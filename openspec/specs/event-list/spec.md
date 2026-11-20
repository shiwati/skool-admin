# event-list Specification

## Purpose

Lets admins browse programs (events) at `/events`, see each program's phase, status and demand at a glance, and narrow the list by phase, text, tags, place, year and instructor.

## Requirements

### Requirement: Programs page

The system SHALL serve the programs screen at `/events` to signed-in admins. The page SHALL show the overline "Programok" and the heading "Programok és események". The subtitle SHALL show how many programs match the current filters in all phases and how many of them are active, for example "24 program · 9 aktív jelentkezési időszakban". An "Új program" action SHALL link to `/events/new`.

#### Scenario: Signed-in admin opens the page

- **WHEN** a signed-in admin opens `/events`
- **THEN** the heading "Programok és események", the phase tabs and the program table are shown
- **AND** "Új program" links to `/events/new`

#### Scenario: Unauthenticated visit

- **WHEN** an unauthenticated visitor opens `/events`
- **THEN** they are redirected to `/login` with `/events` as the return URL

### Requirement: Event phase

Every event SHALL be in exactly one phase at a given moment. An event SHALL be "closed" when its end (`to`) is in the past. It SHALL be "active" when it has not ended and has a registration sheet (`applicationSheetUrl`). It SHALL be "planned" when it has not ended and has no registration sheet.

#### Scenario: Ended event

- **GIVEN** an event whose `to` is earlier than now
- **WHEN** its phase is determined
- **THEN** it is "closed", whether or not it has a sheet

#### Scenario: Upcoming event with a sheet

- **GIVEN** an event that starts next week and has a `applicationSheetUrl`
- **WHEN** its phase is determined
- **THEN** it is "active"

#### Scenario: Upcoming event without a sheet

- **GIVEN** an event that starts next month and has no `applicationSheetUrl`
- **WHEN** its phase is determined
- **THEN** it is "planned"

#### Scenario: Running event

- **GIVEN** an event that started yesterday, ends next week and has a `applicationSheetUrl`
- **WHEN** its phase is determined
- **THEN** it is "active"

### Requirement: Phase tabs

The page SHALL show the tabs "Aktív", "Tervezett", "Lezárt" and "Összes", in that order. Each tab SHALL show the number of programs in that phase that match the other current filters. "Összes" SHALL show all phases. "Aktív" SHALL be selected by default. The tabs SHALL be operable with the arrow keys.

#### Scenario: Default tab

- **WHEN** an admin opens `/events` with no tab in the URL
- **THEN** "Aktív" is selected and only active programs are listed

#### Scenario: Counts follow the filters

- **GIVEN** 3 active programs, 2 of them tagged `robotika`
- **WHEN** the admin filters by the tag `robotika`
- **THEN** the "Aktív" tab shows 2

#### Scenario: Switching tab

- **WHEN** the admin is on page 2 of "Aktív" and selects "Lezárt"
- **THEN** closed programs are listed, starting from page 1

### Requirement: Event display status

Each row SHALL show one status badge:

- "Lezárva" when the event has ended.
- "Folyamatban" when it has started and not ended.
- "Tervezett" when it is upcoming and has no registration sheet.
- "Betelt · várólista" when it is upcoming, has a sheet, has a capacity above zero, and its applications reach or exceed that capacity.
- "Jelentkezés nyitva" in every other case.

#### Scenario: Upcoming event at capacity

- **GIVEN** an upcoming event with a sheet, capacity 4 and 6 applications
- **WHEN** it is listed
- **THEN** its status is "Betelt · várólista"

#### Scenario: Upcoming event below capacity

- **GIVEN** an upcoming event with a sheet, capacity 20 and 3 applications
- **WHEN** it is listed
- **THEN** its status is "Jelentkezés nyitva"

#### Scenario: Capacity not set

- **GIVEN** an upcoming event with a sheet, capacity 0 and 50 applications
- **WHEN** it is listed
- **THEN** its status is "Jelentkezés nyitva"

#### Scenario: Event in progress

- **GIVEN** an event that started yesterday and ends tomorrow
- **WHEN** it is listed
- **THEN** its status is "Folyamatban"

### Requirement: Program table columns

The table SHALL show these columns, in this order: "Program", "Időpont", "Helyszín", "Jelentkezők · kapacitás", "Oktatók", "Státusz", and a row actions button labelled "Műveletek: <program name>" for assistive technology.

#### Scenario: Column order

- **WHEN** the table is rendered
- **THEN** the columns appear in the order listed

### Requirement: Program name links to the program page

The "Program" cell SHALL show the program name and its tags as badges. The name SHALL link to the program's own page (`/events/<id>`).

#### Scenario: Opening a program's page

- **WHEN** the admin activates the name "Python alapok – tél"
- **THEN** `/events/<id>` opens for that program

### Requirement: Date cell

The "Időpont" cell SHALL show the date range in Budapest time as `MM.DD – MM.DD`, and the number of calendar days the event touches ("N nap"). A one-day event SHALL show a single date. Dates outside the current year SHALL include the year (`YYYY.MM.DD`). A range that crosses a year boundary SHALL show the year on both ends.

