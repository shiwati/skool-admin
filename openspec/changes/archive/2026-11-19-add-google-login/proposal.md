# Proposal

## Why

The admin app has no way to sign in: NextAuth is wired to the database, but no provider is enabled, so every planned screen (dashboard, applicants, programs, reports) is unreachable. The UI design ("SKOOL Admin – UI Design", screens 01.1–01.3) specifies Google sign-in restricted to Skool staff. That is the prerequisite for every other feature and for attributing changes to a person.

## What Changes

- Enable Google as the only sign-in method (no passwords, no public registration).
- Restrict access to members of the Skool Google Workspace organisation (`@skool.org.hu`, configurable). Google enforces this primarily, through an **Internal** OAuth consent screen. The server double-checks the verified Workspace domain as a fail-closed safeguard. There is no per-user allowlist. Denied accounts get no user record.
- Add a `/login` page matching the designs, in Hungarian:
    - **01.1 default**: "Üdv újra!" with a "Bejelentkezés Google-fiókkal" button.
    - **01.2 redirecting**: the button is disabled and busy, labelled "Átirányítás a Google-höz…".
    - **01.3 access denied**: the heading "Nincs hozzáférésed", an error banner naming the rejected account, and a "Másik Google-fiók választása" button.
- Make `/` a protected placeholder for signed-in admins (it shows the signed-in user and a sign-out action). Unauthenticated visitors are redirected to `/login` and return to their original URL after signing in.
- Log sign-in successes and denials as structured events, without personal data beyond the user id.
- Add the Skool design foundations needed by the login screen (Poppins and Azeret Mono fonts, brand colour tokens, Skool logo asset), and set the document language to Hungarian.
- New required environment variables: Google OAuth client ID and secret, and the allowed Workspace domain.

## Capabilities

### New Capabilities

- `admin-auth`: how staff authenticate to the admin app and which accounts are authorised. This covers the Google sign-in flow, the Workspace-domain access policy, the login page states, protection of admin routes, sign-out, and auth event logging.

### Modified Capabilities

<!-- None: no specs exist yet. -->

## Impact

- **Code**:
    - `src/lib/auth.ts`: provider, callbacks, custom pages.
    - `src/lib/env-schema.ts` and `.env.example`: new variables.
    - New `src/app/login/` route.
    - New protected route group and session helper; `src/app/page.tsx` moves into the protected group.
    - `src/app/layout.tsx`: fonts and `lang`.
    - `src/app/globals.css`: brand tokens.
    - `public/`: logo.
- **APIs**: `/api/auth/*` gains the Google provider endpoints (`/api/auth/signin/google`, `/api/auth/callback/google`).
- **Dependencies**: none new. This uses `next-auth/providers/google` from the existing NextAuth v4 and `next/font/google`.
- **Database**: no schema change. The existing `User`, `Account` and `Session` tables are populated for allowed admins only.
- **External**: a Google Cloud OAuth client is required. It must be in a Cloud project owned by the Skool Workspace organisation, with the consent screen set to Internal, and redirect URI `<NEXTAUTH_URL>/api/auth/callback/google` for each environment.
- **Docs**: the README's Authentication and environment sections and CLAUDE.md need updating, because "no provider enabled" will no longer be true.
