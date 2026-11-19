# Frontend

## Alapelvek

- Alapból Server Component; Client Component csak interaktív határoknál (`"use client"`).
- shadcn/ui primitívek: `src/components/ui` (új: `npx shadcn@latest add <komponens>`). Téma-tokenek: `src/app/globals.css`.
- Prettier: **tab** behúzás, rendezett Tailwind osztályok. A felület nyelve magyar.

## Közös elemek

- **`DataTable`** (`src/components/data-table.tsx`): TanStack Table, **kliensoldali** rendezés és lapozás, korlátos adatra. Props: `columns`, `data`, `caption` (képernyőolvasónak). Nagy / szerveroldali lapozott adathoz (pl. az API lapozott válaszai) ez külön megfontolást igényel.
- **`ChartContainer`** (`src/components/charts/chart-container.tsx`): Recharts burkoló, akadálymentes címkézéssel.
- **`useZodForm`** (`src/hooks/use-zod-form.ts`): React Hook Form + Zod resolver. A szerveren is validálj mindig; hibaformátum: `formatValidationErrors` (`src/lib/validation.ts`).

## Jelenlegi oldalak

- `/login`: Google-gomb, hibaállapotok (AccessDenied, másik fiók választása).
- `/` (`(admin)`): placeholder üdvözlő oldal + kijelentkezés gomb. Valódi funkciók még nincsenek.
- `error.tsx`, `not-found.tsx`: globális hibaoldalak.

## Teljesítmény

A repóban Next.js skillek vannak (`.claude/skills/`): bundle-optimalizálás, Cache Components, Partial Prefetching. Ezek még nincsenek bekapcsolva.
