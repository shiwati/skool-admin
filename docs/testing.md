# Tesztelés

- Vitest + Testing Library, alapból jsdom. Tesztek a kód mellett: `src/**/*.test.{ts,tsx}` (csak ez a glob fut).
- Szerver/route tesztek: `// @vitest-environment node`, a külső határokat (`@/lib/db`, `@/lib/logger`, session) `vi.hoisted` + `vi.mock` mockolja. Minta: `src/app/api/health/route.test.ts`, `src/app/api/applicants/route.test.ts`.
- A `server-only` import no-op stubra van aliasolva (`tests/server-only.ts`), így a szerver modulok importálhatók.
- **Nincs valódi adatbázis a tesztekben.**
- Tiszta logika (pl. `access-policy`, `callback-url`, `query`, `env-schema`) külön, egyszerű unit teszttel.

## Parancsok

```sh
npm test                                   # minden teszt
npx vitest run src/lib/utils.test.ts       # egy fájl
npx vitest run -t "returns readiness"      # név szerint
npm run test:watch | test:coverage
npm run lint && npm run typecheck && npm run format:check
```
