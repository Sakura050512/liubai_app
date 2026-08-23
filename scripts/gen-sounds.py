#!/usr/bin/env python3
"""
静心之声 · 程序合成音源生成器
================================
生成 6 种环境音(白噪音/粉红噪音/雨声/海浪/风声/篝火),输出到 public/sounds/*.mp3。

设计要点:
- 60 秒 @ 44.1kHz 立体声,可无缝循环(所有 LFO 周期整除 60s,噪声类无端点感,
  脉冲类事件全部在时间轴内完整衰减结束)
- 移植自早期 Web Audio 程序合成引擎的参数(滤波器/包络思路)
- 依赖:numpy + imageio-ffmpeg(自带静态 ffmpeg 二进制)

用法:python scripts/gen-sounds.py [--dry] [--only white,rain]
"""
import os
import sys
import subprocess
import argparse

import numpy as np

SR = 44100
DUR = 60.0
N = int(SR * DUR)
T = np.arange(N) / SR

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'sounds')


# ---------- 基础噪声 ----------

def white(seed=0):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(N).astype(np.float32)


def pink(seed=0):
    """Paul Kellet 粉红噪声(约 -3dB/oct)"""
    rng = np.random.default_rng(seed)
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    out = np.empty(N, np.float32)
    for i in range(N):
        w = rng.standard_normal()
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.96900 * b2 + w * 0.1538520
        b3 = 0.86650 * b3 + w * 0.3104856
        b4 = 0.55000 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.0168980
        out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
        b6 = w * 0.115926
    out /= np.max(np.abs(out)) + 1e-9
    return out.astype(np.float32)


def brown(seed=0):
    """布朗噪声(积分白噪,低频能量强)"""
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(N)
    b = np.cumsum(x)
    # 去趋势 + 归一化
    b = b - np.mean(b)
    b /= np.max(np.abs(b)) + 1e-9
    return b.astype(np.float32)


# ---------- 滤波器(无 scipy 依赖的一阶/双极点 IIR) ----------

def lowpass1(x, fc):
    """一阶低通,fc 为 -3dB 频率(Hz)"""
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = a * acc + (1 - a) * x[i]
        y[i] = acc
    return y


def lowpass2(x, fc):
    """双极点低通(串联两个一阶,更陡)"""
    return lowpass1(lowpass1(x, fc), fc)


def bandpass1(x, fc, q=1.0):
    """一阶带通(低通+高通串联),fc 中心频率"""
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    prev_in = 0.0
    prev_out = 0.0
    r = 1 - q * 0.25  # 谐振阻尼
    for i in range(len(x)):
        y[i] = r * prev_out + (x[i] - prev_in)
        prev_in = x[i]
        prev_out = y[i]
    # 再低通整形
    return lowpass1(y, fc * 2.5)


def lfo(freq, phase=0.0):
    """0..1 正弦 LFO(周期整除 DUR 时无缝)"""
    return 0.5 + 0.5 * np.sin(2 * np.pi * freq * T + phase)


def gain_env(x, lo, hi):
    """幅度包络:归一化后缩放到 [lo, hi]"""
    m = np.max(np.abs(x)) + 1e-9
    return (x / m) * (hi - lo) + lo


# ---------- 各音色 ----------

def gen_white():
    left = white(11)
    right = white(22)
    # 极轻微平滑去"沙"感
    left = lowpass1(left, 8000)
    right = lowpass1(right, 8000)
    return np.stack([left, right], axis=1)


def gen_pink():
    left = pink(33)
    right = pink(44)
    return np.stack([left, right], axis=1)


def gen_rain():
    rng = np.random.default_rng(55)
    # 雨幕:粉噪 → 高通去低频 → 轻低通
    base = pink(66)
    hp = base - lowpass1(base, 1200)  # 简易高通
    curtain = lowpass1(hp, 6500)
    curtain = gain_env(curtain, 0.5, 0.95) * lfo(0.25, 0.2)  # 4s 周期缓慢起伏
    # 随机水滴:短促衰减正弦,中心频率 1.8k-4.3k
    drops = np.zeros(N, np.float32)
    n_drops = int(DUR * 7)
    for _ in range(n_drops):
        t0 = rng.uniform(0.15, DUR - 0.35)
        i0 = int(t0 * SR)
        dur = rng.uniform(0.05, 0.12)
        ln = int(dur * SR)
        if i0 + ln >= N:
            continue
        f = rng.uniform(1800, 4300)
        amp = rng.uniform(0.10, 0.30)
        tt = np.arange(ln) / SR
        env = np.exp(-tt / (dur * 0.28))
        drops[i0:i0 + ln] += (amp * env * np.sin(2 * np.pi * f * tt)).astype(np.float32)
    left = curtain + drops * 0.55
    right = curtain + np.roll(drops, int(0.003 * SR)) * 0.55  # 3ms 声道差增宽度
    return np.stack([left, right], axis=1)


