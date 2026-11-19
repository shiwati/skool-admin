# applicant-editing Specification

## Purpose

TBD - created by archiving change add-applicant-edit. Update Purpose after archive.

## Requirements

### Requirement: Edit page

The system SHALL provide an edit page at `/applicants/{id}/edit` for signed-in admins. It SHALL appear inside the admin shell, with the "Jelentkezők" menu item active.

- **Breadcrumb:** "Jelentkezők › {név} › Szerkesztés". "Jelentkezők" links to the list and the name links to the detail page.
- **Title:** "Adatlap szerkesztése".
- **Description:** "A mentett módosítások a változástörténetbe kerülnek, a neveddel és az időponttal."

A signed-out visitor SHALL be sent to the login page and returned to the edit page after signing in. For an unknown or deleted applicant, the page SHALL answer 404 with the "Nem található ilyen jelentkező" page.

#### Scenario: Opening the edit page

- **WHEN** an admin opens `/applicants/{id}/edit` for Nagy Luca
- **THEN** the page shows "Adatlap szerkesztése" with the breadcrumb "Jelentkezők › Nagy Luca › Szerkesztés"

#### Scenario: Deleted applicant

- **WHEN** an admin opens the edit page of a deleted applicant
- **THEN** the not-found page is shown with status 404 and no data of the applicant

### Requirement: Form is pre-filled on the server

The page SHALL read the applicant from the database by the id in the URL before rendering, and the first response SHALL contain the form filled with the current values. Missing values SHALL appear as empty fields. No separate endpoint SHALL be used to load the form data.

#### Scenario: Pre-filled values

- **GIVEN** Nagy Luca has phone "+36 30 555 1234" and no school
- **WHEN** the edit page is rendered
- **THEN** the "Telefon" field contains "+36 30 555 1234" and the "Iskola" field is empty

### Requirement: Editable fields

The form SHALL offer these fields:

- **"Személyes adatok" card:**
    - Vezetéknév \*, Keresztnév \*
    - Születési év
    - E-mail \*
    - Telefon, with the hint "Nemzetközi formátumban"
    - Iskola, Település
- **"Szülő / gondviselő" card:**
    - Vezetéknév, Keresztnév
    - Anyja neve
    - Cím
    - E-mail, Telefon
    - a "Feliratkozott a hírlevélre" checkbox

Required fields SHALL be marked with "\*". Program, status and any other application data SHALL NOT be editable here.

#### Scenario: Required markers

- **WHEN** the edit page is rendered
- **THEN** "Vezetéknév", "Keresztnév" and "E-mail" in the "Személyes adatok" card are marked as required

### Requirement: Field validation

The form SHALL validate on submit, and the server SHALL apply the same rules:

- Vezetéknév, keresztnév and e-mail are required.
- Leading and trailing spaces are removed, and empty optional fields are stored as empty values.
- The applicant e-mail and the parent e-mail, when given, must be valid e-mail addresses with a domain ending.
- The birth year, when given, must be a whole number between 1900 and the current year.
- Phone numbers, when given, may contain only digits, spaces, "+", "-", "(" and ")", with 6 to 20 digits.
- Text fields are at most 200 characters.

Invalid fields SHALL be marked invalid for assistive technology and show their error message below the field.

#### Scenario: Invalid e-mail

- **WHEN** the user enters "nagy.luca@gmail" as e-mail and saves
- **THEN** the E-mail field shows "Érvénytelen e-mail cím" and nothing is saved

#### Scenario: Missing required name

- **WHEN** the user clears "Keresztnév" and saves
- **THEN** the field shows "Kötelező mező" and nothing is saved

### Requirement: Error summary

After a failed submit, an alert banner SHALL be shown above the form, titled "N mező javításra szorul". It SHALL list the invalid fields as links that move the focus to the field.

#### Scenario: Two invalid fields

- **WHEN** the user saves with an invalid e-mail and an out-of-range birth year
- **THEN** the banner says "2 mező javításra szorul" and lists "E-mail" and "Születési év"
- **AND** activating "E-mail" focuses the e-mail field

### Requirement: Save bar

While the form differs from the loaded values, a floating bar labelled "Mentés" SHALL show:

- "N nem mentett módosítás", where N is the number of changed fields
- an "Elvetés" button, which restores the loaded values
- a "Mentés" button, which submits the form

While nothing has changed, the bar SHALL NOT be shown. While saving, both buttons SHALL be disabled.

#### Scenario: Counting changes

- **WHEN** the user changes the phone number and the school
- **THEN** the bar shows "2 nem mentett módosítás"

#### Scenario: Discarding

- **WHEN** the user activates "Elvetés"
- **THEN** every field shows its loaded value again and the bar disappears

