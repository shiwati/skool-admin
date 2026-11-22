# Eltérések, nyitott kérdések, döntések

## Eltérések a kód és a dokumentáció között

1. ~~Hiányzó doménmigráció~~ **Megoldva (2026-11-19):** `20261119171300_domain_models`.
2. ~~Elavult `CLAUDE.md`~~ **Megoldva:** frissítve, hivatkozik a `docs/`-ra.
3. ~~Védelem-minta eltérés (`handleQuery` közvetlenül `getServerSession`-t hívott)~~ **Megoldva (2026-11-21):** a `handleQuery` is `getAdminSession()`-t használ, és nem logolja a kérés query stringjét (keresett név/e-mail).
4. **README** szándékosan csak a telepítést és az env-et dokumentálja; a végpontok a [api.md](api.md)-ben vannak.
5. ~~OpenSpec: csak az `admin-auth` spec van meg~~ **Megoldva (2026-11-21):** a 2026-11-21-i audit után minden megvalósított funkciónak van specje (`openspec list --specs`).
6. ~~Lemaradt specek a listáknál~~ **Megoldva (2026-11-22):** az `applicant-list`, az `event-list` és az `event-overview` (Jelentkezők fül) spec a kódhoz igazítva. Eltérések voltak: a Jelentkezők listáról kivett sorkijelölés és tömeges sáv (`17c6e45`), az új szűrők („Program éve”, „Előzmény” tól–ig), a két fázis („Jövőbeli” / „Múltbeli”, alap fül „Összes”), a „Cég” oszlop és szűrő, a „Betelt” felirat, a sor menüjének szerkesztés és törlés pontja, valamint a soronkénti státuszváltás. Az `applicant-anonymization` spec belépési pontja is igazítva (2026-11-22): törölni csak az adatlap „Profil törlése” gombjával lehet.

## Nyitott kérdések (az igények ismeretében eldöntendők)

- ~~Sheet-import azonosítás~~ Eldöntve: a sort az `(eventId, sourceKey)` azonosítja (időbélyeg + e-mail), a jelentkezőt nem párosítjuk automatikusan; az azonos név + e-mail duplikátumjelzést kap, az admin vonja össze. Lásd lent és az `applicant-sheet-import` specet.
- ~~Írási végpontok közös alapja, History-naplózás~~ Eldöntve: nincs közös segéd, minden írási végpont maga ellenőriz sessiont, validál és ír History-t (lásd [api.md](api.md)); a szabályokat az `api-conventions` spec rögzíti.
- ~~Szerveroldali lapozású tábla~~ Megoldva: `ApplicantsTable` (`src/components/applicants/`).
- Szerepkörök: marad az "egy Workspace-tag = admin" modell?
- Személyes adatok (gyerekek, szülők): adatkezelési/GDPR követelmények, megőrzés, törlés.
- **Esemény törlése (elhalasztva, 2026-11-21):** a `DELETE /api/events/[id]` véglegesen törli az eseményt és vele az összes jelentkezését, így ezek a statisztikákból (dashboard, riport) is eltűnnek — ellentétben azzal a szándékkal, hogy a statisztikák megmaradjanak (az anonimizált jelentkezők is számítanak). Lehetőségek: törlés tiltása, ha van jelentkezés; soft delete; marad így. **Egyelőre marad**, de mielőtt az esemény-törléshez vagy a statisztikákhoz nyúlunk, vissza kell rá térni.

## Ismert korlátok és furcsaságok

Tudatosan nem javított viselkedések (2026-11-21-i audit). Ha ezekkel kapcsolatos hibát jelentenek, először ezt nézd meg.

**Jelentkező-import (Sheet szinkron, `src/lib/sheet-import/`)**

- A sor azonosítója (`sourceKey`) a nyers időbélyeg-cellából és az e-mailből képződik. Ha valaki a Sheetben átírja egy sor időbélyegét vagy e-mailjét, a következő szinkron **új jelentkezőként újra importálja**.
- Időbélyeg-oszlop nélkül ugyanannak a személynek ugyanarra az eseményre leadott második jelentkezése azonos kulcsot kap, így **kimarad**.
- Ha az eseményen mentett oszlop-hozzárendelés érvénytelen, a szinkron **szó nélkül** visszaáll a kulcsszavas automatikus felismerésre.
- **Javítva 2026-11-21:** a „Szülő e-mail címe” fejlécű oszlop eddig a szülő **lakcímébe** (`parentAddress`) került, mert a „cím” szót a lakcím-szabály előbb elkapta. Az ezelőtt (mentett oszlop-hozzárendelés nélkül) importált jelentkezőknél a `parentAddress` e-mail-címet tartalmazhat, a `parentEmail` pedig üres; ezt egyszeri adatjavítással lehet rendbe tenni.
- A Google 401/403/404-en kívüli hibái (pl. 429 rate limit) részletek nélküli 500-at adnak.

**Visszajelzés-szinkron (`src/app/api/events/[id]/feedback/sync/route.ts`)**

