# Terv: záró riport Google Doc sablonból („A” változat)

> **Állapot:** megvalósítva (`src/lib/reports/template.ts`, `src/lib/google/docs.ts`,
> `src/lib/reports/save.ts`). A riport csak a sablonból készül; a `REPORT_TEMPLATE_DOC_ID`
> kötelező, a régi HTML-es generálás (`render.ts`) törölve. **A ténylegesen használt helyőrzők eltérnek
> az alábbi eredeti tervtől:** szimpla kapcsos zárójel, és ezek a nevek:
>
> `{company_name}` `{event_name}` `{event_date}` `{place}` `{count}` `{age}` (csak „10–12”, az
> „évesek” a sablonban van) `{people_count}` (összes közreműködő) `{volunteer_count}`
> `{volunteer_names}` `{all_names}` `{max_m}` (mentorok 4–5) `{max_t}` (oktató 4–5) `{rate}`
> (ajánlaná) `{quote.text}` (minden kiválasztott idézet, külön bekezdésben), és a
> közreműködő-táblázat mintasora: `{person.role}` · `{person.org}` · `{person.name}`.
> A 4×4-es mutató-rács, a kiemelt idézetek külön blokkja és az opcionális blokkok
> (`{{#…}}`) nincsenek megvalósítva; adat nélkül a csempe üres marad, kézzel törlendő.

## Miért

Most a riportot a [`src/lib/reports/render.ts`](../../src/lib/reports/render.ts) HTML-ként rakja össze, és a Drive feltöltéskor Google Doccá konvertálja ([`src/lib/google/drive.ts`](../../src/lib/google/drive.ts)). A konverzió sok formázást elhagy vagy lebutít: margó nélküli színsávok, pontos térközök, betűvastagságok, oldalfelépítés, lábléc, oldalszám. Kódból ezen csak korlátozottan lehet javítani, és minden apró módosítás fejlesztést és deployt igényel.

A cél: a riport kinézete egy **Google Doc sablonban** legyen, amit bárki szerkeszthet a Docsban. Az app a sablont **lemásolja**, és a Docs API-val **kicseréli benne a helyőrzőket** az adatokra. A sablon formázása így teljesen megmarad.

## Az új folyamat röviden

1. Az admin a „Záró riport” fülön rákattint a „Google Doc generálása” gombra (ez a felület nem változik).
2. Az app a Drive API-val **lemásolja** a sablont az admin saját Drive-jába (`files.copy`). A másolat az app által létrehozott fájl, ezért a meglévő `drive.file` scope-pal szerkeszthető.
3. Az app a Docs API-val (`documents.batchUpdate`) kitölti a másolatot:
    - `replaceAllText` minden egyszerű helyőrzőre;
    - táblázatsorok beszúrása vagy törlése az ismétlődő részeknél (közreműködők, idézetek, mutatók).
4. A link ugyanúgy elmentődik (`EventReportDocument` + `History`), mint most.

---

## 1. A sablon elkészítése (ezt neked kell megcsinálnod)

A kiindulópont a mostani megoldással generált doksi.

1. Generálj egy riportot egy olyan programhoz, amelyikhez van visszajelzés és van legalább 2 kiemelt idézet. Így minden szekció megjelenik benne.
2. Nevezd át, például: **„Skool záró riport – SABLON”**.
3. Szépítsd meg a Docsban:
    - betűtípusok (Poppins; mono részekhez Roboto Mono vagy más elérhető mono);
    - színek, cellaháttér, cellák közti rések, oldaltörések;
    - **Beszúrás → Oldalszámok** és lábléc (pl. `{{company}} × Skool · {{month}} · skool.org.hu`);
    - Skool-logó: maradhat a sablonban mint kép, az app nem nyúl hozzá;
    - partnerlogó: helyőrző kép vagy szöveg marad, ezt minden riportnál kézzel cserélitek.
