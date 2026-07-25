import { useState } from 'react'
import { AlertTriangle, Download, FileUp, Upload, X } from 'lucide-react'
import { parsePerformanceCsv, performanceCsvTemplate, type CsvImportError } from './csv-import'
import { performanceApi, type PerformanceDraft, type PerformanceRecord } from './performance.api'

export function CsvImportPanel({ onClose, onImported, onNotice }: {
  onClose: () => void; onImported: (records: PerformanceRecord[]) => void; onNotice: (message: string) => void
}) {
  const [filename, setFilename] = useState('')
  const [records, setRecords] = useState<PerformanceDraft[]>([])
  const [errors, setErrors] = useState<CsvImportError[]>([])
  const [importing, setImporting] = useState(false)

  const chooseFile = async (file?: File) => {
    if (!file) return
    setFilename(file.name)
    if (file.size > 2 * 1024 * 1024) { setRecords([]); setErrors([{ row: 1, message: '文件不能超过 2MB' }]); return }
    try {
      const result = parsePerformanceCsv(await file.text())
      setRecords(result.records); setErrors(result.errors)
    } catch { setRecords([]); setErrors([{ row: 1, message: 'CSV 文件读取失败' }]) }
  }
  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([`\uFEFF${performanceCsvTemplate}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = '造物台-作品数据导入模板.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  const importRecords = async () => {
    setImporting(true)
    try {
      const result = (await performanceApi.importMany(records)).data
      onImported(result.records)
      onNotice(`CSV 导入完成：新增 ${result.created} 条，跳过重复 ${result.skipped} 条`)
      onClose()
    } catch (error) { onNotice(error instanceof Error ? error.message : 'CSV 批量导入失败') } finally { setImporting(false) }
  }

  return <section className="csv-import-panel" role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
    <header><div><h2 id="csv-import-title">导入小红书 / 抖音 CSV</h2><p>先下载模板核对字段；确认预览无误后再写入本地数据。</p></div><button aria-label="关闭 CSV 导入" onClick={onClose}><X/></button></header>
    <div className="csv-import-actions"><label><FileUp/>选择 CSV 文件<input aria-label="选择 CSV 文件" type="file" accept=".csv,text/csv" onChange={event => void chooseFile(event.target.files?.[0])}/></label><button onClick={downloadTemplate}><Download/>下载 CSV 模板</button>{filename && <span>{filename}</span>}</div>
    {errors.length > 0 && <div className="csv-errors" role="alert"><strong><AlertTriangle/>发现 {errors.length} 个问题</strong>{errors.slice(0, 10).map((error, index) => <p key={`${error.row}-${index}`}>第 {error.row} 行：{error.message}</p>)}{errors.length > 10 && <small>另有 {errors.length - 10} 个问题，请修正后重新选择文件。</small>}</div>}
    {records.length > 0 && <div className="csv-preview"><div><strong>导入预览</strong><span>共 {records.length} 条，显示前 5 条</span></div><div className="csv-table"><div className="csv-row csv-head"><span>平台</span><span>作品</span><span>日期</span><span>播放</span><span>订单</span><span>成交额</span></div>{records.slice(0, 5).map((record, index) => <div className="csv-row" key={`${record.platform}-${record.title}-${index}`}><span>{record.platform}</span><span><b>{record.title}</b><small>{record.productName}</small></span><span>{record.recordedOn}</span><span>{record.views}</span><span>{record.orders}</span><span>¥{record.revenue}</span></div>)}</div><button className="primary csv-confirm" disabled={importing} onClick={() => void importRecords()}><Upload/>{importing ? '正在导入…' : `确认导入 ${records.length} 条`}</button></div>}
    {!filename && <div className="csv-empty"><FileUp/><strong>选择后台导出的 CSV 文件</strong><span>支持 UTF-8、中文或英文字段名，单次最多 1000 条。</span></div>}
  </section>
}
