# Dokumentáció – index

A repó tudásbázisa magyarul. A `CLAUDE.md` csak a legfontosabbakat tartalmazza, a részletek itt vannak. Ami itt szerepel, az **már megvalósult** (vagy tudatosan jelölt eltérés); a tervezett igények az `openspec/changes/` alá kerülnek.

| Fájl                                           | Miről szól                                             | Mikor olvasd                    |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| [overview.md](overview.md)                     | Mi az app, stack, jelenlegi állapot, könyvtárszerkezet | Mindig először                  |
| [domain.md](domain.md)                         | Entitások, kapcsolatok, státuszok, szakszavak          | Üzleti logikához, új funkcióhoz |
| [api.md](api.md)                               | Végpontok, query paraméterek, közös segédek            | API-t érintő munkánál           |
| [data-and-db.md](data-and-db.md)               | Séma, migrációk, seed, History terv                    | Adatmodell-változtatásnál       |
| [auth-and-access.md](auth-and-access.md)       | Google belépés, védelem szabályai                      | Új oldal / endpoint / action    |
| [frontend.md](frontend.md)                     | UI konvenciók, közös komponensek                       | UI-munkánál                     |
| [testing.md](testing.md)                       | Tesztelési minták                                      | Teszt írásakor                  |
| [workflow.md](workflow.md)                     | Parancsok, hookok, OpenSpec, env                       | Környezet, CI, folyamat         |
| [gaps-and-decisions.md](gaps-and-decisions.md) | Eltérések, nyitott kérdések, döntési napló             | Mielőtt a kódra támaszkodsz     |

## Tervek

- [plans/report-google-doc-template.md](plans/report-google-doc-template.md) – **megvalósítva:** a záró riport Google Doc sablonból (másolás + helyőrzők). A `REPORT_TEMPLATE_DOC_ID` kötelező, HTML-es tartalék nincs. A fájl a helyőrzők referenciájaként marad.

## Karbantartás

- Kódváltozás után frissítsd az érintett fájlt; ne duplikálj kódot, csak a „miért” és a „hol” kerüljön ide.
- Eltérést vagy bizonytalanságot a `gaps-and-decisions.md`-be írj, ne szórd szét.
