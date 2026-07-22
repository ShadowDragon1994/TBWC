# Implementation Plan: 真实素材与封面裁切

## Overview
让模板工作室直接使用商品库真实图片，支持素材选择、上传、缩放和位置调整，并让预览与 PNG 导出保持一致。

## Architecture Decisions
- 复用商品库及现有图片上传 API，避免重复素材存储。
- 裁切参数按“平台 + 模板”保存到 localStorage。
- 图片只来自内置资源或同源 `/uploads`，避免 Canvas 跨域污染。
- 缩放与偏移在读取和绘制前统一限制范围。

## Task List

### Phase 1: Layout model
- [x] 裁切参数校验、钳制和持久化测试
- [x] Canvas 导出应用缩放与偏移

### Phase 2: Material workflow
- [x] 加载并展示所有商品素材
- [x] 从模板页向指定商品上传素材
- [x] 素材选择、缩放和水平/垂直位置控件
- [x] 小红书与抖音安全区域提示

### Checkpoint: Complete
- [x] 全部测试、构建和安全审计通过
- [x] Edge 完成真实素材选择、裁切、持久化和 PNG 导出

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 非同源图片污染 Canvas | High | 只接受内置资源与服务端 `/uploads` URL |
| 旧布局参数越界 | Medium | 读取时统一钳制缩放和偏移 |
| 上传文件伪造类型 | Medium | 延用服务端 MIME、数量和 10MB 限制 |

## Open Questions
- 素材删除和重命名放到下一增量，避免误删商品正在使用的图片。
