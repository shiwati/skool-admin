# admin-shell Specification

## Purpose

Provides the shared navigation frame around every signed-in admin page: a sidebar menu to move between admin screens and a topbar showing who is signed in, with sign-out.

## Requirements

### Requirement: Admin pages render inside the shell

Every page that requires an admin session SHALL render inside the admin shell: a left sidebar labelled "Főmenü" for assistive technology and a topbar above the page content. The login page SHALL NOT render the shell.

#### Scenario: Signed-in admin opens an admin page

- **WHEN** a signed-in admin opens `/applicants`
- **THEN** the sidebar and the topbar are shown around the page content

#### Scenario: Login page has no shell

- **WHEN** a visitor opens `/login`
- **THEN** neither the sidebar nor the topbar is shown

### Requirement: Sidebar menu items

The sidebar SHALL show the Skool logo with an "admin" badge, then a "Főmenü" group with "Áttekintés", "Jelentkezők", "Programok", "Visszajelzések", "Riportok", and an "Adatok" group with "Adatforrások", "Adatmigráció", "Változásnapló", in that order. "Áttekintés" SHALL link to `/` and "Jelentkezők" to `/applicants`.

#### Scenario: Menu order and links

- **WHEN** the sidebar is rendered
- **THEN** the items appear in the order listed, grouped under "Főmenü" and "Adatok"
- **AND** activating "Jelentkezők" navigates to `/applicants`

### Requirement: Unavailable menu items are disabled

Menu items whose screen does not exist yet SHALL be shown but disabled: they SHALL NOT navigate, SHALL be exposed to assistive technology as disabled, and SHALL be visually distinct from available items.

#### Scenario: Activating a future screen

- **WHEN** the user activates "Programok" before the programs screen exists
- **THEN** no navigation happens
- **AND** the item is announced as disabled

### Requirement: Active menu item

The menu item matching the current page SHALL be highlighted and marked as the current page for assistive technology. Sub-paths of a section SHALL keep that section active.

#### Scenario: On the applicants page

- **WHEN** the user is on `/applicants`
- **THEN** "Jelentkezők" is highlighted and marked as the current page
- **AND** no other item is marked as current

### Requirement: Topbar shows the signed-in user

The topbar SHALL show the signed-in user's name, e-mail address and an avatar (profile picture, or initials when there is none). Activating the user area SHALL open a menu containing a sign-out action.

#### Scenario: User without a profile picture

- **WHEN** the signed-in user has the name "Kovács Anna" and no picture
- **THEN** the topbar shows "Kovács Anna", their e-mail address and the initials "KA"

#### Scenario: Sign out from the topbar

- **WHEN** the user opens the user menu and activates sign-out
- **THEN** their session ends and they are shown `/login`
