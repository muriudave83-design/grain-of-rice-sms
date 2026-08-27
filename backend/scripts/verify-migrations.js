const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");

const prismaDir = path.resolve(__dirname, "..", "prisma");
const migrationsDir = path.join(prismaDir, "migrations");
const manifestPath = path.join(prismaDir, "migration-checksums.json");
const lockPath = path.join(migrationsDir, "migration_lock.toml");

function fail(message) {
  console.error(`Migration verification failed: ${message}`);
  process.exitCode = 1;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.algorithm !== "sha256" || !manifest.migrations) {
  throw new Error("Unsupported or malformed migration checksum manifest");
}

const lock = fs.readFileSync(lockPath, "utf8");
if (!/^provider\s*=\s*"postgresql"\s*$/m.test(lock)) {
  fail("migration_lock.toml must declare provider = \"postgresql\"");
}

const migrationNames = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const acceptedNames = Object.keys(manifest.migrations).sort();

for (const name of migrationNames) {
  const sqlPath = path.join(migrationsDir, name, "migration.sql");
  if (!fs.existsSync(sqlPath)) {
    fail(`${name} has no migration.sql`);
    continue;
  }

  const bytes = fs.readFileSync(sqlPath);
  if (bytes.includes(0)) fail(`${name}/migration.sql contains NULL bytes`);
  if (
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff) ||
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
  ) {
    fail(`${name}/migration.sql contains a byte-order mark`);
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${name}/migration.sql is not valid UTF-8`);
  }

  const expected = manifest.migrations[name];
  if (!expected) {
    fail(`${name} is not present in migration-checksums.json`);
    continue;
  }
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected.toLowerCase()) {
    fail(`${name}/migration.sql checksum changed (expected ${expected}, got ${actual})`);
  }
}

for (const name of acceptedNames) {
  if (!migrationNames.includes(name)) fail(`accepted migration directory is missing: ${name}`);
}

if (!process.exitCode) {
  console.log(`Verified ${migrationNames.length} immutable PostgreSQL migrations.`);
}
