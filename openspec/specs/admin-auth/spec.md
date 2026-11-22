# admin-auth Specification

## Purpose

Controls who can use the Skool admin app. Staff sign in with their Skool Google Workspace account, and only accounts on the Skool Workspace domain may reach admin pages.

## Requirements

### Requirement: Google is the only sign-in method

The system SHALL authenticate admins exclusively through Google OAuth. It SHALL NOT offer password, email-link or self-registration sign-in.

#### Scenario: Login page offers only Google

- **WHEN** a visitor opens `/login`
- **THEN** the only sign-in action shown is "Bejelentkezés Google-fiókkal"
- **AND** no password or email input field is present

#### Scenario: Google account chooser is always shown

- **WHEN** a visitor starts Google sign-in
- **THEN** Google is asked to show its account chooser, even if the browser is signed in to a single Google account

### Requirement: Access requires a Skool Workspace account

Any member of the Skool Google Workspace organisation SHALL be granted access; there SHALL be no per-user allowlist. The system SHALL verify server-side that Google reports a verified email and that the Workspace hosted-domain claim and the email domain both equal the configured domain (case-insensitive). Otherwise access SHALL be denied, even if Google's own organisation restriction is misconfigured.

#### Scenario: Workspace account signs in

- **WHEN** a user completes Google sign-in with a verified `@skool.org.hu` Workspace account
- **THEN** a session is created and the user is redirected to their return URL, or `/` if there is none

#### Scenario: Account outside the organisation

- **GIVEN** the Google OAuth client is misconfigured to accept accounts outside the organisation
- **WHEN** a user completes Google sign-in with `luca.nagy@gmail.com`
- **THEN** no session is created
- **AND** the user is returned to `/login` in the access-denied state

#### Scenario: Personal Google account using a Skool address

- **WHEN** a user signs in with a consumer Google account registered to a `@skool.org.hu` address, which has no Workspace hosted-domain claim
- **THEN** access is denied

#### Scenario: Unverified email

- **WHEN** Google reports the account email as not verified
- **THEN** access is denied

#### Scenario: Domain case differs

- **WHEN** Google reports the hosted domain or email domain in different letter case than configured
- **THEN** access is granted

### Requirement: Denied sign-ins create no records

The system SHALL NOT create or update user, account or session records for a denied sign-in attempt.

#### Scenario: Denied attempt leaves the database unchanged

- **WHEN** an account outside the Skool Workspace completes Google sign-in
- **THEN** no user, account or session record is created for that account

### Requirement: Login page default state

The login page SHALL show the Skool admin brand panel and a sign-in card. The card contains the overline "Bejelentkezés", the heading "Üdv újra!", the explanation "Lépj be a Skool Google-fiókoddal. Külön jelszóra nincs szükség.", the Google button, and the notice that only `@skool.org.hu` accounts can sign in and that changes are logged by user name.

#### Scenario: First visit

- **WHEN** an unauthenticated visitor opens `/login` without an error indicator
- **THEN** the heading "Üdv újra!" and the button "Bejelentkezés Google-fiókkal" are shown
- **AND** no error banner is shown

### Requirement: Login page redirecting state

After the user activates the Google button, the page SHALL show that a redirect is in progress until the browser leaves the page, and SHALL prevent repeated activation.

#### Scenario: Button clicked

- **WHEN** the user activates "Bejelentkezés Google-fiókkal"
- **THEN** the button becomes disabled, is marked busy for assistive technology, shows a spinner, and reads "Átirányítás a Google-höz…"
- **AND** further clicks do not start another sign-in

### Requirement: Login page access-denied state

When the user returns from a denied sign-in, the login page SHALL show the heading "Nincs hozzáférésed" and an alert banner titled "Ez a fiók nem jogosult". It SHALL also offer a button labelled "Másik Google-fiók választása" that restarts Google sign-in with the account chooser.

#### Scenario: Denied with known account

- **WHEN** the user is returned after `luca.nagy@gmail.com` was denied
- **THEN** the alert banner says that the luca.nagy@gmail.com account does not belong to the Skool organisation, and asks them to sign in with an @skool.org.hu account or request access from the administrator

