# Frontend

## Alapelvek

- Alapból Server Component; Client Component csak interaktív határoknál (`"use client"`).
- shadcn/ui primitívek: `src/components/ui` (új: `npx shadcn@latest add <komponens>`). Téma-tokenek: `src/app/globals.css`.
- Prettier: **tab** behúzás, rendezett Tailwind osztályok. A felület nyelve magyar.

## Közös elemek

- **`DataTable`** (`src/components/data-table.tsx`): TanStack Table, **kliensoldali** rendezés és lapozás, korlátos adatra. Props: `columns`, `data`, `caption` (képernyőolvasónak). Szerveroldali lapozású listához lásd az `ApplicantsTable` mintáját (`src/components/applicants/`).
- **UI-primitívek:** shadcn/ui (`button`, `input`, `checkbox`, `badge`, `dialog`, `alert-dialog`, `popover`, `dropdown-menu`, `tooltip`, `skeleton`, `sonner`). A `cn` a `@/lib/utils`-ból jöjjön: az újabb shadcn CLI a `cn` npm-csomagot importálja és telepíti, ezt hozzáadás után cseréld le. A toastok: `toast` a `sonner`-ből, a `<Toaster>` a root layoutban van.
- **`ChartContainer`** (`src/components/charts/chart-container.tsx`): Recharts burkoló, akadálymentes címkézéssel.
- **`useZodForm`** (`src/hooks/use-zod-form.ts`): React Hook Form + Zod resolver. A szerveren is validálj mindig; hibaformátum: `formatValidationErrors` (`src/lib/validation.ts`).

## Jelenlegi oldalak

- `/login`: Google-gomb, hibaállapotok (AccessDenied, másik fiók választása).
- **Admin keret** (`src/app/(admin)/layout.tsx`, `src/components/admin-shell/`): bal oldali menü (`nav-items.ts`; a `href` nélküli pontok letiltva jelennek meg, amíg nincs képernyőjük) és topbar a felhasználói menüvel (kijelentkezés).
- `/` (`(admin)`): placeholder üdvözlő oldal.
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
