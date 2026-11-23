# dashboard Specification

## Purpose

Gives admins an overview at `/` of applications, oversubscription, satisfaction, capacity and demographics for a selected period and program, counting applications (including those of anonymized applicants).

## Requirements

### Requirement: Dashboard is admin-only

The dashboard SHALL be served at `/` inside the admin area. Unauthenticated visitors SHALL be redirected to `/login` with a `callbackUrl` back to `/`. The page SHALL be rendered on the server on every request and greet the admin by name with a greeting matching the Budapest time of day ("Jó reggelt" 4–10 h, "Szép napot" 10–18 h, "Jó estét" otherwise).

#### Scenario: Signed-out visit

- **WHEN** a visitor without a session opens `/`
- **THEN** they are redirected to `/login?callbackUrl=/`

#### Scenario: Evening greeting

- **WHEN** an admin named Anna opens the dashboard at 20:00 Budapest time
- **THEN** the header title reads "Jó estét, Anna!"

### Requirement: Period selection

The "Időszak" selector SHALL offer calendar years (Budapest time) from the current year, labelled "<év> (idei év)", back to the year of the earliest program start, always including the previous year. The selected year SHALL be compared with the year before it. A missing or unknown `period` query parameter SHALL fall back to the current year. Programs SHALL be assigned to a year by their start date; applications for the applications KPI by their received date.

#### Scenario: Unknown period

- **WHEN** an admin opens `/?period=1999` and no program started before 2025 in 2026
- **THEN** the dashboard shows "2026 (idei év)" compared with 2025

### Requirement: Program filter

The "Program" selector SHALL list "Összes program" and the programs starting in the selected period, newest first. Selecting a program SHALL restrict every metric to it. A `program` parameter that does not start in the selected period SHALL be ignored (all programs). The header description SHALL show the period label, the program name or "összes program", and the comparison year. With a program selected, its name in the header SHALL link to the program detail page (`/events/<id>`).

#### Scenario: Program outside the period

- **WHEN** an admin selects 2025 while the URL names a program that starts in 2026
- **THEN** the dashboard shows all programs of 2025

### Requirement: Applications KPI

The "Összes jelentkező" KPI SHALL count applications (not distinct people: one person applying to two programs counts twice) received in the period, with the percentage change against the comparison year. Without previous applications it SHALL show "nincs adat összevetéshez (<év>)".

#### Scenario: Growth

- **WHEN** 120 applications arrived in 2026 and 100 in 2025
- **THEN** the KPI shows 120 with a "+20%" badge and "vs. 2025 (100)"

### Requirement: Oversubscription KPI

The "Átlagos túljelentkezés" KPI SHALL be total applications divided by total capacity over the programs starting in the period that have a capacity, formatted like "2,4×", with the signed difference to the comparison year. Without such programs it SHALL show "—" and "nincs férőhellyel meghirdetett program az időszakban".

#### Scenario: No capacity

- **WHEN** no program starting in the period has a capacity
- **THEN** the KPI shows "—"

### Requirement: Satisfaction KPI

The "Átlagos elégedettség" KPI SHALL show the participant average overall score (1–5) of feedback on programs starting in the period, the signed difference to the comparison year, the number of responses and the mentor average. Without feedback it SHALL show "—" with "nincs visszajelzés az időszak programjaira", or "ehhez a programhoz még nincs visszajelzés" when a program is selected.

#### Scenario: No feedback for selected program

- **WHEN** a program without feedback is selected
- **THEN** the KPI shows "—" and "ehhez a programhoz még nincs visszajelzés"

### Requirement: Capacity chart

"Kapacitás vs. jelentkezők programonként" SHALL show, for each program starting in the period (newest first), its applications broken down by status against its capacity, or "nincs kapacitás". A "Jövőbeli" (default; not yet ended, including running), "Múltbeli" and "Mind" filter SHALL be offered, each with its own empty message.

#### Scenario: No past program

- **WHEN** the "Múltbeli" filter is chosen and no program of the period has ended
- **THEN** the chart shows "A kiválasztott időszakban nincs már lezajlott program."

### Requirement: Oversubscription trend

"Túljelentkezés alakulása" SHALL show, for the current and previous 5 months (Budapest time), applications divided by capacity of programs starting in that month; months without a program with capacity have no value. If no month has a value it SHALL show "Az elmúlt 6 hónapban nem indult férőhellyel meghirdetett program."

#### Scenario: Six months

- **WHEN** the dashboard is opened in November 2026
- **THEN** the trend shows the months "jún" to "nov"

### Requirement: Demographics

"Demográfia" SHALL show the age ("Életkor") or hometown ("Település") distribution of the applications to programs starting in the period. Without applications it SHALL show "A kiválasztott időszakban még nincs jelentkezés."

#### Scenario: Empty period

- **WHEN** no application belongs to a program of the period
- **THEN** the card shows "A kiválasztott időszakban még nincs jelentkezés."

### Requirement: Age buckets

Age SHALL be the program start year minus birth year, bucketed "10 alatt", "10–12", "13–15", "16–18", "19+". "10 alatt" and "Nincs adat" SHALL appear only when non-empty.

#### Scenario: Missing birth year

- **WHEN** an application's applicant has no birth year
- **THEN** it is counted under "Nincs adat"

### Requirement: Hometown grouping

Hometowns SHALL be grouped case- and whitespace-insensitively under their most frequent spelling; the top 8 SHALL be shown and the rest grouped under "Egyéb".

#### Scenario: Same town spelled differently

- **WHEN** applications list "Budapest", "budapest " and "Budapest"
- **THEN** one "Budapest" row with count 3 is shown

### Requirement: Satisfaction by program

"Elégedettség" SHALL list, per program starting in the period, participant and mentor average scores, ordered by participant average descending with unscored programs last, and the "Ajánlaná" share per role. Without feedback it SHALL show "A kiválasztott időszakban még nincs visszajelzés." or "Ehhez a programhoz még nincs visszajelzés.".

#### Scenario: Unscored program

- **WHEN** one program has participant feedback without scores
- **THEN** it is listed after the programs with an average

### Requirement: Anonymized applicants count in statistics

Every dashboard metric based on applications (applications KPI, oversubscription, capacity chart and status breakdown, trend, demographics) SHALL include applications of anonymized (GDPR-deleted) applicants. Their retained birth year and hometown SHALL count in demographics like any other application's. Applications of a merged duplicate SHALL count once, under the kept applicant.

#### Scenario: Anonymized applicant still counted

- **WHEN** an applicant with one application received in 2026 is GDPR-deleted
- **THEN** the 2026 "Összes jelentkező" KPI, the program's capacity bar and the oversubscription are unchanged

#### Scenario: Anonymized applicant in demographics

- **WHEN** an anonymized applicant's application belongs to a program of the period
- **THEN** it is counted in the age bucket and hometown row given by its retained birth year and hometown
