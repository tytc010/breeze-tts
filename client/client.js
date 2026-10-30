// Breeze TTS 2 · 网页半边：侧栏入口 + 整页面板（连接 / 生成 / 音色 / 文件 / 接入 Aurabot）
// 只读写宿主半边的 /breeze-tts/api/*，不直接碰模型和进程。
// 视觉跟随 DSH 主题变量，浅色 / 深色都适配。

window.__ModuleLoader__.load({
  id: 'dsh-breeze-tts',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')
    const { useState, useEffect, useRef, useCallback, useMemo } = React
    const h = React.createElement
    const inject = ['slots']
    const PANEL_ID = 'breeze-tts'
    const API = '/breeze-tts/api'

    // ---------------- 小工具 ----------------
    const get = (p) => fetch(API + p, { cache: 'no-store' }).then((r) => r.json()).catch((e) => ({ ok: false, message: '连不上插件：' + e.message }))
    const post = (p, body) => fetch(API + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then((r) => r.json()).catch((e) => ({ ok: false, message: '连不上插件：' + e.message }))
    const mb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1024).toFixed(0) + ' KB')
    const when = (t) => {
      const d = new Date(t)
      const p = (n) => String(n).padStart(2, '0')
      return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
    const dur = (sec) => (sec >= 60 ? Math.floor(sec / 60) + '分' + Math.round(sec % 60) + '秒' : sec.toFixed(1) + ' 秒')
    const cx = (...a) => a.filter(Boolean).join(' ')
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result).replace(/^data:[^,]+,/, ''))
      fr.onerror = () => reject(new Error('读不了这个文件'))
      fr.readAsDataURL(file)
    })

    const CSS = `
.bz-root{--bz-sea:#3d7fd6;--bz-deep:#1d3b6f;--bz-text:var(--dsw-alias-label-primary,#1f2328);--bz-sub:var(--dsw-alias-label-secondary,#57606a);
  --bz-dim:var(--dsw-alias-label-tertiary,#8b949e);--bz-bg:var(--dsw-alias-bg-base,#fff);--bz-card:var(--dsw-alias-bg-layer-1,#fff);
  --bz-card2:var(--dsw-alias-bg-layer-2,#f6f8fa);--bz-line:var(--dsw-alias-border-l1,rgba(0,0,0,.08));
  --bz-ok:var(--dsw-alias-state-success-primary,#1a7f37);--bz-warn:var(--dsw-alias-state-warn-primary,#bf8700);--bz-err:var(--dsw-alias-state-error-primary,#cf222e);
  --bz-foam:rgba(61,127,214,.10);height:100%;overflow:auto;background:var(--bz-bg);color:var(--bz-text);
  font-size:13px;line-height:1.6;padding:var(--dsh-frame-top-clearance,24px) 0 40px;box-sizing:border-box}
body[data-ds-dark-theme] .bz-root{--bz-sea:#6aa6ef;--bz-deep:#9cc4f5;--bz-foam:rgba(106,166,239,.14)}
.bz-wrap{max-width:1000px;margin:0 auto;padding:0 24px}
.bz-title{display:flex;align-items:center;gap:10px;margin:0 0 14px}
.bz-title h1{font-size:18px;margin:0;font-weight:650}
.bz-pill{display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:999px;background:var(--bz-card2);border:1px solid var(--bz-line);color:var(--bz-sub);font-size:12px}
.bz-dot{width:7px;height:7px;border-radius:50%;background:var(--bz-dim)}
.bz-dot.ok{background:var(--bz-ok)}.bz-dot.err{background:var(--bz-err)}.bz-dot.warn{background:var(--bz-warn)}
.bz-nav{display:flex;gap:4px;padding:5px;border:1px solid var(--bz-line);border-radius:12px;background:var(--bz-card2);margin-bottom:14px;flex-wrap:wrap}
.bz-tab{border:0;background:transparent;color:var(--bz-sub);padding:6px 14px;border-radius:8px;font:inherit;cursor:pointer}
.bz-tab.on{background:var(--bz-card);color:var(--bz-text);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.bz-card{border:1px solid var(--bz-line);border-radius:12px;background:var(--bz-card);padding:14px 16px;margin-bottom:12px}
.bz-card h3{margin:0 0 10px;font-size:13px;font-weight:650;display:flex;align-items:center;gap:8px}
.bz-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px}
.bz-field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:180px}
.bz-field label{font-size:12px;color:var(--bz-sub)}
.bz-in,.bz-ta,.bz-sel{width:100%;box-sizing:border-box;padding:6px 9px;border:1px solid var(--bz-line);border-radius:8px;background:var(--bz-bg);color:var(--bz-text);font:inherit;outline:none}
.bz-ta{min-height:84px;resize:vertical;line-height:1.6}
.bz-in:focus,.bz-ta:focus,.bz-sel:focus{border-color:var(--bz-sea)}
.bz-btn{border:1px solid var(--bz-line);background:var(--bz-card2);color:var(--bz-text);padding:6px 12px;border-radius:8px;font:inherit;cursor:pointer;white-space:nowrap}
.bz-btn:hover{background:var(--bz-foam)}
.bz-btn.pri{background:var(--bz-sea);border-color:var(--bz-sea);color:#fff}
.bz-btn.pri:disabled{opacity:.5;cursor:not-allowed}
.bz-btn.danger{color:var(--bz-err);border-color:var(--bz-err)}
.bz-btn.sm{padding:3px 9px;font-size:12px}
.bz-muted{color:var(--bz-dim);font-size:12px}
.bz-list{display:flex;flex-direction:column;gap:8px}
.bz-item{display:flex;gap:10px;align-items:center;border:1px solid var(--bz-line);border-radius:10px;padding:8px 10px;background:var(--bz-card2)}
.bz-item .grow{flex:1;min-width:0}
.bz-name{font-weight:600}
.bz-ell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bz-badge{font-size:11px;padding:1px 7px;border-radius:999px;background:var(--bz-foam);color:var(--bz-sea);border:1px solid var(--bz-line)}
.bz-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:760px){.bz-cols{grid-template-columns:1fr}}
.bz-log{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;background:var(--bz-card2);border:1px solid var(--bz-line);border-radius:8px;padding:8px;max-height:180px;overflow:auto;white-space:pre-wrap;color:var(--bz-sub)}
.bz-modes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.bz-mode{border:1px solid var(--bz-line);background:var(--bz-card2);color:var(--bz-sub);padding:6px 12px;border-radius:999px;font:inherit;cursor:pointer}
.bz-mode.on{background:var(--bz-foam);border-color:var(--bz-sea);color:var(--bz-text)}
.bz-check{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bz-sub)}
audio{width:100%;height:34px}
.bz-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--bz-card);border:1px solid var(--bz-line);border-radius:10px;padding:8px 16px;box-shadow:0 8px 30px rgba(0,0,0,.14);z-index:9999}
.bz-toast.err{border-color:var(--bz-err);color:var(--bz-err)}
`

    let cssDone = false
    function ensureCss() {
      if (cssDone || typeof document === 'undefined') return
      cssDone = true
      const el = document.createElement('style')
      el.setAttribute('data-plugin', 'dsh-breeze-tts')
      el.textContent = CSS
      document.head.appendChild(el)
    }

    const Dot = ({ st }) => h('i', { className: cx('bz-dot', st === 'ok' ? 'ok' : st === 'err' ? 'err' : st === 'warn' ? 'warn' : '') })

    // ---------------- 连接 ----------------
    function ConnectionTab({ st, reload, toast }) {
      const c = st.config || {}
      const [f, setF] = useState({ endpoint: c.endpoint, port: c.port, exePath: c.exePath, modelPath: c.modelPath, outDir: c.outDir, autoStart: c.autoStart })
      useEffect(() => { setF({ endpoint: c.endpoint, port: c.port, exePath: c.exePath, modelPath: c.modelPath, outDir: c.outDir, autoStart: c.autoStart }) }, [c.endpoint, c.port, c.exePath, c.modelPath, c.outDir, c.autoStart])
      const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
      const save = async () => { const r = await post('/config', f); toast(r.ok ? '设置已保存' : r.message, r.ok ? 'ok' : 'err'); reload() }
      const start = async () => { const r = await post('/server/start'); toast(r.message || (r.ok ? '已启动' : '启动失败'), r.ok ? 'ok' : 'err'); reload() }
      const stop = async () => { const r = await post('/server/stop'); toast(r.message, 'ok'); reload() }
      const hlt = st.health || {}
      return h('div', null,
        h('div', { className: 'bz-card' },
          h('h3', null, '服务状态'),
          h('div', { className: 'bz-row' },
            h('span', { className: 'bz-pill' }, h(Dot, { st: hlt.online ? 'ok' : 'err' }), hlt.online ? '已连接' : '未连接'),
            h('span', { className: 'bz-muted' }, hlt.online ? `延迟 ${hlt.ms} ms · 采样率 ${hlt.info?.sample_rate || 24000} Hz · WS 端口 ${hlt.info?.ws_port || 0}` : (hlt.message || '')),
            h('span', { className: 'bz-muted' }, st.server?.running ? `进程运行中 (PID ${st.server.pid})` : '进程未启动')),
          h('div', { className: 'bz-row' },
            h('button', { className: 'bz-btn pri', onClick: start }, '启动服务'),
            h('button', { className: 'bz-btn', onClick: stop }, '停止服务'),
            h('button', { className: 'bz-btn', onClick: async () => { await reload(); toast('已刷新') } }, '刷新状态')),
          st.server?.logs?.length ? h('div', { className: 'bz-log' }, st.server.logs.slice(-14).map((l) => l.line).join('\n')) : null),
        h('div', { className: 'bz-card' },
          h('h3', null, '路径设置'),
          h('div', { className: 'bz-field' }, h('label', null, '服务地址'), h('input', { className: 'bz-in', value: f.endpoint, onChange: (e) => set('endpoint', e.target.value) })),
          h('div', { className: 'bz-row' },
            h('div', { className: 'bz-field' }, h('label', null, '端口（启动时用）'), h('input', { className: 'bz-in', value: f.port, onChange: (e) => set('port', Number(e.target.value) || 8080) })),
            h('div', { className: 'bz-field', style: { flex: 2 } }, h('label', null, 'breeze-server.exe'), h('input', { className: 'bz-in', value: f.exePath, onChange: (e) => set('exePath', e.target.value) }))),
          h('div', { className: 'bz-row' },
            h('div', { className: 'bz-field', style: { flex: 2 } }, h('label', null, '模型 .gguf'), h('input', { className: 'bz-in', value: f.modelPath, onChange: (e) => set('modelPath', e.target.value) })),
            h('div', { className: 'bz-field', style: { flex: 2 } }, h('label', null, '语音输出文件夹'), h('input', { className: 'bz-in', value: f.outDir, onChange: (e) => set('outDir', e.target.value) }))),
          h('div', { className: 'bz-row' },
            h('label', { className: 'bz-check' }, h('input', { type: 'checkbox', checked: Boolean(f.autoStart), onChange: (e) => set('autoStart', e.target.checked) }), 'DSH 启动时自动拉起 Breeze'),
            h('button', { className: 'bz-btn pri', onClick: save }, '保存设置')))
      )
    }

    // ---------------- 变声（实验） ----------------
    function ConvertCard({ reload, toast, voices }) {
      const [src, setSrc] = useState(null)
      const [srcText, setSrcText] = useState('')
      const [voiceId, setVoiceId] = useState('')
      const [keep, setKeep] = useState(0)
      const [busy, setBusy] = useState(false)
      const [result, setResult] = useState(null)

      const run = async () => {
        if (!src) return toast('先选一段要变声的录音', 'err')
        if (!voiceId) return toast('先选一个目标音色', 'err')
        setBusy(true)
        try {
          const audio = await fileToBase64(src)
          const r = await post('/convert', { audio, filename: src.name, mime: src.type || 'audio/wav', voiceId, text: srcText, keepAcoustic: keep })
          if (!r.ok) return toast(r.message || '变声失败', 'err')
          setResult(r)
          toast('变声完成')
          reload()
        } finally { setBusy(false) }
      }

      return h('div', { className: 'bz-card' },
        h('h3', null, '变声（实验） ', h('span', { className: 'bz-badge' }, '保留原表演，只换音色')),
        h('div', { className: 'bz-row' },
          h('div', { className: 'bz-field' }, h('label', null, '源录音'), h('input', { type: 'file', accept: 'audio/*', onChange: (e) => setSrc(e.target.files?.[0] || null) })),
          h('div', { className: 'bz-field' }, h('label', null, '目标音色'),
            h('select', { className: 'bz-sel', value: voiceId, onChange: (e) => setVoiceId(e.target.value) },
              h('option', { value: '' }, '— 选择 —'),
              voices.map((v) => h('option', { key: v.id, value: v.id }, v.id)))),
          h('div', { className: 'bz-field', style: { maxWidth: 130 } }, h('label', null, `保留原音色 ${keep}`),
            h('input', { type: 'range', min: 0, max: 2, step: 1, value: keep, onChange: (e) => setKeep(Number(e.target.value)) }))),
        h('div', { className: 'bz-row' },
          h('div', { className: 'bz-field' }, h('label', null, '源录音文字（可空，填了更准）'), h('input', { className: 'bz-in', value: srcText, onChange: (e) => setSrcText(e.target.value) })),
          h('button', { className: 'bz-btn pri', disabled: busy, onClick: run }, busy ? '变声中…' : '开始变声')),
        h('div', { className: 'bz-muted' }, '音高会被重新生成（不是复制），唱腔可能跑调；说话录音建议保留原音色设为 0。'),
        result ? h('div', { style: { marginTop: 10 } },
          h('audio', { controls: true, src: API + '/file?name=' + encodeURIComponent(result.file) }),
          h('div', { className: 'bz-muted' }, result.file)) : null)
    }

    // ---------------- 生成 ----------------
    function GenerateTab({ st, reload, toast, voices, presets }) {
      const [mode, setMode] = useState('design')
      const [text, setText] = useState('')
      const [instruction, setInstruction] = useState(st.config?.instruction || '')
      const [voiceId, setVoiceId] = useState(st.config?.defaultVoice || '')
      const [cfgScale, setCfgScale] = useState(st.config?.cfgScale ?? 1)
      const [seed, setSeed] = useState(st.config?.seed ?? 42)
      const [useRef, setUseRef] = useState(false)
      const [refFile, setRefFile] = useState(null)
      const [refText, setRefText] = useState('')
      const [busy, setBusy] = useState(false)
      const [result, setResult] = useState(null)

      const run = async () => {
        if (!text.trim()) return toast('先写点要念的文字', 'err')
        setBusy(true)
        try {
          const body = { text, mode, instruction, cfgScale, seed }
          if (mode !== 'design') {
            if (useRef && refFile) {
              body.audio = await fileToBase64(refFile)
              body.filename = refFile.name
              body.mime = refFile.type || 'audio/wav'
              body.refText = refText
            } else body.voiceId = voiceId
          }
          const r = await post('/speak', body)
          if (!r.ok) { toast(r.message || '生成失败', 'err'); return }
          setResult(r)
          toast(`生成好了：${dur(r.seconds)}，用时 ${(r.ms / 1000).toFixed(1)} 秒`)
          reload()
        } finally { setBusy(false) }
      }

      return h('div', null,
        h('div', { className: 'bz-card' },
          h('div', { className: 'bz-modes' },
            [['design', '音色设计'], ['clone', '音色克隆'], ['direction', '音色导演']].map(([k, n]) =>
              h('button', { key: k, className: cx('bz-mode', mode === k && 'on'), onClick: () => setMode(k) }, n))),
          h('div', { className: 'bz-field' }, h('label', null, '要念的文字（支持 [笑] [叹气] 这类语气词）'),
            h('textarea', { className: 'bz-ta', value: text, onChange: (e) => setText(e.target.value), placeholder: '[笑] 欢迎来到今晚的故事时间，让我们一起开始吧。' })),
          mode !== 'design' ? h('div', { className: 'bz-row', style: { marginTop: 10 } },
            h('div', { className: 'bz-field' },
              h('label', null, '音色'),
              h('select', { className: 'bz-sel', value: voiceId, onChange: (e) => setVoiceId(e.target.value), disabled: useRef },
                h('option', { value: '' }, '— 选择已保存的音色 —'),
                voices.map((v) => h('option', { key: v.id, value: v.id }, `${v.id}（${dur(v.seconds || 0)}）`)))),
            h('label', { className: 'bz-check' }, h('input', { type: 'checkbox', checked: useRef, onChange: (e) => setUseRef(e.target.checked) }), '改上传参考音频')) : null,
          mode !== 'design' && useRef ? h('div', { className: 'bz-row' },
            h('div', { className: 'bz-field' }, h('label', null, '参考音频（wav/mp3）'), h('input', { type: 'file', accept: 'audio/*', onChange: (e) => setRefFile(e.target.files?.[0] || null) })),
            h('div', { className: 'bz-field' }, h('label', null, '参考音频的逐字稿（必须准确）'), h('input', { className: 'bz-in', value: refText, onChange: (e) => setRefText(e.target.value) }))) : null,
          h('div', { className: 'bz-row', style: { marginTop: 10 } },
            h('div', { className: 'bz-field', style: { flex: 2 } },
              h('label', null, mode === 'design' ? '音色描述' : '导演指令（可空）'),
              h('input', { className: 'bz-in', value: instruction, onChange: (e) => setInstruction(e.target.value), placeholder: '一位温柔自信的年轻女性，声音清晰，语速偏慢。' })),
            h('div', { className: 'bz-field', style: { maxWidth: 140 } }, h('label', null, `引导强度 ${cfgScale}`),
              h('input', { type: 'range', min: 1, max: 4, step: 0.1, value: cfgScale, onChange: (e) => setCfgScale(Number(e.target.value)) })),
            h('div', { className: 'bz-field', style: { maxWidth: 110 } }, h('label', null, '随机种子'),
              h('input', { className: 'bz-in', value: seed, onChange: (e) => setSeed(Number(e.target.value) || 0) })),
            h('button', { className: 'bz-btn pri', disabled: busy, onClick: run }, busy ? '生成中…' : '生成语音')),
          h('div', { className: 'bz-muted' }, '引导强度 2~3 时语气词（[笑] [叹气]）更容易生效；超过 3 会开始发糙。')),
        result ? h('div', { className: 'bz-card' },
          h('h3', null, '本次结果 ', h('span', { className: 'bz-badge' }, result.mode)),
          h('audio', { controls: true, src: API + '/file?name=' + encodeURIComponent(result.file) }),
          h('div', { className: 'bz-muted' }, `${result.file} · ${dur(result.seconds)} · 用时 ${(result.ms / 1000).toFixed(1)} 秒`)) : null,
        h(ConvertCard, { reload, toast, voices })
      )
    }

    // ---------------- 音色 ----------------
    function VoicesTab({ st, reload, toast, voices, presets }) {
      const [form, setForm] = useState({ name: '', refText: '', description: '', file: null })
      const [preset, setPreset] = useState({ name: '', instruction: '' })
      const [busy, setBusy] = useState('')
      const setF = (k, v) => setForm((x) => ({ ...x, [k]: v }))

      const save = async () => {
        if (!form.file) return toast('先选一个参考音频', 'err')
        if (!form.refText.trim()) return toast('必须填参考音频的逐字稿', 'err')
        setBusy('save')
        try {
          const audio = await fileToBase64(form.file)
          const r = await post('/voices/save', { name: form.name, refText: form.refText, description: form.description, audio, filename: form.file.name, mime: form.file.type || 'audio/wav' })
          toast(r.ok ? '音色已保存到 Breeze' : r.message, r.ok ? 'ok' : 'err')
          if (r.ok) { setForm({ name: '', refText: '', description: '', file: null }); reload() }
        } finally { setBusy('') }
      }
      const act = async (fn, okMsg) => { const r = await fn(); toast(r.ok ? (r.message || okMsg) : r.message, r.ok ? 'ok' : 'err'); if (r.ok) reload() }

      return h('div', null,
        h('div', { className: 'bz-card' },
          h('h3', null, '已保存的音色 ', h('span', { className: 'bz-badge' }, voices.length)),
          voices.length ? h('div', { className: 'bz-list' }, voices.map((v) => h('div', { key: v.id, className: 'bz-item' },
            h('div', { className: 'grow' },
              h('div', { className: 'bz-name' }, v.id, ' ', h('span', { className: 'bz-badge' }, dur(v.seconds || 0))),
              h('div', { className: 'bz-muted bz-ell' }, v.description || v.ref_text || '')),
            h('button', { className: 'bz-btn sm', onClick: () => act(() => post('/voices/patch', { id: v.id, description: window.prompt('新的描述', v.description || '') ?? v.description }), '已保存') }, '改描述'),
            h('button', { className: 'bz-btn sm', onClick: () => act(() => post('/config', { defaultVoice: v.id }), '已设为默认') }, '设为默认'),
            h('button', { className: 'bz-btn sm danger', onClick: () => { if (window.confirm(`从内存移除 ${v.id}？（磁盘上的 .breeze 文件会保留）`)) act(() => post('/voices/delete', { id: v.id }), '已移除') } }, '移除')))) :
            h('div', { className: 'bz-muted' }, '还没有保存过音色。下面用一段参考音频建一个吧。')),
        h('div', { className: 'bz-card' },
          h('h3', null, '新建音色（保存到 Breeze）'),
          h('div', { className: 'bz-row' },
            h('div', { className: 'bz-field' }, h('label', null, '名字（字母/数字/-/_）'), h('input', { className: 'bz-in', value: form.name, onChange: (e) => setF('name', e.target.value), placeholder: 'dafeiyu' })),
            h('div', { className: 'bz-field', style: { flex: 2 } }, h('label', null, '描述（可空）'), h('input', { className: 'bz-in', value: form.description, onChange: (e) => setF('description', e.target.value), placeholder: '活泼少女，声音清亮偏甜' }))),
          h('div', { className: 'bz-row' },
            h('div', { className: 'bz-field' }, h('label', null, '参考音频'), h('input', { type: 'file', accept: 'audio/*', onChange: (e) => setF('file', e.target.files?.[0] || null) })),
            h('div', { className: 'bz-field', style: { flex: 2 } }, h('label', null, '参考音频逐字稿（必须一字不差）'), h('input', { className: 'bz-in', value: form.refText, onChange: (e) => setF('refText', e.target.value) }))),
          h('div', { className: 'bz-row' }, h('button', { className: 'bz-btn pri', disabled: busy === 'save', onClick: save }, busy === 'save' ? '保存中…' : '保存到 Breeze')),
          h('div', { className: 'bz-muted' }, '音色会写进 Breeze 的 voices 目录（.breeze 文件），重启也在。')),
        h('div', { className: 'bz-card' },
          h('h3', null, '音色设计预设 ', h('span', { className: 'bz-badge' }, presets.length)),
          h('div', { className: 'bz-muted', style: { marginBottom: 8 } }, '设计出来的音色没法存进 Breeze（它只保存参考音频），这里把描述存下来复用。'),
          presets.length ? h('div', { className: 'bz-list' }, presets.map((p) => h('div', { key: p.name, className: 'bz-item' },
            h('div', { className: 'grow' }, h('div', { className: 'bz-name' }, p.name), h('div', { className: 'bz-muted bz-ell' }, p.instruction)),
            h('button', { className: 'bz-btn sm danger', onClick: () => act(() => post('/presets/delete', { name: p.name }), '已删') }, '删除')))) : h('div', { className: 'bz-muted' }, '还没有预设'),
          h('div', { className: 'bz-row', style: { marginTop: 10 } },
            h('div', { className: 'bz-field', style: { maxWidth: 160 } }, h('input', { className: 'bz-in', placeholder: '预设名', value: preset.name, onChange: (e) => setPreset((x) => ({ ...x, name: e.target.value })) })),
            h('div', { className: 'bz-field', style: { flex: 2 } }, h('input', { className: 'bz-in', placeholder: '音色描述', value: preset.instruction, onChange: (e) => setPreset((x) => ({ ...x, instruction: e.target.value })) })),
            h('button', { className: 'bz-btn', onClick: () => act(() => post('/presets/save', preset), '已保存') }, '保存预设')))
      )
    }

    // ---------------- 文件 ----------------
    function FilesTab({ st, reload, toast }) {
      const [sel, setSel] = useState([])
      const [play, setPlay] = useState('')
      const files = st.filesAll || st.files || []
      const toggle = (n) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.concat(n)))
      const del = async () => {
        if (!sel.length) return toast('先勾选要删的文件', 'err')
        if (!window.confirm(`删除 ${sel.length} 个文件？不可恢复。`)) return
        const r = await post('/files/delete', { names: sel })
        toast(`删掉了 ${r.deleted} 个`, 'ok'); setSel([]); setPlay(''); reload()
      }
      return h('div', { className: 'bz-card' },
        h('h3', null, '语音文件 ', h('span', { className: 'bz-badge' }, files.length),
          h('span', { className: 'bz-muted', style: { flex: 1, textAlign: 'right' } }, st.outDir || '')),
        h('div', { className: 'bz-row' },
          h('button', { className: 'bz-btn', onClick: () => post('/files/open').then((r) => toast(r.ok ? '已打开文件夹' : r.message, r.ok ? 'ok' : 'err')) }, '打开文件夹'),
          h('button', { className: 'bz-btn', onClick: () => setSel(files.map((f) => f.name)) }, '全选'),
          h('button', { className: 'bz-btn', onClick: () => setSel([]) }, '清空选择'),
          h('button', { className: 'bz-btn danger', onClick: del }, `删除选中（${sel.length}）`),
          h('button', { className: 'bz-btn', onClick: reload }, '刷新')),
        play ? h('div', { style: { margin: '10px 0' } }, h('audio', { controls: true, autoPlay: true, src: API + '/file?name=' + encodeURIComponent(play) })) : null,
        files.length ? h('div', { className: 'bz-list' }, files.map((f) => h('div', { key: f.name, className: 'bz-item' },
          h('input', { type: 'checkbox', checked: sel.includes(f.name), onChange: () => toggle(f.name) }),
          h('div', { className: 'grow' }, h('div', { className: 'bz-ell' }, f.name), h('div', { className: 'bz-muted' }, `${mb(f.size)} · ${when(f.mtime)}`)),
          h('button', { className: 'bz-btn sm', onClick: () => setPlay(f.name) }, '播放'),
          h('a', { className: 'bz-btn sm', href: API + '/file?name=' + encodeURIComponent(f.name), download: f.name, style: { textDecoration: 'none' } }, '下载')))) :
          h('div', { className: 'bz-muted' }, '还没生成过语音。'),
        files.length ? h('div', { className: 'bz-muted', style: { marginTop: 8 } }, '只显示最近 500 个；删除只作用于这个文件夹里的文件。') : null
      )
    }

    // ---------------- Aurabot ----------------
    function AurabotTab({ st, reload, toast, voices }) {
      const ab = st.aurabot || {}
      const [f, setF] = useState({ voiceId: ab.voice?.voiceId || '', instruction: ab.voice?.instruction || '', cfgScale: ab.voice?.cfgScale ?? 1.2, emotionAuto: Boolean(ab.voice?.emotionAuto) })
      const enable = async () => { const r = await post('/aurabot/enable', f); toast(r.ok ? r.message : r.message, r.ok ? 'ok' : 'err'); reload() }
      const disable = async () => { const r = await post('/aurabot/disable'); toast(r.message, 'ok'); reload() }
      const test = async () => { const r = await post('/aurabot/test'); toast(r.ok ? `测试语音生成好了，用时 ${(r.ms / 1000).toFixed(1)} 秒` : r.message, r.ok ? 'ok' : 'err'); reload() }
      return h('div', null,
        h('div', { className: 'bz-card' },
          h('h3', null, '接入状态'),
          h('div', { className: 'bz-row' },
            h('span', { className: 'bz-pill' }, h(Dot, { st: ab.enabled && ab.managed ? 'ok' : 'warn' }), ab.enabled && ab.managed ? '已接入 Breeze' : ab.enabled ? '开关开着但脚本不是你生成的' : '没接入（用内置语音）'),
            h('span', { className: 'bz-muted' }, ab.dir || '')),
          h('div', { className: 'bz-muted' }, '脚本：' + (ab.script || '—')),
          h('div', { className: 'bz-row', style: { marginTop: 10 } },
            h('button', { className: 'bz-btn pri', onClick: enable }, ab.enabled ? '保存并重新接入' : '接入 Aurabot'),
            h('button', { className: 'bz-btn', onClick: disable, disabled: !ab.enabled }, '断开并还原'),
            h('button', { className: 'bz-btn', onClick: test }, '生成一句试试'))),
        h('div', { className: 'bz-card' },
          h('h3', null, '大肥鱼用哪个音色'),
          h('div', { className: 'bz-row' },
            h('div', { className: 'bz-field' }, h('label', null, '音色'),
              h('select', { className: 'bz-sel', value: f.voiceId, onChange: (e) => setF((x) => ({ ...x, voiceId: e.target.value })) },
                h('option', { value: '' }, '— 不选：用下面的导演指令现场设计 —'),
                voices.map((v) => h('option', { key: v.id, value: v.id }, v.id)))),
            h('div', { className: 'bz-field', style: { maxWidth: 130 } }, h('label', null, `引导强度 ${f.cfgScale}`),
              h('input', { type: 'range', min: 1, max: 4, step: 0.1, value: f.cfgScale, onChange: (e) => setF((x) => ({ ...x, cfgScale: Number(e.target.value) })) }))),
          h('div', { className: 'bz-field' }, h('label', null, '导演指令（选了音色时生效）'),
            h('input', { className: 'bz-in', value: f.instruction, onChange: (e) => setF((x) => ({ ...x, instruction: e.target.value })), placeholder: '活泼俏皮，语速略快' })),
          h('label', { className: 'bz-check', style: { marginTop: 8 } },
            h('input', { type: 'checkbox', checked: Boolean(f.emotionAuto), onChange: (e) => setF((x) => ({ ...x, emotionAuto: e.target.checked })) }),
            '跟随心情自动调语气（<55 蔫一点 · 55~85 保持现在的撒娇 · >85 轻快；10 分钟冷却）'),
          h('div', { className: 'bz-muted', style: { marginTop: 6 } }, '改了之后点上面「保存并重新接入」生效。生成的语音会存到文件页那个文件夹。'))
      )
    }

    // ---------------- 页面 ----------------
    function Panel(props) {
      ensureCss()
      const [st, setSt] = useState({ ok: false, config: {}, health: {}, server: {}, files: [], aurabot: {} })
      const [tab, setTab] = useState('conn')
      const [toastMsg, setToastMsg] = useState('')
      const [allFiles, setAllFiles] = useState([])
      const [voices, setVoices] = useState([])
      const [presets, setPresets] = useState([])
      const timer = useRef(null)

      const toast = useCallback((text, kind) => {
        setToastMsg({ text: String(text || ''), kind: kind || 'ok' })
        setTimeout(() => setToastMsg(''), 3200)
      }, [])

      const reload = useCallback(async () => {
        const s = await get('/state')
        setSt(s)
        if (s.ok) {
          setPresets(s.config?.presets || [])
          const f = await get('/files')
          if (f.ok) setAllFiles(f.files || [])
          const v = await get('/voices')
          if (v.ok) { setVoices(v.list || []); setPresets(v.presets || s.config?.presets || []) }
        }
      }, [])

      useEffect(() => {
        reload()
        timer.current = setInterval(() => { get('/state').then((s) => s.ok && setSt(s)).catch(() => {}) }, 5000)
        return () => clearInterval(timer.current)
      }, [reload])

      const health = st.health || {}
      const stTxt = health.online ? '已连接' : '未连接'
      const tabs = [['conn', '连接'], ['gen', '生成'], ['voices', '音色'], ['files', '文件'], ['ab', '接入 Aurabot']]
      const body = { conn: ConnectionTab, gen: GenerateTab, voices: VoicesTab, files: FilesTab, ab: AurabotTab }[tab] || ConnectionTab
      const props2 = { ...props, st: { ...st, filesAll: allFiles }, reload, toast, voices, presets }

      return h('div', { className: 'bz-root' },
        h('div', { className: 'bz-wrap' },
          h('div', { className: 'bz-title' },
            h('h1', null, 'Breeze TTS 2'),
            h('span', { className: 'bz-pill' }, h(Dot, { st: health.online ? 'ok' : 'err' }), stTxt),
            health.online ? h('span', { className: 'bz-muted' }, `${health.ms} ms`) : null,
            st.queue ? h('span', { className: 'bz-pill' }, `队列 ${st.queue}`) : null),
          h('div', { className: 'bz-nav' }, tabs.map(([k, n]) =>
            h('button', { key: k, className: cx('bz-tab', tab === k && 'on'), onClick: () => setTab(k) }, n))),
          h(body, props2)),
        toastMsg ? h('div', { className: cx('bz-toast', toastMsg.kind === 'err' && 'err') }, toastMsg.text) : null
      )
    }

    const Icon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
      h('path', { d: 'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4' }))

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('main', () => slots.register({ name: 'main', key: PANEL_ID }, Panel))
      slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 21, label: () => 'Breeze TTS' }, Icon))
    }

    exports.apply = apply
    exports.inject = inject
    // 便于自测与二次开发
    exports.Panel = Panel
    exports.ConnectionTab = ConnectionTab
    exports.GenerateTab = GenerateTab
    exports.ConvertCard = ConvertCard
    exports.VoicesTab = VoicesTab
    exports.FilesTab = FilesTab
    exports.AurabotTab = AurabotTab
    return module.exports
  },
})
