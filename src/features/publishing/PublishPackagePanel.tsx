import { useMemo, useState } from 'react'
import { Check, Clipboard, Download, ExternalLink, PackageCheck, TriangleAlert } from 'lucide-react'
import type { ContentPlatform, QualityFinding } from '../creation/creation'
import type { PublishStatus } from '../creation-records/creation-records.api'
import { buildPublishPackage, evaluatePublishReadiness } from './publish-package'
import './publish-package.css'

type Props = {
  platform: ContentPlatform
  title: string
  sellingPoints: string[]
  body: string
  findings: QualityFinding[]
  onStatus: (status: PublishStatus, url?: string) => Promise<void>
  onNotice: (message: string) => void
}

export function PublishPackagePanel({ platform, title, sellingPoints, body, findings, onStatus, onNotice }: Props) {
  const [publishedUrl, setPublishedUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const publishPackage = useMemo(() => buildPublishPackage(platform, title, sellingPoints, body), [platform, title, sellingPoints, body])
  const readiness = useMemo(() => evaluatePublishReadiness(title, body, findings), [title, body, findings])
  const copy = async () => {
    try { await navigator.clipboard.writeText(publishPackage.document); onNotice(`${platform}发布包已复制`) } catch { onNotice('剪贴板不可用，请使用下载发布包') }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([publishPackage.document], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${platform}-${title.slice(0, 30) || '发布包'}.md`; anchor.click(); URL.revokeObjectURL(url)
    onNotice(`${platform}发布包已下载`)
  }
  const saveStatus = async (status: PublishStatus, url = '') => {
    setSaving(true)
    try { await onStatus(status, url) } finally { setSaving(false) }
  }
  return <section className="panel publish-package">
    <div className="panel-title"><span><PackageCheck/>平台发布包</span><b className={readiness.ready ? 'ready' : 'blocked'}>{readiness.ready ? '检查通过' : `${readiness.blockers.length} 项待处理`}</b></div>
    <div className="publish-summary"><strong>{platform === '小红书' ? '笔记发布包' : '短视频拍摄包'}</strong><span>{platform === '小红书' ? '封面文案 · 正文 · 话题' : `${publishPackage.sections.length} 段分镜 · 字幕稿`}</span></div>
    <details><summary>预览完整发布包</summary><pre>{publishPackage.document}</pre></details>
    <ul className="publish-checklist">{publishPackage.checklist.map(item => <li key={item}><Check/>{item}</li>)}</ul>
    {!readiness.ready && <div className="publish-blockers">{readiness.blockers.map(item => <span key={item}><TriangleAlert/>{item}</span>)}</div>}
    <div className="publish-actions"><button onClick={() => void copy()}><Clipboard/>复制发布包</button><button onClick={download}><Download/>下载 Markdown</button><button className="ready-action" disabled={!readiness.ready || saving} onClick={() => void saveStatus('ready')}><Check/>保存为可发布</button></div>
    <div className="published-row"><input aria-label="已发布作品链接" type="url" value={publishedUrl} onChange={event => setPublishedUrl(event.target.value)} placeholder="发布后粘贴 HTTPS 作品链接"/><button disabled={!readiness.ready || !publishedUrl.startsWith('https://') || saving} onClick={() => void saveStatus('published', publishedUrl)}><ExternalLink/>记录已发布</button></div>
  </section>
}
