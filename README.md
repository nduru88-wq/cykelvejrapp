# Cykelvejr PWA

En enkel PWA til landskabstablet for:
- Peter: Nørholm ↔ Aalborg SV
- Din dreng: Nørholm ↔ Sønderholm
- Morgen: 07.15–08.15
- Hjemtur: 13.00–16.00

## GitHub Pages
1. Opret et nyt GitHub repository, fx `cykelvejr`.
2. Upload **indholdet** af denne mappe til roden af repoet.
3. Gå til Settings → Pages.
4. Vælg Deploy from a branch → `main` → `/ (root)`.
5. Åbn GitHub Pages-adressen på tabletten.
6. Tilføj siden til hjemmeskærmen / installer PWA'en.

## Vejr
Appen bruger Open-Meteo uden API-nøgle og opdaterer automatisk hvert 15. minut.

## Ruter
Koordinaterne ligger øverst i `app.js` under `PROFILES`.
De er lagt som to punkter pr. rute, så vejret vurderes ved begge ender af turen.

## Cykelscore
Scoren er en praktisk, hjemmelavet vurdering (ikke en officiel meteorologisk indeksværdi).
Regn, sne, vind, vindstød og meget lave/høje temperaturer trækker scoren ned.
