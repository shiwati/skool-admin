# Munkafolyamat

## Első indítás

```sh
cp .env.example .env     # NEXTAUTH_SECRET: openssl rand -base64 32 (≥32 karakter)
npm ci
npm run services:up
npm run db:deploy
npm run db:seed
npm run dev              # http://localhost:3000
```

`npm run dev:all` egyben: services + migrate deploy + generate + dev. A `build` érvényes env-változókat igényel.

## Eszközök

- Node 26 / npm 11.20.0 (Volta), **pontos** függőségverziók; a telepítési scriptek az `allowScripts` listán vannak a `package.json`-ban (frissítés: `npm install-scripts`).
- ESLint szándékosan v9 (plugin peer tartományok): ne frissítsd 10-re.
- Husky pre-commit: lint-staged (`eslint --fix` + prettier; `.prisma` fájlra `prisma format`).

## Környezeti változók

Új változó három helyre kerül: `src/lib/env-schema.ts` (Zod), `.env.example`, README tábla. Az env csak szerveroldali, titkot soha ne tegyél `NEXT_PUBLIC_*` alá. Indításkor az `instrumentation.ts` is validál.

## Naplózás és health

- `src/lib/logger.ts`: Pino (prodban JSON, devben pino-pretty, redakcióval). Ne logolj sessiont, hitelesítő adatot, user rekordot, kérés-törzset.
- `GET /api/health`: readiness (`SELECT 1`), 200/503, `no-store`, hibarészletet nem szivárogtat.

## OpenSpec

Specifikáció-vezérelt változáskezelés: `openspec/specs/` (érvényes követelmények), `openspec/changes/` (folyamatban), `changes/archive/` (lezárt). Az `openspec-*` skillek vezetik a javaslat → megvalósítás → archiválás menetet. Jelenleg egy spec van: `admin-auth`.
**Az új igényeket itt érdemes rögzíteni, nem a `docs/`-ban.**

## Git

Fő ág: `main`, fejlesztés: `develop`. Commitot és pusht csak kérésre.
