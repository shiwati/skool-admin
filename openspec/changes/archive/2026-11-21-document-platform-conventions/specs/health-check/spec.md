## Purpose

Lets the hosting platform and monitoring probe whether the app can serve requests, by checking database connectivity, without authentication and without exposing internals.

## ADDED Requirements

### Requirement: Public database readiness check

`GET /api/health` SHALL be reachable without a session. It SHALL run a trivial database query (`SELECT 1`) on every request and respond `200 {"status":"ok","checks":{"database":"up"}}` on success, or `503 {"status":"error","checks":{"database":"down"}}` on failure. Responses SHALL carry `Cache-Control: no-store`.

#### Scenario: Database reachable

- **WHEN** an unauthenticated client calls `GET /api/health` and the database answers
- **THEN** the response is `200` with `{"status":"ok","checks":{"database":"up"}}` and `Cache-Control: no-store`

#### Scenario: Database unreachable

- **WHEN** the database query fails
- **THEN** the response is `503` with `{"status":"error","checks":{"database":"down"}}` and `Cache-Control: no-store`

### Requirement: Health failures reveal no details

A failed health check SHALL NOT include the error message, connection string, host or stack in the response. The error SHALL be logged on the server only.

#### Scenario: Connection error message is hidden

- **WHEN** the database fails with an error message containing connection details
- **THEN** the response body contains none of that message
- **AND** the error is logged at error level
