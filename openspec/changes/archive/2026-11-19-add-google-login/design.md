# Design

## Context

- NextAuth.js v4 is already wired: `src/lib/auth.ts` has the Prisma adapter, `session: { strategy: "database" }` and `providers: []`. The handler lives at `src/app/api/auth/[...nextauth]/route.ts`. The Prisma schema already has the adapter's `User`, `Account`, `Session` and `VerificationToken` models, so **no migration is needed**.
- Environment values are validated by the Zod schema in `src/lib/env-schema.ts`, parsed in `src/lib/env.ts` (server-only), and checked at startup by `src/instrumentation.ts`.
- The UI uses Tailwind v4 with shadcn neutral tokens in `src/app/globals.css`. Nothing Skool-branded exists yet. `src/app/layout.tsx` uses `lang="en"`.
- Design source: the "SKOOL Admin – UI Design" artifact, boards `L01-Login` (one component with `state` = `alap` | `atiranyitas` | `nincs-jog`) and `C01-Alapok` (design tokens). Visual reference values:
    - **Login layout**:
        - Left brand panel: background `#A6C7E7`, padding 48/64, logo with a black "admin" pill, H1 "SKOOL Menedzsment" in Poppins Black 48/54, Azeret Mono tagline, four pastel module chips (Jelentkezők `#FBC999`, Programok `#FBF3A3`, Feedback `#F8C8DC`, Riportok `#C3B1E1`), and the footer "© 2026 Skool Technológiai Alapítvány · belső használatra".
        - Right side: canvas `#F6F8FB` with a centred white card (440px, radius 20, padding 36, gap 20). The two columns wrap to a single column on narrow screens (`flex: 1 1 520px` / `flex: 999 1 560px`).
    - **Tokens**:
        - Text: `#121417` primary, `#565F6B` secondary, `#6B7480` tertiary.
        - Borders: `#E2E7EE` default, `#C9D2DD` strong.
        - Ink `#0F0F0F` for primary and active elements.
        - Error colours: `#B42318` on `#FBE4E4`.
        - Radii: sm 6, md 10, lg 14, pill 999. Buttons are pills.
        - Fonts: Poppins (400/500/600/700/900) and Azeret Mono (400/500/600).
- Requirements are in `specs/admin-auth/spec.md`.

## Goals / Non-Goals

**Goals:**

- Use one access-policy function as the single source of truth for both sign-in and per-request checks.
- Let Google enforce organisation membership, and keep a server-side check that fails closed: missing claims or unexpected errors result in denial.
- Keep the login page a Server Component, with a small client island for the button.

**Non-Goals:**

- Roles or permissions within the admin app (every admin can do everything for now).
- Any per-user allowlist, whether in configuration or the database. Access management happens in Google Workspace (adding or suspending users).
- Persisting a database audit or change log (screen 08.3). This change only emits structured log events.
- Building the sidebar, topbar or dashboard (02.1). `/` stays a minimal placeholder.
- Dark-mode styling of the login page.

## Decisions

### 1. Google provider from NextAuth v4 with forced account selection and a domain hint

Use `next-auth/providers/google` with `authorization.params = { prompt: "select_account", hd: <allowed domain> }`.

- `select_account` makes "Másik Google-fiók választása" actually let the user pick a different account.
- `hd` pre-filters the chooser to Workspace accounts. It is only a UI hint; the claims are enforced server-side (decision 2).

_Alternative:_ Auth.js v5. This was rejected per the existing project decision to stay on v4.

### 2. Google enforces organisation membership; the server double-checks the Workspace domain

Create the OAuth client in a Google Cloud project owned by the Skool Workspace organisation, with the consent screen's user type set to **Internal**. Google then refuses every account outside the organisation on its own error page ("Access blocked … can only be used within its organisation"), before any callback reaches our app. That is the primary control, and it means user access is managed entirely in Google Workspace admin.

The server still verifies the identity token's claims as defence in depth. The consent-screen setting lives outside the repo, and switching it to External, or reusing a client from a project outside the organisation, would silently open the app to every Google account. The check is one pure function with no list to maintain:

