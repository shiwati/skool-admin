# Proposal

## Why

Lunch is ordered per program, and the answers to the application form's food question ("Van esetleg valamilyen ételérzékenységed, melyet az ebéd rendelésénél figyelembe vehetünk?") are only visible one applicant at a time on the applicant's page. Organizers need to see, per program, who has a food restriction and what it is. Applicants who withdraw also have no status of their own today, so they either stay "Elfogadva" or are marked "Elutasítva", which is wrong.

## What Changes

- **New status "Lemondta"** (`CANCELLED`) for an application the applicant withdrew. It is selectable everywhere the other statuses are (status cell, bulk status bar, Jelentkezők tab filter chips, status breakdown, capacity chart) and has its own badge colour, orange (`bg-peach`). The status badge colours are also rearranged: Új jelentkező blue (`bg-sky`, unchanged), Elfogadva mint (`bg-mint`, new brand token `--color-mint`), Várólista yellow (`bg-lemon`), Részt vett purple (`bg-lavender`), Elutasítva grey (unchanged).
- **New "Étkezési igény" card** on the program page (`/events/<id>`), under the people card, where programs are managed:
    - a table with the columns "Név" and "Étkezési igény" listing the applicants with a food need, grouped by status (Részt vett, Elfogadva, Új jelentkező; Várólista is not covered); each group starts with a row naming the status and has a vertical bar in the status colour on its left;
    - inside a group the rows are sorted by the answer, then by name, so equal needs (vegetarian, …) are next to each other and easy to count;
    - applicants whose answer is empty or "no restriction" ("nem", "nincs", "-", …) are not listed; one total at the end counts them across the three statuses ("Összesen N főnek nincs étkezési igénye.");
    - Elutasítva, Lemondta and anonymized applicants are left out.
- "Lemondta" counts as an application in the totals, like "Elutasítva", but never as accepted.

## Capabilities

### Modified Capabilities

- `applicant-list`: the "Lemondta" badge.
- `event-overview`: the food needs card, and the status breakdown, chips and status changes include "Lemondta".

## Impact

- Database: one additive migration (`ALTER TYPE application_status ADD VALUE 'cancelled'`), backward compatible with the deployed code.
- Code: status maps in `src/lib/applicants/`, the status UI in `src/components/events/overview/` and the dashboard, `funnel()` in `src/lib/dashboard/insights.ts`, a new loader (`src/lib/events/food-needs-load.ts`) and card on the program page.
- Privacy: food answers can reveal health conditions. They are shown only to signed-in admins, only on the program page, and anonymization already clears them.
