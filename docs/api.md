# API

A végpontok többsége `GET`; írási végpontok: `POST /api/applicants/delete`, `POST /api/applicants/[id]/edit`, `POST /api/applicants/merge`, `POST /api/applicants/duplicates/dismiss`, `POST /api/events`, `PATCH`/`DELETE /api/events/[id]`, `POST /api/events/[id]/sync`, `POST /api/events/[id]/feedback/sync`, `POST /api/events/[id]/applicants/status`, `PUT /api/events/[id]/report`, `POST /api/events/[id]/report/documents`, `POST /api/sheets/headers`. A közös szabályokat az `api-conventions` spec rögzíti. Mindegyik bejelentkezést igényel, `Cache-Control: no-store`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

A jelentkező adatlapjának és szerkesztő űrlapjának (`/applicants/[id]`, `/applicants/[id]/edit`) nincs olvasó végpontja: az oldalak szerveroldalon közvetlenül az adatbázisból olvasnak (lásd [frontend.md](frontend.md)).

## Közös válaszformák

- Lapozott lista: `{ items, total, page, pageSize }`
- Hibák: `401 {error:"Unauthorized"}` · `400 {error:"Invalid query parameters", details}` (Zod `flattenError`) · `400 {error:"Invalid request body"}` hibás JSON-törzsre, sémahibánál `details`-szel · `404` ha nincs az erőforrás · `500 {error:"Internal Server Error"}` (részletek csak a logban).

## Végpontok

### `GET /api/applicants`

Paraméterek: `page`, `pageSize` (alap 20, max 100), `eventIds` (CSV vagy ismételt), `ageFrom`, `ageTo` (`ageFrom ≤ ageTo`), `hometown`, `newsletter`, `historyFrom`, `historyTo` (elvégzett — „Részt vett” — programok száma, tól–ig), `q` (szavanként AND; keresés: keresztnév, vezetéknév, e-mail), `sort` (`lastName`|`birthYear`|`hometown`|`history`|`createdAt`, alap `lastName`), `order` (alap `asc`).
Válasz: jelentkezők + `applications` (id, status, receivedAt, event{id,name,from}), `receivedAt desc`. A törölt (anonimizált, `deletedAt` nem null) jelentkezők soha nem szerepelnek benne.

### `POST /api/applicants/delete`

