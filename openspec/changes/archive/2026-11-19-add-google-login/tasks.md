# Tasks

## 1. Auth configuration

- [x] 1.1 Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `AUTH_ALLOWED_DOMAIN` (required, lowercased hostname, no default) to `src/lib/env-schema.ts`. Verify with new cases in `src/lib/env-schema.test.ts`: a missing secret fails without echoing values; `Skool.org.hu` is normalised to `skool.org.hu`; a value that is not a hostname fails.
- [x] 1.2 Add the three variables, with placeholder values and comments, to `.env.example`. Update the README environment table and the Authentication section: Google OAuth client in a Skool-owned Cloud project, **Internal** consent screen, redirect URI `<NEXTAUTH_URL>/api/auth/callback/google`, access managed in Google Workspace with no app-side allowlist, and the offboarding note about deleting `Session` rows. Verify `npm run format:check` passes.

## 2. Access policy

- [x] 2.1 Create the pure module `src/lib/access-policy.ts` with `evaluateSignIn(profile, domain)` (reason codes `unverified_email`, `wrong_hosted_domain`, `wrong_email_domain`). Verify with `src/lib/access-policy.test.ts`, which covers every scenario under "Access requires a Skool Workspace account": Workspace account allowed, gmail account denied, a consumer account with a `@skool.org.hu` email and no `hd` denied, unverified email denied, mismatched `hd` denied, and case-insensitive `hd` and email domain allowed.

## 3. NextAuth wiring

- [x] 3.1 In `src/lib/auth.ts`, add the Google provider with `authorization.params = { prompt: "select_account", hd: env.AUTH_ALLOWED_DOMAIN }` and set `pages: { signIn: "/login", error: "/login" }`. Verify `npm run typecheck` passes.
- [x] 3.2 Implement the `signIn` callback using `evaluateSignIn`. Return `true` on success. On denial, log `logger.warn({ event: "auth.denied", reason })` and return `/login?error=AccessDenied&account=<encoded email>`. Verify with `src/lib/auth.test.ts` (mock `@/lib/db`, `@/lib/env` and `@/lib/logger`): the denied path returns the URL, logs the reason, and the logged object contains no email.
- [x] 3.3 Add `events.signIn` and `events.signOut` logging `{ event, userId }` only, and keep the default same-origin `redirect` behaviour. Verify in `src/lib/auth.test.ts` that event payloads contain no email or tokens, and that `redirect({ url: "https://evil.example/", baseUrl })` returns `baseUrl`.

## 4. Session guard and protected area

- [x] 4.1 Create `src/lib/session.ts` (server-only) with `getAdminSession()` and `requireAdmin(returnTo)`. `requireAdmin` redirects to `/login?callbackUrl=…` when there is no session. Verify with `src/lib/session.test.ts`, mocking `next-auth` `getServerSession` and `next/navigation` `redirect`: no session leads to a redirect with an encoded return path; an existing session is returned.
- [x] 4.2 Create `src/app/(admin)/layout.tsx` calling `requireAdmin("/")`. Move `src/app/page.tsx` to `src/app/(admin)/page.tsx` as a minimal signed-in placeholder showing the user's name and a sign-out button (client component calling `signOut({ callbackUrl: "/login" })`). Verify that `npm run build` lists `/` as dynamic and that `/api/health` and `/api/auth/*` remain outside the group.
- [x] 4.3 Update CLAUDE.md. Replace "no providers are enabled" with the Google Workspace model (Internal consent screen plus a server-side `hd`/domain check, no allowlist), and document that route handlers and server actions must call `getAdminSession()` themselves because the `(admin)` layout does not protect them. Verify the text matches the implemented helper names.

## 5. Design foundations

- [x] 5.1 Load Poppins (400/500/600/700/900) and Azeret Mono (400/500/600) with `next/font/google` in `src/app/layout.tsx`, set `lang="hu"`, and map `--font-sans` and `--font-mono` in `globals.css`. Verify in the dev server that body text renders in Poppins and the `<html>` element has `lang="hu"`.
- [x] 5.2 Add the Skool brand tokens from design board C01 (sky, sky-50, peach, lemon, pink, lavender, ink, canvas, text primary/secondary/tertiary, border default/strong, error fg/bg) to `@theme` in `globals.css`. Re-point shadcn `--primary` to Ink and `--background` to canvas. Verify `npm run lint` and `npm run format:check` pass, and that `src/components/data-table.test.tsx` still passes.
- [x] 5.3 Add a pill-shaped, 44px full-width size/variant to `src/components/ui/button.tsx` for the login CTA. Verify with a test rendering the variant and asserting its classes, and confirm existing Button usages are unchanged.
- [x] 5.4 Add the Skool logo (exported from the design; prefer SVG) at `public/brand/skool-logo.svg` (or `.png`). Verify it loads at `/brand/skool-logo.svg` in the dev server.

## 6. Login page

- [x] 6.1 Create the client component `src/app/login/google-sign-in-button.tsx`, which takes `label` and `callbackUrl` props and renders the inline four-colour Google "G" icon. On click it switches to the disabled, `aria-busy` spinner state reading "Átirányítás a Google-höz…" and calls `signIn("google", { callbackUrl })` exactly once. Verify with `google-sign-in-button.test.tsx` (mock `next-auth/react`): label rendering, pending state after click, and a second click not calling `signIn` again.
- [x] 6.2 Create `src/app/login/page.tsx` (Server Component, metadata title "Bejelentkezés"). It redirects signed-in users to the safe `callbackUrl` (or `/`), maps `error` to the `default`, `denied` or `error` state, and only renders `account` when it is a valid email of at most 254 characters. Build the layout from board L01: brand panel with logo, "admin" pill, "SKOOL Menedzsment", tagline, the four module chips and the footer; the card with overline, heading, explanation, a banner when applicable, the button, a divider and the lock notice. Verify with `page.test.tsx`: the default state shows "Üdv újra!" and no alert; `error=AccessDenied&account=luca.nagy@gmail.com` shows "Nincs hozzáférésed", `role="alert"` with the email, and the "Másik Google-fiók választása" button; a malformed `account` omits the address; `error=OAuthCallback` shows the generic retry banner without the error code; an existing session triggers a redirect.
- [x] 6.3 Check responsive and accessibility behaviour in the running app (`npm run dev`, then `/login`). At 1440px the two columns match board L01. At about 400px the panels stack with no horizontal scroll. Everything is keyboard-reachable with a visible focus ring, and contrast is at least 4.5:1.

## 7. End-to-end verification

- [ ] 7.1 With a real Google OAuth client configured locally, verify the full flow manually:
  - A `@skool.org.hu` Workspace account lands on `/` and the `User`, `Account` and `Session` rows exist.
  - With the Internal consent screen, a gmail account is blocked on Google's own page and never reaches the app.
  - With a temporary External test client, a gmail account lands on the denied state and no new `User` row exists (check in `npm run db:studio`).
  - "Másik Google-fiók választása" shows the Google account chooser.
  - Sign-out returns to `/login` and deletes the session row.
- [ ] 7.2 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check` and `npm run build` (with the new environment variables set), and verify all of them pass.

## Workflow follow-up

- Archive the change after review, which creates `openspec/specs/admin-auth/spec.md`.
