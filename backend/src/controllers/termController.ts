import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { deleteTermData, getTermDeletePreview } from "../services/termDeletion.service";
import { getStartNewTermPreview, startNewTermForActiveClasses } from "../services/startNewTerm.service";

export async function previewStartNewTerm(req: Request, res: Response) {
  try {
    return res.json(await getStartNewTermPreview(prisma, req.body));
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({
      message: error?.message ?? "Failed to preview new Term",
      ...(error?.conflicts ? { conflicts: error.conflicts } : {}),
    });
  }
}

export async function startNewTerm(req: Request, res: Response) {
  try {
    const result = await startNewTermForActiveClasses(prisma, req.body, req.body?.confirmation);
    return res.status(201).json({
      message: `${result.totalCreated} class-specific Terms created successfully`,
      created: result.created,
      skipped: result.skipped,
      totalCreated: result.totalCreated,
      totalSkipped: result.totalSkip,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "A matching Term was created concurrently. Preview again." });
    }
    return res.status(error?.status ?? 500).json({
      message: error?.message ?? "Start New Term rolled back",
      ...(error?.conflicts ? { conflicts: error.conflicts } : {}),
    });
  }
}

// GET /api/admin/terms
export async function getTerms(
  req: Request,
  res: Response
) {
  try {
    const terms = await prisma.term.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        assignments: {
          select: { id: true },
        },

        grades: {
          select: { id: true },
        },

        attendanceSessions: {
          select: { id: true },
        },

        reportCards: {
          select: { id: true },
        },

        reportComments: {
          select: { id: true },
        },

        discipline: {
          select: { id: true },
        },

        transcripts: {
          select: { id: true },
        },

        assessments: {
          select: { id: true },
        },

        class: true,
      },
    });

    const formattedTerms = terms.map((term) => {
      const usageCount =
        term.assignments.length +
        term.grades.length +
        term.attendanceSessions.length +
        term.reportCards.length +
        term.reportComments.length +
        term.discipline.length +
        term.transcripts.length +
        term.assessments.length;

      return {
        ...term,

        hasAcademicData:
          usageCount > 0,

        usageCount,

        stats: {
          assignments:
            term.assignments.length,

          grades:
            term.grades.length,

          attendance:
            term.attendanceSessions.length,

          reports:
            term.reportCards.length,

          comments:
            term.reportComments.length,

          discipline:
            term.discipline.length,

          transcripts:
            term.transcripts.length,

          assessments:
            term.assessments.length,
        },
      };
    });

    return res.json(formattedTerms);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch terms",
      error: error.message,
    });
  }
}

// POST /api/admin/terms
export async function createTerm(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      startDate,
      endDate,
      academicYear,
      classId,
    } = req.body;

    if (!name || !academicYear) {
      return res.status(400).json({
        message:
          "Name and academic year are required",
      });
    }

    const term = await prisma.term.create({
      data: {
        name,

        academicYear:
          String(academicYear),

        ...(startDate && {
          startDate: new Date(startDate),
        }),

        ...(endDate && {
          endDate: new Date(endDate),
        }),

        ...(classId && {
          classId: Number(classId),
        }),
      },
    });

    return res.status(201).json(term);

  } catch (error: any) {
    console.error(
      "CREATE TERM ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to create term",
      error: error.message,
    });
  }
}

// TOGGLE LOCK
export const toggleTermLock = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const term = await prisma.term.findUnique({
      where: { id },
    });

    if (!term) {
      return res.status(404).json({
        message: "Term not found",
      });
    }

    const updated = await prisma.term.update({
      where: { id },
      data: {
        isLocked: !term.isLocked,
      },
    });

    return res.json(updated);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message:
        "Failed to toggle term lock",
      error: error.message,
    });
  }
};

// UPDATE TERM
export async function updateTerm(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    const {
      name,
      academicYear,
      startDate,
      endDate,
      classId,
      isLocked,
    } = req.body;

    const updated = await prisma.term.update({
      where: { id },

      data: {
        ...(name !== undefined && {
          name,
        }),

        ...(academicYear !== undefined && {
          academicYear,
        }),

        ...(startDate !== undefined && {
          startDate: startDate
            ? new Date(startDate)
            : undefined,
        }),

        ...(endDate !== undefined && {
          endDate: endDate
            ? new Date(endDate)
            : undefined,
        }),

        ...(classId && {
          classId: Number(classId),
        }),

        ...(isLocked !== undefined && {
          isLocked,
        }),
      },
    });

    return res.json(updated);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update term",
      error: error.message,
    });
  }
}

export async function getTermDeletePreviewController(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid term ID" });
  try {
    return res.json(await getTermDeletePreview(prisma, id));
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({ message: error?.message ?? "Failed to preview term deletion" });
  }
}

// DELETE TERM AND ITS PROVEN TERM-OWNED DATA
export async function deleteTerm(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid term ID" });
    const preview = await deleteTermData(prisma, id, req.body?.confirmation);
    return res.json({
      success: true,
      message: `Term and ${preview.totalRelatedRecords} related records deleted successfully`,
      deleted: preview.willDelete,
    });

  } catch (error: any) {
    console.error(error);
    if (error?.status) return res.status(error.status).json({ message: error.message });
    if (error?.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete this Term because unresolved records still reference it. Term deletion rolled back.",
      });
    }
    return res.status(500).json({ message: "Term deletion rolled back" });
  }
}
