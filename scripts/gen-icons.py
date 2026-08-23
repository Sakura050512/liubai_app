#!/usr/bin/env python3
"""生成 PWA 图标:主色绿圆角底 + 暖白圆(留白意象)+ 一株小嫩芽。
输出 public/icons/icon-192.png 与 icon-512.png。"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
GREEN = '#48654a'      # 主色
LEAF1 = '#5d9168'      # 叶深
LEAF2 = '#7fb583'      # 叶浅
CREAM = '#fcf9f6'      # 暖白


def make_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=GREEN)

    cx = cy = size // 2
    # 暖白大圆(留白 / 月)
    d.ellipse([cx - size * 0.32, cy - size * 0.32, cx + size * 0.32, cy + size * 0.32], fill=CREAM)

    # 嫩芽:茎 + 两片旋转叶
    stem_x = int(cx + size * 0.02)
    d.line([stem_x, int(cy + size * 0.20), stem_x, int(cy - size * 0.10)], fill=LEAF1, width=max(3, int(size * 0.032)), joint='curve')

    def leaf(w, h, rot, pos):
        leaf_img = Image.new('RGBA', (int(w * 1.6), int(h * 1.6)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(leaf_img)
        ld.ellipse([0, 0, w, h], fill=LEAF2)
        leaf_img = leaf_img.rotate(rot, expand=True, resample=Image.BICUBIC)
        img.paste(leaf_img, pos, leaf_img)

    leaf(int(size * 0.26), int(size * 0.14), -38, (int(cx - size * 0.24), int(cy + size * 0.04)))
    leaf(int(size * 0.22), int(size * 0.12), 32, (int(cx - size * 0.02), int(cy - size * 0.10)))

    # 顶芽
    d.ellipse([stem_x - int(size * 0.035), int(cy - size * 0.16), stem_x + int(size * 0.035), int(cy - size * 0.10)], fill=LEAF2)

    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for size in (192, 512):
        make_icon(size).save(os.path.join(OUT, f'icon-{size}.png'))
        print(f'  icon-{size}.png ✓')


if __name__ == '__main__':
    main()
