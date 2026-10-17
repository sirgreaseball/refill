// Shared pieces: the mark, one thin icon set, number formats, the QR code and the modal.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const inr = new Intl.NumberFormat('en-IN')
export const money = (n: number | null | undefined) => (n == null ? '—' : `₹${inr.format(n)}`)
export const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
export const span = (start: number, minutes: number) => `${clock(start)}–${clock(start + minutes)}`
export const lead = (min: number) => {
  const a = Math.abs(min)
  const h = Math.floor(a / 60)
  const m = a % 60
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`
}
export const stamp = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** The brand is the metaphor: a day line, one gap, the gap filling. */
export function Mark({ size = 28, fill = 0.62 }: { size?: number; fill?: number }) {
  return (
    <svg className="mark" width={size * 2} height={size * 0.62} viewBox="0 0 60 18" aria-hidden="true">
      <rect x="1" y="7" width="17" height="4" rx="2" fill="currentColor" />
      <rect x="21.5" y="4.5" width="17" height="9" rx="4.5" fill="none" stroke="var(--beat)" strokeWidth="1.5" />
      <rect className="mark-fill" x="21.5" y="4.5" width={17 * fill} height="9" rx="4.5" fill="var(--act)" />
      <rect x="42" y="7" width="17" height="4" rx="2" fill="currentColor" />
    </svg>
  )
}

const paths: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></>,
  download: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />,
  reset: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" />,
  share: <path d="M12 15V4m0 0L8 8m4-4l4 4M6 11v7.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V11" />,
  more: <><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="M5 12h14m0 0l-5-5m5 5l-5 5" />,
  sun: <><circle cx="12" cy="12" r="3.6" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" /></>,
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  bolt: <path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12L13 3z" />,
  lab: <path d="M9.5 3.5h5M10.5 3.5v6L5 19a1.3 1.3 0 0 0 1.1 2h11.8a1.3 1.3 0 0 0 1.1-2l-5.5-9.5v-6" />,
  book: <path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5zM5 16a3.5 3.5 0 0 1 3.5-3.5H18" />,
  shield: <path d="M12 3.5l7 3v5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9v-5l7-3z" />,
  install: <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />,
  upload: <path d="M12 15V4m0 0L8 8m4-4l4 4M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  pulse: <path d="M3.5 12h4l2.5-6 4 12 2.5-6h4" />,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" /></>,
  chart: <path d="M4.5 19.5h15M7 16.5v-5M12 16.5V7M17 16.5v-8" />,
  sliders: <path d="M5 7h8m4 0h2M5 17h2m4 0h8M15 4.5v5M9 14.5v5" />,
  chevron: <path d="M7 10l5 5 5-5" />,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  desk: <><path d="M3.5 9.5h17M5 9.5V19M19 9.5V19M8.5 9.5v-3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v3" /></>,
  scissors: <><circle cx="6.5" cy="7" r="2.5" /><circle cx="6.5" cy="17" r="2.5" /><path d="M8.6 8.4L20 17M8.6 15.6L20 7" /></>,
}

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Qr({ text, size = 176 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    import('qrcode')
      .then((QR) => QR.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1f1a1e', light: '#fbf8f3' } }))
      .then((s) => alive && setSvg(s))
    return () => { alive = false }
  }, [text])
  return <div className="qr" style={{ width: size, height: size }} role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg }} />
}

/** A floating sheet. Bottom sheet on phones, centred card on wide screens. Esc and the backdrop close it.
 *  It renders into <body> above everything, keeps Tab inside itself, and makes the page behind it inert. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  // Runs once per opening: the desk re-renders every poll, and re-running this would steal focus each time.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const behind = [...document.body.children].filter((el) => !el.contains(ref.current) && !el.hasAttribute('inert'))
    behind.forEach((el) => el.setAttribute('inert', ''))
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close.current()
      if (e.key !== 'Tab' || !ref.current) return
      const all = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute('disabled'))
      if (!all.length) return
      const [first, last] = [all[0], all[all.length - 1]]
      const at = document.activeElement
      if (e.shiftKey && (at === first || at === ref.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus() }
    }
    addEventListener('keydown', onKey)
    return () => { removeEventListener('keydown', onKey); behind.forEach((el) => el.removeAttribute('inert')); prev?.focus() }
  }, [])
  return createPortal(
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close.current()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={() => close.current()} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export function download(name: string, body: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------- toast

type Toast = (text: string, bad?: boolean) => void
const ToastCtx = createContext<Toast>(() => {})
export const useToast = () => useContext(ToastCtx)

/** One message at a time, low on the screen, gone after a few seconds. */
export function ToastHost({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ text: string; bad?: boolean; n: number } | null>(null)
  useEffect(() => {
    if (!t) return
    const id = setTimeout(() => setT(null), t.bad ? 6000 : 3800)
    return () => clearTimeout(id)
  }, [t])
  const show = useCallback<Toast>((text, bad) => setT((p) => ({ text, bad, n: (p?.n ?? 0) + 1 })), [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`toast ${t ? 'is-on' : ''} ${t?.bad ? 'is-bad' : ''}`} role="status" aria-live="polite">{t?.text}</div>
    </ToastCtx.Provider>
  )
}