- Ha a résztvevői és a mentori link közül bármelyik nem érvényes Google Sheet link, **egyik sem szinkronizál**, és a hibaüzenet nem mondja meg, melyik link a rossz (`422 SHEET_URL_INVALID`).
- Időbélyeg nélküli sorokat a tartalmuk hash-e azonosítja, így egy ilyen sor utólagos szerkesztése **duplikált visszajelzést** hoz létre.

**Program Jelentkezők füle**

- A státuszchipek darabszámai (és a „Mind”) az áttekintés számlálóiból jönnek, amelyek az anonimizált jelentkezőket is számolják (statisztika). A tábla viszont kihagyja őket (`deletedAt: null`), így egy chip száma nagyobb lehet a sorok számánál.

**Jelentkezők szűrése**

- Az életkor-szűrő (`ageFrom`/`ageTo`, `ageRangeToBirthYear` a `src/lib/api/query.ts`-ben) a szerver saját órájának évéből számol (`getFullYear()`; Vercelen UTC), nem budapesti időből. Január 1-jén 0:00 és 1:00 (budapesti idő) között ezért egy órán át még az előző évvel szűr. A megjelenített életkor a böngésző idejéből jön, így ebben az órában a kettő eltérhet.

**Egyéb**

- Az anonimizálás megtartja a születési évet és a lakóhelyet (szándékos döntés), így ezek a dashboard demográfiájában továbbra is szerepelnek.
- Kapacitás: a szerver a 0-t „nincs korlát”-ként kezeli, de az űrlap legalább 1-et kér, így 0 csak API-n keresztül állítható be.
- A statikus `/_not-found` oldal scriptjei nem kapnak CSP nonce-ot (a nonce csak dinamikus renderelésnél kerül rájuk), így a 404 oldalon a kliensoldali JS nem fut; a szöveg megjelenik.

## Döntési napló

