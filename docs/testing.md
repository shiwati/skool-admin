# Tesztelés

- Vitest + Testing Library, alapból jsdom. Tesztek a kód mellett: `src/**/*.test.{ts,tsx}` (csak ez a glob fut).
- Szerver/route tesztek: `// @vitest-environment node`, a külső határokat (`@/lib/db`, `@/lib/logger`, session) `vi.hoisted` + `vi.mock` mockolja. Minta: `src/app/api/health/route.test.ts`, `src/app/api/applicants/route.test.ts`.
- A `server-only` import no-op stubra van aliasolva (`tests/server-only.ts`), így a szerver modulok importálhatók.
- **A Vitest tesztekben nincs valódi adatbázis** (az E2E teszteknek van sajátjuk, lásd lent).
- Tiszta logika (pl. `access-policy`, `callback-url`, `query`, `env-schema`) külön, egyszerű unit teszttel.

## Parancsok

```sh
npm test                                   # minden teszt
npx vitest run src/lib/utils.test.ts       # egy fájl
npx vitest run -t "returns readiness"      # név szerint
npm run test:watch | test:coverage
npm run lint && npm run typecheck && npm run format:check
npm run test:e2e                           # Playwright E2E (lásd lent)
npx playwright test e2e/events-list.spec.ts  # egy E2E fájl
npm run test:e2e:ui                        # interaktív futtató
```

## E2E tesztek (Playwright)

