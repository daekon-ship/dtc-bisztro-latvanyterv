#!/usr/bin/env python3
"""
DTC Bisztró – látványterv képpipeline
======================================    Forrásképek (raw) : _qa/  (DTC saját feltöltésű ételfotói a foodora éttermi
                     oldaláról + az étterem borítóképei, lásd README)
Kimenet           : assets/img/

Használat:
    python3 tools/build_images.py          # logó + slot-képek + hero tányér + og
    python3 tools/build_images.py photos   # teljes, reszponzív fotókészlet (opcionális)
    python3 tools/build_images.py crops    # csak a slot-képek
    python3 tools/build_images.py og       # csak a 1200x630 megosztókép

A script szándékosan egyszerű és újrafuttatható: amikor az ügyfél saját,
profir fotókat ad át, elég a _qa/ mappába tenni őket (ugyanazzal a névvel),
es újrafuttatni – a HTML-ben csak a képneveket kell cserélni.
"""
from __future__ import annotations

import os
import sys
from collections import deque

from PIL import Image, ImageChops, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_qa")
OUT = os.path.join(ROOT, "assets", "img")

AVIF_Q = 52
WEBP_Q = 74

# ---------------------------------------------------------------- source map
# (kimenetnév, forrásfájl, lista a generálni kívánt szélességekből, crop (w,h) vagy None)
PHOTOS = [
    ("pizza-gyros",     "26663966.jpg",     [720, 1440], None),
    ("pizza-margherita","26663957.jpg",     [720, 1440], None),
    ("pizza-hawaii",    "26663959.jpg",     [720, 1440], None),
    ("pizza-husimado",  "26663961.jpg",     [720, 1440], None),
    ("pizza-4sajtos",   "26663958.jpg",     [720, 1440], None),
    ("pizza-magyaros",  "26663964.jpg",     [720, 1440], None),
    ("pizza-sztapacska","26663965.jpg",     [720, 1440], None),
    ("hekk",            "26663976.jpg",     [720, 1440], None),
    ("salata",          "26663977.jpg",     [720, 1440], None),
    ("lango-board",     "hero.jpg",         [720, 1440, 1800], None),
    ("lango-sajtos",    "listing.jpg",      [720, 1440], None),
]

# slotonkénti, előre vágott változatok (object-fit helyett stabil arányok)
# (kimenet, forrás, méret, zoom, fókusz(x,y) 0..1)  – a zoom makró/részletvágásokhoz
CROPS = [
    ("cat-menu",    "lango-board",    (960, 1200), 1.0, (.5, .5)),   # napi menü
    ("cat-pizza",   "pizza-husimado", (960, 1200), 1.0, (.5, .5)),   # pizzák
    ("cat-sult",    "hekk",           (960, 1200), 1.9, (.7, .7)),   # frissensültek (burgonya-részlet)
    ("cat-salata",  "salata",         (960, 960),  1.0, (.5, .5)),   # saláták
    ("promo-wide",  "lango-sajtos",   (1600, 900), 1.0, (.5, .5)),   # promó
    ("menu-hero",   "hekk",           (1000, 1250), 1.0, (.5, .5)),  # napi menü szekció
    ("menu-hero-2", "pizza-margherita", (760, 760), 1.0, (.5, .5)),  # átfedő kis kép
    # "miért DTC" sticky képei – mind más fogás, enyhe vágással
    ("why-1",       "lango-sajtos",   (1000, 1250), 1.0, (.5, .5)),
    ("why-2",       "pizza-husimado", (1000, 1250), 1.6, (.5, .5)),
    ("why-3",       "hekk",           (1000, 1250), 1.7, (.36, .45)),
    ("why-4",       "salata",         (1000, 1250), 1.1, (.5, .5)),
]

GALLERY = [
    ("gal-1", "pizza-margherita", (960, 1280)),
    ("gal-2", "lango-board",      (1600, 1000)),
    ("gal-3", "pizza-sztapacska", (1080, 1080)),
    ("gal-4", "pizza-hawaii",     (960, 1280)),
    ("gal-6", "pizza-magyaros",   (960, 1200)),
    ("gal-7", "pizza-4sajtos",    (1080, 1080)),
    ("gal-8", "pizza-gyros",      (1600, 1066)),
]

# a heróhoz kivágott, átlátszó háttérű "tányér"
PLATE_SOURCES = [
    ("hero-plate", "26663966.jpg"),
]


