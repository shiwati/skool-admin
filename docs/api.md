# API

A végpontok többsége `GET`; írási végpontok: `POST /api/applicants/delete`, `POST /api/applicants/[id]/edit`, `POST /api/applicants/merge`, `POST /api/applicants/duplicates/dismiss`, `POST /api/events`, `PATCH /api/events/[id]`, `POST /api/events/[id]/sync`. Továbbiak (POST/PATCH/DELETE) várhatók. Mindegyik bejelentkezést igényel, `Cache-Control: no-store`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

A jelentkező adatlapjának és szerkesztő űrlapjának (`/applicants/[id]`, `/applicants/[id]/edit`) nincs olvasó végpontja: az oldalak szerveroldalon közvetlenül az adatbázisból olvasnak (lásd [frontend.md](frontend.md)).

## Közös válaszformák

- Lapozott lista: `{ items, total, page, pageSize }`
- Hibák: `401 {error:"Unauthorized"}` · `400 {error:"Invalid query parameters", details}` (Zod `flattenError`) · `404` ha nincs az erőforrás · `500 {error:"Internal Server Error"}` (részletek csak a logban).

## Végpontok

### `GET /api/applicants`

Paraméterek: `page`, `pageSize` (alap 20, max 100), `eventIds` (CSV vagy ismételt), `ageFrom`, `ageTo` (`ageFrom ≤ ageTo`), `hometown`, `newsletter`, `attended` (bool), `q` (szavanként AND; keresés: keresztnév, vezetéknév, e-mail), `sort` (`lastName`|`birthYear`|`hometown`|`createdAt`, alap `lastName`), `order` (alap `asc`).
Válasz: jelentkezők + `applications` (id, status, receivedAt, event{id,name,from}), `receivedAt desc`. A törölt (anonimizált, `deletedAt` nem null) jelentkezők soha nem szerepelnek benne.

### `POST /api/applicants/delete`

