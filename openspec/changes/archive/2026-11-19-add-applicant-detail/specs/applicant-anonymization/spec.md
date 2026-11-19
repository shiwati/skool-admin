## MODIFIED Requirements

### Requirement: Deletion entry points

Admins SHALL be able to delete applicants in three ways:

- the "Törlés" bulk action for the selected rows of the applicants list
- a "Törlés" item in a list row's "Műveletek" menu, for that applicant
- a "Törlés" item in the "További műveletek" menu of the applicant's detail page, for that applicant

All entry points SHALL use the same confirmation and the same deletion.

#### Scenario: Deleting one applicant from the row menu

- **WHEN** the user opens a row's "Műveletek" menu and chooses "Törlés"
- **THEN** the deletion confirmation opens for that single applicant

#### Scenario: Deleting from the detail page

- **WHEN** the user opens "További műveletek" on an applicant's detail page and chooses "Törlés"
- **THEN** the deletion confirmation opens for that applicant
