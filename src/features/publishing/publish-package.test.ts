import { describe, expect, it } from 'vitest'
import { buildPublishPackage, evaluatePublishReadiness } from './publish-package'

describe('platform publish package', () => {
  it('builds a Xiaohongshu note package with cover copy and topics', () => {
    const result = buildPublishPackage('小红书', '东方书签礼盒', ['胡桃木与黄铜', '适合送礼'], '正文内容\n\n#送礼 #东方美学 #书签')
    expect(result.document).toContain('# 东方书签礼盒')
    expect(result.document).toContain('## 话题标签')
    expect(result.coverCopy).toBe('东方书签礼盒')
    expect(result.checklist).toContain('准备 3:4 竖版封面图')
  })

  it('builds a Douyin package with storyboard and clean subtitles', () => {
    const body = '【开场】送礼不知道选什么？\n【展示】看看这款礼盒。\n【卖点】胡桃木搭配黄铜。\n【行动引导】喜欢就收藏。'
    const result = buildPublishPackage('抖音', '东方礼盒', ['东方设计'], body)
    expect(result.sections).toEqual([
      { name: '开场', copy: '送礼不知道选什么？' }, { name: '展示', copy: '看看这款礼盒。' },
      { name: '卖点', copy: '胡桃木搭配黄铜。' }, { name: '行动引导', copy: '喜欢就收藏。' },
    ])
    expect(result.subtitles).not.toContain('【开场】')
    expect(result.checklist).toContain('按分镜准备产品近景与使用画面')
  })

  it('only becomes ready when required content has no warnings', () => {
    expect(evaluatePublishReadiness('标题', '正文', [{ level: 'pass', message: '通过' }]).ready).toBe(true)
    expect(evaluatePublishReadiness('标题', '正文', [{ level: 'warning', message: '风险词' }])).toMatchObject({ ready: false, blockers: ['风险词'] })
  })
})
