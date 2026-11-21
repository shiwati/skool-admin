# applicant-detail Specification

## Purpose

Shows everything about one applicant at `/applicants/<id>`: personal and parent data, the programs they applied to with their form answers, tags and the latest changes, with actions to edit or delete the applicant.

## Requirements

### Requirement: Applicant detail page

The system SHALL provide an applicant detail page at `/applicants/{id}` for signed-in admins, inside the admin shell with the "Jelentkezők" menu item active. The page title SHALL be the applicant's name. A breadcrumb labelled "Morzsamenü" SHALL show "Jelentkezők" (linking to `/applicants`) followed by the applicant's name. A signed-out visitor SHALL be sent to the login page and, after signing in, back to the same detail page.

#### Scenario: Opening the detail page

- **WHEN** a signed-in admin opens `/applicants/{id}` for applicant Nagy Luca
- **THEN** the page shows the heading "Nagy Luca" inside the admin shell
- **AND** the breadcrumb shows "Jelentkezők › Nagy Luca" with "Jelentkezők" linking to the list

#### Scenario: Signed-out visitor

- **WHEN** a signed-out visitor opens `/applicants/{id}`
- **THEN** they are redirected to the login page with `/applicants/{id}` as the return address
- **AND** no applicant data is read or sent

### Requirement: Data is loaded on the server before rendering

The page SHALL read the applicant, their applications with program data, and the related change history from the database by the id in the URL before rendering, and SHALL deliver the complete page in the first response. No API endpoint SHALL be added for the detail data, and the page SHALL NOT show a loading state for it.

#### Scenario: First response contains the data

- **WHEN** the detail page of an existing applicant is requested
- **THEN** the first HTML response already contains the applicant's name, personal data and programs

### Requirement: Unknown or deleted applicants are not shown

When no applicant has the id in the URL, or the applicant has been deleted (anonymized), the page SHALL show a not-found page with the text "Nem található ilyen jelentkező" and a link back to "Jelentkezők", and SHALL answer with HTTP status 404. Data of a deleted applicant SHALL never be rendered.

#### Scenario: Deleted applicant

- **GIVEN** applicant "a1" was deleted
- **WHEN** an admin opens `/applicants/a1`
- **THEN** the not-found page is shown with status 404 and no data of "a1"

#### Scenario: Unknown id

- **WHEN** an admin opens `/applicants/does-not-exist`
- **THEN** the not-found page is shown with status 404

### Requirement: Detail page header

The header SHALL show an initials avatar and the name as "Vezetéknév Keresztnév". Next to the name it SHALL show:

- the status label of the most recently received application, if any
- "16+" when the current year minus the birth year is at least 16
- "Hírlevél" when subscribed to the newsletter
- "Alumni" when at least one application has the status "Részt vett"

Below the name, a meta line SHALL show "Létrehozva {ÉÉÉÉ.HH.NN ÓÓ:PP}" and "Módosítva {ÉÉÉÉ.HH.NN ÓÓ:PP}", in Budapest time.

#### Scenario: Header of an alumni applicant

- **GIVEN** Nagy Luca, born 2010, subscribed to the newsletter, has applications "Python alapok – ősz" (Elfogadva, newest) and "Robotika tábor" (Részt vett)
- **WHEN** the detail page is rendered in 2026
- **THEN** the header shows the badges "Elfogadva", "16+", "Hírlevél" and "Alumni"

#### Scenario: Applicant without applications or birth year

- **WHEN** the applicant has no applications, no birth year and no newsletter subscription
- **THEN** no badges are shown

### Requirement: Personal and parent data cards

A "Személyes adatok" card SHALL list:

- Teljes név
- Születési év, with the age: "2010 · 16 év"
- E-mail
- Telefon
- Iskola
- Település

A "Szülő / gondviselő" card SHALL list:

- Név
- Anyja neve
- Cím
- E-mail
- Telefon

Missing values SHALL show "—". E-mail addresses SHALL be `mailto:` links and phone numbers SHALL be `tel:` links.

#### Scenario: Missing parent data

- **WHEN** the applicant has no parent details
- **THEN** every row of the "Szülő / gondviselő" card shows "—"

### Requirement: Programs table

A "Programok" section SHALL list every application of the applicant, most recently received first. Each row SHALL show:

- Program: name and colour dot, as in the list
- Időpont: the program dates as `ÉÉÉÉ.HH.NN – ÉÉÉÉ.HH.NN`
- Státusz: status badge, as in the list
- Jelentkezett: the date received

The section header SHALL show "N jelentkezés · M elvégzett", where M counts the "Részt vett" applications. Without applications, the section SHALL show "Még nincs jelentkezése".