def gen_ocean():
    # 深潮:布朗 → 低通 380Hz,潮汐包络 12s 周期(60/12=5 整周期)
    deep = brown(77)
    deep = lowpass2(deep, 380)
    tide = lfo(1 / 12.0, 0.4)
    tide = 0.18 + 0.82 * tide  # 深潮起伏幅度大
    deep = deep * tide
    # 浪花:白噪 → 低通 1600,随潮汐同步起伏
    foam_l = white(88)
    foam_r = white(99)
    foam_l = lowpass2(foam_l, 1600)
    foam_r = lowpass2(foam_r, 1600)
    foam = 0.30 * (foam_l + foam_r) * 0.5 * tide
    left = deep + foam_l * 0.30 * tide
    right = np.roll(deep, int(0.012 * SR)) + foam_r * 0.30 * tide
    return np.stack([left, right], axis=1)


def gen_wind():
    # 阵风:粉噪 → 低通 320,双 LFO 交错(10s + 5s,均整除 60)
    base = pink(101)
    base = lowpass2(base, 320)
    gust = 0.45 + 0.55 * (0.55 * lfo(0.1, 0.0) + 0.45 * lfo(0.2, 0.5))
    gust = gust / np.max(gust) * 1.0
    wind = base * gust
    # 轻微"咝"声层(高频风)
    hiss_l = lowpass2(white(102), 2400) * 0.18 * gust
    hiss_r = lowpass2(white(103), 2400) * 0.18 * gust
    left = wind + hiss_l
    right = wind + hiss_r
    return np.stack([left, right], axis=1)


def gen_fire():
    rng = np.random.default_rng(104)
    # 暖底:粉噪 → 带通 520
    base = pink(105)
    warm = bandpass1(base, 520)
    warm = gain_env(warm, 0.35, 0.85) * (0.7 + 0.3 * lfo(0.5, 0.1))  # 2s 周期微闪
    # 噼啪:短促宽带脉冲,指数衰减,全部在时间轴内结束
    crackles = np.zeros(N, np.float32)
    n_c = int(DUR * 1.6)
    for _ in range(n_c):
        t0 = rng.uniform(0.2, DUR - 0.3)
        i0 = int(t0 * SR)
        dur = rng.uniform(0.03, 0.09)
        ln = int(dur * SR)
        if i0 + ln >= N:
            continue
        amp = rng.uniform(0.25, 0.9)
        tt = np.arange(ln) / SR
        env = np.exp(-tt / (dur * 0.22))
        burst = rng.standard_normal(ln).astype(np.float32) * env * amp
        # 高频偏置(噼啪声多为高频瞬态)
        burst = lowpass1(burst, 6000)
        crackles[i0:i0 + ln] += burst
    left = warm + crackles
    right = warm + np.roll(crackles, int(0.002 * SR)) * 0.9
    return np.stack([left, right], axis=1)


GENERATORS = {
    'white': gen_white,
    'pink': gen_pink,
    'rain': gen_rain,
    'ocean': gen_ocean,
    'wind': gen_wind,
    'fire': gen_fire,
}

# 每音色预增益(均衡响度;wind 阵风间隙多,听感偏轻,补 6dB)
GAIN = {'white': 1.0, 'pink': 1.0, 'rain': 1.0, 'ocean': 1.0, 'wind': 2.0, 'fire': 1.0}


def soft_clip(x, ceiling=0.92):
    """软限幅防爆音"""
    return np.tanh(x * 1.4) / np.tanh(1.4) * ceiling


def render(name, dry=False):
    print(f'  {name} ...', end=' ', flush=True)
    x = GENERATORS[name]() * GAIN.get(name, 1.0)
    x = soft_clip(x)
    x16 = (x * 32767).astype(np.int16)
    wav_path = os.path.join(OUT_DIR, f'{name}.wav')
    mp3_path = os.path.join(OUT_DIR, f'{name}.mp3')
    os.makedirs(OUT_DIR, exist_ok=True)

    # 写 WAV(用标准库)
    import wave
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(x16.tobytes())

    if dry:
        print(f'{os.path.getsize(wav_path)/1e6:.1f}MB wav (dry, 未转 mp3)')
        return

    ff = subprocess.run(
        [FFMPEG, '-y', '-i', wav_path,
         '-codec:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', mp3_path],
        capture_output=True,
    )
    if ff.returncode != 0:
        print('FAILED:', ff.stderr.decode()[-400:])
        sys.exit(1)
    os.remove(wav_path)
    print(f'{os.path.getsize(mp3_path)/1e6:.2f}MB mp3')


def main():
    global FFMPEG
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='逗号分隔的音色子集,如 white,rain')
    ap.add_argument('--dry', action='store_true', help='只生成 wav 不转 mp3')
    args = ap.parse_args()

    names = list(GENERATORS) if not args.only else [n.strip() for n in args.only.split(',')]
    print(f'生成 {len(names)} 个音源 → {os.path.abspath(OUT_DIR)}')
    for n in names:
        if n not in GENERATORS:
            print(f'  跳过未知音色: {n}')
            continue
        render(n, dry=args.dry)
    print('完成 ✅')


if __name__ == '__main__':
    main()
