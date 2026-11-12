#!/usr/bin/env python3
"""
Extract editable regions from the replica's page templates.

Outputs:
  - templates/<page>.html   (template with data-pf-key attributes added)
  - regions/<page>.json     (region descriptors for the editor)
  - content/<page>.json     (extracted content, keyed by data-pf-key)

Region types:
  text   -> element.innerHTML
  image  -> { src, alt }
  link   -> { label, href }
"""
import json, os, re, sys, html
from html.parser import HTMLParser

R = r"C:/Users/ALOF/portfolio-replica"
DST = r"C:/Users/ALOF/paws/public/portfolio-assets"
SRC = f"{R}/paws-member-portfolio-{{page}}.html"
TDIR = f"{DST}/templates"
REG = f"{DST}/regions"
CON = f"{DST}/content"
for d in (TDIR, REG, CON):
    os.makedirs(d, exist_ok=True)

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param',
        'source','track','wbr','path','circle','rect','line','polyline','polygon',
        'use','stop','ellipse'}

SKIP_CLASSES = {'sr-only', 'tools-marquee__icon', 'bento__icon', 'bento__arrow',
                'bento__fw-ray', 'bento__fw-spark', 'bento__fw-tile'}


class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent', 'text')
    def __init__(self, tag, attrs, parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []
        self.parent = parent
        self.text = []

    @property
    def classes(self):
        return (self.attrs.get('class') or '').split()

    def text_content(self):
        out = ''.join(self.text)
        for c in self.children:
            out += c.text_content()
        return out

    def has_text_child(self):
        for c in self.children:
            if c.text_content().strip():
                return True
        return False

    def in_svg(self):
        n = self
        while n:
            if n.tag == 'svg':
                return True
            n = n.parent
        return False

    def css_path(self):
        parts = []
        n = self
        while n and n.tag not in ('body', 'html', '[document]'):
            c = n.classes[0] if n.classes else n.tag
            parts.append(c)
            n = n.parent
        return list(reversed(parts))


class Dom(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('[document]', [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].text.append(data)


def parse(path):
    d = Dom()
    d.feed(open(path, encoding='utf-8').read())
    return d.root


def in_skip_tree(node):
    n = node
    while n:
        if any(c == 'a11y' or c.startswith('a11y__') or c.startswith('theme-fab') for c in n.classes):
            return True
        n = n.parent
    return False


def is_editable_text(node):
    if node.tag in ('script', 'style', 'svg', 'input', 'textarea', 'select'):
        return False
    if node.in_svg():
        return False
    if any(c in SKIP_CLASSES for c in node.classes):
        return False
    if in_skip_tree(node):
        return False
    if node.attrs.get('data-pf-key'):
        return False
    if not node.text_content().strip():
        return False
    if node.has_text_child():
        return False
    return True


SECTION_NAMES = {
    'sgrid': 'Services', 'tgrid': 'Testimonials', 'agrid': 'About', 'cgrid': 'Contact',
    'bento': 'Bento', 'reel': 'Reel', 'ledger': 'Ledger', 'method': 'Method',
    'offers': 'Offers', 'faq': 'FAQ', 'form': 'Form', 'copy': 'Story',
    'caps': 'Capabilities', 'cells': 'Cells', 'intro': 'Intro', 'clients': 'Clients',
    'pick': 'Picks', 'showcase': 'Showcase', 'tools': 'Tools',
}


def section_of(node):
    n = node.parent
    while n:
        classes = n.classes
        # most specific first: glass modifiers
        for c in classes:
            if c.startswith('home__glass--') or c.startswith('pgrid__glass--'):
                return c.split('--')[-1].replace('-', ' ').title()
        for c in classes:
            if c == 'pgrid__head':
                return 'Header'
            if c in ('home__head', 'home__headline'):
                return 'Hero'
            if c == 'rail' or c.startswith('rail__'):
                return 'Rail'
        for c in classes:
            base = c.split('__')[0]
            if base in SECTION_NAMES:
                return SECTION_NAMES[base]
        for c in classes:
            if c.startswith('home__glass'):
                return c.replace('home__glass', '').replace('--', ' ').strip() or 'Section'
            if c.startswith('pgrid__glass'):
                return c.replace('pgrid__glass', '').replace('--', ' ').strip() or 'Section'
        n = n.parent
    return 'Page'


def label_for(node, idx, section):
    cls = node.classes[0] if node.classes else node.tag
    name = cls.replace('__', ' ').replace('--', ' ').strip()
    name = re.sub(r'^(home|pgrid|cgrid|sgrid|tgrid|agrid|bento|tools|rail|shell) ', '', name)
    title = name[:1].upper() + name[1:] if name else node.tag
    return f"{section} · {title}" + (f" {idx+1}" if idx else "")


def walk(node, out):
    for c in node.children:
        if c.tag not in ('script', 'style'):
            out.append(c)
            walk(c, out)
    return out


def extract(page):
    tpath = f"{TDIR}/{page}.html"
    root = parse(SRC.format(page=page))
    all_nodes = walk(root, [])

    regions = []
    content = {}
    counters = {}

    # 1. images
    for n in all_nodes:
        if n.tag == 'img' and not in_skip_tree(n):
            key = None
            cls = n.classes[0] if n.classes else 'img'
            base = cls
            counters[base] = counters.get(base, 0)
            key = base if counters[base] == 0 else f"{base}__{counters[base]}"
            counters[base] += 1
            n.attrs['data-pf-key'] = key
            n.attrs['data-pf-type'] = 'image'
            regions.append({
                'key': key, 'selector': f'[data-pf-key="{key}"]', 'type': 'image',
                'label': label_for(n, counters[base]-1, section_of(n)),
                'section': section_of(n),
            })
            content[key] = {'src': rewrite_url(n.attrs.get('src', '')), 'alt': n.attrs.get('alt', '')}

    # 2. links
    for n in all_nodes:
        if n.tag == 'a' and n.attrs.get('href') and not in_skip_tree(n):
            cls = n.classes[0] if n.classes else 'link'
            base = cls
            counters[base] = counters.get(base, 0)
            key = base if counters[base] == 0 else f"{base}__{counters[base]}"
            counters[base] += 1
            n.attrs['data-pf-key'] = key
            n.attrs['data-pf-type'] = 'link'
            regions.append({
                'key': key, 'selector': f'[data-pf-key="{key}"]', 'type': 'link',
                'label': label_for(n, counters[base]-1, section_of(n)),
                'section': section_of(n),
            })
            # A link that wraps other editable regions (e.g. a bento card) has
            # no label of its own — its text_content() is just the concatenation
            # of its children. Only leaf links get a label.
            entry = {'href': rewrite_url(n.attrs.get('href', ''))}
            if not n.has_text_child():
                entry['label'] = n.text_content().strip()
            content[key] = entry

    # 3. text
    for n in all_nodes:
        if not is_editable_text(n):
            continue
        cls = n.classes[0] if n.classes else n.tag
        base = cls
        counters[base] = counters.get(base, 0)
        key = base if counters[base] == 0 else f"{base}__{counters[base]}"
        counters[base] += 1
        n.attrs['data-pf-key'] = key
        n.attrs['data-pf-type'] = 'text'
        regions.append({
            'key': key, 'selector': f'[data-pf-key="{key}"]', 'type': 'text',
            'label': label_for(n, counters[base]-1, section_of(n)),
            'section': section_of(n),
        })
        content[key] = n.text_content().strip()

    return root, regions, content


ASSET_ATTRS = ('src', 'poster', 'data-src')


def rewrite_url(v):
    if not v:
        return v
    if v.startswith(('http', '#', 'mailto:', 'tel:', 'data:', 'paws-member-portfolio-', '/')):
        return v
    return '/portfolio-assets/' + v


def serialize(node, out):
    """Serialize the DOM back to HTML."""
    if node.tag == '[document]':
        for c in node.children:
            serialize(c, out)
        return
    attrs = ''
    for k, v in node.attrs.items():
        if v is None:
            attrs += f' {k}'
        else:
            if k in ASSET_ATTRS:
                v = rewrite_url(v)
            attrs += f' {k}="{html.escape(v, quote=True)}"'
    out.append(f'<{node.tag}{attrs}>')
    for t in node.text:
        out.append(html.escape(t))
    for c in node.children:
        serialize(c, out)
    if node.tag not in VOID:
        out.append(f'</{node.tag}>')


if __name__ == '__main__':
    pages = sys.argv[1:] or ['home','projects','services','testimonials','about','contact']
    for p in pages:
        root, regions, content = extract(p)
        out = []
        serialize(root, out)
        open(f"{TDIR}/{p}.html", 'w', encoding='utf-8').write(''.join(out))
        json.dump({'page': p, 'regions': regions}, open(f"{REG}/{p}.json", 'w', encoding='utf-8'),
                  indent=2, ensure_ascii=False)
        json.dump(content, open(f"{CON}/{p}.json", 'w', encoding='utf-8'),
                  indent=2, ensure_ascii=False)
        types = {}
        for r in regions:
            types[r['type']] = types.get(r['type'], 0) + 1
        print(f"{p:14s} regions={len(regions):4d} {types}  content_keys={len(content)}")
