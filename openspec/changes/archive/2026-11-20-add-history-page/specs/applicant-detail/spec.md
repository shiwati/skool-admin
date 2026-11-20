# Spec Delta

## MODIFIED Requirements

### Requirement: Change history card

A "Legutóbbi változások" card SHALL list the recorded changes of the applicant and of their applications, newest first, at most 5 entries. The card header SHALL show a "Teljes napló" link to the applicant's full change history at `/history/<id>`, also when there are no entries. Each entry SHALL show:

- who made the change: the user's name, or "Rendszer" when no user is recorded
- the changed field with a Hungarian label; for an application change, also the program name
- the old and new values as "régi → új", when recorded
- when it happened, as `ÉÉÉÉ.HH.NN ÓÓ:PP` in Budapest time

Status values SHALL be shown with their status labels. Fields without a known label SHALL show their technical name. Without entries, the card SHALL say "Még nincs rögzített változás".

#### Scenario: Status change of an application

- **GIVEN** Kovács Anna changed the status of the "Python alapok – ősz" application from APPLIED to ACCEPTED
- **WHEN** the detail page is rendered
- **THEN** the history card shows "Kovács Anna módosította: Státusz (Python alapok – ősz)" with "Új jelentkező → Elfogadva" and the change time

#### Scenario: No recorded changes

- **WHEN** no history entry exists for the applicant or their applications
- **THEN** the card says "Még nincs rögzített változás"

#### Scenario: Only the latest five changes

- **GIVEN** the applicant and their applications have 8 recorded changes
- **WHEN** the detail page is rendered
- **THEN** the card lists the 5 latest changes

#### Scenario: Opening the full history

- **WHEN** the admin activates "Teljes napló" on the history card
- **THEN** `/history/<id>` opens for this applicant
