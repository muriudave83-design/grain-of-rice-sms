# Missing and divergent historical artifacts

## Missing from Git

- `20260413035610_add_assignment_fields` — production SHA-256 `cc9b6878350fb3336358fffaeab7f83de0fa20bd48d9dda9805389a13938c45b`
- `20260413050020_add_assignment_and_comments` — production SHA-256 `6f412d11ec21a4913caa1b871a9e57cb4bf3bb055b2f6a0b3bac394d7af87e2d`

Production and Git history establish that these April 13 migrations introduced the later assignment/comment schema, including `Assignment.termId`, but their exact SQL artifacts cannot be recovered from this repository.

## Divergent artifact

- `20260306_add_teacher_subject_table`
  - production SHA-256: `6d7bc3b5ec68726b8f15212703239a36f8b43bbbb098ca3c65e7152191bcde7d`
  - raw Git artifact details: see `historical-artifact-manifest.json`

The available artifact is retained for evidence but is not treated as an active migration.
