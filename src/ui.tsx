// Shared pieces: the mark, one thin icon set, number formats, the QR code and the modal.
import { useEffect, useRef, useState, type ReactNode } from 'react'

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

/** A floating sheet. Bottom sheet on phones, centred card on wide screens. Esc and the backdrop close it. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => { removeEventListener('keydown', onKey); prev?.focus() }
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
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
