# Spec Delta

## ADDED Requirements

### Requirement: Program name links to the program page

The "Program" cell SHALL show the program name and its tags as badges. The name SHALL link to the program's own page (`/events/<id>`).

#### Scenario: Opening a program's page

- **WHEN** the admin activates the name "Python alapok – tél"
- **THEN** `/events/<id>` opens for that program

## REMOVED Requirements

### Requirement: Program cell

**Reason**: The program name now links to the program's own page instead of the filtered applicants list. Its old scenario, "Opening a program's applicants", is no longer true, and a MODIFIED block cannot drop it.

**Migration**: Replaced by "Program name links to the program page". The filtered applicants list is still reachable from the row actions ("Jelentkezők megtekintése").
