import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, KeyRound, PlugZap, Save, ShieldCheck } from 'lucide-react'
import { aiApi, type AiSettings, type AiUsageSummary } from './ai.api'
import './ai-settings.css'

const defaults = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
}

export function AiSettingsPage({ onSaved }: { onSaved: (settings: AiSettings) => void }) {
  const [mode, setMode] = useState<'mock' | 'real'>('mock')
  const [baseUrl, setBaseUrl] = useState(defaults.openai.baseUrl)
  const [model, setModel] = useState(defaults.openai.model)
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [inputPricePerMillion, setInputPricePerMillion] = useState(0)
  const [outputPricePerMillion, setOutputPricePerMillion] = useState(0)
  const [monthlyBudget, setMonthlyBudget] = useState(0)
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)

  useEffect(() => {
    void aiApi.settings().then(({ data }) => {
      setMode(data.mode); setBaseUrl(data.baseUrl); setModel(data.model); setHasApiKey(data.hasApiKey)
      setInputPricePerMillion(data.inputPricePerMillion ?? 0); setOutputPricePerMillion(data.outputPricePerMillion ?? 0); setMonthlyBudget(data.monthlyBudget ?? 0)
    }).catch(error => setMessage(error instanceof Error ? error.message : '设置加载失败'))
    void aiApi.usage().then(({ data }) => setUsage(data.summary)).catch(() => setUsage(null))
  }, [])
  const applyPreset = (preset: keyof typeof defaults) => { setBaseUrl(defaults[preset].baseUrl); setModel(defaults[preset].model) }
  const save = async () => {
    setBusy(true)
    try {
      const { data } = await aiApi.saveSettings({ mode, baseUrl, model, inputPricePerMillion, outputPricePerMillion, monthlyBudget, ...(apiKey ? { apiKey } : {}) })
      setHasApiKey(data.hasApiKey); setApiKey(''); setUsage(current => current ? { ...current, monthlyBudget: data.monthlyBudget } : current)
      setMessage('AI 设置和预算已安全保存到本机'); onSaved(data)
    } catch (error) { setMessage(error instanceof Error ? error.message : '设置保存失败') } finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true)
    try { const { data } = await aiApi.test(); setMessage(`连接成功，当前模型：${data.model}`) } catch (error) { setMessage(error instanceof Error ? error.message : '连接失败') } finally { setBusy(false) }
  }

  return <section className="ai-settings-page">
    <header><div><h1>AI 生成设置</h1><p>连接兼容服务，为小红书和抖音生成真实文案。</p></div><span className={mode === 'real' ? 'real' : ''}>{mode === 'real' ? '真实 AI' : '模拟模式'}</span></header>
    {message && <div className="ai-settings-message" role="status"><CheckCircle2/>{message}</div>}
    <section className="usage-card">
      <header><span><BarChart3/>本月 AI 用量</span><small>{usage?.unknownUsageCalls ? `${usage.unknownUsageCalls} 次未返回 Token` : '用量均有记录'}</small></header>
      <div className="usage-grid"><article><b>{usage?.calls ?? 0}</b><span>调用次数</span></article><article><b>{usage ? `${usage.successfulCalls}/${usage.calls}` : '0/0'}</b><span>成功调用</span></article><article><b>{((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString('zh-CN')}</b><span>Token 合计</span></article><article><b>¥{(usage?.estimatedCost ?? 0).toFixed(4)}</b><span>估算费用</span></article></div>
      <div className="budget-progress"><span><b>预算进度</b><em>{usage?.monthlyBudget ? `${Math.min(100, (usage.estimatedCost / usage.monthlyBudget) * 100).toFixed(1)}%` : '未设置预算'}</em></span><div><i style={{ width: `${usage?.monthlyBudget ? Math.min(100, (usage.estimatedCost / usage.monthlyBudget) * 100) : 0}%` }}/></div></div>
    </section>
    <div className="settings-card">
      <h2>生成模式</h2><div className="mode-options"><button aria-pressed={mode === 'mock'} onClick={() => setMode('mock')}><b>模拟模式</b><small>无需密钥，使用内置模板</small></button><button aria-pressed={mode === 'real'} onClick={() => setMode('real')}><b>真实 AI</b><small>使用你配置的模型服务</small></button></div>
      <h2>常用服务</h2><div className="preset-options"><button onClick={() => applyPreset('openai')}>OpenAI</button><button onClick={() => applyPreset('deepseek')}>DeepSeek</button></div>
      <label><span>API 地址</span><input aria-label="API 地址" value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1"/></label>
      <label><span>模型名称</span><input aria-label="模型名称" value={model} onChange={event => setModel(event.target.value)} placeholder="模型 ID"/></label>
      <h2>费用估算</h2><div className="price-grid"><label><span>输入 Token 单价</span><input aria-label="输入 Token 单价" type="number" min="0" step="0.01" value={inputPricePerMillion} onChange={event => setInputPricePerMillion(Number(event.target.value))}/><small>元 / 百万 Token</small></label><label><span>输出 Token 单价</span><input aria-label="输出 Token 单价" type="number" min="0" step="0.01" value={outputPricePerMillion} onChange={event => setOutputPricePerMillion(Number(event.target.value))}/><small>元 / 百万 Token</small></label><label><span>每月预算</span><input aria-label="每月预算" type="number" min="0" step="1" value={monthlyBudget} onChange={event => setMonthlyBudget(Number(event.target.value))}/><small>元，0 表示只统计不提醒</small></label></div>
      <label><span>API Key</span><div className="secret-input"><KeyRound/><input aria-label="API Key" type="password" autoComplete="off" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={hasApiKey ? '已保存；留空表示不修改' : '请输入 API Key'}/></div></label>
      <div className="security-note"><ShieldCheck/><span><b>密钥仅保存在这台电脑</b><small>浏览器无法读取完整密钥，备份文件也不会包含密钥。</small></span></div>
      <footer><button onClick={() => void test()} disabled={busy || mode !== 'real' || !hasApiKey}><PlugZap/>测试连接</button><button className="primary" onClick={() => void save()} disabled={busy || !baseUrl || !model}><Save/>{busy ? '处理中…' : '保存设置'}</button></footer>
    </div>
  </section>
}