4. **Cseréld le az adatokat helyőrzőkre** az alábbi listák szerint. A helyőrző pontosan így szerepeljen, dupla kapcsos zárójellel. A helyőrző betűstílusa (méret, szín, vastagság) öröklődik a beírt értékre.
5. A szabad szöveges helyőrzők (bevezető, „Mit csináltunk?”, köszönet, fotók) **maradjanak úgy, ahogy most vannak** (sárga `[…]` szöveg). Ezeket továbbra is a generált doksiban írjátok meg.
6. Oszd meg a sablont: **Megosztás → Általános hozzáférés → „Skool” (a domain) → Megtekintő**. Shared Drive nem kell.
7. Jegyezd fel a doksi azonosítóját az URL-ből: `https://docs.google.com/document/d/`**`<EZ_AZ_ID>`**`/edit`.

### Egyszerű helyőrzők (szövegcsere)

| Helyőrző              | Tartalom                                           | Példa                              |
| --------------------- | -------------------------------------------------- | ---------------------------------- |
| `{{title}}`           | riport címe                                        | Robert Bosch Kft. × Skool workshop |
| `{{eventName}}`       | program neve                                       | Minecraft: saját világ 3D-ben      |
| `{{company}}`         | partnercég (`Event.companyName`)                   | Robert Bosch Kft.                  |
| `{{dateLong}}`        | kezdő dátum                                        | 2025. május 16.                    |
| `{{weekday}}`         | a hét napja                                        | péntek                             |
| `{{time}}`            | időtartam (egynapos programnál)                    | 15:00 – 18:30                      |
| `{{dateText}}`        | dátum + idő, vagy dátumtartomány                   | 2025. május 16., 15:00–18:30       |
| `{{month}}`           | év + hónap (lábléchez)                             | 2025. május                        |
| `{{place}}`           | helyszín (`location`, ennek hiányában a cég)       | Budapest                           |
| `{{participants}}`    | „Részt vett” státuszú jelentkezők száma            | 15                                 |
| `{{age}}`             | korosztály                                         | 10–12 évesek                       |
| `{{peopleCount}}`     | közreműködők száma                                 | 7                                  |
| `{{volunteerCount}}`  | mentor/önkéntes szerepű közreműködők száma         | 4                                  |
| `{{volunteerNames}}`  | nevük, vesszővel elválasztva                       | Rábai-Béres Diána (Bosch), …       |
| `{{allNames}}`        | minden közreműködő neve `·` jellel (köszönetdoboz) | …                                  |
| `{{mentorRatingPct}}` | mentorértékelés 4–5 aránya                         | 100%                               |
| `{{recommendPct}}`    | „ajánlaná” aránya                                  | 100%                               |

Ha egy értéknek nincs adata (pl. nincs korosztály vagy nincs ajánlás-adat), az app üres szöveget ír a helyére. Ha ez egy egész csempét érint, lásd lent az „Opcionális elemek” részt.

### Ismétlődő részek (táblázatsorok)

Ezeket **táblázatként** kell a sablonba tenni: egy fejlécsor (ha kell) és **pontosan egy mintasor** a helyőrzőkkel. Az app a mintasort annyiszor másolja, ahány elem van, majd kitölti. Ha egy elem sincs, törli a mintasort.

| Rész                               | Mintasor helyőrzői                                       | Megjegyzés                                   |
| ---------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| Közreműködők („Kik vettek részt?”) | `{{person.role}}` · `{{person.org}}` · `{{person.name}}` | 3 oszlopos táblázat                          |
| Kiemelt idézetek (2. oldal teteje) | `{{highlight.text}}` · `{{highlight.role}}`              | max. 2 elem                                  |
| Lányok idézetei                    | `{{pQuote.text}}`                                        | 1 oszlop vagy egy közös táblázat bal oszlopa |
| Mentorok idézetei                  | `{{mQuote.text}}`                                        | 1 oszlop vagy a közös táblázat jobb oszlopa  |
| Hatás-csempék                      | `{{metric.pct}}` · `{{metric.text}}`                     | lásd lent                                    |

**Hatás-csempék:** a mostani 4 oszlopos rács sorbeszúrással nehezen kezelhető (egy sorban 4 elem van). Két lehetőség:

