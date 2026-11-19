# Spec Delta

## MODIFIED Requirements

### Requirement: Sidebar menu items

The sidebar SHALL show the Skool logo with an "admin" badge, then a "Főmenü" group with "Áttekintés", "Jelentkezők", "Programok", "Visszajelzések", "Riportok", and an "Adatok" group with "Adatforrások", "Adatmigráció", "Változásnapló", in that order. "Áttekintés" SHALL link to `/`, "Jelentkezők" to `/applicants` and "Programok" to `/events`.

#### Scenario: Menu order and links

- **WHEN** the sidebar is rendered
- **THEN** the items appear in the order listed, grouped under "Főmenü" and "Adatok"
- **AND** activating "Jelentkezők" navigates to `/applicants`
- **AND** activating "Programok" navigates to `/events`

### Requirement: Unavailable menu items are disabled

Menu items whose screen does not exist yet SHALL be shown but disabled: they SHALL NOT navigate, SHALL be exposed to assistive technology as disabled, and SHALL be visually distinct from available items.

#### Scenario: Activating a future screen

- **WHEN** the user activates "Visszajelzések" before the feedback screen exists
- **THEN** no navigation happens
- **AND** the item is announced as disabled
