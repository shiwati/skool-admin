# Adatbázis

- PostgreSQL, Prisma 7. A `db` singleton: `src/lib/db.ts` (`@prisma/adapter-pg` pool, dev hot reload alatt újrahasznosítva).
- Generátor: `prisma-client-js` (a `@next-auth/prisma-adapter` miatt). A Prisma CLI konfigja: `prisma.config.ts`.
- `pino`, `pino-pretty` és a Prisma csomagok a `next.config.ts` `serverExternalPackages` listájában vannak.

## Migrációk

- Új migráció: `npm run db:migrate -- --name leiras` → **commitold** a `prisma/migrations/` tartalmát.
- Alkalmazás (deploy/CI): `npm run db:deploy`. Prodban soha `db push` vagy `migrate dev`.
- `20261028212000_auth_infrastructure`: NextAuth táblák.
- `20261119171300_domain_models`: `applicant`, `application`, `event`, `history`, `application_status` enum.
- `20261119172536_applicants_soft_delete`: `applicant.deleted_at` / `deleted_by` (GDPR-törlés, lásd lent).
- `20261119184343_applicant_duplicates_and_source_key`: `applicant.duplicate_key` / `duplicate_flag` (sync-duplikátumok), `application.source_key`; az `application` egyedi kulcsa `(event_id, applicant_id)` helyett `(event_id, source_key)`.
- `20261119205135_duplicate_dismissals`: `duplicate_dismissal` tábla („nem duplikáció” döntések jelentkezőpáronként, rendezett `applicant_a_id < applicant_b_id`, kaszkád törléssel).
- A Prisma 7 a `migrate dev` után **nem** generál klienst automatikusan: futtasd az `npx prisma generate`-et (vagy az `npm run typecheck`-et).

## Lokális mintaadat (seed)

Cél: fejlesztéshez legyen alapadat a **lokális** adatbázisban, ami az éles adatbázist soha nem érintheti. A seed **nem** az éles adatbetöltés: azt később maga az app végzi majd Google Sheetből (lásd lent).

- Parancsok: `npm run db:seed` (upsert, újrafuttatható) · `npm run db:seed:reset` (törli az `application`/`applicant`/`event` sorokat, majd újratölti). A `dev:all` is futtatja a `db:seed`-et.
- Forrás: `prisma/seed-data/local.json`, ha létezik (**gitignore**, ide jöhet valódi adat), különben a commitolt, kitalált `prisma/seed-data/sample.json`.
- **Dashboard-demóadat** (`src/lib/seed-demo-data.ts`): kitalált, determinisztikus adat (~40 program, 260 jelentkező, ~1300 jelentkezés, `demo_…` id-kkel), hogy az Áttekintés minden kártyája tesztelhető legyen: előző év januárjától a futtatás utáni 3 hónapig havonta 1–2 program, 0,5×–3,2× túljelentkezés, ismétlődő jelentkezők, hiányzó születési év/település, eltérő írásmódú település. A dátumok a futtatás idejéhez igazodnak. A `sample.json` mellé mindig betöltődik; a `local.json` mellé csak `npm run db:seed:demo` (`--demo`) esetén. Eltávolítás: `npm run db:seed:reset` (local.json esetén utána demó nélkül tölt vissza).
- Formátum: `events[]`, `applicants[]`, `applications[]`, explicit szöveges id-kkel, amikre egymásra hivatkoznak (pl. `seed_event_1`). Validáció és hivatkozás-ellenőrzés: `src/lib/seed-data-schema.ts` (Zod).
- Védelem (`src/lib/seed-guard.ts`): a seed megtagad minden futást, ha `NODE_ENV=production`, vagy a `DATABASE_URL` hosztja nem `localhost` / `127.0.0.1` / `::1`, vagy az URL érvénytelen. Nem része a `db:deploy`-nak, a buildnek, a CI-nak.
- A seed csak a `DATABASE_URL`-t igényli, nem az app teljes env-jét.
- Figyelem: a `dev:all` minden indításkor visszaírja a seedelt sorokat a fájl szerinti állapotra (upsert), tehát a lokális kézi módosításukat felülírja.

## Sheet-import (tervezett)