# ------------------------------------------------------------------ helpers
def _cover_resize(img: Image.Image, size, zoom=1.0, focus=(0.5, 0.5)) -> Image.Image:
    tw, th = size
    w, h = img.size
    if zoom and zoom > 1.0:
        cw, ch = w / zoom, h / zoom
        fx, fy = focus
        left = min(max(fx * w - cw / 2, 0), w - cw)
        top = min(max(fy * h - ch / 2, 0), h - ch)
        img = img.crop((int(left), int(top), int(left + cw), int(top + ch)))
        w, h = img.size
    scale = max(tw / w, th / h)
    nw, nh = max(tw, int(round(w * scale))), max(th, int(round(h * scale)))
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return img.crop((left, top, left + tw, top + th))


def save_variants(img: Image.Image, name: str, suffix: str = "", q=(AVIF_Q, WEBP_Q)) -> None:
    stem = os.path.join(OUT, f"{name}{suffix}")
    rgba = img.convert("RGBA")
    rgb = rgba.convert("RGB")
    alpha = rgba.getchannel("A")
    has_alpha = alpha.getextrema()[0] < 250

    if has_alpha:
        rgba.save(stem + ".avif", quality=q[0])
        rgba.save(stem + ".webp", quality=q[1], method=5)
    else:
        rgb.save(stem + ".avif", quality=q[0])
        rgb.save(stem + ".webp", quality=q[1], method=5)
    print(f"  -> {os.path.basename(stem)}.avif/.webp  {img.size[0]}x{img.size[1]}")


def load(name: str) -> Image.Image:
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        raise SystemExit(f"hiányzó forrás: {path}")
    img = Image.open(path)
    img = ImageOps_exif(img)
    return img


def ImageOps_exif(img: Image.Image) -> Image.Image:
    from PIL import ImageOps

    return ImageOps.exif_transpose(img)


# ------------------------------------------------- background removal (plate)
def cutout(img: Image.Image, light=188, spread=30) -> Image.Image:
    """
    A pizzafotók világos szürke háttérre készültek. A háttér eltávolítása:
    1) minden csúcsból induló rétegfeltöltés a világos, deszaturált pixeleken,
    2) a belső, világos foltok (sajt) így érintetlenek maradnak,
    3) az alfa enyhén elmosódik, hogy ne legyen kemény koszorú a sötét háttéren.
    """
    rgb = img.convert("RGB")
    w, h = rgb.size
    r, g, b = rgb.split()
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    delta = ImageChops.subtract(mx, mn)

    cand = mn.point(lambda v: 255 if v >= light else 0)
    cand = ImageChops.multiply(cand, delta.point(lambda v: 255 if v <= spread else 0))
    buf = bytearray(cand.tobytes())

    seen = bytearray(w * h)
    q = deque()

    def push(idx):
        if not seen[idx] and buf[idx]:
            seen[idx] = 1
            q.append(idx)

    for x in range(w):
        push(x)
        push((h - 1) * w + x)
    for y in range(h):
        push(y * w)
        push(y * w + w - 1)

    while q:
        i = q.popleft()
        x = i % w
        y = i // w
        if x > 0:
            push(i - 1)
        if x < w - 1:
            push(i + 1)
        if y > 0:
            push(i - w)
        if y < h - 1:
            push(i + w)

    alpha = Image.frombytes("L", (w, h), bytes(255 - v * 255 for v in seen))
    alpha = alpha.filter(ImageFilter.MinFilter(3))   # kicsit visszavág a koszorúból
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.1))

    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox:
        out = out.crop(bbox)
    return out


# ------------------------------------------------ megosztókép (og:image)
def _static_fraunces(wght: int = 620, opsz: int = 64) -> bytes:
    """A self-hosted variábilis Fraunces-ból statikus példány (OG-címhez)."""
    import io
    from fontTools import ttLib
    from fontTools.varLib import instancer

    path = os.path.join(ROOT, "assets", "fonts", "fraunces-normal-latin.woff2")
    font = ttLib.TTFont(path)
    axes = {a.axisTag: a for a in font["fvar"].axes} if "fvar" in font else {}
    limits = {tag: v for tag, v in (("wght", wght), ("opsz", opsz), ("SOFT", 0), ("WONK", 0)) if tag in axes}
    if limits:
        instancer.instantiateVariableFont(font, limits, inplace=True)
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()


