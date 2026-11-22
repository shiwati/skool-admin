# applicant-duplicates Specification

## Purpose

Lets admins find applicants that are probably the same person (same name and e-mail), review them pair by pair, and either merge them into one applicant or record that they are different people.

## Requirements

### Requirement: Possible duplicates are detected by name and e-mail

Every applicant SHALL carry a duplicate key built from the normalized last name, first name and e-mail. An applicant SHALL be flagged as a possible duplicate while at least one other non-deleted applicant has the same key. Anonymized applicants SHALL have no key and SHALL never be flagged.

#### Scenario: Second applicant with the same name and e-mail

- **GIVEN** an applicant "Kiss Anna" with "anna@example.com"
- **WHEN** another applicant "Kiss Anna" with "Anna@Example.com " is created
- **THEN** both applicants are flagged as possible duplicates

#### Scenario: Anonymized applicant

- **WHEN** a flagged applicant is anonymized
- **THEN** it loses its key and flag, and the other applicant stays flagged only if a third applicant still shares the key

### Requirement: Duplicate banner on the applicants page

The applicants page SHALL show a warning banner "<n> lehetséges duplikált jelentkezés" with the hint "Azonos névvel és e-mail címmel több jelentkező is van. Ellenőrizd őket, mielőtt visszaigazolást küldesz." and an "Ellenőrzés" button that opens the review dialog. `<n>` is the number of undecided pairs. The banner SHALL be hidden when there is no undecided pair.

#### Scenario: Undecided pairs exist

- **GIVEN** two undecided duplicate pairs
- **WHEN** the admin opens `/applicants`
- **THEN** the banner shows "2 lehetséges duplikált jelentkezés" with an enabled "Ellenőrzés" button

#### Scenario: Nothing to review

- **WHEN** every flagged pair has been merged or dismissed
- **THEN** no duplicate banner is shown

### Requirement: Undecided duplicate pairs

The undecided pairs SHALL be every pair of non-deleted applicants within a group sharing a key, minus the pairs dismissed as "not a duplicate". Pairs SHALL be ordered deterministically: groups by their oldest member, pairs within a group by creation time. `GET /api/applicants/duplicates?skip=<n>` SHALL return `{ total, index, pair }` for the `n`-th pair, wrapping around at the end, and `pair: null` when there is none.

#### Scenario: Group of three

- **GIVEN** three applicants with the same key and no dismissals
- **WHEN** the pairs are listed
- **THEN** there are three pairs

#### Scenario: Skipping past the end

- **GIVEN** two undecided pairs
- **WHEN** the dialog requests `skip=2`
- **THEN** the first pair is returned with `index: 0`

### Requirement: Review dialog compares a pair

The review dialog SHALL show one pair at a time: both applicants' fields side by side and their applications (program, received date, status). It SHALL offer "Duplikáció – összevonás" (choose which applicant is kept), "Nem duplikáció – mindkét jelentkező megmarad" and "Kihagyás most", which moves to the next pair without a decision. After a merge or dismissal the banner count and the list SHALL refresh.

#### Scenario: Skip

- **WHEN** the admin clicks "Kihagyás most"
- **THEN** the next undecided pair is shown and nothing is saved

### Requirement: Merge choice explains that applications are combined

While "Duplikáció – összevonás" is selected, the review dialog SHALL show a note "Mi történik összevonáskor?" stating that only the personal data comes from the kept applicant, and that every application of both applicants is kept unchanged and moves to the kept one. Below the comparison it SHALL show "Összevonás után:" with every application of both applicants as "program (státusz)", newest first.

#### Scenario: Merge explains that applications are combined

- **GIVEN** applicant A applied to "Python alapok – ősz" (Elfogadva) and B to "Robotika tábor" (Részt vett)
- **WHEN** the admin selects "Duplikáció – összevonás"
- **THEN** the note "Mi történik összevonáskor?" reads "Csak a jelentkező személyes adatai közül marad meg a kiválasztott adatlapé (név, elérhetőségek, iskola, szülői adatok). A két jelentkező minden jelentkezése – program, státusz, beküldés ideje és az űrlap válaszai – változatlanul megmarad, és a megmaradó adatlaphoz kerül. Semmi sem cserélődik le."
- **AND** "Összevonás után: Python alapok – ősz (Elfogadva), Robotika tábor (Részt vett)" is shown

#### Scenario: No merge note when kept apart

- **WHEN** the admin selects "Nem duplikáció – mindkét jelentkező megmarad"
- **THEN** neither the note nor the "Összevonás után" line is shown

### Requirement: Merging duplicates into one applicant

`POST /api/applicants/merge` with `{ primaryId, mergeIds }` (1–50 unique ids, `primaryId` not among them) SHALL move every application of the merged applicants, unchanged, to the kept applicant and then permanently delete the merged applicants, so they count as one applicant everywhere. The kept applicant's personal data SHALL be kept as is.

#### Scenario: Merge a pair

- **GIVEN** applicants A (1 application) and B (2 applications) with the same key
- **WHEN** the admin merges B into A
- **THEN** A has 3 applications, B no longer exists, and the response contains A with its applications

#### Scenario: Merged applicant is not re-imported

- **GIVEN** B's application was imported from an event's sheet and B was merged into A
- **WHEN** the event's sheet is synced again
- **THEN** the row is reported as already imported and no new applicant is created

### Requirement: Merge only accepts duplicates

Merge SHALL accept only applicants that exist, are not deleted, and all share the same non-null duplicate key. It SHALL respond `404` when any applicant is missing or deleted, `409` when the keys differ, `400` on an invalid body and `401` without an admin session, and change nothing in those cases.

#### Scenario: Different people

- **WHEN** the admin calls merge with two applicants whose keys differ
- **THEN** the response is `409` and no application moves

#### Scenario: Anonymized applicant

- **WHEN** merge is called with an anonymized applicant's id
- **THEN** the response is `404`

### Requirement: Merge keeps the history on the kept applicant

Merge SHALL record one `merged_from` History row per merged applicant on the kept applicant, and SHALL move the merged applicants' own History rows to the kept applicant, so no History row refers to a deleted applicant. Afterwards the duplicate flags of the affected key SHALL be recomputed.

#### Scenario: History after merge

- **GIVEN** B had an edited e-mail address recorded in its History
- **WHEN** B is merged into A
- **THEN** A's change history shows the e-mail edit and an "Összevonva (duplikáció)" entry, and no History row has B's id as its record

#### Scenario: Last pair of a group merged

- **WHEN** the only two applicants with a key are merged
- **THEN** the kept applicant is no longer flagged

### Requirement: Dismissing a pair as not a duplicate

`POST /api/applicants/duplicates/dismiss` with two applicant ids SHALL store the decision for that pair only, record a `duplicate_dismissed` History row, and leave both applicants and their flags unchanged. It SHALL respond `404` for a missing or deleted applicant and `409` when the two do not share a key. A later applicant with the same key SHALL form new pairs that need a decision.

#### Scenario: Dismiss then a third applicant arrives

- **GIVEN** the pair A–B was dismissed
- **WHEN** applicant C with the same key is imported
- **THEN** the pairs A–C and B–C are undecided and A–B is not shown again

### Requirement: Duplicate actions are admin-only and log no personal data

Every duplicate endpoint SHALL reject a request without an admin session with `401`. Logs SHALL contain only the event name, the acting user's id and counts or ids, never names or e-mail addresses.

#### Scenario: Signed-out request

- **WHEN** `GET /api/applicants/duplicates` is called without a session
- **THEN** the response is `401`