- `src/lib/access-policy.ts` exports `evaluateSignIn(profile, domain) → { allowed: true } | { allowed: false, reason }`.
- It checks, in order: `email_verified === true`, then `hd` (lowercased) `=== domain`, then the email's domain (lowercased) `=== domain`.
- The reason codes are `unverified_email`, `wrong_hosted_domain` and `wrong_email_domain`. They feed the log events and are never shown to the user.
- The `hd` claim is the key part. It is only present for Workspace-managed accounts, so it also rejects a consumer Google account that was registered with a `@skool.org.hu` address.

Because of the Internal consent screen, the access-denied page state (01.3) is normally unreachable. It is kept as the fallback for the misconfiguration case, and because the design specifies it.

_Alternatives:_

- A per-user allowlist (environment variable or database table): rejected, because it duplicates Workspace membership and creates a second place to manage access.
- Relying on the Internal consent screen alone, with no server check: rejected, because a configuration change outside the codebase would remove all access control with no visible failure.

### 3. Domain and credentials come from environment variables

Add the following to `envSchema`:

- `GOOGLE_CLIENT_ID`: non-empty.
- `GOOGLE_CLIENT_SECRET`: non-empty.
- `AUTH_ALLOWED_DOMAIN`: a lowercased hostname, for example `skool.org.hu`. There is no default; it must be set. It is used both for the `hd` authorisation hint and for the server check.

### 4. Denial happens in the `signIn` callback, before any database writes

In NextAuth v4 the `signIn` callback runs before the adapter creates or links the user. Returning a URL string aborts sign-in and redirects there.

- On denial, return `/login?error=AccessDenied&account=<urlencoded email>`.
- On success, return `true`.
- Configure `pages: { signIn: "/login", error: "/login" }`, so all other NextAuth errors (OAuthCallback, OAuthSignin, Callback and so on) land on `/login?error=<Code>` and get the generic error state.

On the page, `account` is only rendered if it parses as an email and is at most 254 characters. React escapes it, so there is no XSS risk. Because the value comes from the URL, someone could craft a link showing a fake account name in the denied banner. That is harmless: the page grants nothing, and the banner text is fixed apart from the address.

_Alternative:_ a short-lived signed cookie carrying the email. That is more robust, but it requires setting cookies from inside NextAuth's handler response, which v4 does not expose cleanly. The query parameter is simpler, and its spoofing risk is cosmetic.

### 5. Server-side guard in a protected route group (no proxy or middleware)

Database sessions cannot be validated without a database read. Rather than doing that in `proxy.ts`/middleware on every request, guard on the server:

- `src/lib/session.ts` (server-only) exports `getAdminSession()`. It calls `getServerSession(authOptions)` and returns the session or `null`. Only Workspace accounts can create sessions, so a valid session is sufficient.
- It also exports `requireAdmin(returnTo)`. On `null` it `redirect()`s to `/login?callbackUrl=<returnTo>`.
- `src/app/(admin)/layout.tsx` calls `requireAdmin` and renders children. `src/app/page.tsx` moves to `src/app/(admin)/page.tsx`, so the URL stays `/`.
- Route handlers and server actions must call `getAdminSession()` themselves, because layouts do not protect them. This is documented in CLAUDE.md. No such endpoints exist yet.
- The return path for the redirect cannot be derived from the layout. Each page passes its own path, or the layout falls back to `/`. A `x-pathname` header set in `proxy.ts` was considered but adds a proxy just for this. Revisit when there are more pages.

`/login`, `/api/auth/*` and `/api/health` sit outside `(admin)` and stay public.

### 6. Open-redirect protection relies on the NextAuth `redirect` callback

Keep the default same-origin behaviour of the `redirect` callback, and pass `callbackUrl` from `searchParams` to `signIn()`. Add a unit test confirming that `https://evil.example/` resolves to the base URL.

### 7. Login page structure

- `src/app/login/page.tsx` is a Server Component.
    - It reads `searchParams` (`error`, `account`, `callbackUrl`).
    - If `getAdminSession()` returns a session, it redirects to the safe `callbackUrl`, or `/`.
    - It maps `error` to a view state: `AccessDenied` gives `denied`, any other value gives `error`, and none gives `default`.
    - It renders the brand panel and card markup statically.
