import { useMemo, useState } from 'react'
import { Archive, Box, Check, ChevronDown, CircleHelp, Download, FileImage, Home, Image, Lock, PackageCheck, RefreshCw, Settings, Sparkles, TriangleAlert } from 'lucide-react'
import productImage from './assets/bookmark-gift.png'
import { checkCompliance, generateMockContent } from './features/creation/creation'
import { mockProduct } from './features/products/mockProducts'

const nav = [
  [Home, '今日工作台'], [Box, '商品库'], [Archive, '创作任务'], [Image, '模板与素材'], [Settings, '设置'],
] as const

export function App() {
  const [variant, setVariant] = useState(0)
  const [content, setContent] = useState(() => generateMockContent(mockProduct.id, 0))
  const [generating, setGenerating] = useState(false)
  const [exported, setExported] = useState(false)
  const findings = useMemo(() => checkCompliance(`${content.title} ${content.sellingPoints.join(' ')}`), [content])

  const generate = () => {
    setGenerating(true)
    window.setTimeout(() => {
      const next = variant + 1
      setVariant(next)
      setContent(generateMockContent(mockProduct.id, next))
      setGenerating(false)
    }, 650)
  }

  const exportBundle = () => {
    const copy = `${content.title}\n\n${content.sellingPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}\n\n模拟商品：${mockProduct.name}`
    const url = URL.createObjectURL(new Blob([copy], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '东方花窗书签礼盒-文案.txt'
    anchor.click()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="seal">造</span><strong>造物台</strong></div>
      <nav>{nav.map(([Icon, label], index) => <button className={index === 0 ? 'active' : ''} key={label}><Icon size={20}/><span>{label}</span></button>)}</nav>
      <div className="side-note">个人模式<br/><small>数据保存在本机</small></div>
    </aside>

    <main>
      <header className="topbar"><div/><button><CircleHelp size={17}/> 使用帮助</button><span className="avatar">山</span></header>
      <section className="page-head">
        <div><h1>七夕礼赠创作任务</h1><div className="steps"><span className="done"><Check/>选择商品</span><i/><span className="current">2</span><b>生成内容</b><i/><span>3</span><b>审核调整</b><i/><span>4</span><b>导出完成</b></div></div>
        <div className="head-actions"><div className="task-state">任务状态：<em>{generating ? '内容生成中' : exported ? '已导出' : '待编辑'}</em></div><button className="primary" onClick={generate} disabled={generating}><Sparkles size={18}/>{generating ? '正在生成…' : '生成内容'}</button><button className="secondary" onClick={exportBundle}><Download size={18}/>导出素材包</button></div>
      </section>

      <section className="workspace">
        <aside className="product-panel panel">
          <div className="panel-title">商品信息 <ChevronDown size={16}/></div>
          <div className="product-summary"><img src={productImage}/><div><strong>{mockProduct.name}</strong><b>¥{mockProduct.price.toFixed(2)}</b><small>材质：{mockProduct.material}</small></div></div>
          <div className="divider"/><h3>产品卖点与信息</h3>
          <Field label="材质" value={mockProduct.material}/><Field label="受众人群" value={mockProduct.audience}/><Field label="适用场景" value={mockProduct.scene}/><Field label="商品类目" value={mockProduct.category}/><Field label="价格" value={`${mockProduct.price.toFixed(2)} 元`}/>
          <button className="soft"><RefreshCw size={15}/>更新商品信息</button>
        </aside>

        <section className="canvas-panel panel">
          <div className="panel-title"><span>主图画布 <small>800×800</small></span><button>更换模板</button></div>
          <div className="artboard"><img src={productImage}/><div className="art-title">花窗<br/>映心意</div><span className="art-tag">七夕礼赠</span><div className="art-footer"><b>花窗雅韵</b><span>胡桃木配黄铜</span><span>心意伴手礼</span></div></div>
          <div className="canvas-tools"><button>−</button><span>50%</span><button>＋</button><button>适应画布</button></div>
        </section>

        <aside className="editor-panel">
          <section className="panel copy-panel"><div className="panel-title">文案内容 <span><Lock size={14}/>全部解锁</span></div>
            <label>生成标题 <small>{content.title.length}/30</small></label><div className="editable"><input value={content.title} onChange={e => setContent({...content, title:e.target.value})}/><Lock size={15}/></div>
            <button className="regen" onClick={generate}><RefreshCw size={14}/>重新生成</button>
            <label>产品卖点 <small>3/3</small></label>{content.sellingPoints.map((point, index) => <div className="editable point" key={index}><i>{index + 1}</i><input value={point} onChange={e => { const points=[...content.sellingPoints]; points[index]=e.target.value; setContent({...content,sellingPoints:points})}}/><Lock size={15}/></div>)}
          </section>
      <section className="panel compliance"><div className="panel-title">合规检测 <button><RefreshCw size={14}/>重新检测</button></div>{findings.map((finding, index) => <div className={finding.level} key={index}>{finding.level === 'warning' ? <TriangleAlert/> : <Check/>}<span>{finding.message}</span>{finding.level === 'warning' && <button onClick={() => setContent({...content,title:content.title.replaceAll('限量','限定'),sellingPoints:content.sellingPoints.map(point=>point.replaceAll('限量','限定'))})}>去修改</button>}</div>)}</section>
        </aside>
      </section>

      <footer className="export-bar"><strong>导出规格</strong><ExportOption icon={<FileImage/>} title="主图 800×800" selected/><ExportOption icon={<FileImage/>} title="详情页长图 750px"/><ExportOption icon={<FileImage/>} title="竖版海报 3:4"/><div className="export-status"><small>导出状态</small><b>{exported ? '已完成 3/3' : '准备就绪 0/3'}</b><div><span className={exported ? 'complete' : ''}/></div></div></footer>
    </main>
  </div>
}

function Field({label,value}:{label:string,value:string}) { return <label className="field"><span>{label}</span><div>{value}<Lock size={13}/></div></label> }
function ExportOption({icon,title,selected}:{icon:React.ReactNode,title:string,selected?:boolean}) { return <button className={`export-option ${selected?'selected':''}`}>{icon}<span><b>{title}</b><small>JPG · 自动适配</small></span>{selected&&<Check/>}</button> }
