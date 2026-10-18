"""Synthesises every sound effect in the film into public/sfx/<name>.wav (48 kHz, stereo).

All sounds are built from sines, filtered noise and envelopes, then given the same small
room so they sit together. Run: python tools/sfx.py
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sfx')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env(n, a, d, curve=4.0):
    """Attack a seconds, then exponential decay over the rest (shape `curve`)."""
    x = np.arange(n) / SR
    e = np.where(x < a, x / max(a, 1e-4), np.exp(-curve * (x - a) / max(d, 1e-4)))
    return e


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def sweep_bp(x, f0, f1, q=1.6, steps=64):
    """Band-pass whose centre glides from f0 to f1 (block-wise; smooth enough for noise)."""
    out = np.zeros_like(x)
    blocks = np.array_split(np.arange(len(x)), steps)
    for i, idx in enumerate(blocks):
        f = f0 * (f1 / f0) ** (i / (steps - 1))
        lo, hi = f / (1 + 1 / q), min(f * (1 + 1 / q), SR / 2 - 100)
        out[idx] = bp(x, lo, hi)[idx]
    return out


def noise(d):
    return rng.standard_normal(int(d * SR))


_ir_cache = {}


def room(x, size=1.2, wet=0.22):
    """A soft synthetic hall: decaying stereo noise impulse response."""
    if size not in _ir_cache:
        n = int(size * SR)
        e = np.exp(-6.0 * np.arange(n) / n)
        ir = np.stack([lp(rng.standard_normal(n), 6000) * e, lp(rng.standard_normal(n), 6000) * e])
        ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 30
        _ir_cache[size] = ir
    ir = _ir_cache[size]
    dry = np.stack([x, x])
    w = np.stack([fftconvolve(x, ir[0]), fftconvolve(x, ir[1])])
    y = np.zeros((2, w.shape[1]))
    y[:, : len(x)] = dry * (1 - wet)
    y += w * wet * 6
    return y


def save(name, x, peak_db=-3.0, size=1.2, wet=0.22, tail=True):
    y = room(x, size, wet) if tail else np.stack([x, x])
    # trim silence at the end
    mag = np.abs(y).max(axis=0)
    last = np.nonzero(mag > mag.max() * 1e-3)[0]
    y = y[:, : (last[-1] + 1 if len(last) else y.shape[1])]
    fade = min(len(y[0]), int(0.05 * SR))
    y[:, -fade:] *= np.linspace(1, 0, fade)
    y *= 10 ** (peak_db / 20) / (np.abs(y).max() + 1e-9)
    wavfile.write(os.path.join(OUT, name + '.wav'), SR, (y.T * 32767).astype(np.int16))


def click(f=3200, d=0.05, decay=0.012):
    t = t_(d)
    return (np.sin(2 * np.pi * f * t) * 0.6 + hp(noise(d), 2000) * 0.4) * np.exp(-t / decay)


def place(buf, x, at):
    i = int(at * SR)
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


# --- UI ---------------------------------------------------------------------------------------
save('tick', click(4200, 0.06, 0.008) * 0.9 + click(1800, 0.06, 0.004) * 0.4, size=0.6, wet=0.15)
save('tap', click(2400, 0.08, 0.01) + lp(noise(0.08), 900) * np.exp(-t_(0.08) / 0.01) * 0.6, size=0.5, wet=0.12)

t = t_(0.35)
pop = np.sin(2 * np.pi * (520 + 900 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.06)
save('pop', pop, size=0.6, wet=0.18)

t = t_(0.5)
toggle = click(1500, 0.5, 0.01) * 0.7
place(toggle, click(2600, 0.1, 0.008) * 0.6, 0.07)
save('toggle', toggle, size=0.5, wet=0.15)

# lock: two mechanical clicks and a low body
t = t_(0.6)
lock = click(1200, 0.6, 0.006) + 0.6 * lp(noise(0.6), 400) * np.exp(-t / 0.03)
place(lock, click(3000, 0.2, 0.004) * 0.8, 0.055)
place(lock, np.sin(2 * np.pi * 110 * t_(0.4)) * np.exp(-t_(0.4) / 0.08) * 0.6, 0.05)
save('lock', lock, size=0.8, wet=0.2)

# chime: notification, two soft bell partials
def bell(f, d=2.0, decay=0.5):
    t = t_(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (decay / m ** 0.6)) for m, a in [(1, 1), (2.01, 0.35), (3.02, 0.15), (4.2, 0.08)])


ch = np.zeros(int(2.2 * SR))
place(ch, bell(1318.5, 2.0, 0.45), 0)
place(ch, bell(1975.5, 2.0, 0.6) * 0.8, 0.11)
save('chime', ch * env(len(ch), 0.002, 2.0, 2), size=1.4, wet=0.25)

# ding: confirm, a bright major third settling
dg = np.zeros(int(2.6 * SR))
place(dg, bell(1046.5, 2.4, 0.8), 0)
place(dg, bell(1318.5, 2.4, 0.8) * 0.7, 0.06)
place(dg, bell(1568, 2.4, 0.9) * 0.6, 0.12)
save('ding', dg, size=1.6, wet=0.28)

# deny: soft low two-tone, not alarming
dn = np.zeros(int(0.7 * SR))
for i, f in enumerate([392, 311]):
    tt = t_(0.32)
    place(dn, (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2 * tt)) * env(len(tt), 0.01, 0.3, 3) * 0.6, i * 0.13)
save('deny', lp(dn, 2500), size=0.8, wet=0.2)

# muted: the race loser, a gentle descending blip
tt = t_(0.6)
save('muted', np.sin(2 * np.pi * (660 - 200 * tt / 0.6) * tt) * env(len(tt), 0.01, 0.5, 4) * 0.7, size=1.0, wet=0.25)

# count: a soft digital tick for numbers counting
save('count', click(5200, 0.04, 0.004) * 0.6, size=0.4, wet=0.1)

# --- MOTION -----------------------------------------------------------------------------------
def whoosh(d, f0, f1, a=0.55, q=1.4, bright=0.0):
    n = noise(d)
    x = sweep_bp(n, f0, f1, q)
    if bright:
        x += bright * sweep_bp(n, f0 * 3, f1 * 3, q * 2)
    e = np.sin(np.pi * np.clip(np.arange(len(x)) / len(x), 0, 1)) ** 2
    e = np.where(np.arange(len(x)) < a * len(x), np.sin(np.pi / 2 * np.arange(len(x)) / (a * len(x))) ** 2, np.cos(np.pi / 2 * (np.arange(len(x)) - a * len(x)) / ((1 - a) * len(x))) ** 2)
    return x * e


save('whoosh-soft', whoosh(1.3, 300, 2400, 0.6), size=1.2, wet=0.3)
save('whoosh', whoosh(0.9, 200, 4000, 0.55, bright=0.4), size=1.0, wet=0.25)
save('whoosh-down', whoosh(1.1, 3500, 250, 0.35), size=1.0, wet=0.25)
save('send', whoosh(0.8, 400, 6000, 0.7, q=2, bright=0.5), size=1.2, wet=0.3)

# riser: noise + rising tone into a stop
def riser(d):
    t = t_(d)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / d) ** 2) / SR) * 0.3
    x = sweep_bp(noise(d), 300, 7000, 2) * 0.8 + tone
    return x * (t / d) ** 2.2


save('riser-short', riser(0.9), size=0.8, wet=0.2)
save('riser', riser(2.4), size=1.0, wet=0.25)

# shimmer: the open gap starting to glow, a cluster of high partials fading in and breathing
t = t_(2.6)
sh = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (1 + 0.5 * np.sin(2 * np.pi * (3 + i) * t)) for i, f in enumerate([1760, 2217, 2637, 3322]))
sh *= np.minimum(1, t / 0.9) * np.exp(-np.maximum(0, t - 0.9) / 0.9) * 0.25
save('shimmer', sh, size=2.0, wet=0.4)

# scan: a beam passing over rows
t = t_(1.4)
sc = sweep_bp(noise(1.4), 1500, 5000, 6) * 0.6 + np.sin(2 * np.pi * (900 + 800 * t / 1.4) * t) * 0.15
sc *= np.sin(np.pi * t / 1.4)
save('scan', sc, size=0.8, wet=0.2)

# --- IMPACTS ----------------------------------------------------------------------------------
def boom(d=2.2, f0=90, f1=38, k=0.12):
    t = t_(d)
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / k)) / SR
    return np.sin(ph) * np.exp(-t / (d / 4))


hl = boom(2.4) + 0.35 * lp(noise(2.4), 1200) * np.exp(-t_(2.4) / 0.05)
save('hit-low', hl, size=2.0, wet=0.3)

th = boom(1.0, 120, 50, 0.05) * 0.9 + 0.3 * lp(noise(1.0), 600) * np.exp(-t_(1.0) / 0.02)
save('thud', th, size=0.9, wet=0.2)

# crack: the cancellation, a dry fracture over a low knock
t = t_(1.2)
cr = 0.7 * boom(1.2, 140, 60, 0.04)
cr += hp(noise(1.2), 2500) * np.exp(-t / 0.03) * 0.9
for i in range(9):
    place(cr, click(rng.uniform(2500, 7000), 0.08, 0.004) * rng.uniform(0.3, 0.8), rng.uniform(0, 0.12))
place(cr, bell(2900, 1.0, 0.25) * 0.15, 0.01)
save('crack', cr, size=1.4, wet=0.28)

# clash: overbooked, low impact with a dissonant edge
t = t_(2.0)
cl = boom(2.0, 110, 40, 0.06) * 1.0
cl += np.tanh(3 * (np.sin(2 * np.pi * 233 * t) + np.sin(2 * np.pi * 247 * t))) * np.exp(-t / 0.35) * 0.25
cl += lp(noise(2.0), 3000) * np.exp(-t / 0.08) * 0.5
save('clash', cl, size=1.6, wet=0.3)

# logo: riser into a warm bloom chord
d = 4.5
t = t_(d)
lg = np.zeros(len(t))
for f, a in [(146.8, 1), (220, 0.7), (293.7, 0.6), (370, 0.5), (440, 0.35), (587.3, 0.25)]:
    lg += a * np.sin(2 * np.pi * f * t) * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))
lg *= np.minimum(1, t / 0.04) * np.exp(-t / 1.6) * 0.35
lg += boom(d, 80, 36, 0.1) * 0.8
save('bloom', lp(lg, 5000), size=2.4, wet=0.4)

# coins-away: shimmering descending sparkle
d = 2.2
t = t_(d)
ca = np.zeros(len(t))
for i in range(18):
    f = 3000 * (0.55 ** (i / 18)) * rng.uniform(0.9, 1.1)
    place(ca, bell(f, 0.6, 0.12) * (1 - i / 22) * 0.4, i * 0.08)
save('coins-away', ca, size=1.6, wet=0.35)

# ring: a soft modern phone trill
d = 2.4
rg = np.zeros(int(d * SR))
for k in range(2):
    tt = t_(0.9)
    tr = np.sin(2 * np.pi * 880 * tt) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 16 * tt))) + 0.5 * np.sin(2 * np.pi * 1320 * tt)
    place(rg, lp(tr, 3000) * env(len(tt), 0.01, 0.9, 1.5) * 0.4, k * 1.2)
save('ring', rg, size=0.8, wet=0.2)

# drone-beat: an amber pulse, low and patient
d = 4.5
t = t_(d)
db = (np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 110 * t)) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.42 * t - np.pi / 2))
db *= np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 1.2)
save('drone-beat', lp(db, 800), size=1.6, wet=0.3)

# heartbeat: the race build-up
hb = np.zeros(int(3.0 * SR))
for k in range(4):
    place(hb, boom(0.4, 70, 45, 0.03) * 0.8, k * 0.62)
    place(hb, boom(0.4, 60, 40, 0.03) * 0.5, k * 0.62 + 0.18)
save('heartbeat', hb, size=0.8, wet=0.15)

# bezel: a mechanical watch winding up, ticks speeding up then easing
d = 2.8
bz = np.zeros(int(d * SR))
x = 0.0
k = 0
while x < 2.4:
    place(bz, click(3800 + 300 * (k % 2), 0.05, 0.006) * (0.4 + 0.6 * min(1, x / 1.2)), x)
    x += 0.16 * np.exp(-x * 1.1) + 0.03
    k += 1
bz += 0.25 * lp(noise(d), 250) * np.minimum(1, t_(d) / 1.5) * np.exp(-np.maximum(0, t_(d) - 2.0) / 0.3)
save('bezel', bz, size=1.2, wet=0.25)

# stamp: a firm press
st = boom(0.8, 150, 70, 0.02) * 0.8 + lp(noise(0.8), 1800) * np.exp(-t_(0.8) / 0.015) * 0.7
save('stamp', st, size=0.9, wet=0.18)

print('sfx:', len(os.listdir(OUT)), 'files in', os.path.abspath(OUT))
