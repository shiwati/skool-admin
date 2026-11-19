# Eltérések, nyitott kérdések, döntések

## Eltérések a kód és a dokumentáció között

1. **Hiányzó doménmigráció.** A `schema.prisma` tartalmazza az `Applicant`, `Application`, `Event`, `History` modelleket, de a `prisma/migrations/` egyetlen migrációja csak az auth-táblákat hozza létre. Tiszta adatbázison az új végpontok hibáznának. Teendő: `npm run db:migrate -- --name domain_models`, majd commit.
2. **Elavult `CLAUDE.md`.** A "Project state" szakasz szerint nincs üzleti funkció és entitás; ez már nem igaz. Frissítendő, és hivatkozzon a `docs/`-ra.
3. **Védelem-minta eltérés.** A `session.ts` a `getAdminSession()`-t ajánlja Route Handlerekhez, a `handleQuery` viszont közvetlenül `getServerSession(authOptions)`-t hív. Működésre ekvivalens, de egységesíthető.
4. **README** csak az alapot dokumentálja; az új végpontok nincsenek benne.
5. **OpenSpec:** csak az `admin-auth` spec van meg; az applicants/events API-hoz nincs spec.

## Nyitott kérdések (az igények ismeretében eldöntendők)

- Honnan érkeznek az adatok (űrlap-import, Google Sheet — az `Event.sheetUrl` erre utalhat, kézi felvitel)?
- Az írási végpontok közös alapja (body-validáció, session, hibakezelés, History) még hiányzik, az első írási igénnyel együtt tervezendő.
- Milyen írási műveletek kellenek (státuszváltás, szerkesztés, törlés), és kell-e hozzájuk History-naplózás?
- Szerveroldali lapozású tábla kell-e (a `DataTable` jelenleg kliensoldali)?
- Szerepkörök: marad az "egy Workspace-tag = admin" modell?
- Személyes adatok (gyerekek, szülők): adatkezelési/GDPR követelmények, megőrzés, törlés.

## Döntési napló

| Dátum      | Döntés                                                | Indok                               |
| ---------- | ----------------------------------------------------- | ----------------------------------- |
| 2026-11-19 | A tudásbázis a `docs/` alatt él, magyarul, commitolva | Közös, verziózott, kereshető        |
| (korábban) | Google az egyetlen belépési mód, nincs allowlist      | Workspace-tagság = jogosultság      |
| (korábban) | NextAuth v4, ESLint v9, pontos függőségverziók        | Kompatibilitás és reprodukálhatóság |
