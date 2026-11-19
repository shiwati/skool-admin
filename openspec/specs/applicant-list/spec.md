# applicant-list Specification

## Purpose

Lets admins browse, search and filter applicants at `/applicants`, choose which columns they see, select applicants, and take their e-mail addresses for use elsewhere.

## Requirements

### Requirement: Applicants page

The system SHALL serve the applicants screen at `/applicants` to signed-in admins. The page SHALL show the overline and heading "Jelentkezők" and a subtitle with the number of applicants matching the current filters, formatted with Hungarian thousands grouping (for example "Google Formból érkező jelentkezések · 1 248 fő").

#### Scenario: Signed-in admin opens the page

- **WHEN** a signed-in admin opens `/applicants`
- **THEN** the heading "Jelentkezők" and the applicant table are shown

#### Scenario: Unauthenticated visit

- **WHEN** an unauthenticated visitor opens `/applicants`
- **THEN** they are redirected to `/login` with `/applicants` as the return URL

### Requirement: Data comes from the applicants endpoint

The list SHALL be populated from `GET /api/applicants` using only that endpoint's supported query parameters. If the endpoint answers 401, the user SHALL be sent to `/login` with the current page as the return URL.

#### Scenario: Session expired while on the page

- **WHEN** the endpoint answers 401 while the user changes a filter
- **THEN** the user is redirected to `/login` with the current `/applicants` URL, including its query, as the return URL

### Requirement: Default table columns

By default the table SHALL show, in this order: a selection checkbox, "Név / e-mail", "Életkor", "Program", "Státusz", "Település / iskola", "Hírlevél", "Előzmény", "Jelentkezett", and a row actions button labelled "Műveletek" for assistive technology.

#### Scenario: First visit with no saved column settings

- **WHEN** an admin opens `/applicants` with no saved column settings
- **THEN** the columns appear in the order listed

### Requirement: Applicant personal cells

Each row SHALL show the name as "Vezetéknév Keresztnév" with the e-mail address below it and an initials avatar. Age SHALL be the current year minus the birth year, with a "16+" badge from 16. The row SHALL show hometown with the school name below it, a check mark when subscribed to the newsletter, and the applicant's creation date as `ÉÉÉÉ.HH.NN`. Missing values SHALL show "—".

#### Scenario: Applicant without birth year or school

- **WHEN** an applicant has no birth year and no school name
- **THEN** the age cell shows "—" and only the hometown is shown in the location cell

### Requirement: Applicant application cells

Each row SHALL show the program and status of the applicant's most recently received application, with "+N" when there are N more applications. Under "Előzmény" it SHALL show the number of attended programs as "N program". An applicant without applications SHALL show "—" in these cells.

#### Scenario: Applicant with two applications

- **GIVEN** Nagy Luca, born 2010 (16 in 2026), has applications to "Python alapok – ősz" (accepted, newest) and "Robotika tábor" (attended)
- **WHEN** the row is rendered in 2026
- **THEN** it shows "Nagy Luca", age "16" with a "16+" badge, program "Python alapok – ősz" with "+1", status "Elfogadva", and "1 program" under "Előzmény"

#### Scenario: Applicant without applications

- **WHEN** an applicant has no applications
- **THEN** the program, status and history cells show "—"

### Requirement: Status labels

Application statuses SHALL be shown as coloured badges with Hungarian labels: applied as "Új jelentkező", accepted as "Elfogadva", waitlisted as "Várólista", attended as "Részt vett", rejected as "Elutasítva".

#### Scenario: Waitlisted application

- **WHEN** an applicant's newest application is waitlisted
- **THEN** the status cell shows the badge "Várólista"

### Requirement: Search

A search field labelled "Keresés a listában" SHALL filter applicants by name and e-mail via the endpoint's `q` parameter. The search SHALL run after the user stops typing, not on every keystroke.

#### Scenario: Searching by partial e-mail

- **WHEN** the user types "freemail" and pauses
- **THEN** only applicants whose name or e-mail contains "freemail" (case-insensitive) are listed

### Requirement: Filters

The page SHALL offer filter chips "Program" (multiple programs; `eventIds`), "Életkor" (minimum and/or maximum age; `ageFrom`/`ageTo`), "Település" (text; `hometown`), "Hírlevél" (subscribed / not subscribed; `newsletter`) and "Részt vett" (has / has not attended a program; `attended`). A chip with an active filter SHALL show its value. Each active filter SHALL be removable on its own, and the "Szűrők törlése" action SHALL remove all of them.

#### Scenario: Filtering by program

- **WHEN** the user selects "Robotika tábor" in the "Program" chip
- **THEN** only applicants with an application to "Robotika tábor" are listed
- **AND** the chip shows the selected program

#### Scenario: Invalid age range

- **WHEN** the user enters a minimum age greater than the maximum age
- **THEN** the filter is not applied and the chip explains that the minimum cannot exceed the maximum

### Requirement: Sorting

The columns "Név / e-mail", "Életkor", "Település / iskola" and "Jelentkezett" SHALL be sortable in both directions, server-side. The current sort column and direction SHALL be shown and exposed to assistive technology. The default sort SHALL be "Jelentkezett", newest first. Sorting by "Életkor" SHALL order by age, not by birth year.

#### Scenario: Sorting by age ascending

- **WHEN** the user sorts "Életkor" ascending
- **THEN** the youngest applicants are listed first

### Requirement: Paging

The table footer SHALL show the visible range and the total ("1–25 / 1 248 jelentkező"), a "Sorok / oldal" selector with 10, 25, 50 and 100 (default 25), and page navigation with previous and next buttons and page numbers.

#### Scenario: Changing page size

