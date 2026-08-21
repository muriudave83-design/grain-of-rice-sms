import { Prisma, PrismaClient } from "@prisma/client";

type StartTermClient = Prisma.TransactionClient | PrismaClient;

export const SCHOOL_TERM_NAMES = ["Term 1", "Term 2", "Term 3"] as const;

export type StartNewTermInput = {
  name: unknown;
  academicYear: unknown;
  startDate: unknown;
  endDate: unknown;
};

function parseDate(value: unknown, field: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw { status: 400, message: `${field} must use YYYY-MM-DD format` };
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw { status: 400, message: `${field} is invalid` };
  }
  return date;
}

export function validateStartNewTermInput(input: StartNewTermInput) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const academicYear = typeof input.academicYear === "string" ? input.academicYear.trim() : "";
  if (!SCHOOL_TERM_NAMES.includes(name as (typeof SCHOOL_TERM_NAMES)[number])) {
    throw { status: 400, message: "Term name must be Term 1, Term 2 or Term 3" };
  }
  if (!/^\d{4}(?:\/\d{4})?$/.test(academicYear)) {
    throw { status: 400, message: "Academic year must be YYYY or YYYY/YYYY" };
  }
  const startDate = parseDate(input.startDate, "Start date");
  const endDate = parseDate(input.endDate, "End date");
  if (startDate >= endDate) {
    throw { status: 400, message: "Start date must be before end date" };
  }
  return { name, academicYear, startDate, endDate };
}

export function startNewTermConfirmation(name: string) {
  return `START ${name.toUpperCase()}`;
}

function sameDate(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function overlaps(start: Date, end: Date, existingStart: Date, existingEnd: Date) {
  return start <= existingEnd && end >= existingStart;
}

export async function getStartNewTermPreview(client: StartTermClient, input: StartNewTermInput) {
  const proposal = validateStartNewTermInput(input);
  const classes = await client.class.findMany({
    select: {
      id: true,
      name: true,
      isArchived: true,
      terms: { select: { id: true, name: true, academicYear: true, startDate: true, endDate: true, isLocked: true } },
    },
    orderBy: { name: "asc" },
  });
  const activeClasses = classes.filter((schoolClass) => !schoolClass.isArchived);
  if (activeClasses.length === 0) throw { status: 400, message: "No active classes are available" };

  const willCreate: Array<{ classId: number; className: string }> = [];
  const skipped: Array<{ classId: number; className: string; termId: number }> = [];
  const conflicts: Array<{ classId: number; className: string; reason: string; existingTermId: number }> = [];

  for (const schoolClass of activeClasses) {
    const matching = schoolClass.terms.find(
      (term) => term.name === proposal.name && term.academicYear === proposal.academicYear,
    );
    if (matching) {
      if (sameDate(matching.startDate, proposal.startDate) && sameDate(matching.endDate, proposal.endDate)) {
        skipped.push({ classId: schoolClass.id, className: schoolClass.name, termId: matching.id });
      } else {
        conflicts.push({
          classId: schoolClass.id,
          className: schoolClass.name,
          existingTermId: matching.id,
          reason: `${proposal.name} ${proposal.academicYear} already exists with different dates`,
        });
      }
      continue;
    }

    const overlapping = schoolClass.terms.find((term) =>
      overlaps(proposal.startDate, proposal.endDate, term.startDate, term.endDate),
    );
    if (overlapping) {
      conflicts.push({
        classId: schoolClass.id,
        className: schoolClass.name,
        existingTermId: overlapping.id,
        reason: `Overlaps ${overlapping.name} ${overlapping.academicYear}`,
      });
      continue;
    }
    willCreate.push({ classId: schoolClass.id, className: schoolClass.name });
  }

  return {
    proposal,
    confirmation: startNewTermConfirmation(proposal.name),
    activeClasses: activeClasses.map(({ id, name }) => ({ classId: id, className: name })),
    willCreate,
    skipped,
    conflicts,
    archivedClassesExcluded: classes.filter((schoolClass) => schoolClass.isArchived)
      .map(({ id, name }) => ({ classId: id, className: name })),
    totalCreate: willCreate.length,
    totalSkip: skipped.length,
    totalConflicts: conflicts.length,
  };
}

export async function startNewTermForActiveClasses(
  prisma: PrismaClient,
  input: StartNewTermInput,
  confirmation: unknown,
) {
  return prisma.$transaction(async (tx) => {
    const preview = await getStartNewTermPreview(tx, input);
    if (confirmation !== preview.confirmation) {
      throw { status: 400, message: `Type ${preview.confirmation} to confirm` };
    }
    if (preview.conflicts.length > 0) {
      throw { status: 409, message: "Resolve all Term date conflicts before starting the new Term", conflicts: preview.conflicts };
    }

    const created = [];
    for (const schoolClass of preview.willCreate) {
      const term = await tx.term.create({
        data: {
          name: preview.proposal.name,
          academicYear: preview.proposal.academicYear,
          startDate: preview.proposal.startDate,
          endDate: preview.proposal.endDate,
          classId: schoolClass.classId,
          isActive: true,
          isLocked: false,
        },
        select: { id: true, classId: true },
      });
      created.push({ ...schoolClass, termId: term.id });
    }
    return { ...preview, created, totalCreated: created.length };
  });
}
