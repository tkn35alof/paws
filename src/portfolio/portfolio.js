// Portfolio template engine.
//
// The replica's pages are stored as static templates (public/portfolio-assets/
// templates/<page>.html) with `data-pf-key` attributes marking every editable
// element. A member's content (JSON in the portfolio_pages table) is applied to
// the template at render time, and the result is displayed inside an iframe so
// the replica's own CSS/JS runs unchanged and cannot clash with the PAWS app.

export const ASSET_BASE = '/portfolio-assets'

import { ICONS, ICON_SPRITE } from './icons-sprite.js'

/** Icon regions are stored as { icon: 'pi-name' }; the sprite supplies the art. */
export function iconPath(id) {
  const hit = ICONS.find((i) => i.id === id)
  return hit ? hit.path : ''
}

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
      case 'icon':
        // The sprite is injected into every rendered page, so a <use> resolves.
        if (value.icon) el.innerHTML = `<use href="#${value.icon}"/>`
        else if (value.src) {
          // An uploaded logo replaces the inline SVG.
          const img = el.ownerDocument.createElement('img')
          img.src = value.src
          img.alt = value.alt || ''
          img.setAttribute('class', el.getAttribute('class') || '')
          img.setAttribute('data-pf-key', region.key)
          img.setAttribute('data-pf-type', 'image')
          img.style.cssText = 'width:1em;height:1em;object-fit:contain'
          el.parentNode.replaceChild(img, el)
        }
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
.paws-pop__btn--wide{display:block;width:100%;margin-top:10px;padding:7px 10px;color:#ff5a8a;border-color:rgba(255,90,138,.5)}
.paws-pop__grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:6px}
.paws-pop__group{grid-column:1/-1;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#9a9aa5;margin-top:8px}
.paws-pop__icon{background:#16161f;border:1px solid #2a2a35;border-radius:6px;padding:6px;cursor:pointer;display:grid;place-items:center}
.paws-pop__icon img{width:18px;height:18px;object-fit:contain}
.paws-pop__icon:hover{border-color:#ff5a8a}
.paws-pop__icon.is-active{border-color:#ff5a8a;background:rgba(255,90,138,.12)}
</style>
</head>
<body>
${ICON_SPRITE}
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
  var pendingUpload = null;
  var ICONS = ${JSON.stringify(ICONS)};

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

  // --- icons -------------------------------------------------------------

  function currentIconId(el) {
    var u = el.querySelector('use');
    if (!u) return '';
    var m = (u.getAttribute('href') || '').match(/#(.+)/);
    return m ? m[1] : '';
  }

  function iconGrid(box, current, onPick) {
    var t = document.createElement('div');
    t.className = 'paws-pop__title';
    t.textContent = 'Icon';
    box.appendChild(t);
    var grid = document.createElement('div');
    grid.className = 'paws-pop__grid';
    var groups = {};
    ICONS.forEach(function (ic) {
      (groups[ic.group] || (groups[ic.group] = [])).push(ic);
    });
    Object.keys(groups).forEach(function (name) {
      var h = document.createElement('div');
      h.className = 'paws-pop__group';
      h.textContent = name;
      grid.appendChild(h);
      groups[name].forEach(function (ic) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'paws-pop__icon' + (ic.id === current ? ' is-active' : '');
        b.title = ic.label;
        var img = document.createElement('img');
        img.src = '${ASSET_BASE}/' + ic.path;
        img.alt = ic.label;
        b.appendChild(img);
        b.onclick = function (ev) { ev.stopPropagation(); onPick(ic.id); };
        grid.appendChild(b);
      });
    });
    box.appendChild(grid);
  }

  function editIcon(el, key) {
    var sig = signature(el);
    showPop(el, function (box) {
      iconGrid(box, currentIconId(el), function (id) {
        el.innerHTML = '<use href="#' + id + '"/>';
        postChange(key, { icon: id }, el, sig);
        closePop();
      });
      var uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'paws-pop__btn paws-pop__btn--wide';
      uploadBtn.textContent = 'Upload from device';
      uploadBtn.onclick = function (ev) {
        ev.stopPropagation();
        pendingUpload = { el: el, key: key, sig: sig, kind: 'icon' };
        post({ type: 'paws:portfolio-upload', key: key, kind: 'image' });
      };
      box.appendChild(uploadBtn);
    });
  }

  // The parent uploads to Supabase Storage and posts the public URL back.
  function applyUpload(url) {
    var p = pendingUpload;
    if (!p || !url) { pendingUpload = null; return }
    pendingUpload = null
    if (p.kind !== 'icon') {
      p.el.setAttribute('src', url)
      postChange(p.key, { src: url, alt: p.el.getAttribute('alt') || '' }, p.el, p.sig)
      return
    }
    // An uploaded logo replaces the inline SVG (and its twin, if any).
    var keys = [p.key]
    var build = function (k) {
      var img = document.createElement('img')
      img.src = url
      img.alt = ''
      img.setAttribute('data-pf-key', k)
      img.setAttribute('data-pf-type', 'image')
      img.style.cssText = 'width:1em;height:1em;object-fit:contain'
      return img
    }
    var parent = p.el.parentNode
    parent.replaceChild(build(p.key), p.el)
    document.querySelectorAll('[data-pf-key]').forEach(function (n) {
      if (n === p.el || signature(n) !== p.sig) return
      var k = n.getAttribute('data-pf-key')
      keys.push(k)
      n.parentNode.replaceChild(build(k), n)
    })
    post({ type: 'paws:portfolio-change', key: p.key, value: { src: url, alt: '' }, twins: keys.slice(1) })
  }

  // The marquee track is doubled for its seamless loop, so several regions are
  // exact twins of each other. One edit must update every copy, and the change
  // has to be written to every twin key or the copies drift apart on rebuild.
  function signature(el) {
    // SVG icons carry no text/src/href, so their markup is the only way to
    // tell two different icons apart.
    if (el.tagName === 'svg') return 'svg|' + el.innerHTML
    return el.tagName + '|' + (el.getAttribute('class') || '') + '|' +
      (el.getAttribute('src') || el.getAttribute('href') || el.textContent || '').trim();
  }

  function postChange(key, value, el, sig) {
    var msg = { type: 'paws:portfolio-change', key: key, value: value };
    if (el) {
      // sig is the element's signature BEFORE the edit — comparing after the
      // DOM has changed would never match the untouched twins.
      var match = sig || signature(el);
      var twins = [];
      document.querySelectorAll('[data-pf-key]').forEach(function (n) {
        if (n === el) return;
        if (n.getAttribute('data-pf-key') === key) return;
        if (signature(n) === match) twins.push(n.getAttribute('data-pf-key'));
      });
      if (twins.length) {
        msg.twins = twins;
        twins.forEach(function (k) {
          var n = document.querySelector('[data-pf-key="' + k + '"]');
          if (n && n.outerHTML !== el.outerHTML) {
            // keep the twin visually in step for the rest of the session
            if (el.tagName === 'IMG') { n.setAttribute('src', el.getAttribute('src')); n.setAttribute('alt', el.getAttribute('alt')); }
            else if (el.tagName === 'A') { n.setAttribute('href', el.getAttribute('href')); }
            else if (el.tagName === 'svg') { n.innerHTML = el.innerHTML; }
            else { n.textContent = el.textContent; }
          }
        });
      }
    }
    post(msg);
  }

  function editText(el, key, wrapValue) {
    if (el.getAttribute('contenteditable') === 'true') return;
    var sig = signature(el);
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
      postChange(key, wrapValue ? wrapValue(value) : value, el, sig);
    }
    el.addEventListener('blur', done);
  }

  function editImage(el, key) {
    var src = el.getAttribute('src') || '';
    var alt = el.getAttribute('alt') || '';
    var sig = signature(el);
    showPop(el, function (box) {
      var t = document.createElement('div');
      t.className = 'paws-pop__title';
      t.textContent = 'Image';
      box.appendChild(t);
      var srcInput = popField(box, 'URL', src);
      var altInput = popField(box, 'Alt text', alt);
      // Uploads go through the parent: the iframe has no Supabase credentials.
      var uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'paws-pop__btn paws-pop__btn--wide';
      uploadBtn.textContent = 'Upload from device';
      uploadBtn.onclick = function (ev) {
        ev.stopPropagation();
        pendingUpload = { el: el, key: key, sig: sig, kind: 'image' };
        post({ type: 'paws:portfolio-upload', key: key, kind: 'image' });
      };
      box.appendChild(uploadBtn);
      popActions(box, function () {
        var s = srcInput.value.trim();
        var a = altInput.value.trim();
        el.setAttribute('src', s);
        el.setAttribute('alt', a);
        postChange(key, { src: s, alt: a }, el, sig);
      });
      setTimeout(function () { srcInput.focus(); }, 0);
    });
  }

  function editHref(el, key, withLabel) {
    var href = el.getAttribute('href') || '';
    var svg = el.querySelector('svg');
    var sig = signature(el);
    showPop(el, function (box) {
      var t = document.createElement('div');
      t.className = 'paws-pop__title';
      t.textContent = 'Link';
      box.appendChild(t);
      var hrefInput = popField(box, 'URL', href);
      if (svg) {
        iconGrid(box, currentIconId(svg), function (id) {
          svg.innerHTML = '<use href="#' + id + '"/>';
          var value = { icon: id, href: el.getAttribute('href') || '' };
          if (withLabel) value.label = (el.textContent || '').trim();
          postChange(key, value, el, sig);
        });
      }
      popActions(box, function () {
        var h = hrefInput.value.trim();
        el.setAttribute('href', h);
        var value = { href: h };
        if (withLabel) value.label = (el.textContent || '').trim();
        if (svg && currentIconId(svg)) value.icon = currentIconId(svg);
        postChange(key, value, el, sig);
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
    } else if (type === 'icon') {
      editIcon(el, key);
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

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'paws:portfolio-upload-done') return;
    applyUpload(e.data.url);
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
