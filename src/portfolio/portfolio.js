// Portfolio template engine.
//
// The replica's pages are stored as static templates (public/portfolio-assets/
// templates/<page>.html) with `data-pf-key` attributes marking every editable
// element. A member's content (JSON in the portfolio_pages table) is applied to
// the template at render time, and the result is displayed inside an iframe so
// the replica's own CSS/JS runs unchanged and cannot clash with the PAWS app.

export const ASSET_BASE = '/portfolio-assets'

export const PAGES = [
  { key: 'home', label: 'Home' },
  { key: 'projects', label: 'Projects' },
  { key: 'services', label: 'Services' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'about', label: 'About' },
  { key: 'contact', label: 'FAQs / Contact' },
]

/** Replace the text nodes of an element, preserving element children (icons). */
function setText(el, text) {
  const doc = el.ownerDocument
  let inserted = false
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!inserted) {
        node.nodeValue = text
        inserted = true
      } else {
        el.removeChild(node)
      }
    }
  }
  if (!inserted) el.appendChild(doc.createTextNode(text))
}

/** Does this link carry its own label (direct text), rather than wrapping
 *  other editable regions? Container links must not be given a label, or the
 *  concatenation of their children's text is injected into the card. */
function linkHasOwnLabel(el) {
  return [...el.childNodes].some(
    (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim(),
  )
}

/** Apply a member's content to a parsed template document. */
export function applyContent(doc, regions, content) {
  if (!regions || !content) return
  for (const region of regions) {
    const el = doc.querySelector(region.selector)
    if (!el) continue
    const value = content[region.key]
    if (value == null) continue
    switch (region.type) {
      case 'text':
        setText(el, String(value))
        break
      case 'image':
        if (value.src != null) el.setAttribute('src', value.src)
        if (value.alt != null) el.setAttribute('alt', value.alt)
        break
      case 'link':
        if (value.label != null && linkHasOwnLabel(el)) setText(el, String(value.label))
        if (value.href != null) el.setAttribute('href', value.href)
        break
      default:
        break
    }
  }
}

/** Point the replica's internal page links at the PAWS portfolio routes. */
export function rewritePageLinks(doc, slug) {
  doc.querySelectorAll('a[href^="paws-member-portfolio-"]').forEach((a) => {
    const m = a.getAttribute('href').match(/^paws-member-portfolio-(\w+)\.html$/)
    if (m) a.setAttribute('href', `/portfolio/${slug}/${m[1]}`)
  })
}

/** Build a parsed document from a template + content. */
export function buildPageDocument({ template, regions, content, slug }) {
  const doc = new DOMParser().parseFromString(template, 'text/html')
  applyContent(doc, regions, content)
  rewritePageLinks(doc, slug)
  return doc
}

/** Wrap the body in a standalone document for the iframe. */
export function pageSrcdoc(doc, { title = 'Portfolio' } = {}) {
  const body = doc.body ? doc.body.innerHTML : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="${ASSET_BASE}/portfolio.css">
<link rel="stylesheet" href="${ASSET_BASE}/paws-brand.css">
<style>
body.paws-editing [data-pf-key]{outline:1px dashed rgba(255,90,138,.45);outline-offset:2px;cursor:text}
body.paws-editing [data-pf-key]:hover{outline:2px solid #ff5a8a;background:rgba(255,90,138,.06)}
body.paws-editing [data-pf-key][contenteditable="true"]{outline:2px solid #ff5a8a;outline-offset:2px}
.paws-pop{position:absolute;z-index:9999;width:260px;padding:12px;background:#0e0e18;border:1px solid rgba(255,90,138,.55);border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.55);font:13px/1.4 system-ui,sans-serif;color:#f5f5f7}
.paws-pop__title{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ff5a8a;margin-bottom:4px}
.paws-pop label{display:block;font-size:11px;color:#9a9aa5;margin:8px 0 3px}
.paws-pop__input{width:100%;box-sizing:border-box;background:#16161f;color:#f5f5f7;border:1px solid #2a2a35;border-radius:6px;padding:6px 8px;font:inherit}
.paws-pop__row{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}
.paws-pop__btn{background:transparent;color:#f5f5f7;border:1px solid #2a2a35;border-radius:6px;padding:5px 10px;cursor:pointer;font:inherit}
.paws-pop__btn:hover{border-color:#ff5a8a;color:#ff5a8a}
</style>
</head>
<body>
${body}
<script src="${ASSET_BASE}/portfolio.js"></script>
<script>
/* The replica's internal nav links must drive the PAWS app, not navigate the
   iframe itself (which would nest a new SPA and shrink the preview). */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="/portfolio/"]') : null;
    if (!a) return;
    if (document.body.classList.contains('paws-editing')) return;
    e.preventDefault();
    try {
      parent.postMessage({ type: 'paws:portfolio-nav', href: a.getAttribute('href') }, '*');
    } catch (err) {}
  }, true);
})();
</script>
<script>
/* Inline editing: the member edits the portfolio exactly where the content
   sits. The parent toggles edit mode; changes are posted back as
   { type: 'paws:portfolio-change', key, value }. */
(function () {
  var body = document.body;
  var pop = null;

  function post(msg) { try { parent.postMessage(msg, '*'); } catch (e) {} }

  function closePop() {
    if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    pop = null;
  }

  function showPop(anchor, build) {
    closePop();
    var box = document.createElement('div');
    box.className = 'paws-pop';
    body.appendChild(box);
    build(box);
    var r = anchor.getBoundingClientRect();
    var w = box.offsetWidth;
    var x = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - w - 8));
    box.style.left = x + 'px';
    box.style.top = (r.bottom + window.pageYOffset + 6) + 'px';
    pop = box;
    return box;
  }

  function popField(box, label, value) {
    var l = document.createElement('label');
    l.textContent = label;
    var i = document.createElement('input');
    i.className = 'paws-pop__input';
    i.value = value || '';
    box.appendChild(l);
    box.appendChild(i);
    return i;
  }

  function popActions(box, onSave) {
    var row = document.createElement('div');
    row.className = 'paws-pop__row';
    var cancel = document.createElement('button');
    cancel.className = 'paws-pop__btn';
    cancel.textContent = 'Cancel';
    cancel.onclick = closePop;
    var save = document.createElement('button');
    save.className = 'paws-pop__btn';
    save.textContent = 'Apply';
    save.onclick = function () { onSave(); closePop(); };
    row.appendChild(cancel);
    row.appendChild(save);
    box.appendChild(row);
  }

  function editText(el, key, wrapValue) {
    if (el.getAttribute('contenteditable') === 'true') return;
    el.setAttribute('contenteditable', 'true');
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    function done() {
      el.removeEventListener('blur', done);
      el.setAttribute('contenteditable', 'false');
      var value = (el.textContent || '').trim();
      post({
        type: 'paws:portfolio-change',
        key: key,
        value: wrapValue ? wrapValue(value) : value,
      });
    }
    el.addEventListener('blur', done);
  }

  function editImage(el, key) {
    var src = el.getAttribute('src') || '';
    var alt = el.getAttribute('alt') || '';
    showPop(el, function (box) {
      var t = document.createElement('div');
      t.className = 'paws-pop__title';
      t.textContent = 'Image';
      box.appendChild(t);
      var srcInput = popField(box, 'URL', src);
      var altInput = popField(box, 'Alt text', alt);
      popActions(box, function () {
        var s = srcInput.value.trim();
        var a = altInput.value.trim();
        el.setAttribute('src', s);
        el.setAttribute('alt', a);
        post({ type: 'paws:portfolio-change', key: key, value: { src: s, alt: a } });
      });
      setTimeout(function () { srcInput.focus(); }, 0);
    });
  }

  function editHref(el, key, withLabel) {
    var href = el.getAttribute('href') || '';
    showPop(el, function (box) {
      var t = document.createElement('div');
      t.className = 'paws-pop__title';
      t.textContent = 'Link';
      box.appendChild(t);
      var hrefInput = popField(box, 'URL', href);
      popActions(box, function () {
        var h = hrefInput.value.trim();
        el.setAttribute('href', h);
        var value = { href: h };
        if (withLabel) value.label = (el.textContent || '').trim();
        post({ type: 'paws:portfolio-change', key: key, value: value });
      });
      // When the label is also being edited inline, stealing focus here would
      // blur the contenteditable and cancel the label edit before it starts.
      if (!withLabel) setTimeout(function () { hrefInput.focus(); }, 0);
    });
  }

  function directText(el) {
    var t = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].nodeValue;
    }
    return t.trim();
  }

  document.addEventListener('click', function (e) {
    if (!body.classList.contains('paws-editing')) return;
    closePop();
    var el = e.target && e.target.closest ? e.target.closest('[data-pf-key]') : null;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var type = el.getAttribute('data-pf-type');
    var key = el.getAttribute('data-pf-key');
    if (type === 'text') {
      editText(el, key);
    } else if (type === 'image') {
      editImage(el, key);
    } else if (type === 'link') {
      var label = directText(el);
      if (label) {
        editText(el, key, function (v) {
          return { label: v, href: el.getAttribute('href') || '' };
        });
      }
      editHref(el, key, !!label);
    }
  }, true);

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'paws:portfolio-edit') return;
    if (e.data.enabled) body.classList.add('paws-editing');
    else { body.classList.remove('paws-editing'); closePop(); }
  });

  document.addEventListener('click', function (e) {
    if (!pop) return;
    if (pop.contains(e.target)) return;
    var anchor = e.target && e.target.closest ? e.target.closest('[data-pf-key]') : null;
    if (anchor) return;
    closePop();
  }, true);
})();
</script>
</body>
</html>`
}

/** Fetch a template from the static assets. */
export async function fetchTemplate(page) {
  const res = await fetch(`${ASSET_BASE}/templates/${page}.html`)
  if (!res.ok) throw new Error(`Template not found: ${page}`)
  return res.text()
}

/** Fetch the region descriptors for a page. */
export async function fetchRegions(page) {
  const res = await fetch(`${ASSET_BASE}/regions/${page}.json`)
  if (!res.ok) return []
  const data = await res.json()
  return data.regions || []
}
