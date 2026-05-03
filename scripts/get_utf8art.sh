python - <<'PY'
import re, html, urllib.request
url='https://web.archive.org/web/20150316232355id_/http://anime.en.utf8art.com/arc/the_melancholy_of_haruhi_suzumiya_30.html'
page=urllib.request.urlopen(url, timeout=20).read().decode('utf-8', 'replace')
m=re.search(r'<textarea class="AA_TextArea"[^>]*>(.*?)</textarea>', page, re.S)
text=html.unescape(m.group(1)).rstrip('\n')
print(f'lines={len(text.splitlines())}, chars={len(text)}')
print(text)
PY
