import zipfile

z = zipfile.ZipFile('android/app/build/outputs/apk/debug/app-debug.apk')
names = z.namelist()
home = [n for n in names if 'Home-' in n and n.endswith('.js')]
me = [n for n in names if 'Me-' in n and n.endswith('.js')]
print('Home chunk:', home)
print('Me chunk:', me)

def esc(s):
    return s.encode('unicode_escape').decode()

for f in home:
    data = z.read(f).decode('utf-8', 'ignore')
    has = ('处暑' in data) or (esc('处暑') in data) or ('\u5904\u6691' in data)
    print(f, '节气[处暑]:', 'OK' if has else 'MISSING')

for f in me:
    data = z.read(f).decode('utf-8', 'ignore')
    for kw in ['数据导出', '退出登录', '再想想', 'liubai-export', '导出全部记录']:
        ok = kw in data or esc(kw) in data
        print(' ', kw, ':', 'OK' if ok else 'MISSING')
