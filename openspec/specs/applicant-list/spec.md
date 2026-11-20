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

An "Oszlopok" button SHALL open the "Oszlopok a listában" panel. In it the user can:

- show or hide columns
- reorder them by dragging, or with keyboard-operable move up/down controls
- restore the default columns and order with "Alapértelmezés visszaállítása"

"Név / e-mail" SHALL always remain visible. Besides the default columns, "Szülő neve és e-mail" and "Telefonszám" SHALL be available, hidden by default.

The button SHALL be available at every width. Below 768 px it SHALL be a 44 × 44 px icon button with the accessible name "Oszlopok", next to the search field and the "Szűrők" button.

#### Scenario: Showing the phone number

- **WHEN** the user ticks "Telefonszám" in the panel
- **THEN** a "Telefonszám" column appears in the table at its position in the panel's order

#### Scenario: Reordering with the keyboard

- **WHEN** the user moves "Hírlevél" up one position using the keyboard
- **THEN** the "Hírlevél" column moves one position left in the table

#### Scenario: Column picker on a phone

- **WHEN** the applicants page is shown at 390 px
- **THEN** an "Oszlopok" icon button is shown next to the "Szűrők" button
- **AND** activating it opens the "Oszlopok a listában" panel

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

### Requirement: Rows open the applicant detail page

Clicking anywhere on an applicant row SHALL open that applicant's detail page at `/applicants/{id}`, except on the row checkbox and the row's "Műveletek" menu, which keep their own behaviour. The applicant's name in the row SHALL be a link to the same page, so the detail page can be reached with the keyboard and opened in a new tab. Rows SHALL show a pointer cursor and a hover highlight. Loading, empty and error rows SHALL NOT navigate.

#### Scenario: Clicking a row

- **WHEN** the user clicks the location cell of Nagy Luca's row
- **THEN** the browser navigates to `/applicants/{id of Nagy Luca}`

#### Scenario: Ticking the checkbox does not navigate

- **WHEN** the user ticks the checkbox of a row
- **THEN** the row is selected and the page stays on the list

#### Scenario: Keyboard navigation

- **WHEN** the user tabs to the name link of a row and presses Enter
- **THEN** the applicant's detail page opens

### Requirement: Tablet list layout

From 768 px to 1279 px, the applicants page SHALL keep the table layout:

- **Header and toolbar:** the header actions and the toolbar (search and filter chips) SHALL wrap onto new lines instead of overflowing. The search field SHALL take the full width of its line.
- **Table:** the table SHALL keep the user's column settings and scroll horizontally inside its frame when the columns do not fit.
- **Selection:** row selection and the bulk-action bar SHALL keep working.

#### Scenario: Toolbar at tablet width

- **WHEN** the applicants page is shown at 820 px
- **THEN** the search field and all filter chips are visible without horizontal page scroll

### Requirement: Mobile applicant cards

Below 768 px, the applicants SHALL be shown as a list of cards instead of the table, in the same order and with the same paging. Each card SHALL link to the applicant's detail page.

The card header SHALL always show the "Név / e-mail" part:

- the initials avatar
- the name, with a "16+" badge from 16 years
- the e-mail address, truncated to one line

Below the header, the card SHALL show one labelled line for each other visible column, in the column order set in the column picker. Each line SHALL use the column's heading as its label: "Életkor", "Program", "Státusz", "Település / iskola", "Hírlevél", "Előzmény", "Jelentkezett", "Szülő", "Telefonszám". The line values SHALL be:

- **Életkor:** "{N} év", or "—".
- **Program:** the latest program with its colour dot and "+N" for further applications, or "—".
- **Státusz:** the latest application's status badge, or "—".
- **Település / iskola:** the settlement with the school after it ("Budapest · Fazekas Gimnázium"), or "—".
- **Hírlevél:** "Feliratkozott", or "—" when not subscribed.
- **Előzmény:** the number of attended programs as plain text ("1 program"), or "—".
- **Jelentkezett:** the creation date as `ÉÉÉÉ.HH.NN`.
- **Szülő:** the parent's name and e-mail, or "—".
- **Telefonszám:** the phone number, or "—".

Hidden columns SHALL have no line. The cards SHALL use the same saved column settings as the table. Cards SHALL NOT have selection checkboxes, and the bulk-action bar SHALL NOT be offered on mobile. The loading, empty and error states SHALL be shown as on desktop, inside the list.

#### Scenario: Card content

- **GIVEN** Nagy Luca, 16 years old, from Budapest, subscribed to the newsletter, whose latest application to "Python alapok – ősz" is accepted, with 1 attended program
- **WHEN** the applicants page is shown at 390 px with the default column settings
- **THEN** her card shows "Nagy Luca" with "16+" and her e-mail
- **AND** below that the lines "Életkor 16 év", "Program Python alapok – ősz", "Státusz Elfogadva", "Település / iskola Budapest", "Hírlevél Feliratkozott", "Előzmény 1 program" and "Jelentkezett" with the date, in this order
- **AND** tapping the card opens her detail page

#### Scenario: Hiding a column hides its card line

- **WHEN** the user turns off "Hírlevél" in the column picker at 390 px
- **THEN** no card shows a "Hírlevél" line
- **AND** the desktop table in the same browser no longer shows the "Hírlevél" column

#### Scenario: Showing an extra column adds its card line

- **WHEN** the user turns on "Telefonszám" at 390 px and moves it to the top
- **THEN** each card shows a "Telefonszám" line directly below the card header

#### Scenario: No selection on mobile

- **WHEN** the applicants page is shown at 390 px
- **THEN** no selection checkboxes and no bulk-action bar are shown

### Requirement: Mobile filters dialog

Below 768 px, the toolbar SHALL show the search field and a "Szűrők" button next to it. Both SHALL be at least 44 px high. The button SHALL show the number of active filters as a badge, and its accessible name SHALL include that number, for example "Szűrők (3 aktív)". Activating it SHALL open a dialog titled "Szűrők" that contains the same filters as the desktop chips, with the same effect on the URL and the list. "Szűrők törlése" SHALL also be available there.

#### Scenario: Filtering on a phone

- **WHEN** the user opens "Szűrők" at 390 px and turns on the "Hírlevél" filter
- **THEN** the list shows only subscribed applicants, the URL contains the filter, and the button shows "1" active filter

### Requirement: Mobile list header

Below 768 px, the page title and the total ("N fő") SHALL be shown on one line with a "További műveletek" menu button. The "E-mail lista" action SHALL be available from that menu. The disabled "Szinkronizálás" action SHALL be shown in that menu as disabled. The duplicate banner SHALL use a compact single-line form with its action button.

#### Scenario: E-mail list from the menu

- **WHEN** the user opens "További műveletek" on the applicants page at 390 px and chooses "E-mail lista"
- **THEN** the e-mail list dialog opens for the current filters
