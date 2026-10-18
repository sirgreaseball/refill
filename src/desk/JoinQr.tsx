// The counter's QR codes: one for a client to book an open time today, one to join the waitlist.
// Both open the business's own booking page; whatever a client books or joins lands on the desk.
import { useState } from 'react'
import { joinLink } from '../api'
import { Icon, Qr, copy, useToast } from '../ui'

type Kind = 'book' | 'wait'
const TEXT: Record<Kind, { tab: string; note: string; share: string }> = {
  book: { tab: 'New appointment', note: 'Scan to book an open time today. The booking appears on Today straight away.', share: 'Book a time with us today' },
  wait: { tab: 'Join the waitlist', note: 'Scan to join the waitlist, with a clear yes or no to messages. If a time opens that fits, Refill offers it.', share: 'Join our waitlist' },
}

export default function JoinQr({ code, salon }: { code: string; salon: string }) {
  const [kind, setKind] = useState<Kind>('book')
  const toast = useToast()
  const url = kind === 'book' ? joinLink(code) : `${joinLink(code)}/wait`
  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) { try { await nav.share({ title: salon, text: `${TEXT[kind].share} at ${salon}`, url }); return } catch { /* closed */ } }
    toast(await copy(url) ? 'Link copied.' : 'Could not copy. Long-press the link instead.')
  }
  return (
    <div className="qr-one join-qr">
      <div className="seg" role="group" aria-label="What the code opens">
        {(['book', 'wait'] as const).map((k) => (
          <button key={k} className={kind === k ? 'is-on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>{TEXT[k].tab}</button>
        ))}
      </div>
      <Qr text={url} size={208} />
      <p className="quiet">{TEXT[kind].note}</p>
      <p className="mono small join-url">{url.replace(/^https?:\/\//, '')}</p>
      <div className="card-acts" style={{ justifyContent: 'center' }}>
        <button className="btn is-primary" onClick={share}><Icon name="share" /> Share</button>
        <button className="btn" onClick={async () => toast(await copy(url) ? 'Link copied.' : 'Could not copy.')}><Icon name="copy" /> Copy link</button>
        <a className="btn is-quiet" href={url.slice(url.indexOf('#'))}>Open it</a>
      </div>
    </div>
  )
}
