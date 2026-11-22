# text-search Specification

## Purpose

Defines how the admin lists match text the user types into a search field or a text filter chip: case and accents are ignored, so names and places are found however they are typed.

## Requirements

### Requirement: Text filters ignore case and accents

Every free-text list filter SHALL match regardless of letter case and accents, in both directions: typed text without accents SHALL find stored text with accents, and typed text with accents SHALL find stored text without them. Apart from that, each filter SHALL keep its own matching rule (every word, or the whole phrase).

#### Scenario: Typed without accents

- **GIVEN** an applicant "Kovács Anna"
- **WHEN** the admin searches the Jelentkezők list for "kovacs"
- **THEN** "Kovács Anna" is listed

#### Scenario: Typed with accents

- **GIVEN** an applicant stored as "Kovacs Bela"
- **WHEN** the admin searches the Jelentkezők list for "Kovács Béla"
- **THEN** "Kovacs Bela" is listed

#### Scenario: Other letters still have to match

- **GIVEN** applicants "Kovács Anna" and "Kocsis Anna"
- **WHEN** the admin searches the Jelentkezők list for "kovacs"
- **THEN** only "Kovács Anna" is listed

### Requirement: Filters that ignore accents

The accent rule SHALL apply to these filters:

- **Jelentkezők:** the search (first name, last name, e-mail) and the "Település" chip
- **A program's Jelentkezők tab:** the `q` parameter of `GET /api/events/<id>/applicants`
- **Programok:** the search (name) and the "Helyszín / partner", "Cég" and "Oktató" chips
- **Visszajelzések:** the search over free-text answers

The same parameters on the list endpoints, and the e-mail lists and CSV exports built from them, SHALL follow the same rule.

#### Scenario: Place chip

- **GIVEN** an applicant from "Pécs"
- **WHEN** the admin filters "Település" by "pecs"
- **THEN** the applicant is listed

#### Scenario: Program chips

- **GIVEN** a program at "Győr" with the instructor "Kiss Péter" and the partner "Példa Kft."
- **WHEN** the admin filters "Helyszín / partner" by "gyor", "Oktató" by "peter" or "Cég" by "pelda"
- **THEN** the program is listed each time

#### Scenario: Feedback search

- **GIVEN** a feedback answer "Nagyon élveztem a tábort"
- **WHEN** the admin searches the Visszajelzések for "elveztem a tabort"
- **THEN** the response is listed

#### Scenario: Export follows the search

- **GIVEN** the Jelentkezők list is searched for "kovacs" and shows "Kovács Anna"
- **WHEN** the admin exports the list to CSV
- **THEN** the file contains "Kovács Anna"

### Requirement: New and changed records are searchable at once

A record SHALL be findable without accents as soon as it is created or changed, by any path: the sheet import, editing, merging, anonymization, the seed, or a direct database change.

#### Scenario: Edited name

- **GIVEN** an applicant renamed from "Kis Ádám" to "Nagy Ádám"
- **WHEN** the admin searches for "nagy adam"
- **THEN** the applicant is listed, and a search for "kis adam" no longer finds them

#### Scenario: Anonymized applicant

- **WHEN** an applicant "Kovács Anna" is anonymized
- **THEN** a search for "kovacs" no longer finds the record
