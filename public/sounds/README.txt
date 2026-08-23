静心之声 · 音源文件目录
======================

本目录已内置 6 个程序合成的环境音(60 秒无缝循环,192kbps mp3):

  white.mp3   白噪音 —— 均匀平稳,遮蔽杂音
  pink.mp3    粉红噪音 —— 柔和低沉,助眠首选
  rain.mp3    雨声 —— 细密雨幕,安心入眠
  ocean.mp3   海浪 —— 缓慢潮汐,放空思绪
  wind.mp3    风声 —— 林间微风,松弛呼吸
  fire.mp3    篝火 —— 噼啪暖意,冬日围炉

想换成真实录音?直接把同名文件覆盖即可(文件名后缀需一致,
mp3 / wav / ogg / m4a 均可),刷新页面或重新构建后生效。

重新生成内置音源:
  pip install numpy imageio-ffmpeg   # 首次
  python scripts/gen-sounds.py       # 全部重生成
  python scripts/gen-sounds.py --only rain,fire   # 只重生成部分
