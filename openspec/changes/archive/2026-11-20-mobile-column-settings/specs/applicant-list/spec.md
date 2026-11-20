## MODIFIED Requirements

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
