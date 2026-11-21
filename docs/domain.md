# Doménmodell

Forrás: `prisma/schema.prisma`. A mezők DB-oszlopnevei snake_case-ek (`@map`), a táblák egyes számúak (`applicant`, `application`, `event`, `history`).

## Entitások

- **Applicant (jelentkező)**: a gyerek adatai (név, születési év, iskola, lakóhely, telefon, e-mail), a szülő adatai (`parent*` mezők), `newsletter` hozzájárulás. Egy jelentkező több eseményre jelentkezhet.
- **Event (program/esemény)**: `name`, `from`/`to`, `companyName`, `location`, `description` (DB: `desc`), `applicationSheetUrl` (jelentkező űrlap sheetje), `participantFeedbackSheetUrl` és `mentorFeedbackSheetUrl` (a két visszajelző űrlap sheetje), `ageRange` (szabad szöveg), `instructor`, `mentors` (szöveglista), `tags` (normalizált címkelista, alapérték üres; lásd lent), `capacity` (alapérték 0).
- **Application (jelentkezés)**: egy Applicant × Event kapcsolat. Egy jelentkezőnek ugyanarra az eseményre **több** jelentkezése is lehet (pl. összevonás után); az import az `(eventId, sourceKey)` egyedi kulccsal ismeri fel a már betöltött sort. Tartalmazza a jelentkezési űrlap válaszait (`foodPreference`, `heardFromWhere/Whom`, `solvedProblem`, `pastExpInProg`, korábbi részvétel mezők, `comment`, `companyAwareness`), a `receivedAt` beérkezési időt és a `status`-t.
- **Feedback (visszajelzés)**: egy névtelen visszajelző űrlap-válasz egy eseményhez, `role` = `PARTICIPANT` (résztvevő) vagy `MENTOR`. A válaszok stabil kérdéskulcsokkal a `answers` JSON-ban vannak (katalógus: `src/lib/feedback/questions.ts`); kiemelt oszlopok: `submittedAt`, `overallScore` (résztvevő: mentor- és oktatóértékelés átlaga; mentor: saját 1–5 összértékelése), `recommend` (`yes`/`maybe`/`no`), `searchText` (keresés). Jelentkezőhöz **szándékosan nincs párosítva**. Újraszinkronnál a `(eventId, role, sourceKey)` egyedi kulcs véd a duplikációtól (`sourceKey` = időbélyeg + azonos időbélyegű sor sorszáma).
- **History (változásnapló)**: mezőszintű napló (`tableName`, `fieldName`, `recordId`, `oldValue`, `newValue`, `createdBy`). Írja: a GDPR-törlés, a jelentkező szerkesztése, a duplikátum-összevonás és -elvetés, a tömeges státuszváltás, a program szerkesztése és törlése, valamint a riport generálása. Összevonáskor a beolvasztott jelentkező `applicant` sorai átkerülnek a megtartott jelentkezőhöz (`recordId`), így History sor nem mutat törölt jelentkezőre. Olvassa: a jelentkező adatlap és a `/history/[id]` oldal.
- **User**: NextAuth felhasználó (admin). `updatedBy` kapcsolatot ad az Applicant és Application felé.

## Címkék (`Event.tags`)

- **Nincs fix lista és nincs címketábla:** a választható címkék a programokon használt címkék (`GET /api/events/tags`, darabszámmal; lekérdezés: `src/lib/events/tag-options.ts`). Új címkét a program űrlapján lehet felvenni; a címke akkor jön létre, amikor egy programot elmentenek vele, és eltűnik, ha már egy program sem használja.
- **Normalizálás** (`src/lib/events/tags.ts`, kliensről is importálható): `normalizeTag` (szélek levágva, belső szóközök összevonva, kisbetű magyar szabályokkal), `tagSchema` (1–30 karakter, vessző nélkül), `tagListSchema` (ismétlődés kiszűrve). Ugyanez fut az űrlapon, a létrehozó/szerkesztő végpontokon, a listaszűrőben és a seedben. Adatbázis-megkötés nincs.
- **Majdnem azonos címkék:** az űrlap ékezet- és kisbetű-független egyezésnél (`searchKey`) a meglévő címkét ajánlja fel, nem újat. Ez felületi védelem; a szerver csak normalizál.
- **Átnevezés, összevonás nincs:** elírt címkét programonként kell javítani.
- **Szín** (`src/lib/events/colors.ts`): a négy régi címke (`robotika`, `programozás`, `kezdő`, `haladó`) rögzített színt kap, minden más a nevéből hash-sel számolt palettaszínt.

## Kapcsolatok

```
Event 1─* Application *─1 Applicant
Event 1─* Feedback
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
