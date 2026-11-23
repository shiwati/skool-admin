# Design

## "No restriction" detection

The food field is free text, so the card decides per answer whether it is "no restriction". The answer is trimmed, lowercased and accent-folded, and punctuation and spaces at the ends are removed. It counts as "no restriction" when it is empty, made only of dashes or punctuation, or equal to one of a short fixed list: `nem`, `nincs`, `nincsen`, `semmi`, `nem van`, `nincs ilyen`, `nincs semmi`, `nem vagyok erzekeny`, `nincs megkotes`, `nincs allergiam`, `nincs erzekenysegem`, `nem, nincs`, `n/a`, `na`, `none`, `no`. Anything else is shown as a restriction.

The rule is deliberately an exact list, not "starts with nem/nincs": a missed "no" only shows an extra line, but swallowing "nem eszik húst" into the count would hide a real restriction.

## Who is covered

Only applications with status Részt vett, Elfogadva or Új jelentkező (Várólista is left out), of applicants that are not anonymized (`deletedAt: null`). Anonymized applicants have no answer, so counting them as "no restriction" would be false; this is a list of people, not a statistic, so the usual `deletedAt` rule for person lists applies. An applicant with two applications to the program is shown once, with the answer of the application whose status ranks first (Részt vett → Elfogadva → Új jelentkező).

## Loading and layout

The program page (`/events/[id]`) loads the card's data with `getFoodNeeds(eventId)` (`src/lib/events/food-needs-load.ts`): one query of the program's applications in the three covered statuses with the answer and the applicant's id, names and `deletedAt`. The pure `foodNeeds` in `src/lib/events/food-needs.ts` builds the groups, the sorting and the totals. The card (`src/components/events/overview/food-needs-card.tsx`) is a `DetailCard` in the main column under the people card; the listed names link to the applicant's page.

The card is a real table: each status group is a `<tbody>` named after the status, starting with a row that names the status. The status-coloured bar is an absolutely positioned strip at the left edge of the first cell of every applicant row, so the applicant rows of a group form one continuous bar. The status name row has no bar and is flush with the card's left edge instead of indented, so it reads as a heading that interrupts the bar, not as a list item.

## Sorting

Within a group rows are sorted by the answer folded to lowercase without accents or punctuation, then by name (Hungarian collation). "Laktózmentes" and "laktozmentes" therefore land together, which is what makes counting the vegetarians and the like easy.

## Colour

Final assignment: Új jelentkező blue (`bg-sky`), Elfogadva mint (`bg-mint`, a new token `#b5e3d8`), Várólista yellow (`bg-lemon`), Részt vett purple (`bg-lavender`), Lemondta orange (`bg-peach`), Elutasítva grey (`bg-surface-subtle`). Every status has its own hue; the badge text stays dark. Mint is cool and light like the others and clearly apart from sage (green, used for program colours and the alumni tag) and sky (blue).

## Migration

`ALTER TYPE "application_status" ADD VALUE 'cancelled'` is additive: the old code never reads or writes the value, so it is safe to run before the new deployment is promoted.
