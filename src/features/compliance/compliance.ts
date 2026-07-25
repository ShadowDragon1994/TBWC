export type ComplianceSeverity = 'block' | 'confirm' | 'suggest'
export type ComplianceStatus = 'unresolved' | 'accepted' | 'resolved'
export type ComplianceFinding = {
  id: string
  severity: ComplianceSeverity
  status: ComplianceStatus
  location: '标题' | '正文' | '素材'
  term?: string
  reason: string
  suggestion: string
}

type ComplianceInput = {
  title: string
  body: string
  authorizationRecorded: boolean
  hasAiLabel: boolean
}

const termRules = [
  { terms: ['第一', '最好', '最佳', '100%', '绝对'], reason: '可能构成无法证明的极限或绝对化表达', suggestion: '改成可由商品资料证明的客观描述' },
  { terms: ['治疗', '治愈'], reason: '普通商品文案不应包含医疗功效承诺', suggestion: '删除功效承诺，仅描述商品材质和使用场景' },
]

const finding = (value: Omit<ComplianceFinding, 'id' | 'status'>): ComplianceFinding => ({
  ...value,
  id: `${value.severity}:${value.location}:${value.term ?? value.reason}`,
  status: 'unresolved',
})

export function runCompliance(input: ComplianceInput) {
  const findings: ComplianceFinding[] = []
  const fields = [['标题', input.title], ['正文', input.body]] as const
  for (const [location, copy] of fields) {
    for (const rule of termRules) {
      for (const term of rule.terms.filter(candidate => copy.includes(candidate))) {
        findings.push(finding({ severity: 'block', location, term, reason: rule.reason, suggestion: rule.suggestion }))
      }
    }
    if (/(?:1[3-9]\d{9}|微信|vx|联系电话)/i.test(copy)) {
      findings.push(finding({ severity: 'block', location, reason: '内容包含站外联系方式或引流信息', suggestion: '删除电话号码、微信号或其他站外联系方式' }))
    }
    if (copy.includes('限量')) {
      findings.push(finding({ severity: 'confirm', location, term: '限量', reason: '限量描述需要库存或活动依据', suggestion: '确认依据后继续，或改为“节日心意礼”等中性表达' }))
    }
  }
  if (!input.authorizationRecorded) {
    findings.push(finding({ severity: 'confirm', location: '素材', reason: '尚未记录图片与字体授权凭证', suggestion: '确认素材来源并补充授权记录后再发布' }))
  }
  if (!input.hasAiLabel) {
    findings.push(finding({ severity: 'block', location: '素材', reason: 'AI 生成素材尚未包含必要标识', suggestion: '在导出素材中加入清晰可见的 AI 生成标识' }))
  }
  if (Array.from(input.title).length > 30) {
    findings.push(finding({ severity: 'suggest', location: '标题', reason: '标题超过 30 个字符，移动端可能显示不完整', suggestion: '保留商品名和一个核心卖点，缩短标题' }))
  }
  return findings
}

export function applyComplianceDecision(item: ComplianceFinding, status: 'accepted' | 'resolved') {
  if (item.severity === 'block' && status === 'accepted') throw new Error('阻断项必须修改后解决')
  return { ...item, status }
}

export function canExport(findings: ComplianceFinding[]) {
  return findings.every(item => item.status === 'resolved' || (item.severity !== 'block' && item.status === 'accepted'))
}

