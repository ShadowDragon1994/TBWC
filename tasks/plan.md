# Implementation Plan: 内容历史与版本管理

## Overview
在现有创作记录能力上增加不可变版本快照。生成、局部改写和手动保存都会形成可检索、可预览、可恢复的历史版本，并兼容已有本地数据库和备份。

## Architecture Decisions
- 延用 `creation_records`，通过增量迁移新增 `source` 与 `version_number`，避免建立重复数据系统。
- 历史版本只新增、不覆盖；从历史恢复后再次保存会形成新版本。
- 生成的三个候选分别保存，便于比较和找回未选中的方案。
- 筛选由服务端参数化查询执行，输入在 API 边界通过 Zod 校验。

## Task List

### Phase 1: Version foundation
- [x] 为记录模型增加来源、版本号和兼容迁移
- [x] 支持按关键词、商品、平台和来源筛选

### Checkpoint: Foundation
- [x] API 测试通过
- [x] 旧格式记录仍可创建和恢复

### Phase 2: Automatic snapshots
- [x] 生成候选时自动保存三个版本
- [x] 局部改写和手动保存形成新版本

### Phase 3: History experience
- [x] 历史页展示版本来源和版本号
- [x] 提供组合筛选与恢复到工作台

### Checkpoint: Complete
- [x] 全部测试和生产构建通过
- [x] Edge 中完成生成、筛选、恢复流程
- [x] 依赖安全审计无高危漏洞

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 旧 SQLite 缺少新列 | High | 启动时检查列并做可重复增量迁移 |
| 自动保存失败阻塞生成 | Medium | 内容生成成功优先，快照失败给出明确提示 |
| 多候选版本号冲突 | Medium | 服务端在单进程本地数据库中按现有最大值递增 |

## Open Questions
- 无；当前按个人、本地单进程工具设计。
