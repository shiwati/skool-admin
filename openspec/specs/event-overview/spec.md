# event-overview Specification

## Purpose

Shows a single program's page at `/events/[id]`: header and tabs, KPI cards, applications by status, program details, the applicant sheet sync and the latest changes.

## Requirements

### Requirement: Program page is admin-only

`/events/<id>` SHALL be reachable only by a signed-in admin. A signed-out visitor SHALL be redirected to the sign-in page with the program page as the return address. An unknown id SHALL show the "not found" page.

#### Scenario: Signed-out visitor

- **WHEN** a signed-out visitor opens `/events/<id>`
- **THEN** they are redirected to `/login` and no program data is read

#### Scenario: Unknown program

- **WHEN** an admin opens `/events/does-not-exist`
- **THEN** the "not found" page is shown

### Requirement: Program header and tabs

The page SHALL show a breadcrumb "Programok › name", the program name, its tags, the program status (same rules as the program list), the date range with duration, the place, and the instructor and mentors. A "Szerkesztés" button SHALL open `/events/<id>/edit`. A tab bar SHALL show "Áttekintés" as current, "Jelentkezők" with the number of applications linking to the applicants list filtered to the program, and "Visszajelzések", "Záró riport" and "Változástörténet" as disabled.

#### Scenario: Header of an open program

- **WHEN** the admin opens a program that has a sheet, is in the future and is not full
- **THEN** the header shows the status "Jelentkezés nyitva" and the "Jelentkezők" tab shows the application count

### Requirement: KPI cards

The overview SHALL show four cards: capacity, applied (all applications, with the demand ratio badge when capacity is above 0), accepted (as "accepted / capacity"), and waitlist.

#### Scenario: Over-subscribed program

- **WHEN** a program with capacity 20 has 62 applications, 20 accepted and 18 waitlisted
- **THEN** the cards show 20, 62 with "3,1×", "20 / 20", and 18

#### Scenario: Program without capacity

- **WHEN** a program has capacity 0
- **THEN** no demand ratio is shown and nothing is divided by zero

### Requirement: Applications by status

The overview SHALL show how many applications the program has in each status (Új jelentkező, Elfogadva, Várólista, Részt vett, Elutasítva) as a stacked bar with a legend, and link to the applicants list filtered to the program. When there are no applications it SHALL show an empty state instead of the bar.

#### Scenario: No applications yet

- **WHEN** a program has no applications
- **THEN** the empty state is shown and the bar is not

### Requirement: Program details and people

The overview SHALL show the date range, place, address and company, age range, description and tags of the program, with "—" for a missing value. It SHALL list the instructor and the mentors with initials and role.

#### Scenario: Missing values

- **WHEN** a program has no description and no mentors
- **THEN** the description shows "—" and the people card shows only the instructor

### Requirement: Applicant sheet and sync

The overview SHALL show the program's Google Sheet link. When a sheet is set, a "Szinkronizálás most" button SHALL call `POST /api/events/<id>/sync` and report the result in a toast (new, existing and duplicate counts, or the error), then refresh the page data. When no sheet is set, the card SHALL say so and link to the edit page.

#### Scenario: Successful sync

- **WHEN** the admin activates "Szinkronizálás most" and the import creates 3 applications
- **THEN** a success toast reports the counts and the KPI cards show the new numbers

#### Scenario: Sign-in with Google needed again

- **WHEN** the sync answers with code `REAUTH_REQUIRED`
- **THEN** an error toast tells the admin to sign in with Google again

### Requirement: Latest changes

The overview SHALL show the latest changes of the program from `History` (table `event`), newest first, each with who changed it, the field label, the old and new value, and the time. When there are none it SHALL show "Még nincs rögzített változás".

#### Scenario: A field was edited

- **WHEN** the capacity of a program was changed from 18 to 20
- **THEN** the card shows "<name> módosította: Max. tanulói létszám", "18 → 20" and the time
