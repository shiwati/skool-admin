# Spec Delta

## MODIFIED Requirements

### Requirement: Status labels

Application statuses SHALL be shown as coloured badges with Hungarian labels: applied as "Új jelentkező", accepted as "Elfogadva", waitlisted as "Várólista", attended as "Részt vett", rejected as "Elutasítva", cancelled as "Lemondta".

#### Scenario: Waitlisted application

- **WHEN** an applicant's newest application is waitlisted
- **THEN** the status cell shows the badge "Várólista"

#### Scenario: Cancelled application

- **WHEN** an applicant's newest application is cancelled
- **THEN** the status cell shows the badge "Lemondta"
