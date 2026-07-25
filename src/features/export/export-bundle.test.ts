import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import type { ComplianceFinding } from '../compliance/compliance'
import { buildExportBundle, exportImageSpecs } from './export-bundle'

const acceptedFinding: ComplianceFinding = {
  id: 'confirm:正文:限量',
  severity: 'confirm',
  status: 'accepted',
  location: '正文',
  term: '限量',
  reason: '需要依据',
  suggestion: '确认后继续',
}

describe('buildExportBundle', () => {
  it('packages three platform images, copy and the compliance report', async () => {
    const render = vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    const bundle = await buildExportBundle({
      productName: '青瓷杯',
      platform: '小红书',
      title: '雨后青瓷',
      sellingPoints: ['釉色自然'],
      body: '正文',
      imageUrl: '/uploads/cup.png',
      findings: [acceptedFinding],
    }, render)
    const zip = await JSZip.loadAsync(bundle)

    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'images/main-800.png',
      'images/xiaohongshu-3x4.png',
      'images/douyin-9x16.png',
      'content.txt',
      'compliance-report.json',
      'manifest.json',
    ]))
    expect(render).toHaveBeenCalledTimes(exportImageSpecs.length)
    expect(await zip.file('content.txt')?.async('string')).toContain('雨后青瓷')
  })

  it('blocks export while a confirmation is unresolved', async () => {
    await expect(buildExportBundle({
      productName: '商品', platform: '抖音', title: '标题', sellingPoints: [], body: '正文', imageUrl: '/image.png',
      findings: [{ ...acceptedFinding, status: 'unresolved' }],
    }, vi.fn())).rejects.toThrow('合规检查尚未处理完成')
  })
})

