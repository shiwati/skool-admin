# event-editing Specification

## Purpose

Lets admins create, edit and delete programs (events) through the program form at `/events/new` and `/events/<id>/edit` and the `/api/events` endpoints, with server-side validation and a change log in `History`.

## Requirements

### Requirement: Event write endpoints are admin-only

`POST /api/events` and `GET`, `PATCH` and `DELETE /api/events/<id>` SHALL each check the admin session themselves and respond `401` with no data read or written when there is none. The pages `/events/new` and `/events/<id>/edit` SHALL be reachable only by a signed-in admin.

#### Scenario: Signed-out PATCH

- **WHEN** a request without an admin session sends `PATCH /api/events/<id>`
- **THEN** the response is `401` and the event is unchanged

### Requirement: Event validation

The server SHALL validate the body of `POST` and `PATCH` and respond `400` with field errors when it is invalid or not JSON. `name` SHALL be required and non-blank after trimming. `to` SHALL NOT be earlier than `from`; on `PATCH` the check SHALL use the stored value for a field that is not sent. Sheet URLs SHALL be valid URLs or `null`. A `PATCH` body with no fields SHALL be rejected.

#### Scenario: End before start

- **WHEN** an admin sends `POST /api/events` with `to` one day before `from`
- **THEN** the response is `400` with an error on `to` and no event is created

#### Scenario: Partial update keeps the date rule

- **GIVEN** a stored event from 10 to 12 March
- **WHEN** a `PATCH` sends only `to` = 9 March
- **THEN** the response is `400` with an error on `to`

#### Scenario: Clearing a text field

- **WHEN** a `PATCH` sends `location` as `"  "`
- **THEN** the stored location becomes `null`

#### Scenario: Capacity zero via the API

- **WHEN** `POST /api/events` is sent without `capacity`
- **THEN** the event is created with capacity 0

### Requirement: Capacity and list defaults

`capacity` SHALL be a whole number of at least 0 (0 means no limit) and SHALL default to 0 on create; `tags` and `mentors` SHALL default to empty lists. The stricter form rule is in "Program form validation".

#### Scenario: Negative capacity

- **WHEN** `POST /api/events` sends `capacity` -1
- **THEN** the response is `400` with an error on `capacity`

### Requirement: Empty optional text is stored as null

The optional text fields `companyName`, `location`, `description`, `ageRange` and `instructor` SHALL be trimmed and stored as `null` when empty, on both create and update; `null` SHALL clear a field on `PATCH`.

#### Scenario: Blank location

- **WHEN** `POST /api/events` sends `location` as `""`
- **THEN** the event is stored with `location` `null`

### Requirement: Program form validation

The program form SHALL additionally require a capacity of at least 1 ("Legalább 1 fő legyen."), mark missing required fields with "Kötelező mező", and show "A befejezés nem lehet korábbi a kezdésnél." for an end before the start. Field errors returned by the server SHALL be shown on the matching form fields.

#### Scenario: Capacity zero in the form

- **WHEN** an admin enters 0 as "Maximális létszám" and saves
- **THEN** the field shows "Legalább 1 fő legyen." and nothing is sent

### Requirement: Creating a program

`POST /api/events` SHALL create the event and respond `201` with `{ id }`. On `/events/new` ("Új program felvétele"), a successful save SHALL show "A program mentve." and open `/events/<id>`.

#### Scenario: New program saved

- **WHEN** an admin fills the required fields on `/events/new` and saves
- **THEN** the event is created and its program page opens

### Requirement: Editing a program

`PATCH /api/events/<id>` SHALL update only the sent fields and write one `History` row per changed field (`tableName` "event", with old and new value and the admin as author) in the same transaction. When nothing changes, no update and no `History` row SHALL be written. It SHALL respond with `{ id }`, or `404` when the event does not exist.

#### Scenario: Renaming a program

- **WHEN** an admin changes only the name and saves
- **THEN** the name is updated and exactly one `History` row records the old and new name

#### Scenario: Unknown program

- **WHEN** a `PATCH` targets an id that does not exist
- **THEN** the response is `404`

### Requirement: Edit page

`/events/<id>/edit` ("Program szerkesztése") SHALL show the form filled with the stored values and SHALL show the not-found page for an unknown id. A successful save SHALL show "A program mentve." and open `/events/<id>`; when saving gets `404`, the form SHALL show "A program már nem létezik.".

#### Scenario: Editing a deleted program

- **WHEN** an admin saves the edit form after the program was deleted elsewhere
- **THEN** "A program már nem létezik." is shown

### Requirement: Deleting a program

`DELETE /api/events/<id>` SHALL hard-delete the event; its applications SHALL be deleted with it while the applicants stay. It SHALL write a `History` row with `fieldName` "deleted" and the event name as old value, respond with `{ id }`, or `404` when the event does not exist. The UI SHALL ask "Törlöd a(z) <name> programot?", explain that the program and its applications are deleted permanently while applicant data stays, and require an acknowledgement checkbox before deleting.

#### Scenario: Deleting a program with applications

- **GIVEN** a program with 3 applications
- **WHEN** an admin confirms the deletion
- **THEN** the program and its 3 applications are deleted, the applicants remain, and a "deleted" `History` row is written
