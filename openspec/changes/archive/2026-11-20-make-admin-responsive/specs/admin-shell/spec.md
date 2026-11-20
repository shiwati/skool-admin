## MODIFIED Requirements

### Requirement: Admin pages render inside the shell

Every page that requires an admin session SHALL render inside the admin shell. Its navigation SHALL be labelled "Főmenü" for assistive technology and SHALL take one of these forms by breakpoint:

- **Desktop (≥ 1280 px):** a left sidebar and a topbar above the page content.
- **Tablet (768–1279 px):** an 80 px icon rail on the left and the topbar above the content.
- **Mobile (< 768 px):** a top bar and a navigation bar fixed to the bottom of the screen. There is no sidebar.

Exactly one "Főmenü" navigation SHALL be exposed to assistive technology at any width. The login page SHALL NOT render the shell.

#### Scenario: Signed-in admin opens an admin page

- **WHEN** a signed-in admin opens `/applicants`
- **THEN** the sidebar and the topbar are shown around the page content

#### Scenario: Login page has no shell

- **WHEN** a visitor opens `/login`
- **THEN** neither the sidebar nor the topbar is shown

#### Scenario: Tablet rail

- **WHEN** a signed-in admin opens `/applicants` at 820 px
- **THEN** an 80 px rail with the Skool logo, the "admin" badge and icon items with short labels is shown instead of the full sidebar

#### Scenario: Mobile navigation

- **WHEN** a signed-in admin opens `/applicants` at 390 px
- **THEN** a top bar with the Skool logo, the "admin" badge and the user's avatar is shown
- **AND** a bottom navigation shows "Áttekintés", "Jelentkezők", "Programok", "Visszajelzések" and "Több"

## ADDED Requirements

### Requirement: Tablet rail items

The tablet rail SHALL show, in order:

- the Skool logo and the "admin" badge
- the "Főmenü" items with their icons and short labels: "Áttekintés", "Jelentkezők", "Programok", "Visszajelz.", "Riportok"
- a separator
- a single "Adatok" item

Each item's accessible name SHALL be its full label. The "Adatok" item SHALL be disabled while none of its screens exist. The active, disabled and link behaviour SHALL match the sidebar.

#### Scenario: Active item on the rail

- **WHEN** the user is on `/applicants/abc` at 820 px
- **THEN** the "Jelentkezők" rail item is highlighted and marked as the current page

### Requirement: Mobile bottom navigation

The mobile bottom navigation SHALL be fixed to the bottom of the viewport. It SHALL hold five equally wide items, each at least 44 px high, with an icon and a label:

- "Áttekintés"
- "Jelentkezők"
- "Programok"
- "Visszajelz." (accessible name "Visszajelzések")
- "Több"

The active section SHALL be highlighted and marked as the current page. "Visszajelzések" SHALL be disabled while its screen does not exist.

#### Scenario: Navigating from the bottom bar

- **WHEN** the user activates "Programok" in the bottom navigation
- **THEN** `/events` opens and "Programok" is marked as the current page

### Requirement: More sheet

Activating "Több" SHALL open a sheet, announced as a dialog titled "Több". It SHALL list the remaining menu items:

- "Riportok"
- "Adatforrások"
- "Adatmigráció"
- "Változásnapló"

These SHALL behave as in the sidebar, so items without a screen are disabled. The sheet SHALL close with its close button, the Escape key, or after navigating.

#### Scenario: Opening the more sheet

- **WHEN** the user activates "Több" at 390 px
- **THEN** a dialog titled "Több" lists "Riportok", "Adatforrások", "Adatmigráció" and "Változásnapló", each announced as disabled

### Requirement: Mobile top bar

The mobile top bar SHALL be 56 px high (plus the top safe area), on the sidebar's sky-blue background, and SHALL stay fixed to the top of the screen while the page scrolls; the bottom navigation likewise stays fixed to the bottom. It SHALL show:

- the Skool logo
- the "admin" badge
- the signed-in user's avatar, which opens the same user menu as the desktop topbar, including sign-out

The user's name and e-mail address SHALL be shown inside the menu instead of in the bar.

#### Scenario: Signing out on a phone

- **WHEN** the user taps the avatar in the mobile top bar and chooses sign-out
- **THEN** their session ends and `/login` is shown
