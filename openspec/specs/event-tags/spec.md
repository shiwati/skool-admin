# event-tags Specification

## Purpose

Lets staff tag programs (events) with values from a fixed, developer-maintained tag list. Staff can then filter the program list by those tags with a type-to-search multiselect.

## Requirements

### Requirement: Events carry a list of tags

Every event SHALL have a list of zero or more tags. The list SHALL be empty when no tags are given. Tags SHALL be returned with each event in `GET /api/events` responses.

#### Scenario: Event without tags

- **WHEN** an event is stored without specifying tags
- **THEN** its `tags` is an empty list, never `null`

#### Scenario: Tags returned in the event list

- **GIVEN** an event tagged `robotika` and `kezdő`
- **WHEN** an admin calls `GET /api/events`
- **THEN** that event's item contains `"tags": ["robotika", "kezdő"]`

### Requirement: Fixed tag vocabulary

The system SHALL have a single, fixed list of valid tags. Only tags from this list SHALL be stored on events. The list SHALL change only through a code change, not from the UI.

#### Scenario: Seed data uses an unknown tag

- **WHEN** the seed data gives an event a tag that is not in the fixed list
- **THEN** the seed fails validation and writes nothing

#### Scenario: Seed data uses known tags

- **WHEN** the seed data gives an event only tags from the fixed list
- **THEN** the event is stored with those tags

### Requirement: Tag options endpoint

`GET /api/events/tags` SHALL return the fixed tag list as `{ items: string[] }`, in Hungarian alphabetical order. It SHALL return every listed tag, including tags that no event uses yet. Like the other list endpoints, it SHALL require a signed-in admin and SHALL NOT be cached.

#### Scenario: Signed-in admin requests the options

- **WHEN** a signed-in admin calls `GET /api/events/tags`
- **THEN** the response is `200` with every tag from the fixed list, in Hungarian alphabetical order (`ablak`, `élmény`, `robotika`)
- **AND** it carries `Cache-Control: no-store`

#### Scenario: Unauthenticated request

- **WHEN** a request without a session calls `GET /api/events/tags`
- **THEN** the response is `401 {"error":"Unauthorized"}`

### Requirement: Filter events by tags

`GET /api/events` SHALL accept a `tags` parameter, given as repeated query parameters (`?tags=a&tags=b`). It SHALL return only events that have at least one of the given tags. It SHALL combine this with the other filters using AND. Values SHALL NOT be split on commas, and duplicate or blank values SHALL be ignored.

#### Scenario: Any one matching tag is enough

- **GIVEN** event A tagged `robotika`, event B tagged `kezdő`, and event C with no tags
- **WHEN** an admin calls `GET /api/events?tags=robotika&tags=kezdő`
- **THEN** events A and B are returned and event C is not

#### Scenario: Combined with another filter

- **WHEN** an admin calls `GET /api/events?tags=robotika&year=2026`
- **THEN** only events from 2026 that are tagged `robotika` are returned

#### Scenario: No tags parameter

- **WHEN** an admin calls `GET /api/events` without `tags`
- **THEN** events are not filtered by tag

### Requirement: Unknown filter tags are rejected

A `tags` value that is not in the fixed tag list SHALL be rejected with `400 {"error":"Invalid query parameters", details}`, and no events SHALL be queried.

#### Scenario: Unknown tag

- **WHEN** an admin calls `GET /api/events?tags=nemletezik`
- **THEN** the response is `400` with `error` set to `"Invalid query parameters"`

### Requirement: Tag multiselect filter

The program list SHALL offer a tag filter that lets the user select several tags from the fixed list. It SHALL NOT let the user create a tag that is not in the list. The selected tags SHALL be sent as the `tags` filter.

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

- **GIVEN** the fixed list contains `Élmény` and `robotika`
- **WHEN** the user types `elm`
- **THEN** only `Élmény` is offered

#### Scenario: No request while typing

- **WHEN** the user types several characters into the tag filter
- **THEN** no additional request to `GET /api/events/tags` is made

#### Scenario: Keyboard operation

- **WHEN** the user moves through the options with the arrow keys and presses Enter
- **THEN** the highlighted tag is selected or deselected, and the text input stays focused
