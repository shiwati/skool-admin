# Spec Delta

## MODIFIED Requirements

### Requirement: Applications by status

The overview SHALL show how many applications the program has in each status (Új jelentkező, Elfogadva, Várólista, Részt vett, Elutasítva, Lemondta) as a stacked bar with a legend, and link to the applicants list filtered to the program. When there are no applications it SHALL show an empty state instead of the bar.

#### Scenario: No applications yet

- **WHEN** a program has no applications
- **THEN** the empty state is shown and the bar is not

#### Scenario: Cancelled application in the breakdown

- **WHEN** a program has 2 cancelled applications
- **THEN** the breakdown shows "Lemondta: 2" and counts them in the program's applications total

## ADDED Requirements

### Requirement: Cancelled status

"Lemondta" SHALL be selectable as the status of an application wherever the other statuses are: the status cell, the bulk status bar and the Jelentkezők tab filter chips. A cancelled application SHALL count as an application but not as accepted.

#### Scenario: Cancelling one applicant

- **WHEN** the admin opens "Kiss Anna státusza: Elfogadva. Módosítás" and chooses "Lemondta"
- **THEN** only Kiss Anna's application is sent with the status "Lemondta"

#### Scenario: Filtering cancelled

- **WHEN** an admin opens `/events/<id>/applicants?status=CANCELLED`
- **THEN** the tab lists the program's cancelled applications with the "Lemondta" chip selected

### Requirement: Food needs card

The overview SHALL show an "Étkezési igény" card with a table of the columns "Név" and "Étkezési igény", listing the applicants with a food need, grouped by status in the order Részt vett, Elfogadva, Új jelentkező. Each group SHALL start with a status name row, flush left and without a bar; its applicant rows SHALL have a status-coloured vertical bar on the left. Várólista, Elutasítva, Lemondta and anonymized applicants SHALL NOT be covered.

#### Scenario: Groups

- **GIVEN** a program with applicants with a food need who are Részt vett, Elfogadva and Várólista
- **WHEN** an admin opens the program overview
- **THEN** the table has the groups "Részt vett" and "Elfogadva" and no Várólista group, each with a status-coloured bar along its applicant rows but not its name row, and no other group

#### Scenario: Anonymized applicant

- **GIVEN** an accepted application of an anonymized applicant
- **WHEN** an admin opens the program overview
- **THEN** the applicant is not listed or counted in the card

### Requirement: Food need rows and total

Within a group the rows SHALL be sorted by the answer (ignoring case and accents), then by name, so equal needs are next to each other. An applicant with several applications SHALL appear once, in the first group. Applicants whose answer is empty or means "no restriction" ("nem", "nincs", "-", and similar short answers) SHALL NOT be listed; they SHALL be counted in one total at the end of the card across the three statuses: "Összesen N főnek nincs étkezési igénye."

#### Scenario: Sorted by need

- **GIVEN** accepted applicants "Kiss Anna" (vegetáriánus), "Nagy Béla" (gluténmentes) and "Tóth Cili" (vegetáriánus)
- **WHEN** an admin opens the program overview
- **THEN** the Elfogadva group lists Nagy Béla, then Kiss Anna, then Tóth Cili

#### Scenario: Total without a need

- **GIVEN** applicants answering "nincs", "-" and nothing, in different statuses, and one answering "laktózmentes"
- **WHEN** an admin opens the program overview
- **THEN** only the "laktózmentes" applicant is listed and the card ends with "Összesen 3 főnek nincs étkezési igénye."

#### Scenario: Answer that starts like a no

- **GIVEN** an accepted applicant answering "nem eszik húst"
- **WHEN** an admin opens the program overview
- **THEN** the applicant is listed with that answer and not counted as without a need
