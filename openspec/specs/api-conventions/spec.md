# api-conventions Specification

## Purpose

Defines the conventions every admin API route handler follows (protection, caching, validation, error shapes and logging) so clients can rely on consistent behaviour and no endpoint leaks data.

## Requirements

### Requirement: API routes require an admin session

Every `/api/*` route handler except `GET /api/health` and the authentication endpoints under `/api/auth/*` SHALL check the admin session itself and answer a request without a valid session with `401` and the JSON body `{"error":"Unauthorized"}`. It SHALL NOT redirect, and SHALL NOT read the request body or touch data before the check.

#### Scenario: Unauthenticated list request

- **WHEN** a client without a session calls `GET /api/applicants`
- **THEN** the response is `401` with `{"error":"Unauthorized"}`
- **AND** no database query is made

#### Scenario: Unauthenticated write request

- **WHEN** a client without a session calls `POST /api/applicants/delete` with a valid body
- **THEN** the response is `401` and no applicant is changed

### Requirement: API responses are not cached

Every admin API response, success or error, SHALL carry `Cache-Control: no-store` and SHALL be rendered dynamically per request.

#### Scenario: Error response is not cacheable

- **WHEN** an admin API route answers with any status code
- **THEN** the response has the header `Cache-Control: no-store`

### Requirement: Inputs are validated on the server

Query parameters and JSON request bodies SHALL be validated on the server against a schema before any data is read or written. Invalid query parameters SHALL yield `400 {"error":"Invalid query parameters","details":…}`; an invalid or unparsable body SHALL yield `400 {"error":"Invalid request body"}`, with `details` (form errors and per-field errors) when the body was valid JSON.

#### Scenario: Invalid query parameter

- **WHEN** an admin calls `GET /api/applicants?pageSize=1000`
- **THEN** the response is `400` with error "Invalid query parameters" and `details` naming the `pageSize` field

#### Scenario: Malformed JSON body

- **WHEN** an admin posts a body that is not valid JSON to a write endpoint
- **THEN** the response is `400` with error "Invalid request body" and nothing is changed

### Requirement: Uniform JSON error responses

Errors SHALL be JSON objects with an `error` string. A missing resource SHALL yield `404`; a write that conflicts with the current state (for example a stale edit or mismatched duplicate pair) SHALL yield `409 {"error":"Conflict"}` or a `409` with an explanatory `error`, and SHALL change nothing.

#### Scenario: Unknown resource

- **WHEN** an admin requests `GET /api/events/{id}` for an id that does not exist
- **THEN** the response is `404` with an `error` field

#### Scenario: Stale edit

- **WHEN** an admin saves an applicant edit whose `expectedUpdatedAt` no longer matches the stored record
- **THEN** the response is `409` and no field is changed

### Requirement: Unexpected failures do not leak details

When an unexpected error occurs, the route SHALL respond `500 {"error":"Internal Server Error"}` with no message, stack trace, SQL or other internal detail. The error itself SHALL be written only to the server log.

#### Scenario: Database failure during a list request

- **WHEN** the database throws while serving `GET /api/events`
- **THEN** the response is `500` with exactly `{"error":"Internal Server Error"}`
- **AND** the error is logged at error level

### Requirement: API logs carry no personal data

Log events written by API routes for successful operations SHALL contain only an event name, the acting user's id, record ids and counts or changed field names. They SHALL NOT contain names, e-mail addresses, OAuth or session tokens, or request bodies. Known secret fields (passwords, secrets, tokens, authorization and cookie headers) SHALL be redacted by the logger.

#### Scenario: Applicants anonymized

- **WHEN** an admin deletes two applicants
- **THEN** one info event `{ event: "applicants.anonymized", userId, count: 2 }` is logged
- **AND** it contains no applicant name or e-mail

#### Scenario: Token field is redacted

- **WHEN** a log entry includes a top-level `token` or `access_token` field
- **THEN** its value is written as `[REDACTED]`
