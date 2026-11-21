## ADDED Requirements

### Requirement: Participant count includes anonymized applicants

The report's participant count SHALL be the number of the event's applications with status "Részt vett" (ATTENDED), including applications of anonymized (GDPR-deleted) applicants. Only the count SHALL appear; no personal data of anonymized applicants is available or shown.

#### Scenario: Anonymized participant

- **WHEN** an event has 12 ATTENDED applications and one of those applicants is GDPR-deleted
- **THEN** the report still shows 12 participants
