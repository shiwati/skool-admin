## Purpose

Gives developers realistic data in their local database (sample, optional real local data, and generated dashboard demo data) while making it impossible for the seed to touch a non-local or production database.

## ADDED Requirements

### Requirement: Seed runs only against a local database

The seed SHALL refuse to run, before reading data or writing anything, when `NODE_ENV` is `production`, when `DATABASE_URL` is not a valid URL, or when its host is not `localhost`, `127.0.0.1` or `::1` (case-insensitive). The seed SHALL NOT be part of migration deploy, build or CI.

#### Scenario: Production environment

- **WHEN** the seed runs with `NODE_ENV=production` and a localhost `DATABASE_URL`
- **THEN** it fails with "Seed refused: NODE_ENV is production" and writes nothing

#### Scenario: Remote database host

- **WHEN** the seed runs with `DATABASE_URL` pointing at `db.example.com`
- **THEN** it fails naming the non-local host and writes nothing

#### Scenario: Invalid URL

- **WHEN** `DATABASE_URL` is empty or not a URL
- **THEN** the seed refuses to run

### Requirement: Seed data source selection and validation

The seed SHALL load `prisma/seed-data/local.json` when it exists (git-ignored, may hold real data), otherwise the committed fictitious `prisma/seed-data/sample.json`. The data (`events`, `applicants`, `applications` with explicit ids) SHALL be validated, including cross-references, before any write; invalid data SHALL abort with a non-zero exit and a log listing validation errors and the file name.

#### Scenario: Local file present

- **WHEN** `local.json` exists
- **THEN** it is loaded instead of `sample.json`

#### Scenario: Application references an unknown event

- **WHEN** the data file contains an application whose event id is not defined
- **THEN** the seed exits non-zero without writing anything

### Requirement: Seeding is idempotent upsert, with an explicit reset mode

A normal seed run (`npm run db:seed`) SHALL upsert records by id inside one transaction, so repeated runs restore seeded rows to the file's state without duplicating them, and SHALL recompute duplicate flags using the same name + e-mail key as the sheet import. Reset mode (`npm run db:seed:reset`) SHALL first delete all feedback, applications, applicants and events, then load the data.

#### Scenario: Repeated seed

- **WHEN** `db:seed` runs twice
- **THEN** each seeded record exists once, with the values from the file

#### Scenario: Reset

- **WHEN** `db:seed:reset` runs
- **THEN** previously existing events, applicants, applications and feedback not in the data are gone

### Requirement: Generated dashboard demo data

The seed SHALL add deterministic, fictitious demo data (ids prefixed `demo_`, dates relative to the run time, plus demo feedback) whenever it loads `sample.json`, and alongside `local.json` only when run with `--demo` (`npm run db:seed:demo`). Demo feedback SHALL replace previous `demo_feedback_` rows. Feedback SHALL never be generated for events from `local.json`.

#### Scenario: Real local data stays clean

- **WHEN** `local.json` exists and `db:seed` runs without `--demo`
- **THEN** no `demo_` records and no generated feedback are written

#### Scenario: Demo on request

- **WHEN** `local.json` exists and `db:seed:demo` runs
- **THEN** the demo events, applicants, applications and feedback are loaded next to the local data