- **Mire valók:** a valódi alkalmazást hajtják Chromiumban. Azt ellenőrzik, amit a jsdom nem tud: layout, töréspontok, görgetés a táblakereten belül, valódi navigáció és URL-állapot. Jelenleg a három lista (Jelentkezők, Programok, a program Jelentkezők füle) viselkedését rögzítik asztali, tablet (820 px) és telefon (390 px) szélességen, regressziós hálóként a táblákat érintő változtatásokhoz.
- **Hozzáférés (`e2e/access.spec.ts`):** a route-okat a fájlrendszerből gyűjti (`e2e/support/routes.ts`): minden `src/app/api/**/route.ts` minden exportált metódusa session nélkül `401 {"error":"Unauthorized"}`-t ad, átirányítás nélkül (kivétel: `/api/auth/*`, `/api/health`), és minden `(admin)` oldal a `/login?callbackUrl=…` címre visz. Új route vagy oldal így automatikusan bekerül; ha egy új dinamikus szegmens kell, a `PAGE_IDS`-be vedd fel. Az API-hívások nem létező id-t kapnak, hogy egy védelem nélküli route se írjon valós adatba.
- **Hol:** `e2e/*.spec.ts`; a setup `e2e/auth.setup.ts`, a segédek `e2e/support/`. A Vitest ezeket nem futtatja (csak a `src/**/*.test.{ts,tsx}` glob az övé).
- **Első alkalommal:** `npx playwright install chromium`, és fusson a lokális Postgres (`npm run services:up`).
- **Futás:** a `playwright.config.ts` buildeli az appot, és a 3100-as porton indítja (`next start`), így nem ütközik a 3000-es dev szerverrel. Ha a 3100-on már fut egy szerver, újrahasználja.
- **Saját adatbázis:** `<DATABASE_URL adatbázisa>_e2e` ugyanazon a szerveren (felülírható: `E2E_DATABASE_URL`). A setup minden futás előtt létrehozza, ha kell, lefuttatja a migrációkat, **kiüríti**, és betölti az `e2e/support/fixtures.ts` adatait. Nem lokális, vagy nem `_e2e` végű adatbázisra nem fut, így a fejlesztői adatokhoz sosem nyúl.
- **Bejelentkezés:** Google nélkül. A setup beír egy NextAuth `Session` sort az admin felhasználóhoz, és a cookie-t (`next-auth.session-token`) a böngészőállapotba teszi (`e2e/.auth/`, gitignore-olt). Az auth kód nem változik, tesztes provider nincs.
- **Tesztadat:** determinisztikus. ASCII nevek (a rendezés bármely kollációval ugyanaz), rögzített dátumok és egyedi rendezési kulcsok. A várt sorrendet a tesztek a fixture-ökből számolják (`applicantNames`, `eventNames`, `overviewApplicantNames`). A mai naptól függő dolgot (életkor, 16+, programfázis) ne ellenőrizz.
- **Olvasó tesztek** (`e2e/*.spec.ts`, `chromium` projekt): a közös fixture-adatot olvassák, pontos számokkal („1–25 / 30 jelentkező”), ezért ehhez az adathoz semmi nem írhat.
- **Író tesztek** (`e2e/writes/*.spec.ts`, `writes` projekt): az olvasók után futnak, és az **adatgyárral** (`e2e/support/factory.ts`) saját adatot hoznak létre. Az importjuk `import { expect, test } from "../support/test"`, a teszt a `factory` fixture-t kapja: `factory.event()`, `factory.applicant()`, `factory.application({ applicant, event, status })`, `factory.duplicatePair()`. Minden rekord tesztenként egyedi azonosítót és nevet kap (`factory.token`, újrapróbálásnál és ismétlésnél is egyedi), így a listán `?q=${factory.token}` csak a teszt sorait adja. Ne nyúlj a közös fixture-adathoz, globális számot (dashboard, lista összesen) csak előtte–utána különbségként ellenőrizz. Takarítás nem kell: a setup minden futás elején kiüríti az adatbázist. Ha egy olvasó teszt elbukik, a `writes` projekt nem fut le.
- **Mit fednek le az író tesztek:** GDPR-törlés az adatlapról (`anonymization.spec.ts`: személyes adat törlése, a jelentkezés megmarad, napló-tisztítás, a duplikátum-jelző újraszámolása), duplikátumok (`duplicates.spec.ts`: összevonás az ellenőrző ablakból, „nem duplikáció”, a merge 409/404 válaszai), státuszváltás a program Jelentkezők fülén (`status-change.spec.ts`: tömeges és soronkénti váltás, a már célstátuszú jelentkezés kihagyása, a változásnapló sorai, a kapacitás-figyelmeztetés „Mégse” és „Elfogadás mégis” ágai). CSV export: az olvasó `csv-export.spec.ts` a közös adaton (fájlnév, BOM, pontosvessző, CRLF, oszlopok az oszlopbeállítás szerint, szűrés, üres eredmény, programok minden oldala), az író `writes/csv-export.spec.ts` saját adaton (képlet-semlegesítés, 100 sornál több export). A letöltést és a feldolgozást az `e2e/support/csv.ts` végzi, az app kódjától függetlenül. A duplikátum-ablak a párokat globális sorrendben mutatja, ezért az `openPair` segéd a „Kihagyás most” gombbal lép a teszt saját párjáig. Ami a felületen nem látszik (pl. History, `deletedById`), azt a `db` fixture-rel ellenőrizd.
- **Szabályok:** Szerep és akadálymentes név alapján keress (`getByRole`, `toHaveAccessibleName`), ne CSS-osztályra; a `data-testid` csak ott jó, ahol nincs szerep (pl. a tábla görgető kerete).
- **Mikor fut:** a teljes csomag buildel, ezért nem minden módosítás után. OpenSpec change-ben egyszer, a `tasks.md` végi „Verification” lépésben (ezt az `openspec/config.yaml` `rules.tasks` szabálya teszi bele a UI-t, oldalt vagy API route-ot érintő change-ekbe; az apply közben csak a Vitest fut, az archive előtt ellenőrizni kell, hogy az E2E lefutott). Change nélkül: UI/oldal/API változásnál az érintett spec fájl, commit vagy push előtt a teljes `npm run test:e2e`. Csak spec, dokumentáció vagy tiszta lib változásnál kimarad. Ha nem fut a lokális Postgres, az E2E kimarad, és ezt jelezni kell.
- **CI:** a `.github/workflows/e2e.yml` futtatja PR-on és `main`/`develop` pushon, saját Postgres service-szel (`E2E_DATABASE_URL`) és helyőrző env-vel; hiba esetén a riport artifactként letölthető.
