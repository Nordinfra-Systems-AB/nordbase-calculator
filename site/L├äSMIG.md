# Adapterplåtor på hemsidan: fotogalleri i Resource Library + robots.txt-fix (2026-09-07)

## Bakgrund

Du frågade: "Ska vi upp med ritningar och bilder på hemsidan? under recource library blir det dock en väldigt lång lista så isf någon expand knapp för att se hela listan." Jag rekommenderade **bara foton, inga dimensionerade PDF-ritningar**, eftersom ritningarna redan ligger bakom samtyckesrutan i kalkylatorn — att lägga dem öppet på hemsidan skulle göra det jobbet meningslöst. Du höll med, och valde en enkel "Visa alla"-knapp för listan. Det är det som är byggt här.

## Vad som är gjort

**1. Nytt fotogalleri på `/resources.html`** (`site/src/ResourcesApp.jsx`)

En ny sektion "Adapter plate gallery" längst ner på sidan, med alla 16 referensfoton (samma bilder som redan finns i kalkylatorn) i ett rutnät — tillverkare, modell och Part No. under varje bild. Visar 8 st direkt, med en "Show all 16 adapter plates"-knapp som expanderar till hela listan (och "Show fewer" för att fälla ihop igen). Ingen nedladdningslänk på fotona — bara att titta.

Under galleriet finns en rad text som pekar till kalkylatorns rapport för den riktiga dimensionerade ritningen, med samtyckeskravet nämnt.

**2. Uppdaterad text i "Drawings"-kategorin** (samma fil)

Den befintliga raden som sa "~15 DC Medium drawings ... in progress" är omskriven till att tydligt förklara att de dimensionerade PDF:erna medvetet INTE publiceras öppet, och hänvisar till galleriet ovan samt kalkylatorns rapport.

**3. `robots.txt` i kalkylator-repot** (`public/robots.txt`)

La till `Disallow: /drawings/` så att sökmotorer inte indexerar PDF-ritningarna direkt (de skulle annars kunna hittas via t.ex. Google site-sökning även om knappen i appen är låst bakom samtycke — filen finns ju fortfarande på en förutsägbar URL). Detta var en rekommendation jag gav dig för ett tag sen men som väntat på att gatingen skulle vara klar först — nu är den klar, så jag lade in den. **OBS: jag gjorde detta utan att fråga specifikt om just robots.txt-raden** — säg till om du hellre vill ha den kvar öppen.

Jag rörde INTE hemsidans egen `robots.txt` — fotona i galleriet är avsiktligt sökbara/indexerbara, det är precis vad vi vill (marknadsföring, SEO).

## Filer i den här zippen — så här laddar du upp

Mirrorar repo-strukturen, som vanligt — OBS två olika mappar denna gång (site-repot och kalkylator-repot är samma GitHub-repo men olika undermappar):

- `site/src/ResourcesApp.jsx` → skriv över befintlig fil
- `site/public/adapter-plates/*.png` (16 filer) → NY MAPP i site-delen, ladda upp alla 16 där
- `public/robots.txt` → skriv över befintlig fil (kalkylator-delen, INTE site-delen — det finns två `public/robots.txt`, en per Vercel-projekt, rör inte site:ns)

## Byggt och verifierat

Både `npm run build` (kalkylator) och `npm run build` (site) körda rena, 0 fel, innan leverans. Bilderna hamnar korrekt i `dist/adapter-plates/` efter site-bygget.