def build_og() -> None:
    """1200x630 megosztókép: valódi DTC lángostál-fotó + arculati szövegek."""
    import io
    from PIL import ImageDraw, ImageFont

    W, H = 1200, 630
    ink = (14, 13, 11)
    paper = (244, 239, 230)
    accent = (240, 81, 43)
    mx = 72

    img = _cover_resize(load("hero.jpg"), (W, H))
    img = ImageEnhance.Color(img).enhance(0.94)
    img = ImageEnhance.Brightness(img).enhance(0.9)
    img = img.convert("RGB")

    # balról erős, jobbra enyhébb sötétítő – a szövegek olvashatóságához
    grad = Image.new("L", (W, 1))
    for x in range(W):
        grad.putpixel((x, 0), int(236 - 78 * (x / W)))
    img = Image.composite(Image.new("RGB", (W, H), ink), img, grad.resize((W, H)))

    d = ImageDraw.Draw(img, "RGBA")
    ttf = _static_fraunces()

    def font(sz: int) -> ImageFont.FreeTypeFont:
        return ImageFont.truetype(io.BytesIO(ttf), sz)

    # -- chip -------------------------------------------------------------
    f_chip = font(27)
    chip = "NAPI MENÜ · PIZZA · FRISSENSÜLTEK"
    cw = d.textlength(chip, font=f_chip)
    cy, ch = 92, 52
    d.rounded_rectangle((mx, cy, mx + cw + 48, cy + ch), ch // 2, fill=(*paper, 26), outline=(*paper, 84), width=2)
    d.text((mx + 24, cy + ch / 2), chip, font=f_chip, fill=(*paper, 216), anchor="lm")

    # -- cím: körvonalas DTC + töltött Bisztró (mint a hero) ---------------
    size = 176
    while size > 90:
        f_title = font(size)
        w_dtc = d.textlength("DTC", font=f_title)
        w_gap = d.textlength(" ", font=f_title)
        w_rest = d.textlength("Bisztró", font=f_title)
        if w_dtc + w_gap + w_rest <= W - 2 * mx:
            break
        size -= 4
    ty = 196
    d.text((mx, ty), "DTC", font=f_title, fill=(0, 0, 0, 0), stroke_width=6, stroke_fill=(*accent, 255))
    d.text((mx + w_dtc + w_gap, ty), "Bisztró", font=f_title, fill=(*paper, 255))

    # -- tagline -----------------------------------------------------------
    d.text((mx, ty + size + 34), "A napi ebéd, amit vársz.", font=font(46), fill=(*paper, 236))

    # -- alsó sáv: rendelési idő + cím -------------------------------------
    f_meta = font(27)
    pill = "Online rendelés · H–P 08:00–14:55"
    pw = d.textlength(pill, font=f_meta)
    by, bh = H - 96, 60
    d.rounded_rectangle((mx, by, mx + pw + 52, by + bh), bh // 2, fill=(*accent, 255))
    d.text((mx + 26, by + bh / 2), pill, font=f_meta, fill=(*ink, 255), anchor="lm")
    addr = "2049 Diósd, Pacsirta u. 29."
    d.text((W - mx, by + bh / 2), addr, font=f_meta, fill=(*paper, 200), anchor="rm")

    out = os.path.join(OUT, "og.jpg")
    img.save(out, quality=86, optimize=True, progressive=True)
    print(f"  -> og.jpg  {W}x{H}  {os.path.getsize(out) // 1024} KB")


# ------------------------------------------------------------------- main
def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None

    # DTC logó (arculat) – mindig kerüljön a képek közé
    logo_src = os.path.join(SRC, "aloldal_logo.png")
    if os.path.exists(logo_src):
        Image.open(logo_src).save(os.path.join(OUT, "logo-dtc.png"))
        print("logó…")

    if only == "photos":
        print("fotók…")
        for name, src, widths, crop in PHOTOS:
            img = load(src)
            if crop:
                img = _cover_resize(img, crop)
                save_variants(img, name)
                continue
            for w in widths:
                if w > img.width:
                    continue
                h = round(img.height * w / img.width)
                save_variants(img.resize((w, h), Image.LANCZOS), name, f"-{w}")

    if only in (None, "crops"):
        print("slot-képek…")
        base = {n: load(s) for n, s, _, _ in PHOTOS}
        for name, srcname, size, zoom, focus in CROPS:
            save_variants(_cover_resize(base[srcname], size, zoom, focus), name)
        for name, srcname, size in GALLERY:
            save_variants(_cover_resize(base[srcname], size), name)

    if only in (None, "plate"):
        print("hero tányér (kivágás)…")
        for name, src in PLATE_SOURCES:
            img = load(src)
            plate = cutout(img)
            plate.thumbnail((1120, 1120), Image.LANCZOS)
            plate = ImageEnhance.Color(plate).enhance(1.06)
            save_variants(plate, name, q=(46, 66))

    if only in (None, "og"):
        print("og megosztókép…")
        build_og()

    print("kész.")


if __name__ == "__main__":
    main()
