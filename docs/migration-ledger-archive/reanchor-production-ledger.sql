-- REVIEWED PREPARATION ONLY. Do not run without separate production approval.
-- Preconditions:
--   1. A verified backup and exact ledger CSV export exist.
--   2. prisma migrate resolve --applied 20260827000000_canonical_current_schema
--      has succeeded against the intended database.
--   3. Production still has exactly the 32 legacy rows listed below plus one
--      successful canonical marker.

BEGIN;

CREATE SCHEMA migration_forensics;

CREATE TABLE migration_forensics.prisma_migrations_legacy_20260827
(LIKE public."_prisma_migrations" INCLUDING ALL);

COMMENT ON TABLE migration_forensics.prisma_migrations_legacy_20260827 IS
'Immutable forensic copy of the 32 pre-canonical Prisma ledger rows archived during the 2026-08-27 lineage re-anchor.';

DO $reanchor$
DECLARE
  expected_names text[] := ARRAY[
    '00000000000000_init',
    '20251109171039_init',
    '20251111025243_add_roles_to_user',
    '20251114002524_full_schema_setup',
    '20251116051529_expand_schema_phase4',
    '20251119155233_phase5_grading_models',
    '20251121224622_add_unique_constraints',
    '20251226120540_add_audit_log_model',
    '20260101085512_make_auditlog_metadata_optional',
    '20260103114421_add_must_change_password',
    '20260119054652_class_subject',
    '20260127071348_link_student_to_class',
    '20260129043355_student_class_relation',
    '20260130012541_add_grade_model',
    '20260202055323_add_report_cards',
    '20260203064102_add_parent_student_relation',
    '20260214233539_add_assignment_categories',
    '20260216090240_add_term_relation_to_assessment',
    '20260306_add_teacher_subject_table',
    '20260316081241_add_homework_due_date',
    '20260316090354_add_assessment_type_enum',
    '20260324113652_add_is_archived_to_student',
    '20260324232549_add_class_archive',
    '20260406235522_add_parent_details',
    '20260409080530_add_userid_to_parent',
    '20260410021114_add_assignment_score',
    '20260410110711_add_assignment_weight',
    '20260413035610_add_assignment_fields',
    '20260413050020_add_assignment_and_comments',
    '20260810000000_add_attendance_period',
    '20260822000000_add_teacher_subject_lifecycle',
    '20260823000000_add_student_class_enrollment_phase_1'
  ];
  actual_names text[];
  affected integer;
  expected_checksum_fingerprint constant text := '895747e32a85d504c28cff448a775ad8';
BEGIN
  SELECT array_agg(name ORDER BY name)
  INTO expected_names
  FROM unnest(expected_names) AS name;

  SELECT array_agg(migration_name ORDER BY migration_name)
  INTO actual_names
  FROM public."_prisma_migrations"
  WHERE migration_name <> '20260827000000_canonical_current_schema';

  IF actual_names IS DISTINCT FROM expected_names THEN
    RAISE EXCEPTION 'Legacy migration-name set differs from the approved 32-row ledger export';
  END IF;

  IF (SELECT md5(string_agg(migration_name || ':' || checksum, E'\n' ORDER BY migration_name))
      FROM public."_prisma_migrations"
      WHERE migration_name = ANY(expected_names)) <> expected_checksum_fingerprint THEN
    RAISE EXCEPTION 'Legacy migration checksums differ from the approved ledger export';
  END IF;

  IF (SELECT count(*) FROM public."_prisma_migrations") <> 33 THEN
    RAISE EXCEPTION 'Expected exactly 33 active rows before re-anchor cleanup';
  END IF;

  IF (SELECT count(*) FROM public."_prisma_migrations"
      WHERE migration_name = '20260827000000_canonical_current_schema'
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one successful canonical baseline marker';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE migration_name = ANY(expected_names)
      AND (finished_at IS NULL OR rolled_back_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'A legacy migration is incomplete or rolled back';
  END IF;

  INSERT INTO migration_forensics.prisma_migrations_legacy_20260827
  SELECT * FROM public."_prisma_migrations"
  WHERE migration_name = ANY(expected_names);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 32 THEN
    RAISE EXCEPTION 'Archived % rows; expected 32', affected;
  END IF;

  IF (SELECT count(*) FROM migration_forensics.prisma_migrations_legacy_20260827) <> 32 THEN
    RAISE EXCEPTION 'Forensic archive verification failed';
  END IF;

  IF EXISTS (
    (SELECT * FROM public."_prisma_migrations" WHERE migration_name = ANY(expected_names)
     EXCEPT
     SELECT * FROM migration_forensics.prisma_migrations_legacy_20260827)
    UNION ALL
    (SELECT * FROM migration_forensics.prisma_migrations_legacy_20260827
     EXCEPT
     SELECT * FROM public."_prisma_migrations" WHERE migration_name = ANY(expected_names))
  ) THEN
    RAISE EXCEPTION 'Forensic archive rows or checksums do not exactly match the active legacy rows';
  END IF;

  DELETE FROM public."_prisma_migrations"
  WHERE migration_name = ANY(expected_names);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 32 THEN
    RAISE EXCEPTION 'Deleted % active legacy rows; expected 32', affected;
  END IF;

  IF (SELECT count(*) FROM public."_prisma_migrations") <> 1 OR
     (SELECT count(*) FROM public."_prisma_migrations"
      WHERE migration_name = '20260827000000_canonical_current_schema') <> 1 THEN
    RAISE EXCEPTION 'Canonical marker was not preserved as the sole active row';
  END IF;
END
$reanchor$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON migration_forensics.prisma_migrations_legacy_20260827
FROM PUBLIC;

COMMIT;

-- Read-only verification after COMMIT:
-- SELECT count(*) FROM migration_forensics.prisma_migrations_legacy_20260827; -- 32
-- SELECT migration_name, checksum FROM public."_prisma_migrations";            -- canonical marker only
