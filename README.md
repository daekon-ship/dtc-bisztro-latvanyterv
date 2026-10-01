# DTC Bisztró — látványterv

Prémium, egyoldalas **látványterv** a DTC Bisztró (2049 Diósd, Pacsirta u. 29.) számára.
Cél: WOW-hatás az első 3–5 másodpercben, mobile-first, valódi DTC ételfotókkal,
kizárólag ellenőrzött információkkal.

> **Ez bemutatótartalom.** A napi menü demó-adat (`demo: true`), a képek az étterem
> saját, nyilvánosan közzétett fotói — a végleges oldalba az ügyfél saját, profi
> fotói és napi menüje kerül.

## Nézet

- Nyisd a telepített URL-t (GitHub Pages link), **vagy** lokálban:

```bash
cd dtc-bisztro-latvanyterv
python3 -m http.server 8392
# → http://localhost:8392
```

## Mi van az oldalon

| Szekció | Tartalom |
| --- | --- |
| Hero | Outline-stroke cím, lebegő pizza (kivágott fotó), forgó „4+1” stamp, scroll-jelző |
| Ticker | Marquee futósáv |
| Napi menü | Sticky fotó + 3 fogás kártya, allergén chipek, Picúr/Normál/Macho méretek |
| 4+1 promó | „4 menü rendelése esetén az 5. ajándék” — számláló animációval |
| Kínálat | Editorial grid: menü, pizzák, frissensültek, saláták, házhozszállítás |
| Rendelés | 3 lépés timeline |
| Galéria | Masonry + teljes szélességű parallax kép, lightbox (nyilak / Esc / swipe) |
| Miért DTC | 4 ok, sticky fotókkal |
| Kapcsolat | Térkép (sötét filter), ÚTVONAL / HÍVÁS, online rendelési idő blokk |

## Ellenőrzött tények (semmi kitalált)

- Online rendelés: **H–P 08:00–14:55** · kiszállítás **11:00–15:00** (hétköznap)
- Napi menü **H–P, 1 860 Ft-tól** · „4 menü rendelése esetén az 5. ajándék”
- Minimális rendelés **1 990 Ft** · adagméretek: **Picúr / Normál / Macho**
- Fizetés: **SZÉP kártya + készpénz** · iOS/Android app létezik
- A helyszíni nyitvatartás **nincs ellenőrizve** → a UI telefonos érdeklődést javasol
- Minden CTA a valódi rendelésfelületre mutat: <https://dtcbisztro.hu/>

## Napi menü cseréje (éles üzem)

A menü **egyetlen forrása** [`assets/js/data-menu.js`](assets/js/data-menu.js).
A HTML mezői `data-field` attribútumon keresztül ebből hidratálódnak — a
HTML-hez nem kell nyúlni:

```js
window.DTC_MENU = {
  demo: false,               // élesben false → eltűnik a „Demo” chip
  day: "Péntek",
  priceFrom: "1 890 Ft-tól",
  fields: { dish1: "…", alt1: "…", dish2: "…", /* … */ },
  tags:   { tags1: ["Gluténmentes"], /* … */ },
  sizes:  [ /* Picúr / Normál / Macho */ ]
};
```

Később ugyanez a objektum adhatja vissza egy rendelési rendszer API-válasza is.

## Saját fotó behelyettesítése

1. Az új fotókat tedd a `_qa/` mappába (a pipeline forrásmappája, nincs a repóban).
2. Indítsd el a képgenerátort:

```bash
python3 tools/build_images.py          # logó + slotok + hero tányér + og
python3 tools/build_images.py photos   # teljes reszponzív fotókészlet
python3 tools/build_images.py crops    # slot-vágások
python3 tools/build_images.py og       # 1200×630 megosztókép
```

3. A `tools/build_images.py` tetején a `PHOTOS` / `CROPS` / `GALLERY` listákban
   lehet forrásfájlt, vágást, fókuszt cserélni. A kimenet mindig
   AVIF + WEBP páros, a HTML `<picture>`-elemeihez.

Követelmény: Python 3.10+ és `pillow` (+ `fonttools` és `brotli` az og-képhez).

## Technológia

- Tiszta statikus **HTML/CSS/JS — nincs keretrendszer, nincs build-függőség**
- Self-hosted betűk: Fraunces (display) + Archivo, woff2, preloadolva
- Sötét arculat: grafit alap (#0e0d0b), egy accent (#f0512b), grain textúra
- Motion: IntersectionObserver reveal, parallax (csak nagy kijelző + egér),
  mágneses CTA, számlálók — `prefers-reduced-motion` everywhere
- Képek: AVIF/WEBP `<picture>` fallbackkel, lazy loading
- `assets/img/og.jpg` — 1200×630 megosztókép (FB/Messenger/Teams előnézethez)

## Megjegyzés a `_qa/` mappához

A `_qa/` belső munkaterület (nyers fotók, QA-oldalak) — a `.gitignore`
kizárja, élesben nem publikus.