| Dátum      | Döntés                                                                                                                                                                                                                                                           | Indok                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-19 | Jelentkező törlése = GDPR-anonimizálás (soft delete `deletedAt`-tel), a jelentkezések és a History értékei nélkül megmaradnak                                                                                                                                    | Személyes adat eltűnik, a programstatisztika megmarad                                                                                                          |
| 2026-11-22 | A listatáblák maradnak saját megoldáson (nincs TanStack Table); rögzített oszlopok és oszlopszélesség-állítás nem készül                                                                                                                                         | A szerveroldali rendezés/lapozás mellett a könyvtár keveset adna; a haladó táblafunkciókat elvetettük. Az E2E tesztek (`e2e/`) megmaradnak regressziós hálónak |
| 2026-11-19 | A Jelentkezők lista oszlopbeállítása böngészőnként (`localStorage`) mentődik                                                                                                                                                                                     | Egyszerű, nincs sémaváltozás                                                                                                                                   |
| 2026-11-19 | A tömeges státuszmódosítás nem a Jelentkezők listán, hanem a program-jelentkezések képernyőn lesz                                                                                                                                                                | A státusz jelentkezésenként (program × jelentkező) él                                                                                                          |
| 2026-11-19 | A tudásbázis a `docs/` alatt él, magyarul, commitolva                                                                                                                                                                                                            | Közös, verziózott, kereshető                                                                                                                                   |
| 2026-11-19 | Lokális mintaadat seed-del (`sample.json` / gitignore-olt `local.json`), localhost-védelemmel; az éles import külön, későbbi app-funkció                                                                                                                         | Fejlesztői alapadat az éles DB veszélyeztetése nélkül                                                                                                          |
| 2026-11-21 | Duplikátum-összevonáskor a beolvasztott jelentkező **véglegesen törlődik**; jelentkezései és History sorai a megtartotthoz kerülnek. Csak nem törölt, azonos `duplicateKey`-ű jelentkezők vonhatók össze                                                         | Ugyanaz a személy: mindenhol egynek látszik; az újraimportot a `sourceKey` akadályozza                                                                         |
| 2026-11-21 | A statisztikák (dashboard, riport, kitöltési arány) az anonimizált jelentkezőket is számolják; a születési év és a lakóhely anonimizáláskor megmarad                                                                                                             | Az anonimizálás célja, hogy a statisztika megmaradjon                                                                                                          |
| 2026-11-21 | A `REPORT_TEMPLATE_DOC_ID` kötelező, HTML-es riport-tartalék nincs                                                                                                                                                                                               | Egy generálási út, egyszerűbb                                                                                                                                  |
| 2026-11-21 | Az import sorkulcsa marad időbélyeg + e-mail (nem csak időbélyeg)                                                                                                                                                                                                | A Sheetet nem szerkesztik utólag; a csak-időbélyeg kulcs azonos másodpercben ütközne és migrációt igényelne                                                    |
| 2026-11-21 | Külön direkt (`DATABASE_URL`) és opcionális poololt (`DATABASE_URL_POOLED`) adatbázis-URL; a migrációk a direktet, az app a poololtat használja                                                                                                                  | A migrációkhoz session-szintű kapcsolat kell, az app kapcsolatait a pooler fogja össze                                                                         |
| 2026-11-21 | Az éles migráció a Vercel buildben fut (`vercel-build`, csak `VERCEL_ENV=production`), a sikeres `next build` után; nincs külön GitHub Action                                                                                                                    | Garantált sorrend (séma a kód élesítése előtt), nincs párhuzamos verseny a deployjal, nincs extra titok a GitHubon                                             |
| 2026-11-21 | Vercelen csak a `main` buildel automatikusan (`vercel.json` `ignoreCommand`), más branch csak kézzel; a migrációkat PR-en GitHub Action ellenőrzi üres Postgresen + drift-ellenőrzéssel                                                                          | Az éles migráció a buildben fut, ezért a hibás migrációt merge előtt kell elkapni                                                                              |
| 2026-11-21 | GitHub Actions CI (`ci.yml`): format, lint, typecheck, teszt, build placeholder env-vel, OpenSpec validálás (`--strict`); minden PR-en és a `main`/`develop` pushain                                                                                             | A Vercel csak buildel; a minőségi kapukat merge előtt kell érvényesíteni                                                                                       |
| 2026-11-21 | Amit a szerver előre tudhat, azt előtölti: a Jelentkezők lista első oldala, „Program” szűrője és duplikátumszáma, a program Jelentkezők fülének URL szerinti nézete. A Jelentkezők lista szűrőváltása `window.history.replaceState`-tel írja az URL-t            | Nincs töltő állapot első megnyitáskor; a `router.replace` a szerveren is újrafuttatta a listát, így egy szűrőváltás kétszer kérdezett                          |
| 2026-11-21 | A program Jelentkezők fülének nézete (státusz, rendezés, lapozás) az URL-ben él, a Jelentkezők lista kulcsneveivel; a „Kor” rendezés kor szerint megy (növekvő = legfiatalabb elöl, eddig a legidősebb volt elöl); írás után csak a `router.refresh()` tölt újra | Megosztható és visszaállítható nézet, a szerver a nyitott nézetet tölti elő, a felirat és a sorrend egyezik, nincs dupla lekérdezés                            |
| 2026-11-22 | Az írási végpontok közös vázat használnak (`handleBody` / `handleAdmin`); hibás JSON-ra mindenhol `Invalid request body`; a Prisma-hibák üzenete nem kerül a logba                                                                                               | Kilenc kézzel másolt váz szétcsúszott (hibaszöveg, auth-feltétel); a Prisma-üzenet személyes adatot idézhet                                                    |
| 2026-11-22 | Az app minden környezetben `noindex`: `X-Robots-Tag` fejléc minden válaszon + robots meta minden oldalon; nincs tiltó `robots.txt`                                                                                                                               | Belső admin felület, nem lehet kereshető; a Vercel productionre nem tesz `noindex`-et; a `Disallow` elrejtené a `noindex`-et a crawler elől                    |
| (korábban) | Google az egyetlen belépési mód, nincs allowlist                                                                                                                                                                                                                 | Workspace-tagság = jogosultság                                                                                                                                 |
| (korábban) | NextAuth v4, ESLint v9, pontos függőségverziók                                                                                                                                                                                                                   | Kompatibilitás és reprodukálhatóság                                                                                                                            |
| 2026-11-21 | A jelentkező/jelentkezés mezőfeliratai egy helyen (`src/lib/applicants/field-labels.ts`); a sheet-megfeleltetés is ezeket mutatja. A programok időpontja `ÉÉÉÉ.HH.NN – HH.NN` (napok száma nélkül), a jelentkező adatlapján teljes `ÉÉÉÉ.HH.NN – ÉÉÉÉ.HH.NN`     | A feliratok elcsúsztak („Megoldott” vs „Megoldandó probléma”); a dátumformátum a kódban már így volt, a spec most követi                                       |

## Duplikátum-ellenőrzés (megvalósítva)

A sheet import duplikátumként jelöli az azonos név + e-mail jelentkezőket (`duplicateFlag`). A jelentkezők képernyő bannere megnyitja az ellenőrző modált (terv: 03.4), amely páronként mutatja őket mezőnkénti összehasonlítással. Az admin dönt:

- **Összevonás**: mindig az admin választja ki, melyik adatlap marad; a másik jelentkezései és History sorai átkerülnek, a rekordja **véglegesen** törlődik (szándékos kivétel a soft delete szabály alól), a `duplicateKey` marad — így egy későbbi azonos jelentkező újra jelölődik.
- **Nem duplikáció**: a pár a `DuplicateDismissal` táblába kerül, és többé nem jelenik meg. Döntés: párra szól, nem jelentkezőre, hogy egy új, azonos kulcsú jelentkező a korábbiakkal újra ellenőrzésre kerüljön.

Döntés: egy jelentkezőnek **ugyanarra az eseményre is lehet több jelentkezése** (pl. kétszer kitöltött form merge után); ezt az adminok kezelik. Ezért nincs `@@unique([eventId, applicantId])`.
