# Spec Delta

## MODIFIED Requirements

### Requirement: Program header and tabs

The page SHALL show a breadcrumb "Programok › name", the program name, its tags, the program status (same rules as the program list), the date range with duration, the place, and the instructor and mentors. A "Szerkesztés" button SHALL open `/events/<id>/edit`. A tab bar SHALL show these tabs as links: "Áttekintés" (`/events/<id>`), "Jelentkezők" with the number of applications (`/events/<id>/applicants`), "Visszajelzések" (`/events/<id>/feedback`) and "Záró riport" (`/events/<id>/report`). The tab of the open page SHALL be marked as current. There SHALL be no "Változástörténet" tab: the program's change log opens from the "Teljes napló" link of the latest changes card, as on the applicant detail page.

#### Scenario: Header of an open program

- **WHEN** the admin opens a program that has a sheet, is in the future and is not full
- **THEN** the header shows the status "Jelentkezés nyitva" and the "Jelentkezők" tab shows the application count

#### Scenario: Opening the report tab

- **WHEN** the admin clicks "Záró riport" on a program page
- **THEN** `/events/<id>/report` opens with the "Záró riport" tab marked as current

#### Scenario: No change history tab

- **WHEN** the program page is rendered
- **THEN** the tab bar shows no "Változástörténet" tab
