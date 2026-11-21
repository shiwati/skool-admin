## ADDED Requirements

### Requirement: CSV export of the filtered programs

The Programok page SHALL offer an "Exportálás CSV-be" action that downloads every program matching the current tab, search and filters, across all pages. While the export runs, the action SHALL be disabled and read "Exportálás…". The CSV SHALL have the columns "Program", "Címkék", "Kezdés", "Befejezés", "Helyszín", "Partnercég", "Kapacitás", "Jelentkezők", "Oktatók" and "Státusz", with the same status rules as the table; missing values SHALL be empty.

#### Scenario: Exporting across pages

- **WHEN** 45 programs match the filters, 20 are shown per page, and the admin chooses "Exportálás CSV-be"
- **THEN** the downloaded CSV has 45 data rows
