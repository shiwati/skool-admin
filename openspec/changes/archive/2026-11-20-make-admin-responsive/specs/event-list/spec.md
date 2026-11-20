## ADDED Requirements

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
