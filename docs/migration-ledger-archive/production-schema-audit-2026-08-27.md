# Read-only production schema audit — 2026-08-27

The production database was accessed read-only. No migration, DDL, DML, `migrate resolve`, or `db push` operation was executed.

## Comparison target

The target was the canonical Prisma schema immediately before `20260827030000_add_combined_teaching_groups`. It excluded all seven combined-teaching-group models and included these approved alignments:

- `Student.classId` relation: `onDelete: Restrict`
- `AttendanceEntry.period`: `@default(LEGACY)`

## Method and result

Prisma 6.19.1 compared the production datasource to the canonical pre-combined datamodel using `prisma migrate diff --from-url ... --to-schema-datamodel ... --script`. The generated result was `-- This is an empty migration.`

This comparison covered Prisma-managed tables, columns, PostgreSQL types, defaults, nullability, primary and unique constraints, foreign keys and their update/delete actions, indexes, enums, and sequences. A separate read-only catalog count found 30 sequences in the production `public` schema. A schema-only `pg_dump` was also used to construct the exact local rehearsal database.

## Classification

- **EXPECTED:** The two previously known production-vs-Prisma differences above; both were incorporated into the canonical target.
- **BENIGN:** None remaining.
- **DANGEROUS:** None remaining after making `Student.classId` delete behavior explicit.
- **MUST FIX BEFORE BASELINE:** None.

Result: zero unexplained semantic differences between production and the approved canonical pre-combined schema.
