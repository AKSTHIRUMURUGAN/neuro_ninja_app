import math
import struct
import wave
import random
import os

OUTPUT_DIR = r"C:\Users\acer\Desktop\neuro_ninja\assets\game\sounds"
os.makedirs(OUTPUT_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def write_wav(filename, samples_l, samples_r=None):
    if samples_r is None:
        samples_r = samples_l
    filepath = os.path.join(OUTPUT_DIR, filename)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        # Normalization
        max_amp = max(max(abs(x) for x in samples_l), max(abs(x) for x in samples_r), 0.001)
        gain = min(2.5, 0.92 / max_amp)
        for i in range(len(samples_l)):
            l_val = max(-1.0, min(1.0, samples_l[i] * gain))
            r_val = max(-1.0, min(1.0, samples_r[i] * gain))
            frames.extend(struct.pack("<hh", int(l_val * 32767.0), int(r_val * 32767.0)))
        wf.writeframes(frames)
    print(f"Generated: {filename} ({len(samples_l)/SAMPLE_RATE:.2f}s)")

# 1. combat_slash.wav - sharp metallic katana slice
dur = 0.35
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    freq = 1400.0 + 4200.0 * math.exp(-t * 18.0)
    shimmer = math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 12.0) * 0.5
    noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 14.0) * 0.4
    sl[i] = shimmer + noise
    sr[i] = shimmer * 0.85 + noise * 1.15
write_wav("combat_slash.wav", sl, sr)

# 2. combat_crit.wav - heavy bass thud with metallic ring
dur = 0.55
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    sub = math.sin(2.0 * math.pi * (55.0 + 120.0 * math.exp(-t * 22.0)) * t) * math.exp(-t * 6.5) * 0.7
    ring = math.sin(2.0 * math.pi * 880.0 * t) * math.exp(-t * 9.0) * 0.35
    noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 18.0) * 0.3
    val = math.tanh(sub * 1.4) + ring + noise
    sl[i] = val
    sr[i] = val
write_wav("combat_crit.wav", sl, sr)

# 3. boss_grunt.wav - deep demon guttural recoil
dur = 0.45
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    f1 = 90.0 + 40.0 * math.sin(2.0 * math.pi * 12.0 * t)
    growl = math.sin(2.0 * math.pi * f1 * t) * math.exp(-t * 5.0) * 0.6
    subgrowl = math.sin(2.0 * math.pi * (f1 * 0.5) * t) * math.exp(-t * 6.0) * 0.4
    noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 7.0) * 0.25
    val = math.tanh((growl + subgrowl + noise) * 1.5)
    sl[i] = val * 0.95
    sr[i] = val * 1.05
write_wav("boss_grunt.wav", sl, sr)

# 4. boss_death.wav - demon defeat scream into ethereal echo
dur = 1.30
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    f = 140.0 * math.exp(-t * 1.5) + 30.0 * math.sin(2.0 * math.pi * 8.0 * t)
    roar = math.sin(2.0 * math.pi * f * t) * math.exp(-t * 2.2) * 0.5
    shatter = (random.random() * 2.0 - 1.0) * math.exp(-t * 4.0) * 0.35
    echo = math.sin(2.0 * math.pi * 440.0 * t) * math.exp(-t * 1.2) * 0.2
    val = roar + shatter + echo
    sl[i] = val
    sr[i] = val
write_wav("boss_death.wav", sl, sr)

# 5. gate_impact.wav - heavy iron and oak door hit
dur = 0.40
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    thud = math.sin(2.0 * math.pi * 65.0 * t) * math.exp(-t * 12.0) * 0.7
    iron = math.sin(2.0 * math.pi * 320.0 * t) * math.exp(-t * 18.0) * 0.4
    wood = (random.random() * 2.0 - 1.0) * math.exp(-t * 20.0) * 0.3
    val = thud + iron + wood
    sl[i] = val
    sr[i] = val
write_wav("gate_impact.wav", sl, sr)

