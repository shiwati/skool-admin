# Tasks

## 1. Formatting helpers and labels

- [x] 1.1 In `src/lib/applicants/format.ts`:
    - Let `formatDate` accept `Date | string`.
    - Add `formatDateTime` (`ÉÉÉÉ.HH.NN ÓÓ:PP`, Europe/Budapest), `formatDateRange`, `isAlumni` and `programsSummary`.

    Verify: `format.test.ts` covers the Budapest time-zone conversion (a UTC evening that falls on the next day), the range format, and "3 jelentkezés · 2 elvégzett".

- [x] 1.2 Add `src/lib/applicants/detail-labels.ts` with three exports:
    - `FORM_ANSWER_FIELDS`, in the order and with the labels from the "Application form answers" requirement
    - `HISTORY_FIELD_LABELS`, covering applicant and application fields, with "Státusz" for `status`
    - `historyValue`, which maps status enum values to labels and otherwise passes the value through

    Verify: the unit test checks the label fallback to the field name and that `historyValue("status", "ACCEPTED")` is "Elfogadva".

## 2. Server-side loader

- [x] 2.1 Implement `getApplicantDetail(id)` in `src/lib/applicants/detail.ts` (`server-only`, wrapped in `React.cache`), per design §1:
    - Use explicit selects, and filter `deletedAt: null`.
    - Return `null` when the applicant is missing or deleted.
    - Read history for the applicant and its applications: newest first, at most 20, with the actor's name or `null`, and the program name for application rows.

    Verify: `detail.test.ts` (node environment, mocked `@/lib/db`) covers four cases:
    - Not found returns `null`.
    - The `where` includes `deletedAt: null`, and no history query runs when the applicant is missing.
    - The history `OR` covers the applicant and application ids, with `take: 20`.
    - Program names are mapped onto application history rows.

## 3. Detail page

- [x] 3.1 Add the Server Components under `src/components/applicants/detail/`:
    - `ApplicantDetailHeader`, with the badges and meta line
    - `PersonalDataCard` and `ParentDataCard`, with `mailto:`/`tel:` links and "—" for missing values
    - `ProgramsTable`, with the summary and the "Még nincs jelentkezése" empty state
    - `FormAnswersCard`, listing only answered fields, with "Nincs kitöltött válasz"
    - `TagsCard`, with "Nincs címke" when empty
    - `HistoryCard`, with "Rendszer", the program suffix, "régi → új" and "Még nincs rögzített változás"

    Follow the board 04.1 layout: a main column and a side column, and the existing tokens from `globals.css`.

    Verify: Testing Library tests render each component from fixtures and cover the scenarios in `specs/applicant-detail/spec.md`, including:
    - the alumni header badges
    - no badges
    - missing parent data
    - the programs summary
    - answered-only form fields
    - the status history entry
    - the empty history

- [x] 3.2 Add the Client Component `ApplicantDetailActions`. It shows:
    - the disabled "Visszaigazolás küldése" and "Szerkesztés" buttons, with tooltips
    - the "További műveletek" dropdown with "Törlés", which opens `DeleteDialog` for `{ ids: [id], name }`
    - `onDeleted` running `router.replace("/applicants")` and then `router.refresh()`

    Verify: the component test (with mocked `next/navigation` and `apiFetch`) covers four cases:
    - Both buttons are disabled.
    - The menu opens the dialog naming the applicant.
    - A successful delete calls `replace("/applicants")`.
    - A failed delete shows "A törlés nem sikerült. Próbáld újra." and does not navigate.

- [x] 3.3 Add `src/app/(admin)/applicants/[id]/page.tsx` and `not-found.tsx`.
    - The page runs, in order: await `params`, `requireAdmin('/applicants/{id}')`, `getApplicantDetail`, then `notFound()` on `null`.
    - `generateMetadata` sets the title to the name, using the same cached loader.
    - The page lays out the sections.

    Verify: `page.test.tsx` (mocked `@/lib/session` and the loader) covers three cases:
    - Without a session, `requireAdmin` redirects and the loader is never called.
    - A `null` result calls `notFound`.
    - An existing applicant renders the heading and breadcrumb.

## 4. List: row navigation

- [x] 4.1 In `ApplicantsTable` / `columns.tsx`:
    - Make the name a `next/link` to `/applicants/{id}`.
    - Add the row `onClick` with the interactive-target filter: plain click calls `router.push`, and Ctrl or Meta click opens a new tab.
    - Add `cursor-pointer` and a hover background on data rows only.

    Verify: `applicants-table.test.tsx` covers four cases:
    - A row cell click pushes `/applicants/{id}`.
    - A checkbox click and a "Műveletek" menu click do not navigate.
    - The name is a link with the right `href`.
    - Skeleton and empty rows do not navigate.

## 5. Docs and integration

- [x] 5.1 Update the docs:
    - `docs/frontend.md`: the `/applicants/[id]` page, server-side loading, and row navigation.
    - `docs/api.md`: a short note that the detail page reads the DB directly and has no endpoint.
    - `CLAUDE.md`: the project-state line, if it lists the screens.

    Verify: `npm run format:check` passes.

- [x] 5.2 Run the full gate. Verify: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `openspec validate add-applicant-detail` all pass.
- [ ] 5.3 Check the page manually in `npm run dev` with the seed data:
    - Open a row from `/applicants`.
    - Confirm the sections, the disabled actions and the 404 for a random id.
    - Delete a seed applicant from the detail page and confirm you land on the list with the toast and the row gone.
    - Restore with `npm run db:seed:reset`.

    Verify: all of the above is observed in the browser.

## Workflow follow-up

- Archive the change after review.
