# Eltérések, nyitott kérdések, döntések

## Eltérések a kód és a dokumentáció között

1. ~~Hiányzó doménmigráció~~ **Megoldva (2026-11-19):** `20261119171300_domain_models`.
2. ~~Elavult `CLAUDE.md`~~ **Megoldva:** frissítve, hivatkozik a `docs/`-ra.
3. **Védelem-minta eltérés.** A `session.ts` a `getAdminSession()`-t ajánlja Route Handlerekhez, a `handleQuery` viszont közvetlenül `getServerSession(authOptions)`-t hív. Működésre ekvivalens, de egységesíthető.
4. **README** csak az alapot dokumentálja; az új végpontok nincsenek benne.
5. **OpenSpec:** csak az `admin-auth` spec van meg; az applicants/events API-hoz nincs spec.

## Nyitott kérdések (az igények ismeretében eldöntendők)

- **Sheet-import azonosítás:** hogyan ismerjük fel ugyanazt a jelentkezőt / eseményt újraimportáláskor (e-mail? név + születési év? külső azonosító mező, pl. `sheetRowId`)? A séma jelenleg nem ad természetes egyedi kulcsot; az `Applicant.email` csak indexelt, és a gyerekeknek lehet közös szülői e-mailje.
- Az import saját, bejelentkezett admin funkció lesz (nem seed), a `dataFileSchema` közös validációval; az írási alap (body-validáció, session, History) előbb kell.
- Az írási végpontok közös alapja (body-validáció, session, hibakezelés, History) még hiányzik, az első írási igénnyel együtt tervezendő.
- Milyen további írási műveletek kellenek (státuszváltás, szerkesztés)? A törlés megvan (GDPR-anonimizálás, lásd [data-and-db.md](data-and-db.md)), a History-naplózás általános megoldása még nyitott.
- ~~Szerveroldali lapozású tábla~~ Megoldva: `ApplicantsTable` (`src/components/applicants/`).
- Szerepkörök: marad az "egy Workspace-tag = admin" modell?
- Személyes adatok (gyerekek, szülők): adatkezelési/GDPR követelmények, megőrzés, törlés.

## Döntési napló

| Dátum      | Döntés                                                                                                                                   | Indok                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 2026-11-19 | Jelentkező törlése = GDPR-anonimizálás (soft delete `deletedAt`-tel), a jelentkezések és a History értékei nélkül megmaradnak            | Személyes adat eltűnik, a programstatisztika megmarad |
| 2026-11-19 | A Jelentkezők lista oszlopbeállítása böngészőnként (`localStorage`) mentődik                                                             | Egyszerű, nincs sémaváltozás                          |
| 2026-11-19 | A tömeges státuszmódosítás nem a Jelentkezők listán, hanem a program-jelentkezések képernyőn lesz                                        | A státusz jelentkezésenként (program × jelentkező) él |
| 2026-11-19 | A tudásbázis a `docs/` alatt él, magyarul, commitolva                                                                                    | Közös, verziózott, kereshető                          |
| 2026-11-19 | Lokális mintaadat seed-del (`sample.json` / gitignore-olt `local.json`), localhost-védelemmel; az éles import külön, későbbi app-funkció | Fejlesztői alapadat az éles DB veszélyeztetése nélkül |
| (korábban) | Google az egyetlen belépési mód, nincs allowlist                                                                                         | Workspace-tagság = jogosultság                        |
| (korábban) | NextAuth v4, ESLint v9, pontos függőségverziók                                                                                           | Kompatibilitás és reprodukálhatóság                   |

## Duplikátum-ellenőrzés (megvalósítva)

A sheet import duplikátumként jelöli az azonos név + e-mail jelentkezőket (`duplicateFlag`). A jelentkezők képernyő bannere megnyitja az ellenőrző modált (terv: 03.4), amely páronként mutatja őket mezőnkénti összehasonlítással. Az admin dönt:

- **Összevonás**: mindig az admin választja ki, melyik adatlap marad; a másik jelentkezései átkerülnek, a rekordja törlődik, a `duplicateKey` marad — így egy későbbi azonos jelentkező újra jelölődik.
- **Nem duplikáció**: a pár a `DuplicateDismissal` táblába kerül, és többé nem jelenik meg. Döntés: párra szól, nem jelentkezőre, hogy egy új, azonos kulcsú jelentkező a korábbiakkal újra ellenőrzésre kerüljön.

Döntés: egy jelentkezőnek **ugyanarra az eseményre is lehet több jelentkezése** (pl. kétszer kitöltött form merge után); ezt az adminok kezelik. Ezért nincs `@@unique([eventId, applicantId])`.
