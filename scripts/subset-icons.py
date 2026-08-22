#!/usr/bin/env python3
"""
留白 App 图标字体子集化工具

用法：
  1. npm i material-symbols          （临时安装官方字体包）
  2. python scripts/subset-icons.py  （扫描 src 中实际使用的图标并生成子集字体）
  3. npm uninstall material-symbols
  4. npm run build

新增图标后重新跑一遍即可；脚本会自动扫描 src/**/*.jsx 中所有图标名，
对照官方字体验证字形存在性（无效名字会被忽略并提示），
子集字体输出到 src/assets/fonts/material-symbols-outlined.woff2。
"""
import re
import glob
import os
import string

from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

SRC = 'node_modules/material-symbols/material-symbols-outlined.woff2'
OUT = 'src/assets/fonts/material-symbols-outlined.woff2'

# 变量字体中，_outline/_border 后缀由 FILL 轴控制，映射到基础字形
MAPPING = {'bookmark_border': 'bookmark', 'chat_bubble_outline': 'chat_bubble', 'person_outline': 'person'}


def collect_candidates():
    cands = set()
    for f in glob.glob('src/**/*.jsx', recursive=True):
        text = open(f, encoding='utf-8').read()
        cands |= set(re.findall(r'>\s*([a-z_][a-z0-9_]*)\s*<', text))
        cands |= set(re.findall(r"icon:\s*'([a-z_][a-z0-9_]*)'", text))
        cands |= set(re.findall(r"'\s*([a-z_][a-z0-9_]*)\s*'", text))
    return cands


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f'未找到 {SRC}，请先执行 npm i material-symbols')

    f = TTFont(SRC)
    glyphs = set(f.getGlyphOrder())
    cmap = f.getBestCmap()

    cands = collect_candidates()
    real, skipped = set(), []
    for i in sorted(cands):
        base = MAPPING.get(i, i)
        if base in glyphs:
            real.add(base)
        elif i in glyphs:
            real.add(i)
        else:
            skipped.append(i)

    if skipped:
        print('⚠️ 以下候选名不是有效图标（已忽略）:', ', '.join(skipped))

    # 组件字形（图标名由 a-z 0-9 _ 组成，liga 连字需要它们）
    components = {cmap[ord(c)] for c in string.ascii_lowercase + string.digits + '_' if ord(c) in cmap}
    keep = real | components
    missing = sorted(keep - glyphs)
    if missing:
        raise SystemExit(f'字形缺失: {missing}')

    opt = Options()
    opt.layout_features = ['*']     # 保留 rlig 连字特性
    opt.layout_closure = False      # 关键：防止从组件字母反推出全部图标
    opt.name_IDs = ['*']
    subsetter = Subsetter(options=opt)
    subsetter.populate(glyphs=keep)
    subsetter.subset(f)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    f.save(OUT)
    print(f'✅ 完成: {len(real)} 个图标, {os.path.getsize(SRC)/1024:.0f}KB → {os.path.getsize(OUT)/1024:.0f}KB')
    print('   ', ' '.join(sorted(real)))


if __name__ == '__main__':
    main()