#### Scenario: Range in the current year

- **GIVEN** today is 2026-11-19 and an event runs from 2026-11-21 to 2026-12-12
- **WHEN** it is listed
- **THEN** the cell shows "11.21 – 12.12" and "22 nap"

#### Scenario: One-day event

- **WHEN** an event starts and ends on 2026-11-16
- **THEN** the cell shows "11.16" and "1 nap"

#### Scenario: Event in another year

- **GIVEN** today is in 2026
- **WHEN** an event ran from 2025-07-06 to 2025-07-10
- **THEN** the cell shows "2025.07.06 – 07.10"

### Requirement: Location cell

The "Helyszín" cell SHALL show the location and, below it, the partner company when there is one. A missing location SHALL be shown as "—".

#### Scenario: Event with location and partner

- **GIVEN** an event at "Budapest, Minta utca 1." with the partner "Minta Robotics Kft."
- **WHEN** it is listed
- **THEN** the cell shows the location, with the partner below it

### Requirement: Demand cell

When the capacity is above zero, the "Jelentkezők · kapacitás" cell SHALL show "<applications> / <capacity> fő", the ratio of applications to capacity as a badge with one decimal and a decimal comma (for example "3,1×"), and a bar filled in proportion to the ratio, up to full. When the capacity is zero, it SHALL show "<applications> jelentkező" with no badge and no bar. Applications SHALL be counted in every status.

#### Scenario: Oversubscribed program

- **GIVEN** an event with capacity 20 and 62 applications
- **WHEN** it is listed
- **THEN** the cell shows "62 / 20 fő" and the badge "3,1×", and the bar is full

#### Scenario: No capacity

- **GIVEN** an event with capacity 0 and 7 applications
- **WHEN** it is listed
- **THEN** the cell shows "7 jelentkező" and no ratio badge

### Requirement: Oversubscription badge tone

The ratio badge SHALL use a distinct tone in each of three bands: at least 2×, from 1× up to 2×, and below 1×.

#### Scenario: Tones by band

- **WHEN** the ratios 2,5×, 1,5× and 0,2× are shown
- **THEN** each badge uses the tone of its band, and the three tones differ

### Requirement: Instructors cell

The "Oktatók" cell SHALL show monogram avatars for the first two of the instructor and the mentors, in that order. When there are more people, it SHALL also show "+N". The full list of names SHALL be available to assistive technology. With no instructor and no mentors, the cell SHALL show "—".

#### Scenario: Instructor and two mentors

- **GIVEN** the instructor "Kovács Péter" and the mentors "Nagy Anna" and "Szabó Gergő"
- **WHEN** the event is listed
- **THEN** the avatars "KP" and "NA" are shown, followed by "+1"

#### Scenario: Nobody assigned

- **GIVEN** an event with no instructor and no mentors
- **WHEN** it is listed
- **THEN** the cell shows "—"

### Requirement: Row actions

The row actions menu SHALL offer "Jelentkezők megtekintése". It SHALL lead to the applicants list, filtered to that program.

#### Scenario: Viewing applicants from the menu

- **WHEN** the admin opens a row's actions and selects "Jelentkezők megtekintése"
- **THEN** `/applicants?eventIds=<id>` opens

### Requirement: Search programs

The page SHALL have a search field labelled "Keresés a programok között". It SHALL filter programs by name, ignoring case. Every word typed SHALL appear in the name. The search SHALL apply after the user stops typing for a short delay, without a separate submit.

#### Scenario: Multi-word search

- **WHEN** the admin types "python tél"
- **THEN** only programs whose name contains both "python" and "tél" are listed

### Requirement: Filter chips

The page SHALL offer these filter chips:

- "Címke": see `event-tags`.
- "Helyszín / partner": text that must appear in the location or in the partner company, ignoring case.
- "Időszak": a year, or "Bármikor". It matches programs that start in that year, in Budapest time.
- "Oktató": text that must appear in the instructor's name.

Active filters SHALL combine with AND. "Szűrők törlése" SHALL appear while any filter is active and SHALL clear them all.

#### Scenario: Place matches the partner

- **GIVEN** an event at "Online" whose partner is "Példa Szoftver Zrt."
- **WHEN** the admin filters "Helyszín / partner" by "példa"
- **THEN** the event is listed

#### Scenario: Year filter

- **WHEN** the admin selects 2027 under "Időszak"
- **THEN** only programs starting in 2027 are listed

#### Scenario: Clearing all filters

- **GIVEN** a search text and a year filter are active
- **WHEN** the admin activates "Szűrők törlése"
- **THEN** both are cleared, and the selected tab is kept

### Requirement: Sorting

The "Program", "Időpont" and "Jelentkezők · kapacitás" headers SHALL sort the list by name, start date and capacity. The list SHALL be sorted by start date, newest first, by default. The first activation of a header SHALL sort by name or capacity in ascending order, and by start date in descending order. Activating the current sort header again SHALL reverse the order. The current sort SHALL be exposed to assistive technology.

