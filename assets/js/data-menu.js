/* ==========================================================================
   DTC Bisztró – NAPI MENÜ ADATFORRÁS
   --------------------------------------------------------------------------
   Ez az EGYETLEN hely, ahol a napi menü szerepel. Élesben ezt a fájlt kell
   naponta frissíteni (vagy egy későbbi rendelési rendszer API-válaszával
   felülírni) – a HTML nem változik, a kártyák maguktól frissülnek.

   DEMO tartalom: a látványtervben mintaadat, nem a mai hivatalos ajánlat.
   A valós napi menü a dtcbisztro.hu/etlap oldalon, naponta frissülve jelenik
   meg; élesben innen, automatikusan töltődik ide.
   ========================================================================== */

window.DTC_MENU = {
  demo: true,
  day: "Csütörtök",
  date: "2026-10-01",
  priceFrom: "1 860 Ft-tól",
  delivery: "11:00–15:00",
  orderWindow: "08:00–14:55",

  /* kártyánként egy-egy mező */
  fields: {
    dish1: "Azték barackleves",
    alt1: "Máskor a héten: babgulyás",
    dish2: "Tarhonyás hús",
    alt2: "vagy tökfőzelék fasírttal",
    dish3: "Hagymás rostélyos",
    alt3: "steakburgonyával · vagy töltött káposzta"
  },

  /* allergén / jelölés chippek */
  tags: {
    tags1: ["Gluténmentes", "Laktózmentes"],
    tags2: ["Laktózmentes", "Vegetáriánus opció"],
    tags3: ["Gluténmentes", "Laktózmentes"]
  },

  /* adagméret- sor */
  sizes: [
    { name: "Picúr",  hint: "kisebb étvágyra",      active: false },
    { name: "Normál", hint: "a klasszikus adag",     active: true  },
    { name: "Macho",  hint: "aki többet enne",       active: false }
  ]
};
