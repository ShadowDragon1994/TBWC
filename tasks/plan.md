# Implementation Plan: 模板与平台封面

## Overview
启用模板与素材页面，提供本地品牌预设、常用话题、两套封面模板、平台规格切换和 PNG 导出。

## Architecture Decisions
- 品牌预设保存在 localStorage，符合个人工具的本地优先定位。
- 封面导出使用原生 Canvas，不增加图片处理依赖。
- 平台规格固定为小红书 1080×1440、抖音 1080×1920，预览按比例缩放。
- 只允许颜色控件和纯文本进入绘制函数，不渲染 HTML。

## Task List

### Phase 1: Rules and persistence
- [x] 平台规格、文件名清理和本地预设测试
- [x] 品牌名称、颜色、常用话题持久化

### Phase 2: Cover studio
- [x] 两套视觉模板与实时预览
- [x] 小红书/抖音规格切换
- [x] Canvas PNG 导出

### Checkpoint: Complete
- [x] 全部测试、构建和安全审计通过
- [x] Edge 完成预设保存、模板切换和 PNG 下载

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| localStorage 数据损坏 | Medium | 读取时进行形状校验并回退默认值 |
| Canvas 图片跨域污染 | Medium | 第一版仅使用同源内置图片 |
| 文件名包含非法字符 | Medium | 导出前清理 Windows 非法字符并限制长度 |

## Open Questions
- 后续再接入自定义 Logo 和多素材上传。
