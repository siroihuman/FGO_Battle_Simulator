import gzip
import json
import pathlib
import urllib.parse
import urllib.request

TARGET = 'https://w.atwiki.jp/siroi_human/pages/815.html'
OUT = pathlib.Path('page815-commoncrawl')
OUT.mkdir(exist_ok=True)
headers = {'User-Agent': 'FGO-Battle-Simulator-Research/1.0'}

with urllib.request.urlopen(urllib.request.Request('https://index.commoncrawl.org/collinfo.json', headers=headers), timeout=30) as response:
    collections = json.load(response)

matches = []
for collection in collections[:12]:
    api = collection['cdx-api'] + '?' + urllib.parse.urlencode({'url': TARGET, 'output': 'json', 'filter': 'status:200'})
    try:
        with urllib.request.urlopen(urllib.request.Request(api, headers=headers), timeout=15) as response:
            lines = response.read().decode('utf-8', 'replace').splitlines()
    except Exception as error:
        matches.append({'collection': collection['id'], 'error': repr(error)})
        continue
    records = [json.loads(line) for line in lines if line.strip().startswith('{')]
    if not records:
        continue
    for record in records:
        record['collection'] = collection['id']
        matches.append(record)
    record = records[-1]
    start = int(record['offset'])
    end = start + int(record['length']) - 1
    data_url = 'https://data.commoncrawl.org/' + record['filename']
    request = urllib.request.Request(data_url, headers={**headers, 'Range': f'bytes={start}-{end}'})
    with urllib.request.urlopen(request, timeout=60) as response:
        compressed = response.read()
    raw = gzip.decompress(compressed)
    (OUT / 'record.bin').write_bytes(raw)
    separator = raw.find(b'\r\n\r\n')
    warc_body = raw[separator + 4:] if separator >= 0 else raw
    separator2 = warc_body.find(b'\r\n\r\n')
    http_body = warc_body[separator2 + 4:] if separator2 >= 0 else warc_body
    (OUT / 'page.html').write_bytes(http_body)
    break

(OUT / 'matches.json').write_text(json.dumps(matches, ensure_ascii=False, indent=2))
