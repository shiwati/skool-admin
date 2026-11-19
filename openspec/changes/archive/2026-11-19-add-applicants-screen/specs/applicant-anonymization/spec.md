# Spec Delta

## Purpose

Deletes applicants in a GDPR-compliant way: their personal data is irreversibly removed, while non-identifying participation history needed for program statistics and reports is kept.

## ADDED Requirements

### Requirement: Deletion entry points

Admins SHALL be able to delete applicants from the applicants list in two ways: the "Törlés" bulk action for the selected rows, and a "Törlés" item in a row's "Műveletek" menu for that applicant.

#### Scenario: Deleting one applicant from the row menu

- **WHEN** the user opens a row's "Műveletek" menu and chooses "Törlés"
- **THEN** the deletion confirmation opens for that single applicant

### Requirement: Deletion requires explicit confirmation

Before deleting, the system SHALL show a confirmation dialog announced as an alert dialog. It SHALL name the applicant (or give the count when there are several) and state that personal data is removed permanently and cannot be restored. The delete button SHALL stay disabled until the user ticks "Értem, a törlés nem vonható vissza". "Mégse" SHALL close the dialog without changes.

#### Scenario: Confirming a bulk deletion

- **WHEN** 4 applicants are selected, the user activates "Törlés", ticks the acknowledgement and confirms
- **THEN** the 4 applicants are anonymized
- **AND** a confirmation message says 4 applicants were deleted, the list refreshes and the selection is cleared

#### Scenario: Cancelling

- **WHEN** the user activates "Mégse" in the confirmation dialog
- **THEN** no applicant is changed

### Requirement: Personal data is removed

Anonymizing an applicant SHALL set the first and last name to the fixed placeholders "Törölt" and "jelentkező". It SHALL clear the e-mail address, phone number, school name and all parent fields (first name, last name, mother's name, address, e-mail, phone), and set the newsletter subscription to off.

#### Scenario: Applicant after anonymization

- **WHEN** applicant "Nagy Luca" with e-mail, phone and parent details is anonymized
- **THEN** the stored record has name "Törölt jelentkező" and no e-mail, phone, school or parent data
- **AND** newsletter is off

### Requirement: Non-identifying history is kept

Anonymization SHALL keep the applicant's birth year and hometown, and keep all of their applications with program, status and dates. On each application it SHALL clear the free-text answers (food preference, where and from whom they heard about Skool, solved problem, past programming experience, other past participation, past Skool participation description, comment).

#### Scenario: Program headcount after deletion

- **GIVEN** a program has 20 applications, one of them from an applicant who is then anonymized
- **WHEN** the program's applications are counted by status
- **THEN** the count is still 20, with the same statuses

### Requirement: Change log is scrubbed

Anonymization SHALL remove the stored old and new values from every change-log entry about the applicant record and about that applicant's applications. It SHALL then add one change-log entry recording the anonymization, the admin who performed it, and the time, with no personal values.

#### Scenario: Earlier edit of the e-mail address

- **GIVEN** the change log holds an entry where the applicant's e-mail changed from one address to another
- **WHEN** the applicant is anonymized
- **THEN** that entry no longer contains either address
- **AND** a new entry records the anonymization and the admin who did it

### Requirement: Deletion is recorded and irreversible

An anonymized applicant SHALL be marked as deleted with the deletion time and the admin who deleted them. The system SHALL offer no way to restore the removed data. Deleting an already deleted applicant SHALL change nothing and SHALL NOT count as an error.

#### Scenario: Repeated deletion

- **WHEN** a deletion request includes an applicant who is already deleted
- **THEN** that applicant is left unchanged and the other applicants in the request are deleted

### Requirement: Deletion is atomic per request

All applicants in one deletion request SHALL be anonymized together: if anonymizing any of them fails, none of them SHALL be changed, and the user SHALL see an error message saying the deletion did not succeed and can be retried.

#### Scenario: Failure mid-way

- **WHEN** a database error occurs while anonymizing the third of five selected applicants
- **THEN** none of the five applicants is changed
- **AND** the user sees the retryable error message

### Requirement: Deletion endpoint is protected and validated

The deletion endpoint SHALL require a valid admin session and answer 401 without one. It SHALL accept between 1 and 100 applicant ids per request and answer 400 for an empty, oversized or malformed request. It SHALL answer 404 without changing anything when any id does not exist. Responses SHALL NOT include personal data or technical error details.

#### Scenario: Request without a session

- **WHEN** an unauthenticated client calls the deletion endpoint
- **THEN** it receives 401 and no data changes

#### Scenario: Unknown applicant id

- **WHEN** a request contains an id that matches no applicant
- **THEN** it receives 404 and no applicant in the request is changed

### Requirement: Deletions are logged without personal data

Each successful deletion request SHALL produce a structured log event with the acting user's id and the number of applicants deleted. It SHALL NOT contain names, e-mail addresses or other personal data.

#### Scenario: Bulk deletion logged

- **WHEN** an admin deletes 4 applicants
- **THEN** an info-level event with their user id and count 4 is logged, without names or e-mail addresses
