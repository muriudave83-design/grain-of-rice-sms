# Prepared production backup and verification commands

These commands are templates for a separately approved rollout. Load the production URL without printing it and use a timestamped directory outside the repository.

```powershell
$rolloutDir = Join-Path $env:TEMP 'grain-of-rice-lineage-rollout-20260827'
New-Item -ItemType Directory -Path $rolloutDir -Force | Out-Null
$databaseUrl = ((Get-Content backend/.env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -split '=', 2)[1].Trim().Trim('"')
$pgUrl = ($databaseUrl -split '\?', 2)[0]

pg_dump "--dbname=$pgUrl" --format=custom --file="$rolloutDir\production-before-lineage-repair.dump" --verbose
pg_restore --list "$rolloutDir\production-before-lineage-repair.dump" | Set-Content "$rolloutDir\production-before-lineage-repair.list.txt"
if ($LASTEXITCODE -ne 0) { throw 'Backup catalog verification failed' }

$ledgerQuery = 'SELECT id, migration_name, checksum, started_at, finished_at, applied_steps_count, rolled_back_at, logs FROM public."_prisma_migrations" ORDER BY started_at, migration_name'
$ledgerCopy = "\copy ($ledgerQuery) TO '$($rolloutDir.Replace('\','/'))/production-ledger.csv' WITH (FORMAT CSV, HEADER TRUE, FORCE_QUOTE *)"
psql "--dbname=$pgUrl" -v ON_ERROR_STOP=1 -c $ledgerCopy
```

After the separately approved repair:

```powershell
Push-Location backend
npx prisma migrate status
npm run migrations:verify
Pop-Location

psql "--dbname=$pgUrl" -v ON_ERROR_STOP=1 -c 'SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM public."_prisma_migrations" ORDER BY started_at'
psql "--dbname=$pgUrl" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS archived_legacy_rows FROM migration_forensics.prisma_migrations_legacy_20260827'
```

Recovery uses the verified custom-format dump with `pg_restore` into a replacement database, or the provider's tested point-in-time recovery mechanism. Do not overwrite the live database until the recovery target has been validated.
