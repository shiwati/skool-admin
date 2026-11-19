# Design

## Context

- **Data model.** `Applicant`, `Application` (→ `Event`) and `History` hold the data for the page; see `prisma/schema.prisma`. Applicants are soft-deleted (`deletedAt`), and every applicant read must filter it out (`docs/data-and-db.md`).
- **History convention.** Entries use `tableName` = the `@@map` name (`applicant`, `application`), `recordId`, and `fieldName` = the Prisma field name (`src/lib/applicants/anonymize.ts`). Today only GDPR deletion writes entries, and those belong to deleted applicants, which the page never shows. In practice the history card starts empty.
- **Auth.** The `(admin)` layout calls `requireAdmin`. Next.js renders a layout and its page concurrently, so a page that reads personal data cannot rely on the layout's redirect having happened first.
- **List screen.** `/applicants` already provides:
    - formatting helpers (`src/lib/applicants/format.ts`)
    - status labels and colours, and the program colour dot
    - `DeleteDialog`, which posts to `POST /api/applicants/delete` and shows a sonner toast
    - the server-side first render pattern
- **Interactive pieces.** The page itself can be a Server Component; the interactive parts are only the header actions and the list's row click.

## Goals / Non-Goals

**Goals:**

- A single server-side DB round trip group per request (applicant + applications + history), shared between `generateMetadata` and the page.
- Reuse the list's formatting and the deletion flow unchanged where possible.
- Never send personal data of deleted applicants, nor fields not shown on the page (for example `duplicateKey`), to the client.

**Non-Goals:**

- Editing (board 04.2) and a full change log page ("Teljes napló").
- Writing History entries. This change only reads them.
- New schema fields or an API endpoint for detail data.

## Decisions

### 1. Server-only loader with `React.cache`

`src/lib/applicants/detail.ts` (`server-only`) exports `getApplicantDetail(id)`, wrapped in `cache()`. It returns `null` when the applicant is missing or `deletedAt` is set.

- **Applicant query.** A `findFirst({ where: { id, deletedAt: null } })` with an explicit `select` of the displayed fields, including applications ordered by `receivedAt desc` with `event { id, name, from, to }`.
- **History query.** Runs after that. It matches `OR` [`{ tableName: "applicant", recordId: id }`, `{ tableName: "application", recordId: { in: applicationIds } }`], orders by `createdAt desc`, takes 20, and includes `createdBy { name }`.
- **History mapping.** The loader maps history rows to a view shape `{ id, actor, field, programName, oldValue, newValue, createdAt }`. It resolves `programName` from the application id → event name. It reuses the `APPLICANT_TABLE` and `APPLICATION_TABLE` constants from `anonymize.ts`.
- **Shared result.** Both `generateMetadata` (title = name) and the page call the loader. `cache` makes that one set of queries.
- **Why not reuse `listApplicants` or an endpoint.**
    - The user asked for no endpoint.
    - The list query selects a different shape and pages.
    - A dedicated loader keeps the selected fields minimal.
- **Alternative considered:** a single Prisma query with history as a relation. `History` has no relation to `Applicant` (polymorphic `recordId`), so it needs a second query.

### 2. Page guards itself, then `notFound()`

`src/app/(admin)/applicants/[id]/page.tsx` is an async Server Component. It runs these steps:

1. Await `params`.
2. Call `requireAdmin(`/applicants/${id}`)`, which is cached per request, so the layout does not add a DB read.
3. Call the loader, and call `notFound()` on `null`.

The page then renders the sections. `not-found.tsx` in the same segment renders "Nem található ilyen jelentkező" with a link to `/applicants`.

- **Status code.** `notFound()` before any streaming yields a 404 status. The segment has no `loading.tsx`, so nothing streams before the page resolves.
- **Id validation.** No id format check is needed. Prisma treats the id as an opaque string, and unknown ids simply return `null`.

### 3. Presentation split

These are Server Components under `src/components/applicants/detail/`:

