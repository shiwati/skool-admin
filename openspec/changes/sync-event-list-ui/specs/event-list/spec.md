# Spec Delta

## MODIFIED Requirements

### Requirement: Program table columns

The table SHALL show these columns by default, in this order: "Program", "Időpont", "Helyszín", "Kapacitás · jelentkezők", "Oktatók", "Státusz", and a row actions button labelled "Műveletek: <program name>" for assistive technology. The visible columns and their order SHALL follow the user's column settings; "Program" SHALL always be visible and the row actions button SHALL always be the last column.

#### Scenario: Column order

- **WHEN** the table is rendered with the default column settings
- **THEN** the columns appear in the order listed

### Requirement: Program name links to the program page

The "Program" cell SHALL show the program name and its tags as badges. The name SHALL link to the program's own page (`/events/<id>`), so the page can be reached with the keyboard and opened in a new tab. Clicking anywhere else on a program row SHALL also open that page, except on the row actions button and its menu, which keep their own behaviour. Rows SHALL show a pointer cursor and a hover highlight. Ctrl/⌘-click on a row SHALL open the page in a new tab.

#### Scenario: Opening a program's page

- **WHEN** the admin activates the name "Python alapok – tél"
- **THEN** `/events/<id>` opens for that program

#### Scenario: Clicking elsewhere on the row

- **WHEN** the admin clicks the "Kapacitás · jelentkezők" cell of a program row
- **THEN** `/events/<id>` opens for that program

#### Scenario: Using the row actions

- **WHEN** the admin clicks "Műveletek: <program name>" on a row
- **THEN** the actions menu opens and the program page does not open

### Requirement: Mobile program cards

Below 768 px, programs SHALL be shown as cards instead of the table, in the same order and with the same paging. Each card SHALL show a header with the program name and colour dot, linking to the program page, its tags, and a "Műveletek: <program name>" button with the row actions. Below the header, every other visible column SHALL be one labelled line, in the order of the column settings:

- "Időpont": the date cell content
- "Helyszín": the location and partner
- "Igény": "<applications> / <capacity> fő" with the ratio badge
- "Oktatók": the instructors line
- "Státusz": the display status

Tapping anywhere on a card, except on the actions button and its menu, SHALL open the program page. Hidden columns SHALL have no line. The empty states SHALL be shown as on desktop.

#### Scenario: Program card

- **GIVEN** a program with capacity 20 and 62 applications
- **WHEN** `/events` is shown at 390 px
- **THEN** its card shows "62 / 20 fő" with the "3,1×" badge, and tapping the name opens the program page

#### Scenario: Hidden column on a card

- **GIVEN** the "Helyszín / partner" column is hidden in the column settings
- **WHEN** `/events` is shown at 390 px
- **THEN** the cards have no "Helyszín" line

### Requirement: Mobile new-program action

Below 768 px, "Új program" SHALL be a floating button in the bottom-right corner above the bottom navigation, and SHALL link to `/events/new`. The search field SHALL fill its row next to the "Oszlopok" icon button, the filter chips SHALL be a horizontally scrollable row, and the phase tabs SHALL scroll horizontally.

#### Scenario: Creating a program from a phone

- **WHEN** the user taps the floating "Új program" button at 390 px
- **THEN** `/events/new` opens

## ADDED Requirements

### Requirement: Program column picker

An "Oszlopok" button SHALL open the "Oszlopok a listában" panel, listing every column in the current order with a checkbox. "Program" SHALL be checked and cannot be unchecked. From 768 px, the button SHALL be at the end of the filter row, and the panel SHALL allow reordering by dragging and with keyboard-operable move up/down controls. A "Alapértelmezés visszaállítása" action SHALL restore the default columns.

#### Scenario: Hiding a column

- **WHEN** the admin unticks "Helyszín / partner" in the panel
- **THEN** the "Helyszín" column disappears from the table

#### Scenario: Reordering with the keyboard

- **WHEN** the admin moves "Státusz" up one position using the keyboard at 1280 px
- **THEN** the "Státusz" column moves one position left in the table

### Requirement: Mobile program column picker

Below 768 px, the column picker SHALL be a 44 × 44 px icon button with the accessible name "Oszlopok", next to the search field. Its panel SHALL only control visibility: it SHALL NOT offer drag handles or move up/down controls, and the cards SHALL keep the order set on a larger screen.

#### Scenario: Column picker on a phone

- **WHEN** `/events` is shown at 390 px and the admin taps "Oszlopok"
- **THEN** the "Oszlopok a listában" panel opens with checkboxes and no move up/down controls

### Requirement: Program column settings persist in the browser

The programs list's column visibility and order SHALL be saved in the user's browser and restored on later visits in that browser, separately from the Jelentkezők list's column settings. If saved settings are missing, unreadable or refer to unknown columns, the defaults SHALL be used for whatever cannot be restored.

#### Scenario: Returning later

- **WHEN** the admin hid "Oktatók", left, and opens `/events` again in the same browser
- **THEN** "Oktatók" is still hidden, and the Jelentkezők list's columns are unchanged
