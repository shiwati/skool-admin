## MODIFIED Requirements

### Requirement: Admin pages require a session

Every admin page, route handler and server action, except the login page, the auth endpoints and the health check, SHALL require a valid, unexpired session. Unauthenticated page requests SHALL be redirected to `/login` with the requested path and query as the return URL; API requests SHALL get `401`. Only same-origin return URLs SHALL be honoured; anything else SHALL fall back to `/`.

#### Scenario: Unauthenticated visit to an admin page

- **WHEN** an unauthenticated visitor opens `/`
- **THEN** they are redirected to `/login` with `/` as the return URL

#### Scenario: Query string is preserved

- **WHEN** an unauthenticated visitor opens `/applicants?q=kiss&page=2`
- **THEN** they are redirected to `/login` with `/applicants?q=kiss&page=2` as the return URL

#### Scenario: Return after sign-in

- **WHEN** a visitor was redirected from an admin path and then signs in successfully
- **THEN** they land on that original path

#### Scenario: Off-site return URL is ignored

- **WHEN** the return URL points to another origin
- **THEN** after sign-in the user lands on `/` instead

#### Scenario: Protocol-relative or backslash return URL is ignored

- **WHEN** the return URL is `//evil.example` or `/\evil.example`
- **THEN** after sign-in the user lands on `/` instead

#### Scenario: Same-origin absolute return URL is reduced to a path

- **WHEN** the return URL is an absolute URL on the app's own origin
- **THEN** only its path, query and fragment are used

#### Scenario: API request without session

- **WHEN** an unauthenticated client calls an admin API route
- **THEN** it receives `401` and is not redirected

#### Scenario: Health check remains public

- **WHEN** an unauthenticated client calls `GET /api/health`
- **THEN** it receives the readiness response without being redirected
