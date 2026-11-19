# Adatbázis

- PostgreSQL, Prisma 7. A `db` singleton: `src/lib/db.ts` (`@prisma/adapter-pg` pool, dev hot reload alatt újrahasznosítva).
- Generátor: `prisma-client-js` (a `@next-auth/prisma-adapter` miatt). A Prisma CLI konfigja: `prisma.config.ts`.
- `pino`, `pino-pretty` és a Prisma csomagok a `next.config.ts` `serverExternalPackages` listájában vannak.

## Migrációk

- Új migráció: `npm run db:migrate -- --name leiras` → **commitold** a `prisma/migrations/` tartalmát.
- Alkalmazás (deploy/CI): `npm run db:deploy`. Prodban soha `db push` vagy `migrate dev`.
- `20261028212000_auth_infrastructure`: NextAuth táblák.
- `20261119171300_domain_models`: `applicant`, `application`, `event`, `history`, `application_status` enum.

## Lokális mintaadat (seed)

Cél: fejlesztéshez legyen alapadat a **lokális** adatbázisban, ami az éles adatbázist soha nem érintheti. A seed **nem** az éles adatbetöltés: azt később maga az app végzi majd Google Sheetből (lásd lent).

- Parancsok: `npm run db:seed` (upsert, újrafuttatható) · `npm run db:seed:reset` (törli az `application`/`applicant`/`event` sorokat, majd újratölti). A `dev:all` is futtatja a `db:seed`-et.
- Forrás: `prisma/seed-data/local.json`, ha létezik (**gitignore**, ide jöhet valódi adat), különben a commitolt, kitalált `prisma/seed-data/sample.json`.
- Formátum: `events[]`, `applicants[]`, `applications[]`, explicit szöveges id-kkel, amikre egymásra hivatkoznak (pl. `seed_event_1`). Validáció és hivatkozás-ellenőrzés: `src/lib/seed-data-schema.ts` (Zod).
- Védelem (`src/lib/seed-guard.ts`): a seed megtagad minden futást, ha `NODE_ENV=production`, vagy a `DATABASE_URL` hosztja nem `localhost` / `127.0.0.1` / `::1`, vagy az URL érvénytelen. Nem része a `db:deploy`-nak, a buildnek, a CI-nak.
- A seed csak a `DATABASE_URL`-t igényli, nem az app teljes env-jét.
- Figyelem: a `dev:all` minden indításkor visszaírja a seedelt sorokat a fájl szerinti állapotra (upsert), tehát a lokális kézi módosításukat felülírja.

## Sheet-import (tervezett)

Az éles adatot az app tölti majd be Google Sheetből, bejelentkezett adminként. A seed adatfájl-formátuma (`dataFileSchema`) úgy készült, hogy az import ugyanebbe a formába konvertálhasson és ugyanazt a validációt használja. Nyitott: a Sheet sorainak nincs id-ja, a jelentkezőnek nincs természetes egyedi kulcsa, ezt az import tervezésekor kell eldönteni ([gaps-and-decisions.md](gaps-and-decisions.md)).

## Lokális környezet

`npm run services:up` indítja a Postgrest (:5432) és a pgAdmint (:5050) Docker Compose-szal; a pgAdmin szerverlistája: `docker/pgadmin/servers.json`.

## History (terv)

A `History` tábla mezőszintű változásnaplónak készült (`tableName`, `fieldName`, `recordId`, régi/új érték, ki változtatta). Írási logika még nincs; ha lesz, érdemes egy központi helyen (pl. szerviz-réteg vagy Prisma extension) megoldani, hogy ne lehessen kihagyni. Az `updatedBy` mezők ugyanezt a célt szolgálják rekordszinten.
