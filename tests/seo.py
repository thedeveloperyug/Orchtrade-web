"""Validate public crawlable pages and machine-readable metadata before deployment."""
import json
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
ROOT = Path(__file__).resolve().parents[1]
HOST = "https://orchtrade.com"
class Inspect(HTMLParser):
    def __init__(self):
        super().__init__(); self.title = ""; self.in_title = False; self.h1 = 0; self.canonical = []; self.description = []; self.links = []; self.schemas = []; self.in_schema = False; self.buffer = ""
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "h1": self.h1 += 1
        if tag == "link" and a.get("rel") == "canonical": self.canonical.append(a.get("href"))
        if tag == "meta" and a.get("name") == "description": self.description.append(a.get("content"))
        if tag == "a": self.links.append(a.get("href",""))
        if tag == "script" and a.get("type") == "application/ld+json": self.in_schema = True; self.buffer = ""
    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_schema: self.buffer += data
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        if tag == "script" and self.in_schema: self.schemas.append(json.loads(self.buffer)); self.in_schema = False
ns = {"s":"http://www.sitemaps.org/schemas/sitemap/0.9"}
urls = [x.text for x in ET.parse(ROOT/"sitemap.xml").findall("s:url/s:loc", ns)]
assert len(urls) == len(set(urls)) == 8, urls
titles, descriptions = set(), set()
for url in urls:
    assert url.startswith(HOST+"/")
    path = ROOT / urlsplit(url).path.strip("/") / "index.html"
    p = Inspect(); p.feed(path.read_text())
    assert p.canonical == [url], (path, p.canonical)
    assert p.h1 == 1 and p.title.strip() and len(p.description) == 1 and p.description[0], path
    assert p.title not in titles and p.description[0] not in descriptions, path
    titles.add(p.title); descriptions.add(p.description[0])
    if "/terms-and-conditions/" not in url and "/disclaimer/" not in url: assert p.schemas, path
    for href in p.links:
        u = urlsplit(href)
        if (not u.netloc and u.path.startswith("/")) or u.netloc == "orchtrade.com":
            target = ROOT / u.path.strip("/")
            if not target.suffix: target = target / "index.html"
            assert target.is_file(), (path, href)
    print("PASS SEO", url)
home = (ROOT/"index.html").read_text()
for url in urls[3:]:
    assert 'href="'+urlsplit(url).path+'"' in home, url
assert "User-agent: OAI-SearchBot" in (ROOT/"robots.txt").read_text()
assert (ROOT/"llms.txt").is_file()

# Keep public contact details consistent and do not expose the website source link.
for url in urls:
    html = (ROOT / urlsplit(url).path.strip("/") / "index.html").read_text()
    assert "orchstringsupport@gmail.com" in html, url
    assert "yogesh.pandey@orchstring.com" not in html, url
    assert "Website GitHub" not in html, url
print("PASS public support address and footer links")

# The exact supplied SVG and original 16/32/48-pixel ICO images must ship together.
import hashlib
assert hashlib.sha256((ROOT/"favicon.ico").read_bytes()).hexdigest() == "9dfe1bebcde3197c3d8a845284c50c428a6a23cee34c42bf00fc6afa2fd90eb5"
assert (ROOT/"assets/orchtrade-ot-teal.svg").is_file()
for url in urls:
    html = (ROOT / urlsplit(url).path.strip("/") / "index.html").read_text()
    assert html.count('src="/assets/orchtrade-ot-teal.svg"') >= 2, url
    assert '/favicon.ico?v=ot-1' in html, url
print("PASS new logo and favicon on every public page")
