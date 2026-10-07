"""BILLD ad soundtrack: an original 120 BPM track in A minor, built from synths.

Every hit lines up with the animation (one beat = 0.5 s, one bar = 2 s).
Run:  python3 audio/generate.py   ->  audio/billd-track.wav

Sections (seconds):
  0-4    hook: a stab on every word, big impact on "MONEY."
  4-10   problem: half-time, dragging bass, riser and snare roll into the drop
  10-42  drop and groove (arp layer 26-34 for the build scene)
  42-47  industries: 16th hats, filter opening, roll
  47     "YOU.": everything stops for one hit
  48-56  call to action groove, final chord at 54 rings out
"""

from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
LENGTH = 56.0
N = int(SR * LENGTH)
rng = np.random.default_rng(7)


def t_arr(dur):
    return np.arange(int(SR * dur)) / SR


def lp(x, hz, order=2):
    return sosfilt(butter(order, min(hz, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def saw(freq, t, detune=0.0):
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1) - 1


class Track:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)
        self.kick_times = []

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N:
            return
        sig = sig[: N - i] * gain
        self.L[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
        self.R[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

    def add_stereo(self, left, right, at, gain=1.0):
        i = int(at * SR)
        n = min(len(left), N - i)
        self.L[i : i + n] += left[:n] * gain
        self.R[i : i + n] += right[:n] * gain


# --- Instruments ---------------------------------------------------------

def kick(dur=0.45, punch=1.0):
    t = t_arr(dur)
    pitch = 46 + 110 * np.exp(-t * 38)
    phase = 2 * np.pi * np.cumsum(pitch) / SR
    body = np.sin(phase) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6 * punch)


def clap(dur=0.3):
    t = t_arr(dur)
    noise = bp(rng.standard_normal(len(t)), 900, 3200)
    env = np.zeros_like(t)
    for k, off in enumerate((0, 0.011, 0.022)):
        env += np.where(t >= off, np.exp(-(t - off) * (180 if k < 2 else 16)), 0)
    return noise * env * 0.55


def hat(open_=False):
    dur = 0.22 if open_ else 0.05
    t = t_arr(dur)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t * (14 if open_ else 90)) * 0.28


def snare(dur=0.25):
    t = t_arr(dur)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    noise = bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t * 20) * 0.6
    return tone + noise


def bass(freq, dur, cutoff=900, drag=0.0):
    t = t_arr(dur)
    f = freq * (1 - drag * t / dur)  # drag bends the pitch down (the "SLOW" feel)
    phase = np.cumsum(f) / SR
    raw = 0.6 * (2 * (phase % 1) - 1) + 0.5 * np.sin(2 * np.pi * phase * 0.5 * 2)
    env = np.minimum(1, t * 200) * np.exp(-t * 2.2)
    return np.tanh(lp(raw, cutoff) * 1.4) * env * 0.55


def stab(freqs, dur=0.35, cutoff=2600):
    t = t_arr(dur)
    left = sum(saw(f, t, -0.006) + saw(f * 2, t, 0.004) * 0.3 for f in freqs)
    right = sum(saw(f, t, 0.006) + saw(f * 2, t, -0.004) * 0.3 for f in freqs)
    env = np.minimum(1, t * 400) * np.exp(-t * 7)
    k = 0.11 / len(freqs)
    return lp(left, cutoff) * env * k, lp(right, cutoff) * env * k


def pad(freqs, dur, cutoff=1400):
    t = t_arr(dur)
    left = sum(saw(f, t, -0.004) for f in freqs)
    right = sum(saw(f, t, 0.005) for f in freqs)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.5)
    k = 0.05 / len(freqs)
    return lp(left, cutoff) * env * k, lp(right, cutoff) * env * k


def pluck(freq, dur=0.22):
    t = t_arr(dur)
    tri = 2 * np.abs(2 * ((t * freq) % 1) - 1) - 1
    return lp(tri, 3500) * np.exp(-t * 16) * 0.16


def impact(dur=2.2, size=1.0):
    t = t_arr(dur)
    boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 2.4)
    crash = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 3.2) * 0.35
    return np.tanh((boom * 1.3 + crash) * size) * 0.9


