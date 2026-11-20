## ADDED Requirements

### Requirement: Single-column detail layout below 1280 px

Below 1280 px, the detail page SHALL show all cards in one column, in this order:

1. "Személyes adatok"
2. "Szülő / gondviselő"
3. "Programok"
4. "Jelentkezési űrlap válaszai"
5. "Címkék"
6. "Változástörténet"

The page SHALL NOT use tabs. On tablet, the header actions SHALL be shown on their own row below the name, with "Szerkesztés" and "Visszaigazolás küldése" sharing the width and "További műveletek" beside them.

#### Scenario: Card order on a tablet

- **WHEN** the detail page is shown at 820 px
- **THEN** "Címkék" and "Változástörténet" follow the main cards in a single column

### Requirement: Mobile detail header

Below 768 px, the page SHALL behave as follows:

- **Breadcrumb:** replaced by a back link "‹ Jelentkezők" to `/applicants`.
- **Header:** the avatar (64 px), name, badges and meta line SHALL be centred.
- **Actions:** "Visszaigazolás küldése" (disabled) and "Szerkesztés" SHALL share a full-width row, and "További műveletek" SHALL stay available.

#### Scenario: Back to the list

- **WHEN** the user taps "‹ Jelentkezők" on a detail page at 390 px
- **THEN** `/applicants` opens

### Requirement: Mobile detail cards

Below 768 px, the following SHALL apply:

- **Key–value lists:** each card's key–value list SHALL use one column, with a divider between rows.
- **Programs:** the "Programok" table SHALL be shown as a list. Each row SHALL show the colour dot, the program name, the date range below the name, and the status badge on the right.
- **Summary:** the "N jelentkezés · M elvégzett" summary SHALL stay in the section header.

#### Scenario: Programs list on a phone

- **GIVEN** an applicant with 3 applications
- **WHEN** the detail page is shown at 390 px
- **THEN** the "Programok" section shows 3 list rows with name, dates and status, and no table
