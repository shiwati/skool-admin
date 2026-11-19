# Áttekintés

**SKOOL Menedzsment**: belső admin alkalmazás a Skool programjaihoz (események) és a rájuk jelentkezőkhöz. Belépni csak a Skool Google Workspace tagjai tudnak.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn/ui · Prisma 7 + PostgreSQL · NextAuth.js v4 · Zod · Pino · Vitest. Az app a gazdagépen fut (`npm run dev`), csak a Postgres és a pgAdmin fut Dockerben.

Fontos: a Next.js verziója eltér a megszokottól; kódírás előtt nézd meg a `node_modules/next/dist/docs/` releváns részét (lásd `AGENTS.md`).

## Jelenlegi állapot

- Kész: Google-belépés, védelem, health check, logolás, env-validáció, közös UI-elemek.
- Kész: doménmodell a Prisma sémában (lásd [domain.md](domain.md)) és három API végpont, amelyek **egyelőre mind GET** (lásd [api.md](api.md)); írási (POST/PATCH/DELETE) végpontok várhatók.
- **Nincs még**: valódi admin felület (a főoldal placeholder), Sheet-import (lásd [gaps-and-decisions.md](gaps-and-decisions.md)). Lokális mintaadat van: [data-and-db.md](data-and-db.md).

## Könyvtárszerkezet

```
src/
  app/
    (admin)/        védett oldalak; a layout requireAdmin()-t hív
    api/            Route Handlerek: auth, health, applicants, events
    login/          belépő oldal (Google gomb, hibaállapotok)
  components/
    ui/             shadcn primitívek
    charts/         ChartContainer (Recharts, akadálymentes)
    data-table.tsx  TanStack tábla, kliensoldali rendezés/lapozás
  hooks/            useZodForm
  lib/
    api/            handler.ts (handleQuery), query.ts (paraméter-segédek)
    auth.ts, access-policy.ts, session.ts, callback-url.ts
    db.ts, env.ts, env-schema.ts, logger.ts, validation.ts, utils.ts
  instrumentation.ts  indításkor env-validáció
prisma/             schema.prisma, migrations/, seed.ts
openspec/           specifikáció-vezérelt változáskezelés
tests/              vitest setup, server-only stub
docs/               ez a tudásbázis
```