GDPR-törlés anonimizálással (részletek: [data-and-db.md](data-and-db.md#jelentkező-törlése-gdpr-anonimizálás)). Törzs: `{ "ids": string[] }` (1–100, egyedi, nem üres). Válasz: `200 { deleted }`, ahol a `deleted` a most törölt jelentkezők száma (a már törölteket kihagyja). Hibák: `401` · `400 {error:"Invalid request body", details}` · `404`, ha bármelyik id ismeretlen (ilyenkor semmi sem változik) · `500`. Egy tranzakcióban fut; a log csak `{ event: "applicants.anonymized", userId, count }`.

### `POST /api/applicants/[id]/edit` — jelentkező szerkesztése

A szerkesztő űrlap (`/applicants/[id]/edit`) mentése. Törzs (séma: `applicantEditRequestSchema`, `src/lib/applicants/edit-schema.ts`, ugyanazt használja az űrlap is): a szerkeszthető mezők űrlap-alakban (`lastName`, `firstName`, `email` kötelező; `birthYear` szövegként, 1900..idei év; `phoneNumber`, `schoolName`, `hometown`, `parentLastName`, `parentFirstName`, `parentMothersName`, `parentAddress`, `parentEmail`, `parentPhone`; `newsletter` bool) + `expectedUpdatedAt` (ISO, a betöltéskori `updatedAt`). Üres opcionális szöveg `null`-ként mentődik.
Válasz: `200 { updatedAt }`. Hibák: `401` · `400 {error:"Invalid request body", details}` (mezőnkénti hibák, magyar üzenettel) · `404` ismeretlen vagy törölt jelentkezőre · `409 {error:"Conflict"}`, ha a jelentkező a betöltés óta módosult (ilyenkor semmi sem változik) · `500`.
Egy tranzakcióban: csak a ténylegesen változott mezőket írja, mindegyikhez egy `History`-sort (`tableName: "applicant"`); név- vagy e-mail-változáskor újraszámolja a `duplicateKey`-t és a régi/új kulcs `duplicateFlag`-jeit. A log csak `{ event: "applicant.updated", userId, changed }`.

### `GET /api/events`

Paraméterek: `page`, `pageSize`, `year`, `companyName`, `place` (helyszín vagy partnercég, részszöveg), `instructor`, `q` (név), `phase` (`active`: még nem ért véget és van jelentkezési sheet / `planned`: még nem ért véget, sheet nélkül / `closed`: véget ért; hiányzik = mind), `tags` ([címkék](domain.md#címkék-eventtags), csak ismételt paraméterként, pl. `?tags=robotika&tags=kezdő`, vesszőnél nem vág; normalizálódik; bármelyik címke egyezése elég; olyan érvényes címke, amit egy program sem használ → üres találat; hibás formájú címke (üres, 30 karakternél hosszabb, vesszőt tartalmaz) → `400`), `sort` (`from`|`name`|`companyName`|`capacity`, alap `from`), `order` (alap: `from` esetén desc, különben asc).
Válasz: események + `applicationCounts` (státuszonként + `total`).

### `GET /api/events/tags`

Paraméter nincs. Válasz: `{ items: { name: string, count: number }[] }`, a **programokon használt címkék** és hogy hány program használja őket (`unnest(tags)` + `GROUP BY`, `src/lib/events/tag-options.ts`), a legtöbbet használt elöl, azonos számnál magyar ábécérendben. A nem használt címke nem szerepel. Példa: `{ "items": [{ "name": "robotika", "count": 2 }, { "name": "ablak", "count": 1 }, { "name": "élmény", "count": 1 }] }`. Ebből dolgozik a címkeszűrő (új címke ott nem vehető fel) és a program űrlapjának címkemezője (ott igen).

### `POST /api/events` — új program

Törzs (JSON, sémája `createEventSchema` a `src/lib/events/api-schema.ts`-ben): `name` (kötelező), `from`/`to` (dátum, `to >= from`); választható: `tags[]` (bármilyen érvényes címke: normalizálódik — szélek levágva, belső szóközök összevonva, kisbetű —, 1–30 karakter, vessző nélkül, ismétlődés kiszűrve; alap üres), `description`, `companyName`, `location`, `applicationSheetUrl`, `ageRange` (`"12-18"`), `instructor`, `mentors[]`, `capacity` (egész, ≥ 0, alap 0). Üres szöveg `null`-ra normalizálódik. Az űrlap legalább 1 fős létszámot kér, ezt a kliens ellenőrzi.
Válasz: `201 { id }`; `400` `{error, details}` (mezőnkénti hibák); `401`.

### `GET /api/events/[id]`

Egy program összes mezője. `404`, ha nem létezik; `401`. A szerkesztő oldal (`/events/[id]/edit`) ugyanazt a `getEvent` függvényt (`src/lib/events/queries.ts`) hívja közvetlenül, nem HTTP-n.

### `PATCH /api/events/[id]` — program módosítása

Törzs: a `POST` mezői (`src/lib/events/api-schema.ts`, `updateEventSchema`), mind választható, de legalább egy kell. Csak a megadott mezők változnak; az opcionális szöveges mezők (`description`, `companyName`, `location`, `applicationSheetUrl`, `ageRange`, `instructor`) `null`-lal törölhetők. A `to >= from` ellenőrzés a tárolt értékekkel egyesítve történik.
A tranzakció a ténylegesen megváltozott mezőnként egy `History` sort ír (`tableName: "event"`, `fieldName` a Prisma mezőnév, `oldValue`/`newValue` szövegként; dátum ISO, lista JSON). Ha semmi sem változik, nem ír semmit.
Válasz: `200 { id }`; `400` `{error, details}`; `401`; `404`.

A módosítás és a törlés logikája: `src/lib/events/mutations.ts` (`updateEvent`, `deleteEvent`).

### `GET /api/events/[id]/applicants`

Paraméterek: `page`, `pageSize`, `status` (CSV enum), `ageFrom`, `ageTo`, `q`, `sort` (`lastName`|`birthYear`|`status`|`receivedAt`, alap `receivedAt`), `order` (alap `asc`).
Válasz: Application + beágyazott `applicant` (a törölt/anonimizált jelentkezők nélkül). `404`, ha az esemény nem létezik.

### `POST /api/events/[id]/applicants/status` — tömeges státuszmódosítás

Body: `{ "ids": ["…"], "status": "ACCEPTED" }` (1–100 egyedi `Application` id, `status` az `ApplicationStatus` enumból). Egy tranzakcióban csak a ténylegesen változó jelentkezések frissülnek (`status`, `updatedById`), soronként egy `History` sorral (`tableName: "application"`, `fieldName: "status"`, `oldValue`/`newValue` az enum kulcsa). A már célstátuszú sor kimarad. Válasz: `{ updated, skipped }`; hibák: 400 (validáció), 401, 404 (ismeretlen vagy másik programhoz tartozó id, semmi sem változik). Kód: `src/lib/applications/update-status.ts`. A férőhelyet a szerver nem kényszeríti ki, a felület csak figyelmeztet.

Egyéb: `GET /api/health` (nyilvános readiness, 200/503), `/api/auth/*` (NextAuth).

## Közös segédek (`src/lib/api/`)

- `handleQuery(request, schema, run)` (`handler.ts`): session ellenőrzés → **query** validáció → futtatás → egységes hibakezelés. Olvasó (GET) végpontokra.
- `handleBody(request, schema, run, { event, mapError?, failure?, select? })`: írási végpontokra. Session + felhasználó-azonosító ellenőrzés (`401`, a törzset ilyenkor nem olvassa) → JSON beolvasás (nem JSON → `400 {error:"Invalid request body"}`) → Zod validáció (`400 {error:"Invalid request body", details}`) → `run(data, { userId })`. A dobott hibát előbb a `mapError` válaszolja meg (ismert domain-hibák: 404, 409, Google-hibák); a többi a logba kerül `{ event, path, userId, err }` alakban, a kliens `500 {error:"Internal Server Error"}`-t kap (vagy a `failure` válaszát). A `select` a törzs egy részét adja a sémának (riport: `body.content`).
- `handleAdmin(request, run, options)`: ugyanez törzs nélkül (pl. `DELETE`, szinkronizálás).
- Válasz-segédek: `jsonResponse`, `unauthorized`, `notFound`, `internalError`, `invalidBody`, `invalidField(field, message)` (egy mezős `400`, a Zod `details` alakjával).
- `google-errors.ts`: `googleErrorResponse(error, reauthMessage?)` → `403 REAUTH_REQUIRED` vagy `422 SHEET_NOT_ACCESSIBLE`, más hibára `undefined` (a `mapError`-ba illeszthető).
- A History sorokat továbbra is a végpont (vagy a `src/lib` függvénye) írja.
- `query.ts`: `MAX_PAGE_SIZE` (100), `idListSchema` (tömeges műveletek 1–100 egyedi id-je), `paginationSchema`, `orderSchema`, `csvList`, `repeatedList` (vesszőt nem vágó lista szabad szöveghez), `booleanParam`, `optionalText`, `searchTokens`, `containsInsensitive`, `ageRangeToBirthYear`, `budapestYearRange`, `pageResult`.
- Rendezésnél mindig van másodlagos `id` rendezés (stabil lapozás); nullable mezőknél `nulls: "last"`.

## Konvenciók új végponthoz

1. Zod séma a query-re (vagy body-ra), szerveroldali validáció mindig.
2. Védelem: a layout nem védi a Route Handlert; lásd [auth-and-access.md](auth-and-access.md).
3. Teszt a végpont mellé (`route.test.ts`, Prisma mockolva); lásd [testing.md](testing.md).
4. Ne logolj kérés-törzset, felhasználói rekordot, e-mailt. A logger `err` szerializálója (`serializeError`, `src/lib/logger.ts`) a Prisma-hibákból a típust, a kódot (`code` / `errorCode`), a `meta`-t és a stack hívási sorait írja ki, az üzenetet nem (az a lekérdezés argumentumait idézheti). Kivétel a kapcsolódási hiba (`PrismaClientInitializationError`), annak üzenete megmarad. Fejlesztői módban (`NODE_ENV=development`) minden hiba teljes egészében a logba kerül. Más hibák üzenete és stackje mindig megmarad. Debugolás élesben: az `event` + `path` (rekord id) + `code`/`meta` + hívási hely mutatja, mi romlott el; a teljes üzenet lokálisan reprodukálva látszik.
5. Írási végpont: `handleBody` / `handleAdmin`, ne kézzel írt session- és törzsellenőrzés.

## `POST /api/events/[id]/sync` — Google Form sheet import

Az esemény `applicationSheetUrl`-jében megadott válasz-sheetet olvassa a **bejelentkezett admin Google-jogosultságával** (`spreadsheets.readonly` scope; a bejelentkezés a riportokhoz `drive.file`-t is kér; ha hiányzik: `403 REAUTH_REQUIRED`, újra be kell jelentkezni). A gid nélküli linknél az első munkalapot veszi.

- Oszlop ↔ mező párosítás: ha az eseménynek van mentett `applicationSheetMapping`-je (mező → **pontos** fejléc, kis-/nagybetű és szóköz-eltérés nem számít), az dönt; ha `null`, a fejléc-kulcsszavak alapján: `src/lib/sheet-import/mapping.ts` (kötelező: vezetéknév, utónév, e-mail; ha a mentett fejléc hiányzik a sheetből, `SHEET_HEADERS_MISSING`). Ismeretlen oszlopok (pl. kézi „1. oszlop”) kimaradnak, a válasz `unmappedHeaders`-ben listázza őket.
- Minden új válasz **új** `Applicant` + `Application`. Újraszinkronnál az `Application.sourceKey` (időbélyeg + e-mail, eseményen belül egyedi) miatt semmi nem jön létre kétszer, és semmi nem íródik felül.
- Duplikátum: azonos `Applicant.duplicateKey` (normalizált név + e-mail) → minden érintett jelentkező `duplicateFlag = true`. A kulcs és a jelző szabálya egy helyen van (`src/lib/applicants/duplicate-flags.ts`): `duplicateKey()`, és `recomputeDuplicateFlags(tx, keys)`, amit a szerkesztés, az anonimizálás, az összevonás és a seed hív – egy nem törölt jelentkező addig jelölt, amíg egy másik nem törölt jelentkező is ugyanazt a kulcsot viseli, és csak a ténylegesen változó sorok íródnak. Az import (egy új jelentkező hozzáadása) ugyanezt az eredményt adja, saját lépésekkel. Az eldöntésük a duplikáció-ellenőrzés képernyőn történik (merge vagy „nem duplikáció”), lásd lent.
- Válasz: `{ created, existing, duplicates, errors: [{ row, reason }], unmappedHeaders }`.

## `POST /api/applicants/merge` — duplikátumok összevonása

Body: `{ "primaryId": "…", "mergeIds": ["…"] }` (1–50 egyedi id, a `primaryId` nem lehet köztük). Egy tranzakcióban: a `mergeIds` jelentkezők összes jelentkezése az elsődlegeshez kerül (a jelentkezési adatok változatlanok; ugyanarra az eseményre több is maradhat), a `History`-ba `merged_from` sor kerül, a merge-elt jelentkezők törlődnek. A `duplicateFlag` csak akkor marad igaz, ha még van másik jelentkező ugyanazzal a `duplicateKey`-jel. Válasz: `{ applicant (jelentkezésekkel), movedApplications }`; hibák: 400 (validáció), 401, 404 (ismeretlen vagy törölt id), 409 (eltérő vagy hiányzó `duplicateKey`). Kód: `src/lib/applicants/merge.ts`.

## `GET /api/applicants/duplicates` — következő eldöntetlen duplikátumpár

Query: `skip` (≥ 0, alapértelmezés 0; a „Kihagyás most” lépteti, a végén körbeér). A párok az azonos `duplicateKey`-ű, nem törölt, `duplicateFlag`-es jelentkezőkből képződnek (egy N tagú csoport minden párja), kivéve a „nem duplikáció”-nak jelölt párokat (`src/lib/applicants/duplicate-pairs.ts`). Válasz: `{ total, index, pair: { a, b } | null }`; az `a` a korábban rögzített jelentkező, mindkettő minden adatával és jelentkezéseivel (program, státusz, beküldés). A jelentkezőlista bannere ebből veszi a darabszámot.

## `POST /api/applicants/duplicates/dismiss` — „nem duplikáció”

Body: `{ "applicantIds": ["…", "…"] }` (két különböző id). A pár rendezve (`applicantAId < applicantBId`) a `DuplicateDismissal` táblába kerül, a `History`-ba `duplicate_dismissed` sor. A döntés **párra** szól: ha később egy harmadik, azonos kulcsú jelentkező érkezik, az bármelyikükkel új párt alkot és megjelenik. A `duplicateFlag` nem változik. Hibák: 400, 401, 404 (ismeretlen vagy törölt), 409 (eltérő `duplicateKey`). Kód: `src/lib/applicants/dismiss-duplicate.ts`.

## `POST /api/events/[id]/feedback/sync` — visszajelző sheetek importja

Az esemény `participantFeedbackSheetUrl` és `mentorFeedbackSheetUrl` sheetjeit olvassa (csak a megadottakat) a bejelentkezett admin Google-jogosultságával, ugyanúgy, mint a jelentkezői sync. Csak az új válaszokat veszi fel, ismételhető. Az oszlopokat a mentett `participantFeedbackSheetMapping` / `mentorFeedbackSheetMapping` (`{ columns: kérdéskulcs|timestamp → pontos fejléc, custom: [{ label, kind, header }] }`) szerint, ennek hiányában a fejléc kulcsszavai alapján ismeri fel (`src/lib/feedback/questions.ts`). Az egyéni kérdések válasza `answers["custom:<label>"]` alá kerül (a részletnézet „Egyéni kérdések” szakaszában látszik, statisztikába nem számít).

### `POST /api/sheets/headers`

Törzs: `{ url }`. A sheet első sorát (fejléceit) adja vissza `{ headers: string[] }` alakban, a bejelentkezett admin Google-hozzáférésével; az esemény-szerkesztő „Mező-megfeleltetés” lenyílója használja (`src/components/events/sheet-mapping-editor.tsx`). A mentett megfeleltetés sémái: `src/lib/sheet-mapping/schema.ts`.

- `200`: `{ PARTICIPANT?: Result, MENTOR?: Result }`, ahol `Result = { created, existing, errors: { row, reason }[], unmappedHeaders }`.
- `422 SHEET_URL_INVALID`: egyik sheet sincs megadva, vagy valamelyik link érvénytelen.
- `422 SHEET_HEADERS_MISSING`: `{ role, missing[] }` – kötelező oszlop hiányzik (időbélyeg; résztvevőnél a mentor- és az oktatóértékelés, mentornál az összértékelés).
- `422 SHEET_NOT_ACCESSIBLE`, `403 REAUTH_REQUIRED`: mint a jelentkezői syncnél.

A lista nem API-n megy: a `/feedback` oldal és a program „Visszajelzések” füle (`/events/[id]/feedback`) szerveren olvas (`src/lib/feedback/list.ts`), a szűrők (`q`, `role`, `eventId`, `page`, `open`) az URL-ben vannak.

## Záró riport (`/api/events/[id]/report…`)

A program „Záró riport” füle (`/events/[id]/report`) és a `/reports` lista szerveren olvas (`src/lib/reports/load.ts`, `list.ts`). A tartalom sémája `src/lib/reports/content.ts` (közreműködők, max. 8 idézet, ebből max. 2 kiemelt, kikapcsolt mutatók). A riport névsort nem tartalmaz: résztvevőkből csak darabszám, az idézeteknél csak a szerep.

- `PUT /api/events/[id]/report` — `{ content }` mentése (`EventReport`, eseményenként egy). `200 { ok }`, `400` validációs hiba, `404`.
- `POST /api/events/[id]/report/documents` — `{ content }` mentése, majd **mindig új** Google Doc a bejelentkezett admin saját Drive-jába (a `REPORT_TEMPLATE_DOC_ID` Google Doc sablon másolata, kitöltve a Docs API-val: `src/lib/reports/template.ts`; `drive.file` + `drive.readonly` scope). Naplózza: `EventReportDocument` + `History` (`tableName: "event"`, `fieldName: "reportDocument"`). `201 { id, title, docUrl, createdAt }`, `403 REAUTH_REQUIRED` (hiányzó scope: újra be kell jelentkezni), `422 TEMPLATE_NOT_ACCESSIBLE` (a sablon nincs megosztva), `503 DRIVE_API_DISABLED` / `DOCS_API_DISABLED`, `502` Google-hiba.
