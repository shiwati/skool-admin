# Hitelesítés és hozzáférés

## Belépés

- **Csak Google** (NextAuth v4, ne v5 béta), adatbázis-alapú session (`src/lib/auth.ts`, Prisma adapter). Nincs jelszó, e-mail link, regisztráció.
- Hozzáférés = a Skool Google Workspace **bármely tagja**. Nincs felhasználónkénti allowlist, és ne is vezessünk be.
- Kettős védelem: az OAuth kliens consent screenje **Internal**; emellett a `signIn` callback szerveroldalon újra ellenőriz a tiszta `evaluateSignIn` függvénnyel (`src/lib/access-policy.ts`): verified e-mail + `hd` claim + e-mail domain mind egyezik az `AUTH_ALLOWED_DOMAIN`-nel (kisbetű-érzéketlen). Fail-closed.
- Elutasításkor a user `/login?error=AccessDenied&account=…` oldalra kerül, **mielőtt** bármi íródna az adatbázisba.
- A Google kérésben `prompt: select_account` van (mindig mutatja a fiókválasztót), `hd` csak UI-tipp.
- Redirect csak azonos origin-re; a `callbackUrl`-t a `safeCallbackPath` (`src/lib/callback-url.ts`) szűri (idegen origin, `//evil`, `/\evil` elutasítva).

## Védelem szabályai

| Mit           | Hogyan                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Oldal         | a `src/app/(admin)/` alá; a layout `requireAdmin(returnTo)`-t hív      |
| Route Handler | **külön** védeni kell: session ellenőrzés, `null` esetén 401           |
| Server Action | **külön** védeni kell: `getAdminSession()`, `null` esetén elutasítás   |
| Nyilvános     | `/login`, `/api/auth/*`, `/api/health` – maradjanak az `(admin)` kívül |

`src/lib/session.ts`: `getAdminSession()` (request-szintű cache) és `requireAdmin()`.
Az olvasó API végpontok a `handleQuery`-n keresztül védettek (lásd [api.md](api.md)).

## Naplózás

Auth események csak `{ event, userId }` / `{ event, reason }` formában; soha e-mail, token, session vagy hitelesítő adat.

## Környezeti változók

`NEXTAUTH_SECRET` (≥32 karakter), `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_ALLOWED_DOMAIN` (alapérték `skool.org.hu`). Séma: `src/lib/env-schema.ts`. Részletek: [workflow.md](workflow.md). A specifikáció: `openspec/specs/admin-auth/spec.md`.
