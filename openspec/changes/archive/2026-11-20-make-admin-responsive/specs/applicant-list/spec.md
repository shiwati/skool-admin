## ADDED Requirements

### Requirement: Tablet list layout

From 768 px to 1279 px, the applicants page SHALL keep the table layout:

- **Header and toolbar:** the header actions and the toolbar (search and filter chips) SHALL wrap onto new lines instead of overflowing. The search field SHALL take the full width of its line.
- **Table:** the table SHALL keep the user's column settings and scroll horizontally inside its frame when the columns do not fit.
- **Selection:** row selection and the bulk-action bar SHALL keep working.

#### Scenario: Toolbar at tablet width

- **WHEN** the applicants page is shown at 820 px
- **THEN** the search field and all filter chips are visible without horizontal page scroll

### Requirement: Mobile applicant cards

Below 768 px, the applicants SHALL be shown as a list of cards instead of the table, in the same order and with the same paging. Each card SHALL link to the applicant's detail page and show:

- the initials avatar
- the name, with a "16+" badge from 16 years
- the e-mail address, truncated to one line
- "{életkor} év · {település}", leaving out the missing parts
- a badge "Korábban részt vett · N program" when the applicant has attended programs, otherwise "Első jelentkezés"
- a "Hírlevél" badge when subscribed

Cards SHALL NOT have selection checkboxes. The bulk-action bar and the column picker SHALL NOT be offered on mobile. The loading, empty and error states SHALL be shown as on desktop, inside the list.

#### Scenario: Card content

- **GIVEN** Nagy Luca, 16 years old, from Budapest, with 2 attended programs and a newsletter subscription
- **WHEN** the applicants page is shown at 390 px
- **THEN** her card shows "Nagy Luca" with "16+", her e-mail, "16 év · Budapest", "Korábban részt vett · 2 program" and "Hírlevél"
- **AND** tapping the card opens her detail page

#### Scenario: No selection on mobile

- **WHEN** the applicants page is shown at 390 px
- **THEN** no selection checkboxes and no column picker are shown

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
