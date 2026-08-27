# Prisma migration lineage archive

This directory preserves the migration history that existed before the canonical lineage was prepared on 2026-08-27. These files are forensic records only. They are **not active Prisma migrations** and must never be copied back into `backend/prisma/migrations` as a replay chain.

Production recorded 32 successful, non-rolled-back migrations: 28 historical migrations, the later `00000000000000_init` marker, and three August 2026 forward migrations. Commit `6ab13c5267054f1d787c866c3d7ccf70688c6690` deleted the then-existing historical migration directories and introduced a consolidated baseline. The resulting repository order could not reproduce the order recorded in production.

## Evidence preserved

- `production-ledger-2026-08-27.csv`: exact read-only export of all production `_prisma_migrations` columns required for rehearsal.
- `historical-artifact-manifest.json`: Git blob identifiers and SHA-256 comparisons against production.
- `recovered/`: 25 raw Git blobs whose SHA-256 values exactly match production.
- `divergent/20260306_add_teacher_subject_table/`: the available Git artifact; its checked-out byte representation differs from the production checksum evidence.
- `missing-artifacts.md`: the two April 13 migration files that are not present in Git.
- `legacy-active-migrations/`: byte-for-byte copies of the defective baseline and the three post-baseline migrations removed from the active Prisma path.
- `legacy-active-checksums.json`: hashes and byte sizes for those archived active files.
- `reanchor-production-ledger.sql`: reviewed, fail-closed ledger re-anchoring transaction. It is documentation, not a Prisma migration.
- `production-backup-and-verification.md`: commands prepared for a separately approved production rollout.

## Baseline defect

The archived `00000000000000_init/migration.sql` is UTF-16LE and contains embedded NULL bytes. Its repository SHA-256 is recorded in `legacy-active-checksums.json`; production records a different checksum, `425e4b47e1a8f36bdd2a83a57c40e4c6d5b074edfc05d85c9a3bed1aa23755ae`. Production applied its baseline row after the 28 historical migrations as a zero-step marker, while lexical replay would place the baseline first. Editing or restoring these artifacts cannot produce a trustworthy replayable chain.

## Canonical boundary

The active lineage starts at `20260827000000_canonical_current_schema`, representing the verified production-equivalent schema immediately before combined teaching groups. `20260827030000_add_combined_teaching_groups` remains the first real forward migration.