def riser(dur):
    t = t_arr(dur)
    noise = rng.standard_normal(len(t))
    # brighten over time by mixing a progressively higher high-pass
    out = np.zeros_like(t)
    steps = 12
    for s in range(steps):
        a, b = int(len(t) * s / steps), int(len(t) * (s + 1) / steps)
        out[a:b] = hp(noise, 400 + 9000 * (s / steps) ** 2)[a:b]
    sweep = np.sin(2 * np.pi * np.cumsum(220 + 900 * (t / dur) ** 2) / SR) * 0.25
    return (out * 0.22 + sweep) * (t / dur) ** 2


def whoosh(dur=0.6):
    t = t_arr(dur)
    env = np.sin(np.pi * t / dur) ** 2
    return bp(rng.standard_normal(len(t)), 600, 5000) * env * 0.3


# --- Notes ---------------------------------------------------------------

A1, C2, E2, F1, G1 = 55.0, 65.41, 82.41, 43.65, 49.0
CHORDS = [  # Am, F, C, G (one bar each)
    (A1, (220.0, 261.63, 329.63)),
    (F1, (174.61, 220.0, 261.63)),
    (C2 / 2 * 2, (196.0, 261.63, 329.63)),
    (G1, (196.0, 246.94, 293.66)),
]
ARP = {0: (440, 523.25, 659.25, 880), 1: (349.23, 440, 523.25, 698.46),
       2: (392, 523.25, 659.25, 784), 3: (392, 493.88, 587.33, 783.99)}


tr = Track()


def drums_bar(start, clap_on=True, hats="8", open_hat=True):
    for b in range(4):
        tr.add(kick(), start + b * BEAT, 0.95)
        tr.kick_times.append(start + b * BEAT)
    if clap_on:
        for b in (1, 3):
            tr.add(clap(), start + b * BEAT, 0.8, pan=0.05)
    steps = {"8": 8, "16": 16}.get(hats, 0)
    for s in range(steps):
        at = start + s * BAR / steps
        if open_hat and steps == 8 and s % 2 == 1:
            tr.add(hat(True), at, 0.55, pan=0.3)
        else:
            tr.add(hat(), at, 0.7 if s % 2 else 0.45, pan=-0.25)


def bass_bar(start, chord_i, cutoff=900):
    root = CHORDS[chord_i % 4][0]
    pattern = [1, 1, 2, 1, 1, 2, 1, 1.5]
    for s, mul in enumerate(pattern):
        tr.add(bass(root * mul, BEAT / 2 * 0.95, cutoff), start + s * BEAT / 2, 0.9)


def stabs_bar(start, chord_i, hits=(0, 1.5, 3)):
    notes = CHORDS[chord_i % 4][1]
    for h in hits:
        l, r = stab(notes)
        tr.add_stereo(l, r, start + h * BEAT)


# --- Arrangement ---------------------------------------------------------

# 0-4 hook: a hit on each word, impact on "MONEY."
l, r = pad((110, 164.81, 220), 4.0, 900)
tr.add_stereo(l, r, 0.0, 0.7)
for i, at in enumerate((0.0, 0.5, 1.0, 1.5, 2.0)):
    tr.add(kick(0.35, 0.8), at, 0.8)
    l, r = stab(CHORDS[0][1], 0.25, 1800 + i * 300)
    tr.add_stereo(l, r, at, 1.1)
tr.add(impact(1.5, 1.1), 2.5, 1.0)
tr.add(bass(A1, 1.4, 500), 2.5, 1.0)
tr.add(riser(1.0), 3.0, 0.6)

# 4-10 problem: half-time and dragging
for bar_start in (4.0, 6.0, 8.0):
    tr.add(kick(0.5, 0.9), bar_start, 0.9)
    tr.add(snare(), bar_start + 2 * BEAT, 0.5)
    tr.add(hat(True), bar_start + BEAT, 0.35)
    tr.add(hat(True), bar_start + 3 * BEAT, 0.35)