#### Scenario: Sort by name

- **WHEN** the admin activates the "Program" header
- **THEN** programs are listed A to Z, and the header is marked as sorted ascending

#### Scenario: Reverse the order

- **GIVEN** the list is sorted by name, A to Z
- **WHEN** the admin activates the "Program" header again
- **THEN** programs are listed Z to A

### Requirement: Pagination

The list SHALL be paginated with 25 rows per page by default, and the user SHALL be able to choose 10, 25, 50 or 100. The pager SHALL show the visible range and the total, for example "1–25 / 40 aktív program". Any change other than the page itself SHALL return to page 1.

#### Scenario: Changing a filter on a later page

- **GIVEN** the admin is on page 3
- **WHEN** they change the search text
- **THEN** page 1 of the new result is shown

### Requirement: List state in the URL

The tab, search text, filters, sort, page and page size SHALL be kept in the URL, so that reloading or sharing the URL shows the same list. Default values SHALL be left out of the URL. Unknown or invalid values in the URL SHALL be ignored, and the default SHALL be used instead, without an error.

#### Scenario: Reloading a filtered list

- **GIVEN** the admin is on the "Lezárt" tab, sorted by name, filtered by "Pécs"
- **WHEN** they reload the page
- **THEN** the same tab, sort and filter are applied

#### Scenario: Invalid value in the URL

- **WHEN** the admin opens `/events?tab=draft&page=-1`
- **THEN** the "Aktív" tab and page 1 are shown

### Requirement: Empty states

When no program matches, the table SHALL show an empty state instead of rows. If any filter is active, it SHALL say "Nincs a szűrésnek megfelelő program" and offer "Szűrők törlése". Otherwise it SHALL say "Ebben a szakaszban nincs program" and suggest looking at the other tabs or creating a program.

#### Scenario: Filter with no match

- **WHEN** the admin searches for a name no program has
- **THEN** "Nincs a szűrésnek megfelelő program" and "Szűrők törlése" are shown

#### Scenario: Empty phase without filters

- **GIVEN** there are no planned programs
- **WHEN** the admin selects "Tervezett" with no filters active
- **THEN** "Ebben a szakaszban nincs program" is shown

### Requirement: Phase parameter on the events endpoint

`GET /api/events` SHALL accept an optional `phase` parameter with the value `active`, `planned` or `closed`. When it is given, the endpoint SHALL return only events in that phase. When it is missing, events in every phase SHALL be returned. Any other value SHALL be rejected with `400 {"error":"Invalid query parameters", details}`.

#### Scenario: Planned events only

- **WHEN** an admin calls `GET /api/events?phase=planned`
- **THEN** only events that have not ended and have no `applicationSheetUrl` are returned

#### Scenario: Unknown phase

- **WHEN** an admin calls `GET /api/events?phase=draft`
- **THEN** the response is `400` with `error` set to `"Invalid query parameters"`

### Requirement: Place parameter on the events endpoint

`GET /api/events` SHALL accept an optional `place` parameter. It SHALL return only events whose location or partner company contains the given text, ignoring case. It SHALL combine with the other filters using AND.

#### Scenario: Match on location

- **WHEN** an admin calls `GET /api/events?place=debrecen`
- **THEN** events located in "Debrecen, Példa tér 5." are returned

### Requirement: Tablet programs layout

From 768 px to 1279 px, the programs page SHALL keep the table. The table SHALL scroll horizontally inside its frame instead of widening the page. The phase tabs SHALL scroll horizontally when they do not fit. The header actions, search and filter chips SHALL wrap onto new lines.

#### Scenario: Programs at tablet width

- **WHEN** `/events` is shown at 820 px
- **THEN** the page has no horizontal scroll and the table can be scrolled sideways within its frame

### Requirement: Mobile program cards

Below 768 px, programs SHALL be shown as cards instead of the table, in the same order and with the same paging. Each card SHALL show:

- the program name with its colour dot, linking to the program page
- the date cell content
- the location and partner
- the demand ("<applications> / <capacity> fő" with the ratio badge)
- the instructors line
- the display status

The row actions SHALL remain available from a "Műveletek: <program name>" button on the card. The empty states SHALL be shown as on desktop.

#### Scenario: Program card

- **GIVEN** a program with capacity 20 and 62 applications
- **WHEN** `/events` is shown at 390 px
- **THEN** its card shows "62 / 20 fő" with the "3,1×" badge, and tapping the name opens the program page

### Requirement: Mobile new-program action

Below 768 px, "Új program" SHALL be a floating button in the bottom-right corner above the bottom navigation, and SHALL link to `/events/new`. The search field SHALL take the full width, the filter chips SHALL be a horizontally scrollable row, and the phase tabs SHALL scroll horizontally.

#### Scenario: Creating a program from a phone

- **WHEN** the user taps the floating "Új program" button at 390 px
- **THEN** `/events/new` opens
