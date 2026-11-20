# responsive-layout Specification

## Purpose

Makes the admin interface usable on desktop, tablet and phone: shared breakpoint ranges, no horizontal page scroll, touch-friendly controls, and responsive page frames, floating bars, login page, dashboard and forms.

## Requirements

### Requirement: Breakpoint ranges

The admin interface SHALL use three layout ranges by viewport width:

- **mobile:** below 768 px
- **tablet:** from 768 px to 1279 px
- **desktop:** 1280 px and wider

The desktop layout SHALL match the existing 1440 px designs. The tablet and mobile layouts SHALL follow the 820 px and 390 px designs where they exist.

#### Scenario: Width decides the layout

- **WHEN** an admin page is shown at 820 px, then at 390 px, then at 1440 px wide
- **THEN** the tablet layout, then the mobile layout, then the desktop layout is used

#### Scenario: Range boundaries

- **WHEN** an admin page is shown at 767 px, 768 px, 1279 px and 1280 px wide
- **THEN** the mobile, tablet, tablet and desktop layouts are used respectively

#### Scenario: Small laptop

- **WHEN** the applicant detail page is shown at 1024 px
- **THEN** the tablet rail is shown and the detail cards are in a single column

### Requirement: No horizontal page scroll

From 360 px width upward, no page SHALL scroll horizontally as a whole. Content wider than the viewport, such as data tables or tab rows, SHALL scroll inside its own container.

#### Scenario: Wide table on a tablet

- **WHEN** the programs list is shown at 820 px
- **THEN** the page itself does not scroll sideways, and the table can be scrolled horizontally within its frame

### Requirement: Touch-friendly controls on mobile

On mobile, the primary interactive controls SHALL have a touch target of at least 44 × 44 px. This covers navigation items, icon buttons, search fields, filter buttons and list rows or cards.

#### Scenario: Filter button size

- **WHEN** the applicants page is shown at 390 px
- **THEN** the "Szűrők" button is at least 44 px high and wide

### Requirement: Page frame spacing

The page content frame SHALL use:

- **desktop:** 32 px horizontal padding
- **tablet:** 24 px horizontal padding
- **mobile:** 16 px horizontal padding

On mobile, the bottom padding SHALL leave room for the bottom navigation and any floating action. Page headers SHALL place their actions below the title when they do not fit beside it.

#### Scenario: Header actions wrap

- **WHEN** the dashboard header with its period and program controls is shown at 390 px
- **THEN** the controls appear below the title and nothing overflows the viewport

### Requirement: Floating bars follow the content area

Floating bars SHALL stay within the content area at every breakpoint, without overlapping the navigation:

- the applicants bulk-action bar
- the applicant edit save bar

They SHALL be offset by the full sidebar on desktop and by the rail on tablet. On mobile they SHALL span the full screen width and be attached directly to the top of the bottom navigation, without a gap.

#### Scenario: Save bar on a phone

- **WHEN** the user changes a field on the applicant edit page at 390 px
- **THEN** the save bar is fully visible above the bottom navigation and its buttons can be reached

### Requirement: Responsive login page

From 1280 px, the login page SHALL keep the side-by-side layout. Below 1280 px it SHALL stack:

- the sky-blue brand band (logo with "admin" badge, "SKOOL Menedzsment" title, tagline) at the top
- the sign-in card below it, centred

On mobile, the title SHALL be 32 px, the module chips SHALL be hidden, the card SHALL fill the width minus 16 px margins, and the footer note SHALL be centred.

#### Scenario: Login on a phone

- **WHEN** `/login` is opened at 390 px
- **THEN** the brand band is above the sign-in card, the Google sign-in button spans the card width, and nothing scrolls sideways

### Requirement: Responsive dashboard

The dashboard SHALL arrange as follows:

- **KPI cards:**
    - desktop: one row of three
    - tablet: three columns
    - mobile: two columns, with the satisfaction card spanning the full width
- **Capacity and trend charts:** side by side from 1280 px, stacked below.
- **Header controls** (period, program, actions): on mobile they SHALL be a horizontally scrollable row below the title.

#### Scenario: KPI cards on a phone

- **WHEN** the dashboard is shown at 390 px
- **THEN** "Összes jelentkező" and "Átlagos túljelentkezés" share a row and the satisfaction card spans the full width below them

### Requirement: Responsive forms

The applicant edit form and the program create/edit form SHALL behave as follows:

- **Field grid:** one column on mobile, two columns from 768 px.
- **Side cards and section navigation:** shown beside the form only from 1280 px. Below that they SHALL appear below the form (side cards) or be hidden (the program form's section navigation).
- **Mobile buttons:** form action buttons SHALL span the available width.

#### Scenario: Applicant edit form on a phone

- **WHEN** the applicant edit page is shown at 390 px
- **THEN** every field takes the full width, and the "Mit naplózunk?" and "Automatikus mezők" cards follow the form