- `ApplicantDetailHeader` (avatar, name, badges, meta line)
- `PersonalDataCard`, `ParentDataCard`, `ProgramsTable`, `FormAnswersCard`, `TagsCard`, `HistoryCard`

The only Client Component is `ApplicantDetailActions`. It holds the disabled "Visszaigazolás küldése" and "Szerkesztés" buttons, with tooltips following the disabled "Szinkronizálás" pattern in `applicants-header.tsx`. It also holds the "További műveletek" `DropdownMenu` and the `DeleteDialog`. The client receives only `{ id, name }`.

### 4. Formatting helpers

Pure, colocated helpers in `src/lib/applicants/format.ts`, unit-tested:

- **Existing helpers reused.** `fullName`, `applicantInitials`, `ageFromBirthYear`, `isOver16`, `STATUS_LABELS`, `STATUS_BADGE_CLASSES`, `programColorClass`, `formatDate`.
- **New in `format.ts`:**
    - `formatDateTime(value)`, giving `ÉÉÉÉ.HH.NN ÓÓ:PP` in Europe/Budapest
    - `formatDateRange(from, to)`
    - `isAlumni(applications)`, meaning any application is `ATTENDED`
    - `programsSummary(applications)`, giving "N jelentkezés · M elvégzett"
- **Date inputs.** `formatDate` and the new date helpers accept `Date | string`, so Server Components can pass Prisma `Date`s directly.
- **New in `src/lib/applicants/detail-labels.ts`** (client-safe):
    - `FORM_ANSWER_FIELDS`: an ordered list of `{ field, label }` for the form answers card
    - `HISTORY_FIELD_LABELS`: Prisma field name → Hungarian label, with the field name as fallback
    - `historyValue(field, value)`: maps status enum values to `STATUS_LABELS`

### 5. Row click in `ApplicantsTable`

- **Name link.** The name in the name cell becomes a `next/link` `<Link href={`/applicants/${id}`}>`. This is the accessible, keyboard and new-tab entry point.
- **Row click.** The `<tr>` gets an `onClick`. It ignores events whose target is inside `a, button, input, label, [role="checkbox"], [role="menuitem"]`, and it ignores clicks while text is selected. Otherwise it calls `router.push`, or `window.open(href, "_blank")` with Ctrl or Meta pressed.
- **No row-level keyboard handler.** The row gets no `tabIndex` and no `role="link"`, which would nest interactive content; the name link covers keyboard users.
- **Row styling.** Only data rows get `cursor-pointer` and the hover background.
- **Alternative considered:** wrapping cells in links. It is invalid around the checkbox and the menu, and it duplicates links per cell.

### 6. Deletion from the detail page

`ApplicantDetailActions` opens `DeleteDialog` with `{ ids: [id], name }`. Its `onDeleted` runs `router.replace("/applicants")` and then `router.refresh()`. The dialog itself already fires the success toast, and the `<Toaster>` lives in the root layout, so the toast survives the navigation. `replace` keeps the deleted applicant's URL out of the back stack. `DeleteDialog` is reused as is.

## Risks / Trade-offs

- **[Risk] Rendered without the layout's guard.** The page could read data before the layout's guard runs. → The page calls `requireAdmin` itself, and a page test asserts that no loader call happens without a session.
- **[Risk] History grows unbounded.** The card is capped at 20 entries, newest first, until a full log page exists.
- **[Trade-off] Design fields left out.** Many board 04.1 fields have no data, so the page is sparser than the design; this was the user's choice. Adding the fields later only extends the cards.
- **[Trade-off] Name in the browser tab.** The tab title contains the applicant's name, which is personal data in the browser history. This is acceptable for an internal admin tool and consistent with the visible heading.
- **[Risk] Row-click target filtering.** The filter could miss a future interactive element in a cell. → It uses one selector constant, covered by tests for the checkbox and menu.

## Migration Plan

No schema or data migration. Deploy as a normal app release; rollback = revert.
