# Proposal

## Why

Program tags come from a fixed list in code (four tags), so adding a tag needs a code change and a deploy. Admins should be able to add a new tag right where they tag a program, in the program form, without a separate tag management screen.

## What Changes

- The program form's "Címkék" field becomes a type-to-search field that offers the tags already used on programs (most used first) and, as its last option, "+ Új címke: „<text>”" to add the typed text as a new tag.
- **BREAKING** The fixed tag list is removed. The set of available tags is the set of tags currently used on programs; a new tag exists once a program is saved with it, and disappears when no program uses it any more.
- Tags are normalized when typed and again when saved (trimmed, inner spaces collapsed, lowercase, length-limited). A typed text whose accent- and case-insensitive form matches an existing tag offers that tag instead of creating a near-duplicate.
- `GET /api/events/tags` returns the tags in use, each with the number of programs using it.
- **BREAKING** Filtering the program list by a well-formed tag that no program uses returns no programs instead of `400`. Malformed values are still rejected.
- The four existing tags keep their colours; other tags get a stable colour derived from their name.
- Seed data accepts any well-formed tag and stores it normalized.

Out of scope: adding tags from the program page header, renaming or merging tags, and tags on applicants.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-tags`: the fixed vocabulary is replaced by tags created in the program form, with normalization and near-duplicate protection; the tag options endpoint returns tags in use with counts; unused filter tags match nothing instead of being rejected; the filter offers the tags in use.

## Impact

- UI: the program form's tag field (new and edit pages), tag colours.
- Validation: the tag schema used by the create/edit endpoints, the list query parameters and the seed.
- API: `GET /api/events/tags` response gains counts; `GET /api/events?tags=` no longer rejects unused tags.
- No database migration: tags stay a text array on the event.