### Requirement: Leaving with unsaved changes

While there are unsaved changes, the browser SHALL ask for confirmation before the page is closed or reloaded. A "Mégse" link next to the title SHALL return to the detail page.

#### Scenario: Closing the tab

- **WHEN** the user has an unsaved change and closes the tab
- **THEN** the browser asks whether to leave the page

### Requirement: Saving

Saving SHALL send the form values and the applicant's modification time, as loaded, to `POST /api/applicants/{id}/edit`. On success, the user SHALL be taken to the detail page, which shows the new values and an "Az adatlap mentve." confirmation message. Fields the user did not change SHALL keep their values.

#### Scenario: Successful save

- **WHEN** the user corrects the phone number and activates "Mentés"
- **THEN** the detail page opens with the new phone number and the message "Az adatlap mentve."

### Requirement: Save endpoint

`POST /api/applicants/{id}/edit` SHALL behave as follows:

- It SHALL require a valid admin session and answer `401` without one.
- It SHALL validate the body with the same rules as the form and answer `400` with per-field errors.
- It SHALL answer `404` when the applicant does not exist or is deleted.
- It SHALL answer `409` when the applicant was modified after the given modification time.
- On success it SHALL answer `200` with the new modification time.
- It SHALL send no caching headers that allow storing the response.
- Error responses SHALL NOT include personal data or technical details.
- The update SHALL be recorded as made by the signed-in user.
- Logs SHALL contain only the event name, the user id and the number of changed fields.

#### Scenario: Unauthenticated request

- **WHEN** the endpoint is called without a session
- **THEN** it answers 401 and nothing changes

#### Scenario: Invalid body

- **WHEN** the body has an invalid e-mail
- **THEN** it answers 400 with a field error for `email` and nothing changes

### Requirement: Field errors from the server

When the server answers `400` with field errors, the form SHALL show those errors on the matching fields and in the error summary. For any other failure, the form SHALL keep the entered values and show "A mentés nem sikerült. Próbáld újra.".

#### Scenario: Server-side error shown on the field

- **WHEN** the server rejects the parent e-mail
- **THEN** the "Szülő / gondviselő" e-mail field shows the server's message

### Requirement: Conflict detection

When the applicant was changed after the form was loaded, for example by another admin or in another tab, saving SHALL NOT overwrite it. The endpoint SHALL answer `409`. The form SHALL keep the entered values and show "Az adatlapot közben valaki módosította. Töltsd újra az oldalt, és vezesd át a módosításaidat." with a "Újratöltés" button.

#### Scenario: Concurrent edit

- **GIVEN** two admins opened the edit page of the same applicant
- **WHEN** the first saves and then the second saves
- **THEN** the second save is rejected with the conflict message and the first admin's values are kept

### Requirement: Changes are logged to history

Each successful save SHALL record, in the same transaction as the update, one change-history entry per field whose stored value changed. Each entry SHALL hold:

- the field
- the old and new values
- the saving user
- the time of the change

Fields whose value did not change SHALL NOT be logged. A save with no actual change SHALL succeed without writing entries. Entries SHALL appear in the "Változástörténet" card of the detail page.

#### Scenario: Phone correction is logged

- **WHEN** Szabó Péter changes the phone from "+36 30 555 1243" to "+36 30 555 1234" and saves
- **THEN** the detail page history shows "Szabó Péter módosította: Telefon" with "+36 30 555 1243 → +36 30 555 1234"

#### Scenario: Unchanged save

- **WHEN** the user saves without changing any value
- **THEN** no history entry is written

### Requirement: Duplicate flags stay consistent

When a save changes the last name, the first name or the e-mail, the applicant's duplicate key SHALL be recomputed in the same way the sheet import computes it. The duplicate flags SHALL be updated so that each applicant is flagged exactly when another non-deleted applicant shares its key. This applies both to the applicants sharing the old key and to those sharing the new key.

#### Scenario: Fixing a typo removes a duplicate flag

- **GIVEN** two applicants share a duplicate key because one has a mistyped e-mail
- **WHEN** the e-mail of one of them is corrected to a different address
- **THEN** neither applicant is flagged as a possible duplicate anymore

### Requirement: Side information

A side column SHALL show two cards:

- **"Mit naplózunk?"**, saying: "Minden mentett mezőnél: ki módosított (Google-fiók), mikor, és a régi → új érték. A naplóbejegyzések nem szerkeszthetők és nem törölhetők."
- **"Automatikus mezők"**, explaining:
    - "16+": "a születési évből számolva"
    - "Alumni": "elvégzett program esetén"

#### Scenario: Side cards

- **WHEN** the edit page is rendered
- **THEN** the "Mit naplózunk?" and "Automatikus mezők" cards are shown
