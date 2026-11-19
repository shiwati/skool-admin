## MODIFIED Requirements

### Requirement: Header actions

The header SHALL show the following actions:

- **"Visszaigazolás küldése"**: visible but disabled. It SHALL be announced as unavailable, with a tooltip saying it is coming later.
- **"Szerkesztés"**: active. It SHALL be a link to the applicant's edit page at `/applicants/{id}/edit`.
- **"További műveletek"**: a menu button whose menu contains "Törlés".

#### Scenario: Disabled actions

- **WHEN** the user tries to activate "Visszaigazolás küldése"
- **THEN** nothing happens and the button is announced as disabled

#### Scenario: Opening the editor

- **WHEN** the user activates "Szerkesztés" on Nagy Luca's detail page
- **THEN** the edit page `/applicants/{id}/edit` of Nagy Luca opens

## ADDED Requirements

### Requirement: Newsletter history values

In the "Változástörténet" card, the old and new values of the newsletter field SHALL be shown as "Igen" or "Nem" instead of technical values.

#### Scenario: Newsletter subscription change

- **WHEN** an admin subscribed the applicant to the newsletter
- **THEN** the history entry shows "módosította: Hírlevél" with "Nem → Igen"
