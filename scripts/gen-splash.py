#!/usr/bin/env python3
"""生成留白风格启动闪屏(暖白底 + 嫩芽 + 衬线「留白」),覆盖 Capacitor 默认闪屏。
输出到 android/app/src/main/res/drawable*/splash.png。"""
import os
import glob
from PIL import Image, ImageDraw, ImageFont

RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
GREEN = (72, 101, 74)       # 主色 #48654a
LEAF1 = (93, 145, 104)      # 叶深 #5d9168
LEAF2 = (127, 181, 131)     # 叶浅 #7fb583
CREAM = (252, 249, 246)     # 暖白 #fcf9f6

FONT_CANDIDATES = [
    'C:/Windows/Fonts/simsun.ttc',   # 宋体(衬线)
    'C:/Windows/Fonts/simkai.ttf',
    'C:/Windows/Fonts/msyh.ttc',
]


def load_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_sprout(img, cx, cy, scale):
    """在 (cx,cy) 画一株嫩芽(茎 + 两片旋转叶)"""
    d = ImageDraw.Draw(img)
    s = scale
    stem_x = int(cx + 0.02 * s)
    d.line([stem_x, int(cy + 0.30 * s), stem_x, int(cy - 0.12 * s)], fill=LEAF1, width=max(2, int(0.045 * s)), joint='curve')

    def leaf(w, h, rot, pos):
        li = Image.new('RGBA', (int(w * 1.6), int(h * 1.6)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(li)
        ld.ellipse([0, 0, w, h], fill=LEAF2)
        li = li.rotate(rot, expand=True, resample=Image.BICUBIC)
        img.paste(li, pos, li)

    leaf(int(0.36 * s), int(0.20 * s), -38, (int(cx - 0.34 * s), int(cy + 0.06 * s)))
    leaf(int(0.30 * s), int(0.17 * s), 32, (int(cx - 0.03 * s), int(cy - 0.14 * s)))
    d.ellipse([stem_x - int(0.05 * s), int(cy - 0.23 * s), stem_x + int(0.05 * s), int(cy - 0.16 * s)], fill=LEAF2)


def make_splash(w, h):
    img = Image.new('RGB', (w, h), CREAM)
    d = ImageDraw.Draw(img)
    cx, cy = w / 2, h / 2
    # 文字「留白」居中(略偏上,给嫩芽留位)
    font = load_font(int(min(w, h) * 0.135))
    text = '留白'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - min(w, h) * 0.10), text, font=font, fill=GREEN)
    # 嫩芽在文字下方
    draw_sprout(img, cx, cy + min(w, h) * 0.20, min(w, h) * 0.55)
    return img


def main():
    targets = {
        'drawable/splash.png': (480, 320),
        'drawable-port-mdpi/splash.png': (320, 480),
        'drawable-port-hdpi/splash.png': (480, 800),
        'drawable-port-xhdpi/splash.png': (720, 1280),
        'drawable-port-xxhdpi/splash.png': (960, 1600),
        'drawable-port-xxxhdpi/splash.png': (1280, 1920),
        'drawable-land-mdpi/splash.png': (480, 320),
        'drawable-land-hdpi/splash.png': (800, 480),
        'drawable-land-xhdpi/splash.png': (1280, 720),
        'drawable-land-xxhdpi/splash.png': (1600, 960),
        'drawable-land-xxxhdpi/splash.png': (1920, 1280),
    }
    for rel, (w, h) in targets.items():
        path = os.path.join(RES, rel)
        make_splash(w, h).save(path)
        print(f'  {rel} {w}x{h} ✓')


if __name__ == '__main__':
    main()
