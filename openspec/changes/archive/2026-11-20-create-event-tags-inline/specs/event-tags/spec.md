# Spec Delta

## ADDED Requirements

### Requirement: Tags created in the program form

The "Címkék" field of the program form (new and edit) SHALL be a type-to-search field. It SHALL offer the tags currently used on programs, most used first, narrowed as the user types (case- and accent-insensitive). When the typed text is not an existing tag, the last option SHALL be "+ Új címke: „<text>”", which adds the normalized text as a tag. The tag is stored when the program is saved.

#### Scenario: Picking an existing tag

- **GIVEN** `programozás` is used on 3 programs
- **WHEN** the admin types `prog` in the "Címkék" field and presses Enter on `programozás`
- **THEN** `programozás` is added to the program's tags

#### Scenario: Adding a new tag

- **WHEN** the admin types `3D nyomtatás` and selects "+ Új címke: „3d nyomtatás”"
- **AND** saves the program
- **THEN** the program is stored with the tag `3d nyomtatás`
- **AND** `3d nyomtatás` is offered in the field and in the tag filter from then on

#### Scenario: Tag no longer used

- **GIVEN** `3d nyomtatás` is used only on one program
- **WHEN** the admin removes it from that program and saves
- **THEN** `3d nyomtatás` is no longer offered anywhere

### Requirement: Tag normalization

A tag SHALL be normalized by trimming it, collapsing inner whitespace to one space and lowercasing it with Hungarian rules. A normalized tag SHALL be 1 to 30 characters long and SHALL NOT contain a comma. Normalization SHALL happen in the form and again on the server for every stored tag, including seed data; a program's tags SHALL contain no duplicates after normalization. An invalid tag SHALL be rejected with a field error.

#### Scenario: Saved through the API

- **WHEN** a program is saved with the tags `"  Robotika "` and `"robotika"`
- **THEN** it is stored with the single tag `robotika`

#### Scenario: Too long

- **WHEN** a program is saved with a 31-character tag
- **THEN** the request is rejected with a field error on "Címkék" and nothing is stored

### Requirement: Near-duplicate protection

When the typed text matches an existing tag after ignoring case and accents, the field SHALL offer the existing tag and SHALL NOT offer "+ Új címke" for that text.

#### Scenario: Missing accent

- **GIVEN** `programozás` is used on a program
- **WHEN** the admin types `Programozas`
- **THEN** `programozás` is offered and no "+ Új címke" option is shown

### Requirement: Tag colours

The tags `robotika`, `programozás`, `kezdő` and `haladó` SHALL keep their current colours. Every other tag SHALL get a colour from the tag palette chosen from its name, so the same tag always has the same colour on every page.

#### Scenario: Stable colour of a new tag

- **WHEN** the tag `3d nyomtatás` is shown on the program list and on the program page
- **THEN** it has the same colour in both places

## MODIFIED Requirements

### Requirement: Tag options endpoint

`GET /api/events/tags` SHALL return the tags currently used on at least one program as `{ items: { name: string, count: number }[] }`, where `count` is the number of programs using the tag, ordered by `count` descending and then in Hungarian alphabetical order. Like the other list endpoints, it SHALL require a signed-in admin and SHALL NOT be cached.

#### Scenario: Signed-in admin requests the options

- **GIVEN** `robotika` is used on 2 programs and `élmény` and `ablak` on 1 program each
- **WHEN** a signed-in admin calls `GET /api/events/tags`
- **THEN** the response is `200` with the items `robotika` (2), `ablak` (1), `élmény` (1), in this order
- **AND** it carries `Cache-Control: no-store`

#### Scenario: Unauthenticated request

- **WHEN** a request without a session calls `GET /api/events/tags`
- **THEN** the response is `401 {"error":"Unauthorized"}`

### Requirement: Unknown filter tags are rejected

A `tags` filter value that is not a valid normalized tag (empty after normalization, longer than 30 characters, or containing a comma) SHALL be rejected with `400 {"error":"Invalid query parameters", details}`, and no events SHALL be queried. A valid tag that no program uses SHALL simply match no programs.

#### Scenario: Unknown tag

- **WHEN** an admin calls `GET /api/events?tags=nemletezik` and no program is tagged `nemletezik`
- **THEN** the response is `200` with no items

#### Scenario: Malformed tag

- **WHEN** an admin calls `GET /api/events?tags=` followed by a 31-character value
- **THEN** the response is `400` with `error` set to `"Invalid query parameters"`

### Requirement: Tag multiselect filter

The program list SHALL offer a tag filter that lets the user select several of the tags currently used on programs. It SHALL NOT let the user create a tag; new tags are only created in the program form. The selected tags SHALL be sent as the `tags` filter.

#### Scenario: Selecting tags filters the list

- **WHEN** the user selects `robotika` and `kezdő` in the tag filter
- **THEN** the program list is requested with `tags=robotika&tags=kezdő`
- **AND** the filter shows the selected tags as its active value

#### Scenario: Clearing the filter

- **WHEN** the user clears the tag filter
- **THEN** the program list is requested without `tags`

#### Scenario: No way to add a new tag

- **WHEN** the user types a text that matches no tag in the list
- **THEN** a "Nincs találat" message is shown
- **AND** no option to create that text as a tag is offered

### Requirement: Type-to-search in the tag filter

As the user types in the tag filter, the options SHALL be narrowed in the browser, without a request per keystroke. Matching SHALL be case-insensitive, SHALL ignore accents, and SHALL match anywhere in the tag.

#### Scenario: Case- and accent-insensitive match

- **GIVEN** the tags in use are `élmény` and `robotika`
- **WHEN** the user types `ELM`
- **THEN** only `élmény` is offered

#### Scenario: No request while typing

- **WHEN** the user types several characters into the tag filter
- **THEN** no additional request to `GET /api/events/tags` is made

#### Scenario: Keyboard operation

- **WHEN** the user moves through the options with the arrow keys and presses Enter
- **THEN** the highlighted tag is selected or deselected, and the text input stays focused

## REMOVED Requirements

### Requirement: Fixed tag vocabulary

**Reason**: Tags are now created in the program form; the available tags are the tags in use.
**Migration**: Existing tags stay on their programs unchanged. Seed data with any well-formed tag is accepted and stored normalized (see "Tag normalization").
