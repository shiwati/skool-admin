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

### Requirement: Program header

The page SHALL show a breadcrumb "Programok › name", the program name, its tags, the program status (same rules as the program list), the date range (in the program list's "Időpont" format), the place, and the instructor and mentors. A "Szerkesztés" button SHALL open `/events/<id>/edit`.

#### Scenario: Header of an open program

- **WHEN** the admin opens a program that has a sheet, is in the future and is not full
- **THEN** the header shows the status "Jelentkezés nyitva" and the "Jelentkezők" tab shows the application count

### Requirement: Program tabs

A tab bar SHALL show these tabs as links: "Áttekintés" (`/events/<id>`), "Jelentkezők" with the number of applications (`/events/<id>/applicants`), "Visszajelzések" (`/events/<id>/feedback`) and "Záró riport" (`/events/<id>/report`). The tab of the open page SHALL be marked as current. There SHALL be no "Változástörténet" tab: the program's change log opens from the "Teljes napló" link of the latest changes card, as on the applicant detail page.

#### Scenario: Opening the report tab

- **WHEN** the admin clicks "Záró riport" on a program page
- **THEN** `/events/<id>/report` opens with the "Záró riport" tab marked as current

#### Scenario: No change history tab

- **WHEN** the program page is rendered
- **THEN** the tab bar shows no "Változástörténet" tab

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

### Requirement: Status links in the status breakdown

In the overview's status breakdown, each status with at least one application SHALL link to the Jelentkezők tab filtered to that status. A status with no applications SHALL NOT be a link.

#### Scenario: Opening the waitlist

- **GIVEN** a program with 4 waitlisted applications
- **WHEN** the admin activates "Várólista" in the status breakdown
- **THEN** `/events/<id>/applicants?status=WAITLISTED` opens with the "Várólista" chip selected

#### Scenario: Empty status

- **WHEN** a program has no rejected applications
- **THEN** "Elutasítva" in the status breakdown is plain text, not a link

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

The overview SHALL show the latest changes of the program from `History` (table `event`), newest first, each with who changed it, the field label, the old and new value, and the time. When there are none it SHALL show "Még nincs rögzített változás". The card header SHALL show a "Teljes napló" link to the program's change history at `/history/<id>`, also when there are no changes.

#### Scenario: A field was edited

- **WHEN** the capacity of a program was changed from 18 to 20
- **THEN** the card shows "<name> módosította: Max. tanulói létszám", "18 → 20" and the time

#### Scenario: Opening the full history

- **WHEN** the admin activates "Teljes napló" on the latest changes card
- **THEN** `/history/<id>` opens for this program

### Requirement: Bulk status change on the Jelentkezők tab

Admins SHALL be able to set one status for selected applications on the program's Jelentkezők tab ("Tömeges műveletek"). `POST /api/events/<id>/applicants/status` SHALL accept `{ ids, status }` with 1–100 unique ids and a valid status; it SHALL respond `401` without an admin session, `400` for an invalid body and `404` when any id is unknown or belongs to another program. Applications already in the target status SHALL be skipped and the response SHALL report the updated and skipped counts.

#### Scenario: Accepting selected applicants

- **WHEN** an admin selects 3 new applications and sets "Elfogadva"
- **THEN** the 3 applications become accepted, 3 `History` rows are written and the toast reads "3 jelentkezés státusza: Elfogadva"

#### Scenario: Application of another program

- **WHEN** the request includes an application id of another program
- **THEN** the response is `404` and no status changes

### Requirement: Per-row status change on the Jelentkezők tab

Each row's status SHALL be a menu button labelled "<name> státusza: <status>. Módosítás" for assistive technology. Choosing another status SHALL change only that application, through the same endpoint, with the same feedback and capacity warning as a bulk change. Clicking the status menu SHALL NOT open the applicant.

#### Scenario: Waitlisting one applicant

- **WHEN** the admin opens "Kiss Anna státusza: Új jelentkező. Módosítás" and chooses "Várólista"
- **THEN** only Kiss Anna's application is sent with the status "Várólista"

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

### Requirement: Jelentkezők tab view lives in the URL

The Jelentkezők tab SHALL reflect its status filter, sort, order, page and page size in the page URL (`status`, `sort` = `name`|`age`|`status`|`receivedAt`, `order`, `page`, `pageSize`), leaving default values out. Opening that URL SHALL restore the same view. Invalid values SHALL fall back to the default. Changing the status filter, sort or page size SHALL return to page 1.

#### Scenario: Sharing a filtered view

- **WHEN** an admin opens `/events/<id>/applicants?status=WAITLISTED&page=2`
- **THEN** the tab shows page 2 of the program's waitlisted applications, with the "Várólista" chip selected

#### Scenario: Default view has a clean URL

- **WHEN** an admin selects the "Mind" chip and returns to the default sort on page 1
- **THEN** the URL is `/events/<id>/applicants` without a query

#### Scenario: Invalid parameter

- **WHEN** an admin opens `/events/<id>/applicants?status=FOO&sort=bar&page=0`
- **THEN** the default view is shown: all statuses, oldest application first, page 1

#### Scenario: Filter change returns to page 1

- **GIVEN** the tab shows page 3
- **WHEN** the admin selects the "Elfogadva" chip
- **THEN** the URL contains `status=ACCEPTED` and no `page`, and page 1 is shown

### Requirement: Jelentkezők tab status chips

The tab SHALL show the chips "Mind" and one per status, each with its count. Selecting a status chip SHALL list only that status; selecting the active chip again, or "Mind", SHALL list every status.

#### Scenario: Turning a status chip off

- **GIVEN** the "Várólista" chip is selected
- **WHEN** the admin selects "Várólista" again
- **THEN** every status is listed and the URL has no `status`

### Requirement: Jelentkezők tab sorting and empty states

The "Név", "Kor" and "Státusz" headers SHALL sort the table, ascending on first activation, reversing on the next. A line SHALL describe the sort ("Rendezés: …"), with an "Alapsorrend" action when it is not the default. Without applications the table SHALL say "Még nincs jelentkező ehhez a programhoz."; when a status filter matches nothing, "Nincs a szűrésnek megfelelő jelentkezés." with a "Szűrő törlése" action.

#### Scenario: Sorting by name

- **WHEN** the admin activates the "Név" header
- **THEN** applications are listed A to Z by last name and the URL contains `sort=name`

#### Scenario: Status filter without match

- **GIVEN** the "Elutasítva" chip is selected and no application is rejected
- **WHEN** the table loads
- **THEN** "Nincs a szűrésnek megfelelő jelentkezés." is shown, and "Szűrő törlése" lists every status

### Requirement: Jelentkezők tab sorts by age

Sorting the Jelentkezők tab by "Kor" SHALL order by age: ascending SHALL put the youngest applicants first. Applicants without a birth year SHALL come last in both directions.

#### Scenario: Youngest first

- **GIVEN** applicants born in 2008 and 2011
- **WHEN** the admin sorts by "Kor" ascending
- **THEN** the applicant born in 2011 is listed first and the sort line reads "Rendezés: kor, növekvő"

### Requirement: Program not-found page

The not-found page of `/events/<id>` and its sub-pages SHALL show "Nem található ilyen program", the note "Lehet, hogy a programot törölték, vagy hibás a hivatkozás." and a "Programok" link to `/events`.

#### Scenario: Deleted program

- **WHEN** an admin opens the page of a deleted program
- **THEN** "Nem található ilyen program" is shown with a link to `/events`
