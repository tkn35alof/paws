#!/usr/bin/env python3
"""Mark the marquee's inline SVG logos as editable icon regions.

The extractor only tags <img> elements; the marquee mixes <img> logos with
inline <svg> logos, so the SVG ones were unreachable in the editor. This adds
`data-pf-key` / `data-pf-type="icon"` to every `svg.tools-marquee__icon` in the
templates. Duplicated marquee items (the track is doubled for the seamless
loop) get their own keys; the editor groups exact twins so one edit updates
both copies.

Run:  python scripts/mark-marquee-icons.py
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES = os.path.join(ROOT, "public", "portfolio-assets", "templates")

SVG_RE = re.compile(r'<svg\b[^>]*class="tools-marquee__icon"[^>]*>', re.I)


def main():
    total = 0
    for path in sorted(glob.glob(os.path.join(TEMPLATES, "*.html"))):
        src = open(path, encoding="utf-8").read()
        body_start = src.find("<body")
        if body_start < 0:
            continue
        head, body = src[:body_start], src[body_start:]
        n = 0

        def repl(m):
            nonlocal n
            tag = m.group(0)
            if "data-pf-key" in tag:
                return tag
            n += 1
            key = "tools-marquee__icon" if n == 1 else f"tools-marquee__icon__{n - 1}"
            return tag[:-1] + f' data-pf-key="{key}" data-pf-type="icon">'

        body = SVG_RE.sub(repl, body)
        if n:
            open(path, "w", encoding="utf-8", newline="").write(head + body)
            print(f"{os.path.basename(path)}: {n} icons tagged")
            total += n
    print(f"total: {total}")


if __name__ == "__main__":
    main()
