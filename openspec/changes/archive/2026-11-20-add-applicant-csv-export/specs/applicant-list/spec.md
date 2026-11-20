# Spec Delta

## ADDED Requirements

### Requirement: CSV export of the filtered applicants

The Jelentkezők page SHALL offer an "Exportálás CSV-be" action. It SHALL download every applicant that matches the current search and filters, across all pages, not only the rows on screen. While the export runs, the action SHALL be disabled and read "Exportálás…".

#### Scenario: Exporting more than one page

- **WHEN** 45 applicants match the filters, 20 are shown per page, and the admin chooses "Exportálás CSV-be"
- **THEN** the downloaded file has a header row and 45 applicant rows

### Requirement: CSV columns follow the column settings

The CSV SHALL contain only the columns visible in the user's column settings, in the configured order. A table cell that shows two values SHALL become separate CSV columns: "Település" and "Iskola"; "Szülő neve" and "Szülő e-mail". Values SHALL match what the table shows; missing values SHALL be empty.

#### Scenario: Hidden column

- **WHEN** "Életkor" is hidden in the column settings and the admin exports
- **THEN** the CSV has no "Életkor" column

### Requirement: Applicant name in separate columns

The applicant's name SHALL be exported in two columns, "Vezetéknév" (last name) and "Keresztnév" (first name), followed by "E-mail", in the position of the "Név / e-mail" column. The CSV SHALL NOT contain a combined "Név" column. "Szülő neve" SHALL stay a single column.

#### Scenario: Split name

- **WHEN** the admin exports an applicant named "Kiss Béla" with e-mail `bela@example.com`
- **THEN** the row has "Kiss" under "Vezetéknév", "Béla" under "Keresztnév" and `bela@example.com` under "E-mail"

### Requirement: CSV file format

The file SHALL be named `jelentkezok-ÉÉÉÉ-HH-NN.csv` with the export date. It SHALL be UTF-8 with a byte order mark, use semicolons between cells and CRLF line breaks, so Hungarian Excel opens it with correct accents. A cell starting with `=`, `@`, a tab, a carriage return, or a non-numeric `+` or `-` SHALL be prefixed with an apostrophe so it is not run as a formula.

#### Scenario: Formula in a name

- **WHEN** an applicant's last name is `=HYPERLINK(1)`
- **THEN** the "Vezetéknév" cell is `'=HYPERLINK(1)`

#### Scenario: Phone number stays as is

- **WHEN** an applicant's phone number is `+36 30 123 4567`
- **THEN** the "Telefonszám" cell is `+36 30 123 4567`

### Requirement: Export feedback

After a successful export the admin SHALL see a notice with the number of exported rows ("N sor exportálva"). When no applicant matches, no file SHALL be downloaded and the notice SHALL read "Nincs exportálható sor a szűrésnek megfelelően.". On failure the notice SHALL read "Az exportálás nem sikerült. Próbáld újra.".

#### Scenario: Nothing to export

- **WHEN** the filters match no applicant and the admin exports
- **THEN** no file is downloaded and the "Nincs exportálható sor" notice appears