- `src/app/login/google-sign-in-button.tsx` is a `"use client"` component.
    - It holds local `pending` state.
    - On click it sets pending, then calls `signIn("google", { callbackUrl })` from `next-auth/react`.
    - While pending, it renders the disabled, `aria-busy` spinner button reading "Átirányítás a Google-höz…" (state 01.2).
    - The label prop is "Bejelentkezés Google-fiókkal" by default and "Másik Google-fiók választása" in the denied state.
    - It renders the official four-colour Google "G" SVG inline.
- No `SessionProvider` is needed, because `signIn` and `signOut` from `next-auth/react` work without it.
- Sign-out on the placeholder uses a small client button calling `signOut({ callbackUrl: "/login" })`. Database sessions are deleted server-side by NextAuth.
- Hungarian copy lives inline in the components. There is no i18n framework; the app is Hungarian-only.

### 8. Design foundations: only what the login page needs

- `layout.tsx` loads Poppins and Azeret Mono with `next/font/google` as CSS variables, and sets `lang="hu"`.
- `globals.css`:
    - Map `--font-sans` and `--font-mono` to those fonts.
    - Add brand tokens (`--color-sky`, `--color-sky-50`, `--color-peach`, `--color-lemon`, `--color-pink`, `--color-lavender`, `--color-ink`, `--color-canvas`, plus text, border and error tokens) to `@theme`.
    - Re-point the shadcn `--primary` to Ink and `--background` to canvas, so the existing `Button` matches the design.
    - Add a `pill` variant/size for the 44px full-width login button rather than overriding it per use.
- Logo: the design uses a raster Skool logo that is not in the repo. Add it as `public/brand/skool-logo.svg` (or `.png`) and render it with `next/image` with alt text "Skool".

### 9. Logging

Use the NextAuth `events.signIn` and `events.signOut` handlers for success and sign-out events, logging `{ event, userId }`. Log denials from the `signIn` callback as `logger.warn({ event: "auth.denied", reason })`. Never log `profile`, `account`, `user.email` or tokens. The existing redaction is only a backstop.

## Risks / Trade-offs

- [Google Workspace accounts and the `hd` claim: a personal Google account registered with a `@skool.org.hu` email has no `hd` claim] → Denied by the `hd` check. This is intentional, but document it so the support message makes sense.
- [Every Workspace member gets full admin access, including people outside the admin team] → Accepted by the product decision. If that changes, add roles in a later change rather than an allowlist.
- [Offboarding lag: suspending or deleting a user in Workspace blocks new sign-ins, but their existing database session stays valid until it expires (NextAuth default `maxAge` of 30 days)] → Accepted for now. Staff can be cut off immediately by deleting their `Session` rows. A shorter `session.maxAge` is a one-line follow-up if needed.
- [The consent screen is accidentally switched to External] → The server-side `hd` and domain check still denies outsiders (decision 2), and the denied state tells them why.
- [Layout-only guards do not cover future route handlers or server actions] → `getAdminSession()` is the documented pattern, CLAUDE.md is updated, and a test covers the helper.
- [`next/font/google` fetches fonts at build time] → Builds need network access to Google Fonts. Vercel builds have it; offline builds would need to self-host the fonts.
- [The return URL is lost for nested pages until per-page paths are passed] → Only `/` exists today; revisit when more pages land.
- [The spoofable `account` value in the denied banner] → Cosmetic only (decision 4).

## Migration Plan

1. Create a Google Cloud OAuth client (Web application) in a Cloud project owned by the Skool Workspace organisation. Set the OAuth consent screen user type to **Internal**. Add authorised redirect URIs `http://localhost:3000/api/auth/callback/google` and each deployed `<NEXTAUTH_URL>/api/auth/callback/google`.
2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `AUTH_ALLOWED_DOMAIN=skool.org.hu` in every environment **before** deploying, because startup validation rejects missing values.
3. Deploy. There are no database migrations.
4. Rollback: redeploy the previous build. The new environment variables are ignored by the old schema, and user/account/session rows created meanwhile are harmless.

## Open Questions

- Who in the Skool Workspace organisation owns the Google Cloud project and creates the OAuth client? This does not affect the implementation.
- Is an SVG version of the Skool logo available, or only the raster used in the design?
