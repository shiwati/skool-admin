# Design

## Context

- **Column settings.** `useColumnSettings` (localStorage key `skool-admin:applicants:columns:v1`, `useSyncExternalStore`) stores `{ order, hidden }`. `visibleColumns(settings)` gives the ordered visible ids, always including `name`.
- **Desktop table.** `ApplicantsTable` renders `COLUMNS[id].cell(item, now)` for each visible id. These cells are sized for table columns, for example a check icon for the newsletter and truncated two-line cells.
- **Mobile cards.** `ApplicantCardList` is rendered inside `ApplicantsTable` with `md:hidden`. It has a fixed body: an "age · settlement" line plus the history and newsletter badges. It does not know the column settings.
- **Column picker.** `ColumnPicker` (Popover, 300 px wide) is passed to `ApplicantsToolbar` as `trailing`. The toolbar shows it only inside the `hidden md:contents` inline group, so it is invisible on mobile.

## Goals / Non-Goals

**Goals:**

- One source of truth for both layouts: the existing settings and `visibleColumns`.
- Each column defines how it looks on a card next to how it looks in the table, so adding a column later means one place to edit.

**Non-Goals:**

- Separate settings for mobile and desktop.
- Sorting from the card list (sorting stays a table feature).
- Changing the picker panel's content or the storage format.

## Decisions

### 1. A per-column card renderer

`ColumnDef` gains an optional `card?: (item, now) => ReactNode`. When it is absent, the card falls back to `cell`. The column's `label` is the line label. Card renderers are defined where the table cell is not suitable on a phone:

| Column     | Card value                                        |
| ---------- | ------------------------------------------------- |
| age        | "{N} év" (the 16+ badge is already in the header) |
| location   | "Budapest · Iskola", one line, wrapping           |
| newsletter | "Feliratkozott" / "—"                             |
| history    | plain text "N program" / "—"                      |
| parent     | "Név · e-mail", wrapping                          |

`program`, `status`, `createdAt` and `phone` reuse `cell` as is.

- **Why on `ColumnDef`:** keeps table and card in sync per column and avoids a parallel switch in the card list.
- **Alternative considered:** a separate `CARD_FIELDS` map. Rejected, because it duplicates labels and would drift from the column list.

### 2. Card layout

- **Header:** the header stays as today (avatar, name + 16+, e-mail) and represents the locked `name` column.
- **Body:** a `<dl>` with one row per visible non-name column, in `visibleColumns` order.
    - Each row uses `grid grid-cols-[112px_minmax(0,1fr)] gap-x-3`, with the `dt` in `text-text-tertiary` and the value in the `dd`.
- **Whole-card link:** the whole card stays one link to the detail page. Values inside are non-interactive.
- **Data flow:** `ApplicantCardList` gets a `columns: ColumnId[]` prop. `ApplicantsTable` already receives `columns` and passes them on.

### 3. Picker trigger on mobile

- **Trigger modes.** `ColumnPicker` gets a `compact` prop. When it is set, the trigger is a 44 px round icon button (`Columns3` icon) with the accessible name "Oszlopok". The default mode keeps the current text button. The popover content is unchanged; on narrow screens it is `w-[min(300px,calc(100vw-2rem))]`.
- **Placement.** `ApplicantsToolbar` gets a `mobileTrailing` slot, rendered `md:hidden` right after the "Szűrők" button. `ApplicantsView` passes `<ColumnPicker compact … />` there and keeps the existing one in `trailing` for tablet and desktop.
- **State.** Both instances read the same `useColumnSettings` state, so they cannot diverge. Only one is displayed at a time.
- **Alternative considered:** moving the picker into the "Szűrők" dialog. Rejected, because the user asked for it next to the filters, and nesting a Popover in a Dialog adds focus-trap edge cases.

## Risks / Trade-offs

- **[Trade-off] The default card changes.** Today's compact "16 év · Budapest" line and badges become labelled lines, so the card gets taller with the default 7 lines. This is accepted: it was the user's choice, and hiding columns shortens it.
- **[Risk] Duplicate picker in the DOM** (two triggers, one hidden by CSS). → Tests target the compact one by its container class. Popover ids come from Radix `useId`, so there are no collisions.
- **[Risk] The popover overflows on 360 px screens.** → Its width is clamped to the viewport minus 2rem, and `align="end"` is kept.

## Migration Plan

No data migration: existing saved settings apply to the cards immediately. Rollback = revert.