- **(ajánlott)** A sablonban egy **fix 4×4-es rács** van, cellánként `{{m1.pct}}` / `{{m1.text}}` … `{{m16.pct}}` / `{{m16.text}}`. Az app kitölti a szükséges cellákat, és **törli a teljesen üres sorokat**. Egy félig üres sor utolsó cellái üresen maradnak.
- Vagy egy oszlopos lista, ami ugyanúgy működik, mint a többi ismétlődő rész (egyszerűbb, de nem rács).

A cellaszínt (100% = szürke, egyébként színes) a sablon nem tudja magától. Ha ez fontos, az app az `updateTableCellStyle` kéréssel állíthatja be cellánként.

### Opcionális elemek

Ha egy egész blokknak el kell tűnnie adat nélkül (pl. az „ajánlaná” csempe), tegyél köré jelölő bekezdéseket: `{{#recommend}}` … `{{/recommend}}`. Az app adat nélkül törli a közöttük lévő tartalmat, adattal csak a két jelölőt. Első körben ez kihagyható, ilyenkor az üres helyet kézzel kell eltüntetni.

---

## 2. Google Cloud beállítások

Abban a GCP-projektben, amelyikben a `GOOGLE_CLIENT_ID` OAuth kliens van (ugyanott, ahol a Sheets és a Drive API már be van kapcsolva):

1. **Google Docs API bekapcsolása:** APIs & Services → Library → „Google Docs API” → **Enable**. Ha a riportgenerálás 403-mal áll le, a hibakód valószínűleg `accessNotConfigured` / `SERVICE_DISABLED` lesz, mint a Drive API-nál volt.
2. **A Drive API maradjon bekapcsolva** (a `files.copy`-hoz kell).
3. **Új scope az OAuth consent screenen:** Google Auth Platform → **Data Access** → Add or remove scopes:
    - `https://www.googleapis.com/auth/drive.readonly`: ezzel olvassa az app a sablont, mert a mostani `drive.file` csak az app saját fájljaihoz enged. A másoláshoz olvasási jog kell.
    - A `drive.file` maradjon (a másolat szerkesztéséhez és a Docs API-hoz elég).
    - Az app **Internal** típusú, ezért a „restricted” scope-hoz **nem kell Google-ellenőrzés**.
4. **Alternatíva a `drive.readonly` helyett:** ha nem akartok minden Drive-fájlra olvasási jogot adni, a sablont egyszer az appal kell létrehoztatni (pl. egy admin-oldali „sablon feltöltése” gombbal), mert akkor `drive.file` alatt elérhető. Ez viszont csak annak az adminnak működik, aki feltöltötte. Ezért a `drive.readonly` az egyszerűbb.

## 3. Konfiguráció

- Új env változó: **`REPORT_TEMPLATE_DOC_ID`** (a sablon azonosítója az URL-ből).
    - [`src/lib/env-schema.ts`](../../src/lib/env-schema.ts): opcionális string. Ha nincs megadva, maradjon a mostani HTML-es generálás (fallback).
    - `.env.example` és a README env-táblázata.
    - Produkciós környezetben is be kell állítani.
- **Mindenkinek újra be kell jelentkeznie** az új scope miatt. A meglévő `GoogleReauthRequiredError` kezeli: a generáló végpont `403 REAUTH_REQUIRED`-et ad, a felület kiírja.

## 4. Kódváltozások

