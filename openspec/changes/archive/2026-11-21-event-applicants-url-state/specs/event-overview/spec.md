# Spec Delta

## ADDED Requirements

### Requirement: Jelentkezők tab view lives in the URL

The Jelentkezők tab SHALL reflect its status filter, sort, order, page and page size in the page URL (`status`, `sort` = `name`|`age`|`status`|`receivedAt`, `order`, `page`, `pageSize`), leaving default values out. Opening that URL SHALL restore the same view. Invalid values SHALL fall back to the default. Changing the status filter, sort or page size SHALL return to page 1.

#### Scenario: Sharing a filtered view

- **WHEN** an admin opens `/events/<id>/applicants?status=WAITLISTED&page=2`
- **THEN** the tab shows page 2 of the program's waitlisted applications, with the "Várólista" chip selected

#### Scenario: Default view has a clean URL

- **WHEN** an admin selects the "Mind" chip and returns to the default sort on page 1
- **THEN** the URL is `/events/<id>/applicants` without a query

#### Scenario: Invalid parameter

- **WHEN** an admin opens `/events/<id>/applicants?status=FOO&sort=bar&page=0`
- **THEN** the default view is shown: all statuses, oldest application first, page 1

#### Scenario: Filter change returns to page 1

- **GIVEN** the tab shows page 3
- **WHEN** the admin selects the "Elfogadva" chip
- **THEN** the URL contains `status=ACCEPTED` and no `page`, and page 1 is shown

### Requirement: Jelentkezők tab sorts by age

Sorting the Jelentkezők tab by "Kor" SHALL order by age: ascending SHALL put the youngest applicants first. Applicants without a birth year SHALL come last in both directions.

#### Scenario: Youngest first

- **GIVEN** applicants born in 2008 and 2011
- **WHEN** the admin sorts by "Kor" ascending
- **THEN** the applicant born in 2011 is listed first and the sort line reads "Rendezés: kor, növekvő"

### Requirement: Status links in the status breakdown

In the overview's status breakdown, each status with at least one application SHALL link to the Jelentkezők tab filtered to that status. A status with no applications SHALL NOT be a link.

#### Scenario: Opening the waitlist

- **GIVEN** a program with 4 waitlisted applications
- **WHEN** the admin activates "Várólista" in the status breakdown
- **THEN** `/events/<id>/applicants?status=WAITLISTED` opens with the "Várólista" chip selected

#### Scenario: Empty status

- **WHEN** a program has no rejected applications
- **THEN** "Elutasítva" in the status breakdown is plain text, not a link