Az éles adatot az app tölti majd be Google Sheetből, bejelentkezett adminként. A seed adatfájl-formátuma (`dataFileSchema`) úgy készült, hogy az import ugyanebbe a formába konvertálhasson és ugyanazt a validációt használja. Nyitott: a Sheet sorainak nincs id-ja, a jelentkezőnek nincs természetes egyedi kulcsa, ezt az import tervezésekor kell eldönteni ([gaps-and-decisions.md](gaps-and-decisions.md)).

## Lokális környezet

`npm run services:up` indítja a Postgrest (:5432) és a pgAdmint (:5050) Docker Compose-szal; a pgAdmin szerverlistája: `docker/pgadmin/servers.json`.

## Jelentkező törlése (GDPR, anonimizálás)

Jelentkezőt fizikailag nem törlünk. A törlés (`anonymizeApplicants`, `src/lib/applicants/anonymize.ts`) egy tranzakcióban fut:

- A név „Törölt” / „jelentkező” lesz; az e-mail, a telefon, az iskola és minden szülői mező `null`, a hírlevél `false`. A `duplicateKey` (normalizált név + e-mail, tehát személyes adat) `null` lesz, a `duplicateFlag` `false`; a vele azonos kulcsú, megmaradt jelentkezők jelölése újraszámolódik. A születési év és a település megmarad (statisztikához).
- A `deletedAt` / `deletedById` rögzíti, mikor és ki törölte. Visszaállítás nincs.
- A jelentkezések (program, státusz, dátumok) megmaradnak, a szabad szöveges válaszaik törlődnek.
- A `history` sorokból (`table_name` = `applicant` vagy `application`, `record_id` = az érintett id) kikerülnek a régi és új értékek, egy új sor (`field_name` = `deletedAt`) pedig rögzíti a törlést.

Minden **személyeket listázó/mutató** lekérdezésnek `deletedAt: null`-ra kell szűrnie (a `GET /api/applicants` ezt teszi). **Kivétel: a statisztikák** (dashboard, riport résztvevőszám, visszajelzések kitöltési aránya) az anonimizált jelentkezők jelentkezéseit is számolják — az anonimizálás épp ezért van.

**Duplikátum-összevonás ≠ GDPR-törlés:** összevonáskor a beolvasztott jelentkező jelentkezései és History sorai a megtartott jelentkezőhöz kerülnek, a rekordja **véglegesen törlődik** (ugyanaz a személy, egynek kell látszania mindenhol). Az újraimportálást az `Application.sourceKey` akadályozza meg, ami a jelentkezéssel együtt költözik. Lokálisan: a `db:seed` upsertje egy törölt mintajelentkezőnek visszaírja a személyes adatait, de a `deletedAt`-et nem nullázza, így a jelentkező rejtve marad. Teljes visszaállításhoz használd a `db:seed:reset`-et.

## History

A `History` tábla mezőszintű változásnapló (`tableName`, `fieldName`, `recordId`, régi/új érték, ki változtatta). Konvenció: a `tableName` az adatbázistábla neve (`@@map`, pl. `applicant`), a `fieldName` a Prisma-mezőnév, az érték szövegként (szám és logikai is, pl. `"2010"`, `"true"`).

Írói:

- **GDPR-törlés** (`anonymize.ts`): kitisztítja a jelentkező és jelentkezései régi/új értékeit, és egy `deletedAt` sort ír.
- **Duplikátum-összevonás** (`merged_from`) és **-elvetés** (`duplicate_dismissed`).
- **Program szerkesztése** (`PATCH /api/events/[id]`): `tableName: "event"`, mezőnként egy sor; dátum ISO, lista JSON.
- **Jelentkező szerkesztése** (`updateApplicant`, `src/lib/applicants/update.ts`): minden ténylegesen megváltozott mezőhöz egy sor, a mentéssel azonos tranzakcióban. Mivel `tableName: "applicant"`, a GDPR-törlés ezeket is kitisztítja.

Általános írási logika (pl. Prisma extension) még nincs; ha még több író lesz, érdemes központosítani. Az `updatedBy` mezők ugyanezt a célt szolgálják rekordszinten.

Olvasói: a jelentkező adatlap (legfrissebb 5) és a `/history/[id]` oldal (legfeljebb 200).
