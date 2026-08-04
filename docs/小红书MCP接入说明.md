# 小红书 MCP 接入说明

造物台已实现 `xpzouying/xiaohongshu-mcp` 的 Streamable HTTP 客户端，不复制或修改其源码。外部服务升级时，造物台只依赖标准 MCP 的 `search_feeds` 和 `publish_content` 工具。

## 1. 安装并启动外部服务

根据项目说明下载 Windows Release，或单独克隆运行：

```powershell
git clone https://github.com/xpzouying/xiaohongshu-mcp.git
cd xiaohongshu-mcp
go run cmd/login/main.go
go run .
```

首次运行需要在打开的浏览器中完成小红书登录。默认 MCP 地址：

```text
http://127.0.0.1:18060/mcp
```

先使用 MCP Inspector 验证服务：

```powershell
npx @modelcontextprotocol/inspector
```

## 2. 启动造物台

在启动造物台前设置 MCP 地址：

```powershell
$env:XHS_MCP_URL='http://127.0.0.1:18060/mcp'
npm.cmd start
```

正式启动后：

- “趋势选品”调用 `search_feeds`，不再返回模拟数据。
- “趋势选品 → 配置种子词”可维护1至10个关键词，每行一个；保存到本地SQLite并立即重新采集。
- “重新采集”会重新搜索候选关键词。
- “发布任务”中的自动发布调用 `publish_content`。
- 商品图片使用本机绝对路径传递。
- 商品名称通过 `products` 参数尝试绑定店铺中的已有商品。
- MCP执行结果和错误写入造物台SQLite审计表。

## 3. 数据口径

小红书搜索页面不直接提供官方搜索指数，所以造物台不会把搜索结果伪装成官方热度：

- `搜索热度`：搜索结果互动总量 + 每条结果100点基础曝光代理值。
- `相关笔记`：本次搜索实际返回的笔记数量。
- `互动率`：根据平均点赞、收藏和评论量归一化。
- `直接竞品`：搜索结果中的去重作者数；缺少作者字段时使用笔记数。
- `7日增长`：首次采集为0；后续需增加每日快照后计算真实变化。

页面会显示“搜索结果互动代理值（非官方搜索指数）”。

## 4. 发布要求

真实MCP发布前必须满足：

1. 发布任务属于小红书且状态为“可发布”。
2. 任务关联商品。
3. 商品至少上传一张图片。
4. MCP服务已经登录。
5. 店铺若需绑定商品，该商品必须已经存在且账号已开通商品功能。

当前外部MCP负责小红书趋势搜索与内容发布，不承担电商商品创建。货源由可替换的1688供应商适配器导入，商品上架由独立的淘宝适配器承担；项目不默认接入千帆。

## 5. 回退

不设置 `XHS_MCP_URL` 或重新启动前清除该环境变量，造物台会使用模拟适配器：

```powershell
Remove-Item Env:XHS_MCP_URL
```

模拟和真实执行使用相同审计结构，可在自动化执行历史中区分 `mock` 与 `xiaohongshu-mcp`。