#### Scenario: Denied account email unavailable or malformed

- **WHEN** the denied state is shown without a valid email address to name
- **THEN** the banner shows the same message without naming an account

#### Scenario: Banner is announced

- **WHEN** the access-denied banner is rendered
- **THEN** it is exposed to assistive technology as an alert

### Requirement: Login page generic error state

When sign-in fails for a reason other than access denial (for example a cancelled consent or an OAuth error), the login page SHALL show the default heading, an error banner saying sign-in did not succeed and can be retried, and the default Google button. It SHALL NOT reveal technical error details.

#### Scenario: OAuth callback error

- **WHEN** the user returns to `/login` after a failed OAuth callback
- **THEN** a retryable error banner is shown with no error codes or stack details

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

### Requirement: Signed-in users skip the login page

An already signed-in user who opens `/login` SHALL be redirected to their return URL, or to `/` if there is none.

#### Scenario: Signed-in user opens login

- **WHEN** a signed-in user opens `/login`
- **THEN** they are redirected to `/`

### Requirement: Sign-out

Signed-in admins SHALL be able to sign out from admin pages. Signing out SHALL end the server-side session and return the user to `/login`.

#### Scenario: Sign out

- **WHEN** a signed-in admin activates sign-out
- **THEN** their session is invalidated server-side
- **AND** they are shown `/login` in the default state

### Requirement: Authentication events are logged

The system SHALL record a structured log event for each successful sign-in, denied sign-in and sign-out. Events SHALL include the event type, the time and the reason for a denial. Successful sign-ins and sign-outs SHALL include the internal user id. Events SHALL NOT include email addresses, names, OAuth tokens or session tokens.

#### Scenario: Denied sign-in is logged

- **WHEN** a sign-in is denied because the hosted-domain claim does not match
- **THEN** a warning-level event with reason "wrong_hosted_domain" is logged without the email address

#### Scenario: Successful sign-in is logged

- **WHEN** an admin signs in
- **THEN** an info-level event containing their user id and no tokens is logged

### Requirement: Auth configuration is validated at startup

The server SHALL refuse to start when the Google client credentials or the allowed Workspace domain are missing or malformed. It SHALL report which settings are invalid without printing their values.

#### Scenario: Missing Google client secret

- **WHEN** the server starts without a Google client secret configured
- **THEN** startup fails with an error naming the missing setting and not printing any secret values

### Requirement: Responses carry security headers

Every response SHALL carry HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a `Referrer-Policy` and a `Permissions-Policy`. Every page response SHALL carry a Content-Security-Policy with a fresh per-request nonce that allows scripts only from the app's origin or with that nonce, never `unsafe-inline` scripts.

#### Scenario: Page has a nonce-based CSP

- **WHEN** a browser requests any page, including `/login`
- **THEN** the response's Content-Security-Policy contains a `'nonce-…'` script source that differs per request, and every inline script in the HTML carries that nonce

#### Scenario: App cannot be framed

- **WHEN** another site embeds the app in an iframe
- **THEN** the browser refuses to render it (`frame-ancestors 'none'`, `X-Frame-Options: DENY`)

#### Scenario: Injected script is blocked

- **WHEN** a page contains an inline script without the request's nonce
- **THEN** the browser does not execute it

### Requirement: The app is excluded from search engines

Every response SHALL carry `X-Robots-Tag: noindex, nofollow, noarchive`, and every page SHALL include a `<meta name="robots">` with `noindex, nofollow`, in every environment. The app SHALL NOT serve a `robots.txt` that disallows crawling, because a crawler blocked from a page never sees its `noindex`.

#### Scenario: Login page is not indexed

- **WHEN** a search engine crawler fetches `/login` on the production domain
- **THEN** the response carries `X-Robots-Tag: noindex, nofollow, noarchive` and the HTML has a robots meta tag with `noindex, nofollow`

#### Scenario: API and file responses are not indexed

- **WHEN** a crawler fetches any other URL, such as `/api/health`
- **THEN** the response carries the same `X-Robots-Tag` header
