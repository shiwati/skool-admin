# Frontend

## Alapelvek

- Alapból Server Component; Client Component csak interaktív határoknál (`"use client"`).
- shadcn/ui primitívek: `src/components/ui` (új: `npx shadcn@latest add <komponens>`). Téma-tokenek: `src/app/globals.css`.
- Prettier: **tab** behúzás, rendezett Tailwind osztályok. A felület nyelve magyar.

## Közös elemek

- **`DataTable`** (`src/components/data-table.tsx`): TanStack Table, **kliensoldali** rendezés és lapozás, korlátos adatra. Props: `columns`, `data`, `caption` (képernyőolvasónak). Szerveroldali lapozású listához lásd az `ApplicantsTable` mintáját (`src/components/applicants/`).
- **UI-primitívek:** shadcn/ui (`button`, `input`, `checkbox`, `badge`, `dialog`, `alert-dialog`, `popover`, `dropdown-menu`, `tooltip`, `skeleton`, `sonner`, `card`, `label`, `textarea`). A `cn` a `@/lib/utils`-ból jöjjön: az újabb shadcn CLI a `cn` npm-csomagot importálja és telepíti, ezt hozzáadás után cseréld le. A toastok: `toast` a `sonner`-ből, a `<Toaster>` a root layoutban van.
- **`ChartContainer`** (`src/components/charts/chart-container.tsx`): Recharts burkoló, akadálymentes címkézéssel.
- **`useZodForm`** (`src/hooks/use-zod-form.ts`): React Hook Form + Zod resolver. A szerveren is validálj mindig; hibaformátum: `formatValidationErrors` (`src/lib/validation.ts`).

- **Oldalkeret:** `PageShell` (tartalomkeret padding és térköz), `PageHeader` (eyebrow, cím, leírás, műveletek) és `Breadcrumb` a `src/components/admin-shell/`-ben; minden `(admin)` oldal ezeket használja. `Card` a kártyás felülethez.
- **Űrlap-elemek** (`src/components/form/`): `FormField` (címke, kötelező-jelölő, hiba, súgó, `aria-invalid`/`aria-describedby` bekötés; a `fieldControlClass` a design szerinti mezőstílus), `TagInput` (szabad szavas chipek), `OptionChips` (fix listából választható chipek), `FormErrorSummary` (hibaösszegző, a mezőre ugró linkekkel).
- **`apiFetch` hibái:** `ApiError` a `status` mellett a hibaválasz JSON-törzsét is hordozza (`body`), így a szerver mezőhibái (`details.fieldErrors`) visszatölthetők az űrlapra.

## Jelenlegi oldalak

- `/login`: Google-gomb, hibaállapotok (AccessDenied, másik fiók választása).
- **Admin keret** (`src/app/(admin)/layout.tsx`, `src/components/admin-shell/`): bal oldali menü (`nav-items.ts`; a `href` nélküli pontok letiltva jelennek meg, amíg nincs képernyőjük; a Programok a `/events`-re mutat, a lista még hiányzik) és topbar a felhasználói menüvel (kijelentkezés).
- `/` (`(admin)`): Áttekintés (dashboard, design 02.1). Szerveren tölt (`src/lib/dashboard/load.ts`), a számítások tiszta függvények (`compute.ts`, `period.ts` a `src/lib/dashboard/`-ban), a kártyák a `src/components/dashboard/`-ban. Anonimizált jelentkező egyik mutatóba sem számít. **Jelentkezést számolunk, nem személyt:** aki két programra jelentkezett, kétszer számít.
    - **Fejléc:** év választó (`?period=`: idei év = alapértelmezett, vagy tavalyi év; mindig az azt megelőző évvel összevetve; az év határa budapesti idő), programszűrő (`?program=`: az időszakban induló programok közül; időszakváltáskor törlődik). Exportálás nincs (szándékosan kimaradt). A szűrők minden kártyára hatnak, a 6 hónapos trend időablaka fix.
    - **Összes jelentkező:** az időszakban beérkezett (`receivedAt`) jelentkezések száma vs. az előző időszak, %-os változás.
    - **Átlagos túljelentkezés:** az időszakban induló (`from`) programok összes jelentkezése / összes férőhelye (0 kapacitású program kimarad); különbség az előző időszakhoz képest.
    - **Átlagos elégedettség:** helyőrző, amíg nincs feedback.
    - **Kapacitás vs. jelentkezők:** az időszakban induló programok, jelentkezés / kapacitás; Jövőbeli (még nem ért véget, a most zajló is) / Múltbeli (már véget ért) / Mind.
    - **Túljelentkezés alakulása:** elmúlt 6 hónap, havonta az abban a hónapban induló programok jelentkezés / férőhely aránya (Recharts).
    - **Demográfia:** nincs külön év választó, a fejléc időszakát követi. Életkor (a program kezdő éve − `birthYear`, sávok) és Település (`hometown`, top 8 + Egyéb) fül.
    - **Elégedettség:** üres állapot; később programonkénti feedback-átlag.
    - Az elvégzési arány, a tanulói útvonal, a megye és az iskola szándékosan kimaradt.
- `/events/new`: új program felvétele (`src/components/events/new-event-form.tsx`, séma: `src/lib/events/schema.ts`). Szekciók: alapadatok (név, címkék a fix listából, leírás), időpont és helyszín (`datetime-local` mezők: dátum + óra:perc), kapacitás (létszám ≥ 1, korosztály tól–ig → `ageRange` `"12-18"`), oktató és mentorok. Mentés: `POST /api/events`, siker után átirányítás a `/events/:id`-re (ez és a `/events` lista még nem létezik). Nincs vázlatmentés, alkalom-lista és záró riport szekció.
- `/applicants`: Jelentkezők lista (`src/components/applicants/`), a `GET /api/applicants`-ből, kliensoldalon.
    - **Állapot:** a szűrés, rendezés és lapozás az URL-ben él (`src/lib/applicants/list-params.ts`).
    - **Tábla:** sima `<table>` oszlopkonfigurációval (`columns.tsx`), nem a `DataTable`.
    - **Oszlopválasztó:** a beállítás `localStorage`-ban mentődik (`column-settings.ts`, `use-column-settings.ts`).
    - **Kijelölés és tömeges műveletek:** e-mail másolás és törlés (`POST /api/applicants/delete`), valamint e-mail lista a teljes szűrésről.
    - **Helyőrzők:** a „Szinkronizálás” gomb letiltva, a duplikáció-banner funkció nélkül.
- Kliensoldali API-hívások: `apiFetch` (`src/lib/api/client.ts`). 401 esetén teljes oldalas átirányítás a `/login`-ra, az aktuális URL-lel mint visszatérési címmel.
- `error.tsx`, `not-found.tsx`: globális hibaoldalak.

## Teljesítmény

A repóban Next.js skillek vannak (`.claude/skills/`): bundle-optimalizálás, Cache Components, Partial Prefetching. Ezek még nincsenek bekapcsolva.
