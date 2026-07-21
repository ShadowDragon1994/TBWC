# Implementation Plan: 平台发布包

## Overview
将已生成内容整理为可直接发布的小红书笔记包或抖音拍摄包，并提供发布前检查、复制、下载和发布状态记录。

## Architecture Decisions
- 发布包由前端纯函数生成，保持可测试且不依赖外部平台接口。
- 发布检查复用现有质量规则；任何 warning 都阻止标记“可发布”。
- 发布状态与作品链接保存在创作版本记录中，通过兼容迁移增加字段。
- 作品链接只校验 HTTPS 格式并存储，不发起服务器请求。

## Task List

### Phase 1: Package rules
- [x] 小红书完整笔记、封面提示和素材清单
- [x] 抖音分镜、字幕稿和拍摄清单
- [x] 发布就绪判定与测试

### Phase 2: Publishing workflow
- [x] 发布包预览、复制和 Markdown 下载
- [x] 发布状态、作品链接 API 与数据库迁移
- [x] 历史页显示发布状态

### Checkpoint: Complete
- [x] 全部测试、构建和依赖审计通过
- [x] Edge 完成生成发布包、复制/下载和状态流程

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 浏览器剪贴板权限受限 | Medium | 捕获错误并给出明确反馈，下载仍可使用 |
| 旧记录无发布字段 | High | 数据库列与备份 Schema 提供安全默认值 |
| 非法作品链接 | Medium | API 边界仅接受空值或 HTTPS URL |

## Open Questions
- 无；第一版采用人工发布后回填链接。
