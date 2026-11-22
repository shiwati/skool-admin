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

- **Visszatérési cím:** a layout nem látja az URL-t, ezért a `src/proxy.ts` (a Next 16-ban ez a korábbi middleware) minden oldalkérésnél átadja az útvonalat a query-vel együtt az `x-skool-return-to` fejlécben. A layout ezt (`returnToFromHeader`, `src/lib/return-to.ts`, azonos originre szűrve) adja a `requireAdmin`-nak, így például a `/applicants?page=2` bejelentkezés után ugyanoda tér vissza. A proxy semmilyen hozzáférési döntést nem hoz.
- **Biztonsági fejlécek:** a `next.config.ts` minden válaszra HSTS-t, `X-Frame-Options: DENY`-t, `nosniff`-et, `Referrer-Policy`-t és `Permissions-Policy`-t tesz. Az oldalakra a `src/proxy.ts` kérésenként új nonce-szal Content-Security-Policy-t állít (`buildCsp`, `src/lib/csp.ts`): script csak a saját originről és nonce-szal (`strict-dynamic`), `unsafe-inline` nélkül fut; kép a Google profilképekhez, űrlap-átirányítás az `accounts.google.com`-ra és a Vercel preview toolbar (`vercel.live`) engedélyezett. Új külső forrást (script, kép, analitika) a `csp.ts`-be kell felvenni, különben a böngésző blokkolja. A proxy a prefetch-kéréseket kihagyja.
- **Keresőmotorok kizárása:** minden válasz `X-Robots-Tag: noindex, nofollow, noarchive` fejlécet kap (`next.config.ts`), és minden oldal `<meta name="robots" content="noindex, nofollow">`-ot (root layout); mindkettő a `src/lib/no-index.ts`-ből jön. A Vercel ezt csak a preview deployokra tenné rá magától, a productionre nem. `robots.txt`-t szándékosan nem adunk: egy `Disallow: /` miatt a Google nem látná a `noindex`-et, és a hivatkozott URL leírás nélkül mégis bekerülhetne a találatok közé.
- **`session.user.id`:** a `session` callback a belső `User.id`-t a sessionbe teszi, hogy az írási végpontok rögzíthessék, ki végezte a műveletet (pl. `deletedById`). Típus: `src/types/next-auth.d.ts`.

Az olvasó API végpontok a `handleQuery`-n, az írók a `handleBody` / `handleAdmin`-on keresztül védettek (lásd [api.md](api.md)); mindhárom a `getAdminSession()`-t hívja.

## Naplózás

Auth események csak `{ event, userId }` / `{ event, reason }` formában; soha e-mail, token, session vagy hitelesítő adat.

## Környezeti változók

`NEXTAUTH_SECRET` (≥32 karakter), `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_ALLOWED_DOMAIN` (alapérték `skool.org.hu`). Séma: `src/lib/env-schema.ts`. Részletek: [workflow.md](workflow.md). A specifikáció: `openspec/specs/admin-auth/spec.md`.
