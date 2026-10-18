"""Synthesises the film's music bed into public/music/bed.wav, timed to the scenes.

A warm pad in D that follows the story (dark brief, tense pain, lift at the reveal, a steady
pulse through the walkthrough, a bloom at the end), with a quiet chronograph tick, ducked
under the narration. Run after tools/vo.mjs: python tools/music.py
"""
import json
import os
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..')
defs = json.load(open(os.path.join(ROOT, 'src/data/scenes.json')))
vo = json.load(open(os.path.join(ROOT, 'src/data/vo.json')))

# scene timing, same arithmetic as src/timeline.ts
scenes, t = [], 0.0
for d in defs['scenes']:
    cue, at, gaps = {}, d['pre'], d.get('gaps') or []
    for i, lid in enumerate(d['lines']):
        cue[lid] = at
        at += vo[lid]['duration'] + (gaps[i] if i < len(gaps) else 0)
    dur = at + d['post']
    scenes.append({'id': d['id'], 'from': t, 'dur': dur, 'cue': cue})
    t += dur - defs['overlap']
TOTAL = t + defs['overlap']
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(3)


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def lp(x, f):
    return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)


def pad(notes, d, cutoff, bright=1.0):
    """Detuned saw stack through a low-pass: warm, slow attack, slow release."""
    n = int(d * SR)
    tt = np.arange(n) / SR
    y = np.zeros(n)
    for m in notes:
        for det in (-0.07, 0.0, 0.06):
            f = hz(m + det)
            ph = (f * tt + rng.uniform()) % 1.0
            y += (2 * ph - 1) * (0.6 if det else 0.8)
    y = lp(lp(y, cutoff), cutoff * 1.4)
    y += bright * 0.15 * sum(np.sin(2 * np.pi * hz(m + 12) * tt) for m in notes[-2:])
    a, r = min(2.5, d * 0.35), min(3.0, d * 0.4)
    env = np.minimum(1, tt / a) * np.minimum(1, (d - tt) / r)
    return y * env / (len(notes) * 2.2)


# chords (MIDI); D major family, voiced low and open
Dmaj9 = [38, 50, 54, 57, 61, 64]
Bm9 = [35, 47, 50, 54, 57, 61]
Gmaj7 = [31, 43, 50, 54, 59]
A6 = [33, 45, 49, 54, 57, 64]
Bm_t = [35, 47, 50, 53, 54]  # with a flat edge for the pain
Em9 = [28, 40, 47, 50, 54, 55]

SECTION = {
    'brief': ([Dmaj9], 700, 0.2),
    'pain': ([Bm_t, Em9], 520, 0.0),
    'solution': ([Gmaj7, A6], 1500, 0.8),
    'desk': ([Dmaj9, Bm9, Gmaj7, A6], 1300, 0.5),
    'client': ([Dmaj9, A6], 1500, 0.6),
    'race': ([Bm9, A6], 1100, 0.3),
    'staff': ([Gmaj7, Bm9], 1100, 0.4),
    'owner': ([Dmaj9, Gmaj7], 1400, 0.6),
    'features': ([Bm9, Gmaj7, A6], 1600, 0.7),
    'usp': ([Gmaj7, A6, Bm9], 1700, 0.8),
    'proof': ([Dmaj9, A6], 1900, 0.9),
    'business': ([Gmaj7, Dmaj9], 1300, 0.5),
    'end': ([Dmaj9], 2200, 1.0),
}

L = np.zeros(N)
R = np.zeros(N)
for sc in scenes:
    chords, cutoff, bright = SECTION[sc['id']]
    seg = sc['dur'] / len(chords)
    for i, ch in enumerate(chords):
        start = sc['from'] + i * seg - 1.2
        d = seg + 2.4 + (5 if sc['id'] == 'end' else 0)
        y = pad(ch, d, cutoff, bright)
        s = max(0, int(start * SR))
        y = y[s - int(start * SR):] if start < 0 else y
        e = min(N, s + len(y))
        pan = 0.08 * (1 if i % 2 else -1)
        L[s:e] += y[: e - s] * (1 - pan)
        R[s:e] += y[: e - s] * (1 + pan)

# sub pulse + chronograph tick through the walkthrough (90 bpm), absent in brief, pain and end
beat = 60 / 90
walk = [s for s in scenes if s['id'] in ('desk', 'client', 'race', 'staff', 'owner', 'features', 'usp', 'proof', 'business')]
w0, w1 = walk[0]['from'], walk[-1]['from'] + walk[-1]['dur']
tick_n = int(0.04 * SR)
tick = np.sin(2 * np.pi * 5200 * np.arange(tick_n) / SR) * np.exp(-np.arange(tick_n) / SR / 0.006)
k = 0
x = w0
while x < w1 - 1:
    fade = min(1, (x - w0) / 6, (w1 - x) / 4)
    i = int(x * SR)
    amp = (0.05 if k % 2 == 0 else 0.03) * fade
    L[i:i + tick_n] += tick * amp * 0.9
    R[i:i + tick_n] += tick * amp * 1.1
    if k % 4 == 0:
        n = int(0.5 * SR)
        tt = np.arange(n) / SR
        kick = np.sin(2 * np.pi * (42 + 30 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.18) * 0.22 * fade
        L[i:i + n] += kick[: len(L[i:i + n])]
        R[i:i + n] += kick[: len(R[i:i + n])]
    x += beat
    k += 1

# a slow shimmer of air so silence is never digital
air = lp(rng.standard_normal(N), 3000) * 0.004
L += air
R += np.roll(air, 900)

# duck under the narration: -7 dB while speaking, 0.25 s attack, 0.6 s release
duck = np.ones(N)
for sc in scenes:
    for lid, c in sc['cue'].items():
        a = int((sc['from'] + c - 0.15) * SR)
        b = int((sc['from'] + c + vo[lid]['duration'] + 0.1) * SR)
        duck[max(0, a):min(N, b)] = 10 ** (-7 / 20)
k_att = int(0.25 * SR)
cs = np.concatenate([[0], np.cumsum(duck)])  # moving average via cumulative sum (O(n))
idx = np.arange(N)
lo_i = np.clip(idx - k_att // 2, 0, N)
hi_i = np.clip(idx + k_att // 2, 0, N)
smooth = (cs[hi_i] - cs[lo_i]) / np.maximum(1, hi_i - lo_i)
L *= smooth
R *= smooth

# fade out at the very end
fo = int(2.5 * SR)
end_i = int(TOTAL * SR)
L[end_i - fo:end_i] *= np.linspace(1, 0, fo)
R[end_i - fo:end_i] *= np.linspace(1, 0, fo)
L[end_i:] = 0
R[end_i:] = 0

y = np.stack([L, R])[:, :end_i]
y *= 10 ** (-9 / 20) / (np.abs(y).max() + 1e-9)  # peak -9 dBFS: a bed, not a song
os.makedirs(os.path.join(ROOT, 'public/music'), exist_ok=True)
from scipy.io import wavfile
wavfile.write(os.path.join(ROOT, 'public/music/bed.wav'), SR, (y.T * 32767).astype(np.int16))
print(f'bed.wav {TOTAL:.1f}s, scenes {len(scenes)}')
