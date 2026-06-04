> Agent context — not for human reading.

# Project WIKI

## Tech Stack Notes

*(Added per phase)*

## From Global WIKI — spec-writing

**Design-agnostic plan.md pays off:** Writing plan.md without hex values, Tailwind classes, or pixel sizes — and keeping the design file as the single visual source of truth — prevents silent drift between the spec and the design. Phase 2 SDD project confirmed: no visual specifics in plan.md, zero hex drift at review time.

**Validate external schema columns in spec:** When requirements.md names a column from an external schema (database, API field), verify the column actually exists before spec approval. In a prior project, a "grouped by region" promise survived through spec, frontend, backend, and all tests — and only failed when a human used the app. Lesson: if the spec names a field from an existing data source, read the schema and paste the actual field list into the data model section of requirements.md.
