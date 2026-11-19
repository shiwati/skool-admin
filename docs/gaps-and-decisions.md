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
- Milyen írási műveletek kellenek (státuszváltás, szerkesztés, törlés), és kell-e hozzájuk History-naplózás?
- Szerveroldali lapozású tábla kell-e (a `DataTable` jelenleg kliensoldali)?
- Szerepkörök: marad az "egy Workspace-tag = admin" modell?
- Személyes adatok (gyerekek, szülők): adatkezelési/GDPR követelmények, megőrzés, törlés.

## Döntési napló

| Dátum      | Döntés                                                                                                                                   | Indok                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 2026-11-19 | A tudásbázis a `docs/` alatt él, magyarul, commitolva                                                                                    | Közös, verziózott, kereshető                          |
| 2026-11-19 | Lokális mintaadat seed-del (`sample.json` / gitignore-olt `local.json`), localhost-védelemmel; az éles import külön, későbbi app-funkció | Fejlesztői alapadat az éles DB veszélyeztetése nélkül |
| (korábban) | Google az egyetlen belépési mód, nincs allowlist                                                                                         | Workspace-tagság = jogosultság                        |
| (korábban) | NextAuth v4, ESLint v9, pontos függőségverziók                                                                                           | Kompatibilitás és reprodukálhatóság                   |

## Duplikátum-merge (nyitott)

A sheet import duplikátumként jelöli az azonos név + e-mail jelentkezőket (`duplicateFlag`). A merge még hiányzik: az admin kiválasztja az elsődleges jelentkezőt, annak adatai maradnak, a többiek jelentkezései átkerülnek hozzá (minden jelentkezési adat megmarad), a többi rekord törlődik, a `duplicateFlag` lekerül, a `duplicateKey` marad — így egy későbbi azonos jelentkező újra jelölődik és újra merge-elhető.

Döntés: egy jelentkezőnek **ugyanarra az eseményre is lehet több jelentkezése** (pl. kétszer kitöltött form merge után); ezt az adminok kezelik. Ezért nincs `@@unique([eventId, applicantId])`.