#### Scenario: Programs summary

- **GIVEN** the applicant has 3 applications, 2 of them with status "Részt vett"
- **WHEN** the detail page is rendered
- **THEN** the "Programok" header shows "3 jelentkezés · 2 elvégzett" and the table has 3 rows

### Requirement: Application form answers

When the applicant has at least one application, a "Jelentkezési űrlap válaszai" card SHALL show the answers of the most recently received application. Its subtitle SHALL be "{program} · beküldve {ÉÉÉÉ.HH.NN ÓÓ:PP}". It SHALL list only the answered questions. When no question is answered, the card SHALL say "Nincs kitöltött válasz".

#### Scenario: Only answered questions are listed

- **GIVEN** the latest application has answers only for "Honnan hallottál rólunk?" and "Megjegyzés"
- **WHEN** the detail page is rendered
- **THEN** the card lists exactly those two questions with their answers

#### Scenario: No applications

- **WHEN** the applicant has no applications
- **THEN** the "Jelentkezési űrlap válaszai" card is not shown

### Requirement: Application form answer labels

Each answered question SHALL be shown with one of these labels:

- Honnan hallottál rólunk?
- Kitől hallottál rólunk?
- Milyen problémát oldanál meg?
- Van programozási tapasztalatod?
- Részt vettél már Skool programon?
- Korábbi Skool program
- Más programok
- Étkezési igény
- Megjegyzés

"Részt vettél már Skool programon?" SHALL be shown only when the answer is yes, as "Igen".

#### Scenario: Past Skool participation

- **GIVEN** the latest application answers yes to "Részt vettél már Skool programon?"
- **WHEN** the detail page is rendered
- **THEN** the card lists "Részt vettél már Skool programon?" with the answer "Igen"

### Requirement: Tags card

A "Címkék" card SHALL show the badges below and the note "A 16+ címkét a rendszer a születési év alapján adja és veszi el; kézzel nem módosítható.":

- "16+ · automatikus", under the same rule as the header
- "Hírlevél"
- "Alumni"

With no applicable tag, it SHALL say "Nincs címke". The tags SHALL NOT be editable.

#### Scenario: Automatic 16+ tag

- **WHEN** a 17-year-old applicant's page is rendered
- **THEN** the "Címkék" card shows "16+ · automatikus"

### Requirement: Change history card

A "Legutóbbi változások" card SHALL list the recorded changes of the applicant and of their applications, newest first, at most 5 entries. The card header SHALL show a "Teljes napló" link to the applicant's full change history at `/history/<id>`, also when there are no entries. Without entries, the card SHALL say "Még nincs rögzített változás".

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

### Requirement: Change history entries

Each entry of the "Legutóbbi változások" card SHALL show:

- who made the change: the user's name, or "Rendszer" when no user is recorded
- the changed field with a Hungarian label; for an application change, also the program name
- the old and new values as "régi → új", when recorded
- when it happened, as `ÉÉÉÉ.HH.NN ÓÓ:PP` in Budapest time

Status values SHALL be shown with their status labels. Fields without a known label SHALL show their technical name.

#### Scenario: Status change of an application

- **GIVEN** Kovács Anna changed the status of the "Python alapok – ősz" application from APPLIED to ACCEPTED
- **WHEN** the detail page is rendered
- **THEN** the history card shows "Kovács Anna módosította: Státusz (Python alapok – ősz)" with "Új jelentkező → Elfogadva" and the change time

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

### Requirement: Deleting from the detail page

Choosing "Törlés" in the "További műveletek" menu SHALL open the same deletion confirmation as the list, naming this applicant. After a successful deletion, the user SHALL be taken to `/applicants`, and a confirmation message SHALL say the applicant was deleted. If the deletion fails, the dialog SHALL stay open with an error message and the page SHALL be unchanged.

#### Scenario: Deleting the applicant

- **WHEN** the user opens "További műveletek", chooses "Törlés", ticks "Értem, a törlés nem vonható vissza" and confirms
- **THEN** the applicant is anonymized
- **AND** the user lands on `/applicants` with a "1 jelentkező törölve" message

#### Scenario: Deletion fails

- **WHEN** the deletion request fails
- **THEN** the dialog shows "A törlés nem sikerült. Próbáld újra." and the user stays on the detail page

### Requirement: Newsletter history values

In the "Változástörténet" card, the old and new values of the newsletter field SHALL be shown as "Igen" or "Nem" instead of technical values.

#### Scenario: Newsletter subscription change

- **WHEN** an admin subscribed the applicant to the newsletter
- **THEN** the history entry shows "módosította: Hírlevél" with "Nem → Igen"

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