- **WHEN** the user picks 50 rows per page on page 3
- **THEN** the first 50 matching applicants are shown, starting from page 1

### Requirement: Filters, sort and page live in the URL

Search, filters, sort, page and page size SHALL be reflected in the page URL. Opening that URL SHALL restore the same view. Any change to search, filters, sort or page size SHALL return to page 1.

#### Scenario: Sharing a filtered view

- **WHEN** an admin opens a copied `/applicants` URL containing a program filter and page 2
- **THEN** the list shows page 2 of applicants filtered by that program

### Requirement: Deleted applicants are not listed

Applicants deleted by anonymization SHALL NOT appear in the list, in its total, or in e-mail lists.

#### Scenario: After deleting an applicant

- **WHEN** an applicant has been deleted
- **THEN** they no longer appear in the list and the total decreases by one

### Requirement: Loading, empty and error states

While data loads, the table SHALL show skeleton rows marked busy for assistive technology. With no matching applicants, it SHALL show "Nincs a szűrésnek megfelelő jelentkező", with a "Szűrők törlése" button when filters or search are active. If loading fails, it SHALL show "Nem sikerült betölteni a listát" with a "Újratöltés" button and no technical details.

#### Scenario: Filters return nothing

- **WHEN** the active filters match no applicant
- **THEN** the empty state is shown with "Szűrők törlése"
- **AND** activating it clears all filters and search

#### Scenario: Endpoint error

- **WHEN** the endpoint answers 500
- **THEN** the error state is shown and "Újratöltés" retries the same request

### Requirement: Column picker

An "Oszlopok" button SHALL open the "Oszlopok a listában" panel. In it the user can show or hide columns and reorder them by dragging, or with keyboard-operable move up/down controls. "Név / e-mail" SHALL always remain visible. Besides the default columns, "Szülő neve és e-mail" and "Telefonszám" SHALL be available, hidden by default. "Alapértelmezés visszaállítása" SHALL restore the default columns and order.

#### Scenario: Showing the phone number

- **WHEN** the user ticks "Telefonszám" in the panel
- **THEN** a "Telefonszám" column appears in the table at its position in the panel's order

#### Scenario: Reordering with the keyboard

- **WHEN** the user moves "Hírlevél" up one position using the keyboard
- **THEN** the "Hírlevél" column moves one position left in the table

### Requirement: Column settings persist in the browser

Column visibility and order SHALL be saved in the user's browser and restored on later visits in that browser. If saved settings are missing, unreadable or refer to unknown columns, the defaults SHALL be used for whatever cannot be restored.

#### Scenario: Returning later

- **WHEN** the user hid "Hírlevél", left, and opens `/applicants` again in the same browser
- **THEN** "Hírlevél" is still hidden

### Requirement: Row selection

Each row SHALL have a checkbox. The header checkbox, labelled "Összes kijelölése", SHALL select or clear all rows on the current page and SHALL appear indeterminate when only some are selected. Selected rows SHALL be highlighted. The selection SHALL be cleared whenever the page, sort, search or filters change.

#### Scenario: Selecting all on the page

- **WHEN** the user ticks the header checkbox on a page of 25 rows
- **THEN** all 25 rows are selected and the bulk-action bar shows "25 kijelölve"

### Requirement: Bulk-action bar

While at least one row is selected, a floating toolbar labelled "Tömeges műveletek" SHALL show the count ("N kijelölve") and the actions "E-mail címek másolása" and "Törlés", plus a "Kijelölés megszüntetése" button that clears the selection.

#### Scenario: Clearing the selection

- **WHEN** the user activates "Kijelölés megszüntetése"
- **THEN** no rows are selected and the toolbar disappears

### Requirement: Copy selected e-mail addresses

"E-mail címek másolása" SHALL copy the selected applicants' e-mail addresses to the clipboard as one comma-and-space separated line, without duplicates (compared case-insensitively) and skipping applicants without an e-mail address. A confirmation SHALL state how many addresses were copied.

#### Scenario: Copying with a missing address

- **WHEN** three applicants are selected and one has no e-mail address
- **THEN** two addresses are copied as "a@x.hu, b@y.hu"
- **AND** the confirmation says 2 addresses were copied

### Requirement: E-mail list of the current filter

The "E-mail lista" header button SHALL open a dialog containing the e-mail addresses of all applicants matching the current search and filters, across all pages. The addresses SHALL be comma-and-space separated, without duplicates, in a selectable read-only text box with a "Másolás" button and the number of addresses.

#### Scenario: Filter spans several pages

- **WHEN** the current filter matches 130 applicants with e-mail addresses and the page shows 25
- **THEN** the dialog lists all 130 addresses and states "130 e-mail cím"

#### Scenario: Nothing to list

- **WHEN** no matching applicant has an e-mail address
- **THEN** the dialog says there is no e-mail address to copy and "Másolás" is disabled

### Requirement: Sync action is disabled

The page header SHALL show a "Szinkronizálás" button that is disabled and explains, for assistive technology and on hover or focus, that synchronization is not available yet.

#### Scenario: Trying to sync

- **WHEN** the user tries to activate "Szinkronizálás"
- **THEN** nothing happens and the "not available yet" explanation is available

### Requirement: Duplicate-check placeholder banner

The page SHALL show a warning banner titled "Lehetséges duplikált jelentkezések", saying that applications from the same e-mail address should be checked and that the check is coming soon. Its "Ellenőrzés" button SHALL be disabled. The banner SHALL NOT claim a number of duplicates.

#### Scenario: Banner shown

- **WHEN** the applicants page is rendered
- **THEN** the duplicate banner is shown with a disabled "Ellenőrzés" button and no duplicate count
