## ADDED Requirements

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