GDPR-törlés anonimizálással (részletek: [data-and-db.md](data-and-db.md#jelentkező-törlése-gdpr-anonimizálás)). Törzs: `{ "ids": string[] }` (1–100, egyedi, nem üres). Válasz: `200 { deleted }`, ahol a `deleted` a most törölt jelentkezők száma (a már törölteket kihagyja). Hibák: `401` · `400 {error:"Invalid request body", details}` · `404`, ha bármelyik id ismeretlen (ilyenkor semmi sem változik) · `500`. Egy tranzakcióban fut; a log csak `{ event: "applicants.anonymized", userId, count }`.

### `POST /api/applicants/[id]/edit` — jelentkező szerkesztése

A szerkesztő űrlap (`/applicants/[id]/edit`) mentése. Törzs (séma: `applicantEditRequestSchema`, `src/lib/applicants/edit-schema.ts`, ugyanazt használja az űrlap is): a szerkeszthető mezők űrlap-alakban (`lastName`, `firstName`, `email` kötelező; `birthYear` szövegként, 1900..idei év; `phoneNumber`, `schoolName`, `hometown`, `parentLastName`, `parentFirstName`, `parentMothersName`, `parentAddress`, `parentEmail`, `parentPhone`; `newsletter` bool) + `expectedUpdatedAt` (ISO, a betöltéskori `updatedAt`). Üres opcionális szöveg `null`-ként mentődik.
Válasz: `200 { updatedAt }`. Hibák: `401` · `400 {error:"Invalid request body", details}` (mezőnkénti hibák, magyar üzenettel) · `404` ismeretlen vagy törölt jelentkezőre · `409 {error:"Conflict"}`, ha a jelentkező a betöltés óta módosult (ilyenkor semmi sem változik) · `500`.
Egy tranzakcióban: csak a ténylegesen változott mezőket írja, mindegyikhez egy `History`-sort (`tableName: "applicant"`); név- vagy e-mail-változáskor újraszámolja a `duplicateKey`-t és a régi/új kulcs `duplicateFlag`-jeit. A log csak `{ event: "applicant.updated", userId, changed }`.

### `GET /api/events`

Paraméterek: `page`, `pageSize`, `year`, `companyName`, `place` (helyszín vagy partnercég, részszöveg), `instructor`, `q` (név), `phase` (`active`: még nem ért véget és van jelentkezési sheet / `planned`: még nem ért véget, sheet nélkül / `closed`: véget ért; hiányzik = mind), `tags` (csak a [fix címkelistából](domain.md#címkék-eventtags), csak ismételt paraméterként, pl. `?tags=robotika&tags=kezdő`, vesszőnél nem vág; bármelyik címke egyezése elég; listán kívüli címke → `400`), `sort` (`from`|`name`|`companyName`|`capacity`, alap `from`), `order` (alap: `from` esetén desc, különben asc).
Válasz: események + `applicationCounts` (státuszonként + `total`).

### `GET /api/events/tags`

Paraméter nincs. Válasz: `{ items: string[] }`, a **fix címkelista** (`EVENT_TAGS`) minden eleme magyar ábécérendben, akkor is, ha egyik esemény sem használja; adatbázist nem olvas. Ez a címkeszűrő multiselect opciólistája; új címke a felületen nem vehető fel. Azért végpont és nem közvetlen import, hogy a lista később dinamikussá válhasson a felület módosítása nélkül.

### `POST /api/events` — új program

Törzs (JSON, sémája `createEventSchema` a `src/lib/events/api-schema.ts`-ben): `name` (kötelező), `from`/`to` (dátum, `to >= from`); választható: `tags[]` (csak a fix címkelistából, alap üres), `description`, `companyName`, `location`, `sheetUrl`, `ageRange` (`"12-18"`), `instructor`, `mentors[]`, `capacity` (egész, ≥ 0, alap 0). Üres szöveg `null`-ra normalizálódik. Az űrlap legalább 1 fős létszámot kér, ezt a kliens ellenőrzi.
Válasz: `201 { id }`; `400` `{error, details}` (mezőnkénti hibák); `401`.

### `GET /api/events/[id]`

Egy program összes mezője. `404`, ha nem létezik; `401`. A szerkesztő oldal (`/events/[id]/edit`) ugyanazt a `getEvent` függvényt (`src/lib/events/queries.ts`) hívja közvetlenül, nem HTTP-n.

### `PATCH /api/events/[id]` — program módosítása

Törzs: a `POST` mezői (`src/lib/events/api-schema.ts`, `updateEventSchema`), mind választható, de legalább egy kell. Csak a megadott mezők változnak; az opcionális szöveges mezők (`description`, `companyName`, `location`, `sheetUrl`, `ageRange`, `instructor`) `null`-lal törölhetők. A `to >= from` ellenőrzés a tárolt értékekkel egyesítve történik.
A tranzakció a ténylegesen megváltozott mezőnként egy `History` sort ír (`tableName: "event"`, `fieldName` a Prisma mezőnév, `oldValue`/`newValue` szövegként; dátum ISO, lista JSON). Ha semmi sem változik, nem ír semmit.
Válasz: `200 { id }`; `400` `{error, details}`; `401`; `404`.

### `GET /api/events/[id]/applicants`

Paraméterek: `page`, `pageSize`, `status` (CSV enum), `ageFrom`, `ageTo`, `q`, `sort` (`lastName`|`birthYear`|`status`|`receivedAt`, alap `receivedAt`), `order` (alap `asc`).
Válasz: Application + beágyazott `applicant`. `404`, ha az esemény nem létezik.

Egyéb: `GET /api/health` (nyilvános readiness, 200/503), `/api/auth/*` (NextAuth).

## Közös segédek (`src/lib/api/`)

- `handleQuery(request, schema, run)`: session ellenőrzés → **query** validáció → futtatás → egységes hibakezelés. Olvasó (GET) végpontokra készült; **írási végpontokhoz még nincs megfelelője** (body-validáció, módosító műveletek, History-naplózás, esetleges tranzakció), ezt az első írási igénynél kell kialakítani, a `handleQuery` mintájára.
- `query.ts`: `paginationSchema`, `orderSchema`, `csvList`, `repeatedList` (vesszőt nem vágó lista szabad szöveghez), `booleanParam`, `optionalText`, `searchTokens`, `containsInsensitive`, `ageRangeToBirthYear`, `budapestYearRange`, `pageResult`.
- Rendezésnél mindig van másodlagos `id` rendezés (stabil lapozás); nullable mezőknél `nulls: "last"`.

## Konvenciók új végponthoz

1. Zod séma a query-re (vagy body-ra), szerveroldali validáció mindig.
2. Védelem: a layout nem védi a Route Handlert; lásd [auth-and-access.md](auth-and-access.md).
3. Teszt a végpont mellé (`route.test.ts`, Prisma mockolva); lásd [testing.md](testing.md).
4. Ne logolj kérés-törzset, felhasználói rekordot, e-mailt.

## `POST /api/events/[id]/sync` — Google Form sheet import

Az esemény `sheetUrl`-jében megadott válasz-sheetet olvassa a **bejelentkezett admin Google-jogosultságával** (`spreadsheets.readonly` scope; ha hiányzik: `403 REAUTH_REQUIRED`, újra be kell jelentkezni). A gid nélküli linknél az első munkalapot veszi.

- Oszlop ↔ mező párosítás fejléc-kulcsszavak alapján: `src/lib/sheet-import/mapping.ts` (kötelező: vezetéknév, utónév, e-mail). Ismeretlen oszlopok (pl. kézi „1. oszlop”) kimaradnak, a válasz `unmappedHeaders`-ben listázza őket.
- Minden új válasz **új** `Applicant` + `Application`. Újraszinkronnál az `Application.sourceKey` (időbélyeg + e-mail, eseményen belül egyedi) miatt semmi nem jön létre kétszer, és semmi nem íródik felül.
- Duplikátum: azonos `Applicant.duplicateKey` (normalizált név + e-mail) → minden érintett jelentkező `duplicateFlag = true`. Az eldöntésük a duplikáció-ellenőrzés képernyőn történik (merge vagy „nem duplikáció”), lásd lent.
- Válasz: `{ created, existing, duplicates, errors: [{ row, reason }], unmappedHeaders }`.

## `POST /api/applicants/merge` — duplikátumok összevonása

Body: `{ "primaryId": "…", "mergeIds": ["…"] }` (1–50 egyedi id, a `primaryId` nem lehet köztük). Egy tranzakcióban: a `mergeIds` jelentkezők összes jelentkezése az elsődlegeshez kerül (a jelentkezési adatok változatlanok; ugyanarra az eseményre több is maradhat), a `History`-ba `merged_from` sor kerül, a merge-elt jelentkezők törlődnek. A `duplicateFlag` csak akkor marad igaz, ha még van másik jelentkező ugyanazzal a `duplicateKey`-jel. Válasz: `{ applicant (jelentkezésekkel), movedApplications }`; hibák: 400 (validáció), 401, 404 (ismeretlen id).

## `GET /api/applicants/duplicates` — következő eldöntetlen duplikátumpár

Query: `skip` (≥ 0, alapértelmezés 0; a „Kihagyás most” lépteti, a végén körbeér). A párok az azonos `duplicateKey`-ű, nem törölt, `duplicateFlag`-es jelentkezőkből képződnek (egy N tagú csoport minden párja), kivéve a „nem duplikáció”-nak jelölt párokat (`src/lib/applicants/duplicate-pairs.ts`). Válasz: `{ total, index, pair: { a, b } | null }`; az `a` a korábban rögzített jelentkező, mindkettő minden adatával és jelentkezéseivel (program, státusz, beküldés). A jelentkezőlista bannere ebből veszi a darabszámot.

## `POST /api/applicants/duplicates/dismiss` — „nem duplikáció”

Body: `{ "applicantIds": ["…", "…"] }` (két különböző id). A pár rendezve (`applicantAId < applicantBId`) a `DuplicateDismissal` táblába kerül, a `History`-ba `duplicate_dismissed` sor. A döntés **párra** szól: ha később egy harmadik, azonos kulcsú jelentkező érkezik, az bármelyikükkel új párt alkot és megjelenik. A `duplicateFlag` nem változik. Hibák: 400, 401, 404 (ismeretlen vagy törölt), 409 (eltérő `duplicateKey`).