# 6. gate_crumble.wav - stone masonry cracking and debris
dur = 0.85
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    debris = (random.random() * 2.0 - 1.0) * (1.0 + math.sin(2.0 * math.pi * 24.0 * t)) * math.exp(-t * 3.5) * 0.4
    crack = math.sin(2.0 * math.pi * 180.0 * t) * math.exp(-t * 8.0) * 0.3
    val = debris + crack
    sl[i] = val * 1.1
    sr[i] = val * 0.9
write_wav("gate_crumble.wav", sl, sr)

# 7. coin_jingle.wav - multi-tone casino reward chime
dur = 0.45
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    c1 = math.sin(2.0 * math.pi * 1760.0 * t) * math.exp(-t * 8.0) * 0.35
    c2 = math.sin(2.0 * math.pi * 2637.0 * max(0.0, t - 0.08)) * math.exp(-max(0.0, t - 0.08) * 9.0) * 0.35 if t >= 0.08 else 0.0
    c3 = math.sin(2.0 * math.pi * 3520.0 * max(0.0, t - 0.16)) * math.exp(-max(0.0, t - 0.16) * 10.0) * 0.35 if t >= 0.16 else 0.0
    val = c1 + c2 + c3
    sl[i] = val * 0.85
    sr[i] = val * 1.15
write_wav("coin_jingle.wav", sl, sr)

# 8. chest_creak.wav - heavy antique wood lock rattle
dur = 0.50
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    creak = math.sin(2.0 * math.pi * (110.0 + 80.0 * math.sin(2.0 * math.pi * 30.0 * t)) * t) * math.exp(-t * 4.5) * 0.4
    click = (random.random() * 2.0 - 1.0) * math.exp(-t * 18.0) * 0.3
    val = creak + click
    sl[i] = val
    sr[i] = val
write_wav("chest_creak.wav", sl, sr)

# 9. chest_reveal.wav - shimmering celestial crescendo
dur = 0.95
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    env = min(1.0, t / 0.15) * math.exp(-t * 2.5)
    harmonics = (
        math.sin(2.0 * math.pi * 880.0 * t) * 0.25 +
        math.sin(2.0 * math.pi * 1320.0 * t) * 0.25 +
        math.sin(2.0 * math.pi * 1760.0 * t) * 0.25 +
        math.sin(2.0 * math.pi * 2640.0 * t) * 0.25
    )
    sl[i] = harmonics * env * 0.8
    sr[i] = harmonics * env * 1.2
write_wav("chest_reveal.wav", sl, sr)

# 10. hammer_strike.wav - forge anvil strike with bright ping
dur = 0.50
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    ping = math.sin(2.0 * math.pi * 1480.0 * t) * math.exp(-t * 7.0) * 0.5
    ping2 = math.sin(2.0 * math.pi * 2960.0 * t) * math.exp(-t * 12.0) * 0.25
    thud = math.sin(2.0 * math.pi * 180.0 * t) * math.exp(-t * 15.0) * 0.4
    val = ping + ping2 + thud
    sl[i] = val * 0.95
    sr[i] = val * 1.05
write_wav("hammer_strike.wav", sl, sr)

# 11. fanfare_taiko.wav - triumphant Japanese taiko drum roll
dur = 1.10
n_samples = int(dur * SAMPLE_RATE)
sl = [0.0] * n_samples
sr = [0.0] * n_samples
for i in range(n_samples):
    t = i / SAMPLE_RATE
    # Double drum hit at 0.0s and 0.22s
    t1 = t
    t2 = max(0.0, t - 0.22)
    drum1 = math.sin(2.0 * math.pi * 52.0 * t1) * math.exp(-t1 * 6.0) * 0.6
    drum2 = math.sin(2.0 * math.pi * 48.0 * t2) * math.exp(-t2 * 5.0) * 0.7 if t >= 0.22 else 0.0
    brass = math.sin(2.0 * math.pi * 440.0 * t) * math.exp(-t * 2.0) * 0.25
    val = math.tanh((drum1 + drum2 + brass) * 1.4)
    sl[i] = val
    sr[i] = val
write_wav("fanfare_taiko.wav", sl, sr)

print("All 11 game sound effects generated successfully in assets/game/sounds/")