| Hol                                                                                                            | Mit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/lib/google/token.ts`](../../src/lib/google/token.ts)                                                     | új konstans: `GOOGLE_DRIVE_READONLY_SCOPE`. A `getGoogleAccessToken` most egy scope-ot ellenőriz; legyen `requiredScopes: string[]`, mert a generáláshoz kettő kell (`drive.file` + `drive.readonly`).                                                                                                                                                                                                                                                                                         |
| [`src/lib/auth.ts`](../../src/lib/auth.ts) (+ `auth.test.ts`)                                                  | a `scope` paraméterbe bekerül a `drive.readonly`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/lib/google/docs.ts` (új)                                                                                  | `copyFile(templateId, name, token)` (Drive `files.copy`, `fields=id,webViewLink`); `getDocument(id, token)` (a táblázatok és a mintasorok indexeihez); `batchUpdate(id, requests, token)`. Hibakezelés a `drive.ts` mintájára: 401 → reauth, `insufficient` → reauth, `accessNotConfigured` → `DocsApiDisabledError`, 404/403 a sablonon → `ReportTemplateNotAccessibleError`.                                                                                                                 |
| `src/lib/reports/placeholders.ts` (új, tiszta függvények)                                                      | `ReportDocumentData` → helyőrző-térkép (egyszerű értékek) + listák (közreműködők, idézetek, mutatók). A dátum- és korosztály-formázók a mostani `render.ts`-ből jönnek; ezeket érdemes külön `format.ts`-be kiemelni. Tesztekkel.                                                                                                                                                                                                                                                              |
| `src/lib/reports/fill-template.ts` (új)                                                                        | a Docs `batchUpdate` kérések összerakása: (1) táblázat-mintasorok másolása `insertTableRow`-val **hátulról előre** (így nem csúsznak el az indexek), (2) üres mutató-sorok törlése `deleteTableRow`-val, (3) végül egyetlen körben az összes `replaceAllText` (a sorokban a helyőrzőket sorszámmal kell egyedivé tenni, pl. `{{person.name}}` → első körben `{{person.1.name}}`-re átírva). Ez a legtrükkösebb rész, alaposan tesztelni kell egy rögzített `documents.get` válasz-fixture-rel. |
| [`src/lib/reports/save.ts`](../../src/lib/reports/save.ts)                                                     | `generateReportDocument`: ha van `REPORT_TEMPLATE_DOC_ID`, akkor másolás és kitöltés, egyébként a mostani HTML-feltöltés. A `EventReportDocument` és a `History` mentése változatlan.                                                                                                                                                                                                                                                                                                          |
| [`src/app/api/events/[id]/report/documents/route.ts`](../../src/app/api/events/[id]/report/documents/route.ts) | új hibák leképezése: `DocsApiDisabledError` → `503 DOCS_API_DISABLED`, `ReportTemplateNotAccessibleError` → `422 TEMPLATE_NOT_ACCESSIBLE` („A riport-sablon nem érhető el. Ellenőrizd, hogy meg van-e osztva a domainnel.”).                                                                                                                                                                                                                                                                   |
| `render.ts`                                                                                                    | fallbackként marad; ha a sablonos út beválik, később törölhető.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `docs/api.md`, `docs/auth-and-access.md`, README                                                               | új scope, env változó, hibakódok.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| OpenSpec                                                                                                       | új change (pl. `report-doc-template`) a mostani `add-event-report` mintájára.                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Docs API jegyzetek

- A `replaceAllText` a helyőrző stílusát adja az új szövegnek, és a dokumentum **összes** előfordulását cseréli (a fejlécben és a láblécben is).
- Egy cellán belüli sortörés `\n`-nel új bekezdést kezd ugyanazzal a stílussal. Ezzel a listák egy cellában is megoldhatók táblázatsorok nélkül (pl. a mentorok nevei).
- Az indexek minden beszúrás után eltolódnak: vagy hátulról előre kell dolgozni egy `batchUpdate`-ben, vagy több körben, minden kör után újra lekérve a dokumentumot.
- A „100% = szürke csempe” színezéshez az `updateTableCellStyle` kérés kell `tableCellLocation`-nel.

## 5. Ellenőrzés

- [ ] Docs API bekapcsolva, `drive.readonly` felvéve a consent screenen.
- [ ] `REPORT_TEMPLATE_DOC_ID` beállítva lokálisan és prodban.
- [ ] Újrabejelentkezés után a generálás új doksit hoz létre a saját Drive-ban, és a sablon nem változik.
- [ ] Minden helyőrző kicserélődik (keress rá a kész doksiban a `{{` szövegre).
- [ ] Szélső esetek: 0 közreműködő, 0 idézet, 0 mutató, 1 mutató, 16 mutató, nincs korosztály, többnapos program.
- [ ] A sablonmegosztás visszavonásakor érthető hibaüzenet jelenik meg.
- [ ] Ha nincs `REPORT_TEMPLATE_DOC_ID`, a mostani HTML-es generálás működik tovább.
