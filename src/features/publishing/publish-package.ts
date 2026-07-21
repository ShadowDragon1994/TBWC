import type { ContentPlatform, QualityFinding } from '../creation/creation'

export type PublishSection = { name: string; copy: string }

export function buildPublishPackage(platform: ContentPlatform, title: string, sellingPoints: string[], body: string) {
  if (platform === '小红书') {
    const topics = body.match(/#[^\s#]+/g) ?? []
    const note = body.replace(/(?:\s*#[^\s#]+)+\s*$/, '').trim()
    return {
      platform, coverCopy: title, subtitles: '', sections: [] as PublishSection[],
      checklist: ['准备 3:4 竖版封面图', '确认商品图与字体可商用', '发布前再次核对价格与库存'],
      document: `# ${title}\n\n## 正文笔记\n${note}\n\n## 核心卖点\n${sellingPoints.map(point => `- ${point}`).join('\n')}\n\n## 话题标签\n${topics.join(' ')}`,
    }
  }
  const matches = [...body.matchAll(/【([^】]+)】([\s\S]*?)(?=【[^】]+】|$)/g)]
  const sections = matches.map(match => ({ name: match[1].trim(), copy: match[2].trim() }))
  const subtitles = sections.map(section => section.copy).join('\n') || body.replace(/【[^】]+】/g, '').trim()
  return {
    platform, coverCopy: title, subtitles, sections,
    checklist: ['按分镜准备产品近景与使用画面', '在安静环境录制口播', '发布前检查字幕与口播一致'],
    document: `# ${title}\n\n## 分镜脚本\n${sections.map((section, index) => `${index + 1}. **${section.name}**\n   ${section.copy}`).join('\n\n')}\n\n## 字幕稿\n${subtitles}\n\n## 核心卖点\n${sellingPoints.map(point => `- ${point}`).join('\n')}`,
  }
}

export function evaluatePublishReadiness(title: string, body: string, findings: QualityFinding[]) {
  const blockers = findings.filter(finding => finding.level === 'warning').map(finding => finding.message)
  if (!title.trim()) blockers.unshift('标题不能为空')
  if (!body.trim()) blockers.unshift('正文不能为空')
  return { ready: blockers.length === 0, blockers }
}
