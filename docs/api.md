# API

A végpontok többsége `GET`; az első írási végpont a `POST /api/applicants/delete`. Továbbiak (POST/PATCH/DELETE) várhatók. Mindegyik bejelentkezést igényel, `Cache-Control: no-store`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

## Közös válaszformák

- Lapozott lista: `{ items, total, page, pageSize }`
- Hibák: `401 {error:"Unauthorized"}` · `400 {error:"Invalid query parameters", details}` (Zod `flattenError`) · `404` ha nincs az erőforrás · `500 {error:"Internal Server Error"}` (részletek csak a logban).

## Végpontok

### `GET /api/applicants`

Paraméterek: `page`, `pageSize` (alap 20, max 100), `eventIds` (CSV vagy ismételt), `ageFrom`, `ageTo` (`ageFrom ≤ ageTo`), `hometown`, `newsletter`, `attended` (bool), `q` (szavanként AND; keresés: keresztnév, vezetéknév, e-mail), `sort` (`lastName`|`birthYear`|`hometown`|`createdAt`, alap `lastName`), `order` (alap `asc`).
Válasz: jelentkezők + `applications` (id, status, receivedAt, event{id,name,from}), `receivedAt desc`. A törölt (anonimizált, `deletedAt` nem null) jelentkezők soha nem szerepelnek benne.

### `POST /api/applicants/delete`

GDPR-törlés anonimizálással (részletek: [data-and-db.md](data-and-db.md#jelentkező-törlése-gdpr-anonimizálás)). Törzs: `{ "ids": string[] }` (1–100, egyedi, nem üres). Válasz: `200 { deleted }`, ahol a `deleted` a most törölt jelentkezők száma (a már törölteket kihagyja). Hibák: `401` · `400 {error:"Invalid request body", details}` · `404`, ha bármelyik id ismeretlen (ilyenkor semmi sem változik) · `500`. Egy tranzakcióban fut; a log csak `{ event: "applicants.anonymized", userId, count }`.

### `GET /api/events`

Paraméterek: `page`, `pageSize`, `year`, `companyName`, `instructor`, `q` (név), `sort` (`from`|`name`|`companyName`|`capacity`, alap `from`), `order` (alap: `from` esetén desc, különben asc).
Válasz: események + `applicationCounts` (státuszonként + `total`).

### `GET /api/events/[id]/applicants`

Paraméterek: `page`, `pageSize`, `status` (CSV enum), `ageFrom`, `ageTo`, `q`, `sort` (`lastName`|`birthYear`|`status`|`receivedAt`, alap `receivedAt`), `order` (alap `asc`).
Válasz: Application + beágyazott `applicant`. `404`, ha az esemény nem létezik.

Egyéb: `GET /api/health` (nyilvános readiness, 200/503), `/api/auth/*` (NextAuth).

## Közös segédek (`src/lib/api/`)

- `handleQuery(request, schema, run)`: session ellenőrzés → **query** validáció → futtatás → egységes hibakezelés. Olvasó (GET) végpontokra készült; **írási végpontokhoz még nincs megfelelője** (body-validáció, módosító műveletek, History-naplózás, esetleges tranzakció), ezt az első írási igénynél kell kialakítani, a `handleQuery` mintájára.
- `query.ts`: `paginationSchema`, `orderSchema`, `csvList`, `booleanParam`, `optionalText`, `searchTokens`, `containsInsensitive`, `ageRangeToBirthYear`, `budapestYearRange`, `pageResult`.
- Rendezésnél mindig van másodlagos `id` rendezés (stabil lapozás); nullable mezőknél `nulls: "last"`.

## Konvenciók új végponthoz

1. Zod séma a query-re (vagy body-ra), szerveroldali validáció mindig.
2. Védelem: a layout nem védi a Route Handlert; lásd [auth-and-access.md](auth-and-access.md).
3. Teszt a végpont mellé (`route.test.ts`, Prisma mockolva); lásd [testing.md](testing.md).
4. Ne logolj kérés-törzset, felhasználói rekordot, e-mailt.
