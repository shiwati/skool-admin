# Spec Delta

## MODIFIED Requirements

### Requirement: Program header and tabs

The page SHALL show a breadcrumb "Programok › name", the program name, its tags, the program status (same rules as the program list), the date range with duration, the place, and the instructor and mentors. A "Szerkesztés" button SHALL open `/events/<id>/edit`. A tab bar SHALL show "Áttekintés" as current, "Jelentkezők" with the number of applications linking to the applicants list filtered to the program, and "Visszajelzések" and "Záró riport" as disabled. There SHALL be no "Változástörténet" tab: the program's change log opens from the "Teljes napló" link of the latest changes card, as on the applicant detail page.

#### Scenario: Header of an open program

- **WHEN** the admin opens a program that has a sheet, is in the future and is not full
- **THEN** the header shows the status "Jelentkezés nyitva" and the "Jelentkezők" tab shows the application count

#### Scenario: No change history tab

- **WHEN** the program page is rendered
- **THEN** the tab bar shows no "Változástörténet" tab

### Requirement: Latest changes

The overview SHALL show the latest changes of the program from `History` (table `event`), newest first, each with who changed it, the field label, the old and new value, and the time. When there are none it SHALL show "Még nincs rögzített változás". The card header SHALL show a "Teljes napló" link to the program's change history at `/history/<id>`, also when there are no changes.

#### Scenario: A field was edited

- **WHEN** the capacity of a program was changed from 18 to 20
- **THEN** the card shows "<name> módosította: Max. tanulói létszám", "18 → 20" and the time

#### Scenario: Opening the full history

- **WHEN** the admin activates "Teljes napló" on the latest changes card
- **THEN** `/history/<id>` opens for this program
