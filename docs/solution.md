# 淘宝文创 Web 工具：复用优先方案

## 市面方案结论（2026-08-20）

| 能力 | 采用 | 原因 |
|---|---|---|
| Web 商品工作台、草稿库、人工筛选、任务队列 | [TradeMind](https://github.com/lien0219/trademind-ai) | Apache-2.0；已支持淘宝/天猫采集、商品草稿、图片 Provider、发布中心、PostgreSQL、Redis、React 管理端和失败恢复。 |
| 关键词/链接采集 | TradeMind Playwright Collector | 上游已有淘宝/天猫 Collector，结果直接进入其商品草稿模型。 |
| 图片找同款 | 可插拔商业“拍立淘”API Provider | 淘宝开放平台当前未提供通用全站商品搜索 API；图片搜索需独立获得商业接口服务后接入，避免把非公开页面协议固化进系统。 |
| PSD 自动化 | [Adobe Photoshop API v2](https://developer.adobe.com/firefly-services/docs/photoshop/) | 官方 REST/SDK；支持智能对象替换、ActionJSON、裁切、去背景和 UXP 脚本。v1 已于 2026-07-31 结束生命周期。 |
| 淘宝发布 | [淘宝开放平台 Schema 商品发布](https://developer.alibaba.com/docs/doc.htm?articleId=102602&docType=1&treeId=780) | 官方推荐动态映射 Schema XML 到本地 DB，以适应类目发布规则变化；发布权限和店铺授权由开放平台控制。 |
| 执行可靠性 | 本仓库 `agent_harness` | 为采集、PS、发布批次提供检查点、验收、预算和断点恢复。 |

## 目标流程

1. **发现池**：用户在 TradeMind Web 端提交关键词、商品链接或查询图片；Collector/图片搜索 Provider 将候选商品按 `platform + external_id` 幂等写入草稿库。
2. **人工闸门 A**：候选状态为 `DISCOVERED`，人工批量剔除或标记 `SELECTED`。未选商品不会进入图片处理。
3. **设计处理**：选择 PSD 模板、智能对象图层、ActionJSON 与输出规格，提交 Adobe Photoshop v2 异步作业；回调/轮询完成后保存 PSD、主图和详情图 URL，并记录输入与模板版本。
4. **人工闸门 B**：设计结果进入 `DESIGN_REVIEW`，只有人工确认 `PUBLISH_READY` 才能创建发布任务。
5. **淘宝发布**：先读取卖家类型、授权类目和动态 Schema，再做本地字段映射、图片上传、预检；最终发布动作需显式确认并以 `shop_id + local_product_id + revision` 作为幂等键。
6. **回写与恢复**：淘宝商品 ID、状态与 API 响应回写本地库；失败任务从最后一个验证节点恢复，不重复执行已完成的图片或发布副作用。

## Provider 边界

### `taobao-image-search`

输入：`image_url | image_base64`、分页、价格范围。输出统一为 `external_id/title/url/main_image/price/shop/sales/raw`。供应商通过环境变量配置，业务表不依赖其专有字段。

### `adobe-photoshop-v2`

仅服务端保存 OAuth 凭证。输入必须包含模板版本、素材 URL、操作清单和输出预签名 URL；完成条件是 Adobe 作业成功且输出文件可读取、尺寸/格式验收通过。

### `taobao-publisher`

使用 TOP SDK/开放平台 API，动态保存 Schema 原文、版本与字段映射。发布前必须检查标题、类目、SKU、价格、库存、主图、详情图、资质和人工确认时间。

## 暂不复用的方案

- 启航 ERP：淘宝等多平台 ERP 能力更完整，但体量与本项目“选品—制图—上架”主链路不匹配，暂作未来订单/库存阶段候选。
- Directus + n8n：可快速拼后台和流程，但 TradeMind 已包含同类商品域、后台和任务能力，再叠加会形成两套状态源。
- 旧淘宝 Node SDK：社区 SDK 长期维护情况不明确；发布层优先使用开放平台当前 SDK 与 Schema 体系。

## 外部前置条件

- 淘宝开放平台应用、目标店铺 OAuth 授权、商品发布相关 API 权限。
- 具有关键词/图片搜索能力的接口服务账号；正式选择前需用同一组文创样本比较覆盖率、延迟、字段完整度和成本。
- Adobe Firefly Services 企业合同、Photoshop API v2 Client ID/Secret，以及可供 Adobe 读取和写入的对象存储预签名 URL。

