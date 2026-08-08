# Cykelvejr PWA v2

Ændringer i denne version:
- Charlie vises med navn.
- Vind vises i meter pr. sekund (m/s).
- Regn og vind får grøn/gul/rød tekstkategori.
- Samlet vurdering får en lille animation:
  - regn ved dominerende nedbør
  - vind ved dominerende blæst
  - sne ved sne
  - sol/puls ved rolige forhold
- Service worker cache er opdateret til v2.

## GitHub
Du kan erstatte alle filer med dem i ZIP-filen.

Hvis du kun vil erstatte de ændrede filer:
- index.html
- style.css
- app.js
- sw.js

Det anbefales at erstatte sw.js også, så gamle cachede filer ikke bliver ved med at vises.
