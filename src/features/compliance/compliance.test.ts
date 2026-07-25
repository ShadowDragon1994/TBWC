import { describe, expect, it } from 'vitest'
import { applyComplianceDecision, runCompliance } from './compliance'

describe('runCompliance', () => {
  it('returns blocking findings with an exact location and suggestion', () => {
    const findings = runCompliance({ title: '全网第一青瓷杯', body: '联系电话 13800138000', authorizationRecorded: true, hasAiLabel: true })
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'block', term: '第一', location: '标题', status: 'unresolved' }),
      expect.objectContaining({ severity: 'block', location: '正文', reason: expect.stringContaining('联系方式') }),
    ]))
    expect(findings.every(item => item.suggestion.length > 0)).toBe(true)
  })

  it('requires confirmation for limited quantity and missing authorization evidence', () => {
    const findings = runCompliance({ title: '七夕限量礼盒', body: '适合日常送礼', authorizationRecorded: false, hasAiLabel: true })
    expect(findings.filter(item => item.severity === 'confirm')).toHaveLength(2)
  })

  it('allows confirm findings to be explicitly accepted but never ignores blockers', () => {
    const [confirmation] = runCompliance({ title: '限量礼盒', body: '正文', authorizationRecorded: true, hasAiLabel: true })
    expect(applyComplianceDecision(confirmation, 'accepted').status).toBe('accepted')
    const [blocker] = runCompliance({ title: '最好的礼盒', body: '正文', authorizationRecorded: true, hasAiLabel: true })
    expect(() => applyComplianceDecision(blocker, 'accepted')).toThrow('阻断项必须修改')
  })
})

