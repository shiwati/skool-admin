# Doménmodell

Forrás: `prisma/schema.prisma`. A mezők DB-oszlopnevei snake_case-ek (`@map`), a táblák egyes számúak (`applicant`, `application`, `event`, `history`).

## Entitások

- **Applicant (jelentkező)**: a gyerek adatai (név, születési év, iskola, lakóhely, telefon, e-mail), a szülő adatai (`parent*` mezők), `newsletter` hozzájárulás. Egy jelentkező több eseményre jelentkezhet.
- **Event (program/esemény)**: `name`, `from`/`to`, `companyName`, `location`, `description` (DB: `desc`), `sheetUrl`, `ageRange` (szabad szöveg), `instructor`, `mentors` (szöveglista), `tags` (címkelista a fix listából, alapérték üres; lásd lent), `capacity` (alapérték 0).
- **Application (jelentkezés)**: egy Applicant × Event kapcsolat, **egyedi** `(eventId, applicantId)` párra. Tartalmazza a jelentkezési űrlap válaszait (`foodPreference`, `heardFromWhere/Whom`, `solvedProblem`, `pastExpInProg`, korábbi részvétel mezők, `comment`, `companyAwareness`), a `receivedAt` beérkezési időt és a `status`-t.
- **History (változásnapló)**: mezőszintű napló (`tableName`, `fieldName`, `recordId`, `oldValue`, `newValue`, `createdBy`). A séma létezik, de jelenleg semmi nem tölti.
- **User**: NextAuth felhasználó (admin). `updatedBy` kapcsolatot ad az Applicant és Application felé.

## Címkék (`Event.tags`)

- Az érvényes címkék **fix listája** a `src/lib/events/tags.ts` `EVENT_TAGS` konstansa; ez az egyetlen forrás (API-szűrő, seed, felület). Kliensről is importálható.
- A felületen új címke nem vehető fel; a lista bővítése, módosítása **kódmódosítás**, migráció nem kell hozzá.
- Az ellenőrzés alkalmazásszintű (Zod `eventTagSchema`), adatbázis-megkötés nincs.
- Címke **eltávolítása előtt** a meglévő eseményekről is el kell távolítani (migráció vagy szkript): a listán kívüli tárolt érték a válaszokban megjelenik, de szűrni nem lehet rá.

## Kapcsolatok

```
Event 1─* Application *─1 Applicant
User  1─* Applicant.updatedBy / Application.updatedBy / History.createdBy   (törléskor SetNull)
```

Event vagy Applicant törlésekor az Application-jeik **kaszkádolva törlődnek**.

## ApplicationStatus

| Érték      | DB érték   | Jelentés                 |
| ---------- | ---------- | ------------------------ |
| APPLIED    | applied    | jelentkezett (alapérték) |
| ACCEPTED   | accepted   | elfogadva                |
| REJECTED   | rejected   | elutasítva               |
| ATTENDED   | attended   | részt vett               |
| WAITLISTED | waitlisted | várólistás               |

## Származtatott szabályok a kódban

- **Életkor** nincs tárolva: `életkor ≈ aktuális év − birthYear` (`ageRangeToBirthYear`).
- **„Részt vett” jelentkező**: legalább egy Application `ATTENDED` státuszú.
- **Esemény-év szűrés** Europe/Budapest naptári év szerint (`budapestYearRange`), az `from` mezőre.
- **Eseményenkénti számláló**: státusz szerinti jelentkezésszám + `total` (az `/api/events` válaszában).

## Szakszavak

jelentkező = Applicant · jelentkezés = Application · program/esemény = Event · várólistás = WAITLISTED · változásnapló = History.
