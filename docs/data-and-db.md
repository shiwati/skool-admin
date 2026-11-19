# Adatbázis

- PostgreSQL, Prisma 7. A `db` singleton: `src/lib/db.ts` (`@prisma/adapter-pg` pool, dev hot reload alatt újrahasznosítva).
- Generátor: `prisma-client-js` (a `@next-auth/prisma-adapter` miatt). A Prisma CLI konfigja: `prisma.config.ts`.
- `pino`, `pino-pretty` és a Prisma csomagok a `next.config.ts` `serverExternalPackages` listájában vannak.

## Migrációk

- Új migráció: `npm run db:migrate -- --name leiras` → **commitold** a `prisma/migrations/` tartalmát.
- Alkalmazás (deploy/CI): `npm run db:deploy`. Prodban soha `db push` vagy `migrate dev`.
- Jelenleg egyetlen migráció van: `20261028212000_auth_infrastructure` (csak a NextAuth táblák). **A doménmodellhez még nincs migráció**, lásd [gaps-and-decisions.md](gaps-and-decisions.md).

## Seed

`prisma/seed.ts` idempotens, jelenleg csak egy `SELECT 1`-et futtat; nem hoz létre felhasználót vagy adatot. Új seed-lépés is legyen idempotens.

## Lokális környezet

`npm run services:up` indítja a Postgrest (:5432) és a pgAdmint (:5050) Docker Compose-szal; a pgAdmin szerverlistája: `docker/pgadmin/servers.json`.

## History (terv)

A `History` tábla mezőszintű változásnaplónak készült (`tableName`, `fieldName`, `recordId`, régi/új érték, ki változtatta). Írási logika még nincs; ha lesz, érdemes egy központi helyen (pl. szerviz-réteg vagy Prisma extension) megoldani, hogy ne lehessen kihagyni. Az `updatedBy` mezők ugyanezt a célt szolgálják rekordszinten.
