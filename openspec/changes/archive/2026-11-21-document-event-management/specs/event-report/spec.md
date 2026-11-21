## ADDED Requirements

### Requirement: Saved report draft

`PUT /api/events/<id>/report` SHALL save the edited report content (`{ content }`) as the single `EventReport` of the event, creating it on the first save and replacing its content afterwards, and record the admin as last editor. It SHALL check the admin session itself (`401` without one), respond `400` when the body is not JSON or the content is invalid, `404` when the event does not exist, and `{ ok: true }` on success. Saving SHALL NOT create a Google Doc.

#### Scenario: Saving twice

- **WHEN** an admin saves the report of an event twice with different quotes
- **THEN** the event still has one `EventReport`, holding the second content

#### Scenario: Unknown event

- **WHEN** `PUT /api/events/does-not-exist/report` is sent with valid content
- **THEN** the response is `404` and nothing is saved

### Requirement: Report generation endpoint

`POST /api/events/<id>/report/documents` SHALL check the admin session itself (`401` without one), respond `400` for invalid content, `404` for an unknown event, and `201` with the new document's id, title, link and creation time.

#### Scenario: Unknown event

- **WHEN** a doc is requested for an event that does not exist
- **THEN** the response is `404` and no doc is created

### Requirement: Report generation errors

When generation fails it SHALL create no `EventReportDocument` and respond:

- `422` with code `TEMPLATE_NOT_ACCESSIBLE` when the admin cannot read the template;
- `503` with code `DRIVE_API_DISABLED` or `DOCS_API_DISABLED` when that Google API is not enabled in the app's Cloud project;
- `403` with code `REAUTH_REQUIRED` when the admin has to sign in again;
- `502` for any other Google failure.

#### Scenario: Template not shared

- **WHEN** the template is not shared with the admin's domain
- **THEN** the response is `422` with code `TEMPLATE_NOT_ACCESSIBLE`, the message "A riport-sablon nem érhető el. Ellenőrizd, hogy meg van-e osztva a domainnel." and no doc is listed

#### Scenario: Docs API disabled

- **WHEN** the Google Docs API is disabled in the Cloud project
- **THEN** the response is `503` with code `DOCS_API_DISABLED`

### Requirement: Generated document record

Each generated doc SHALL be stored as an `EventReportDocument` (event, Google doc id, link, title, author, creation time), and a `History` row SHALL be written on the event with the doc title as new value.

#### Scenario: Doc recorded

- **WHEN** a doc is generated successfully
- **THEN** one `EventReportDocument` and one `History` row are written for the event

## MODIFIED Requirements

### Requirement: Google Doc generation

"Google Doc generálása" SHALL first save the report content, then on every run copy the `REPORT_TEMPLATE_DOC_ID` template into the admin's own Drive and fill it through the Docs API, without any HTML-based fallback. It SHALL use the admin's Google token with the `drive.file` and `drive.readonly` scopes. The page SHALL show the new link with a notice that the file was saved to the user's own Drive. Earlier documents SHALL stay listed.

#### Scenario: Template is required

- **WHEN** the app starts without `REPORT_TEMPLATE_DOC_ID`
- **THEN** environment validation fails and no HTML-based document is ever generated

#### Scenario: Second generation

- **WHEN** an admin generates the report for an event that already has a doc
- **THEN** a new doc is created, the earlier one is untouched, and both are listed

#### Scenario: Missing Drive permission

- **WHEN** the admin's Google token lacks the `drive.file` or the `drive.readonly` scope
- **THEN** no doc is created and the page asks the admin to sign in again