tr.add(bass(A1, 1.5, 450, drag=0.35), 4.0, 1.0)          # "SLOW."
tr.add(bass(F1, 2.0, 400), 5.5, 0.9)                      # "OUTDATED."
tr.add(bass(G1, 2.0, 380), 7.5, 0.9)                      # "INVISIBLE ON PHONES."
l, r = pad((220, 261.63, 311.13), 6.0, 700)               # a slightly sour chord
tr.add_stereo(l, r, 4.0, 0.8)
tr.add(riser(2.0), 8.0, 0.9)
for k in range(16):                                       # accelerating roll 9-10
    tr.add(snare(0.12), 9.0 + (1 - (1 - k / 16) ** 1.6) * 1.0, 0.18 + k * 0.025)

# 10 drop, groove to 42
tr.add(impact(2.4, 1.3), 10.0, 1.0)
bar_i = 0
for bar_start in np.arange(10.0, 42.0, BAR):
    drums_bar(bar_start, hats="8")
    bass_bar(bar_start, bar_i)
    stabs_bar(bar_start, bar_i)
    if 26.0 <= bar_start < 34.0:                          # arp for the build scene
        notes = ARP[bar_i % 4]
        for s in range(16):
            tr.add(pluck(notes[s % 4]), bar_start + s * BAR / 16, 0.9, pan=0.35 if s % 2 else -0.35)
    bar_i += 1

# section accents
for at in (14.0, 17.0, 20.0, 23.0):
    tr.add(whoosh(0.5), at - 0.35, 1.0)
tr.add(impact(1.6, 0.8), 26.0, 0.6)
tr.add(impact(1.6, 0.8), 34.0, 0.6)

# 42-47 industries: 16th hats, filter opening
for k, bar_start in enumerate((42.0, 44.0)):
    drums_bar(bar_start, hats="16", open_hat=False)
    bass_bar(bar_start, k, cutoff=700 + k * 900)
    stabs_bar(bar_start, k, hits=(0, 0.75, 1.5, 2.25, 3, 3.5))
for b in range(2):                                        # 46-47
    tr.add(kick(), 46.0 + b * BEAT, 0.95)
    tr.kick_times.append(46.0 + b * BEAT)
tr.add(riser(1.0), 46.0, 0.8)
for k in range(8):
    tr.add(snare(0.1), 46.0 + k * 0.125, 0.25 + k * 0.05)

# 47 "YOU.": one hit, then a breath
tr.add(impact(1.2, 1.4), 47.0, 1.0)
tr.add(bass(A1, 0.9, 600), 47.0, 1.0)

# 48-56 call to action
for k, bar_start in enumerate((48.0, 50.0, 52.0)):
    drums_bar(bar_start, hats="8")
    bass_bar(bar_start, k)
    stabs_bar(bar_start, k)
    l, r = pad(CHORDS[k][1], BAR, 1600)
    tr.add_stereo(l, r, bar_start, 0.9)
tr.add(impact(2.5, 1.0), 54.0, 0.9)
l, r = pad((220, 261.63, 329.63, 440), 2.0, 1800)
tr.add_stereo(l, r, 54.0, 1.2)
tr.add(bass(A1, 1.8, 500), 54.0, 1.0)


# --- Mix -----------------------------------------------------------------

# Sidechain pump: duck everything except kicks a little after each kick.
duck = np.ones(N)
dt = t_arr(0.22)
curve = 1 - 0.35 * np.exp(-dt * 18)
for kt in tr.kick_times:
    i = int(kt * SR)
    n = min(len(curve), N - i)
    duck[i : i + n] = np.minimum(duck[i : i + n], curve[:n])
L, R = tr.L * duck, tr.R * duck

# Fade the tail and master
fade = np.ones(N)
tail = int(SR * 0.6)
fade[-tail:] = np.linspace(1, 0, tail)
L, R = np.tanh(L * 1.25) * fade, np.tanh(R * 1.25) * fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.89, R / peak * 0.89

out = Path(__file__).with_name("billd-track.wav")
pcm = (np.stack([L, R], axis=1) * 32767).astype("<i2")
import wave

with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out} ({LENGTH:.0f}s)")
