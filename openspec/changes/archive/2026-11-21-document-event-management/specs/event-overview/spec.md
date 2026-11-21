## ADDED Requirements

### Requirement: Bulk status change on the Jelentkezők tab

Admins SHALL be able to set one status for selected applications on the program's Jelentkezők tab ("Tömeges műveletek"). `POST /api/events/<id>/applicants/status` SHALL accept `{ ids, status }` with 1–100 unique ids and a valid status; it SHALL respond `401` without an admin session, `400` for an invalid body and `404` when any id is unknown or belongs to another program. Applications already in the target status SHALL be skipped and the response SHALL report the updated and skipped counts.

#### Scenario: Accepting selected applicants

- **WHEN** an admin selects 3 new applications and sets "Elfogadva"
- **THEN** the 3 applications become accepted, 3 `History` rows are written and the toast reads "3 jelentkezés státusza: Elfogadva"

#### Scenario: Application of another program

- **WHEN** the request includes an application id of another program
- **THEN** the response is `404` and no status changes

### Requirement: Bulk status change history

Every application whose status a bulk change sets SHALL get one `History` row (`application` / `status`) with the old and new status and the admin as author, written in the same transaction as the change.

#### Scenario: Skipped application

- **WHEN** a bulk change sets "Elfogadva" on one accepted and one new application
- **THEN** only the new application changes and gets a `History` row

### Requirement: Bulk status feedback

After a bulk status change the UI SHALL show "<N> jelentkezés státusza: <status>" on success and "A státusz módosítása nem sikerült. Próbáld újra." on failure.

#### Scenario: Failed change

- **WHEN** the status request fails with a server error
- **THEN** "A státusz módosítása nem sikerült. Próbáld újra." is shown

### Requirement: Capacity warning on bulk accept

When setting "Elfogadva" would make the number of accepted applications exceed a capacity greater than 0, the UI SHALL ask "Túlléped a kapacitást?" with the resulting accepted count and the capacity, and SHALL change nothing unless the admin confirms.

#### Scenario: Over capacity

- **GIVEN** a program with capacity 10 and 9 accepted applications
- **WHEN** an admin accepts 2 more applications
- **THEN** the confirmation is shown and the statuses change only after confirming

### Requirement: Program not-found page

The not-found page of `/events/<id>` and its sub-pages SHALL show "Nem található ilyen program", the note "Lehet, hogy a programot törölték, vagy hibás a hivatkozás." and a "Programok" link to `/events`.

#### Scenario: Deleted program

- **WHEN** an admin opens the page of a deleted program
- **THEN** "Nem található ilyen program" is shown with a link to `/events`
