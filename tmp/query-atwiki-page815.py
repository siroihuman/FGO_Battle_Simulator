from atwiki import AtWikiAPI, AtWikiURI
import json
import traceback

api = AtWikiAPI(AtWikiURI('https://w.atwiki.jp/siroi_human/'))
result = {}
try:
    pages = list(api.get_list())
    result['page_count'] = len(pages)
    result['page_815'] = [page for page in pages if str(page.get('id')) == '815' or '815' in str(page)]
except Exception:
    result['list_error'] = traceback.format_exc()
try:
    result['source'] = api.get_source(815)
except Exception:
    result['source_error'] = traceback.format_exc()
open('page-815-api-result.json', 'w').write(json.dumps(result, ensure_ascii=False, indent=2, default=str))
