import { Request, Response } from "express";
import { prisma } from "../prisma/client";

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

// DELETE TERM
export async function deleteTerm(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    const [
      assignments,
      grades,
      attendance,
      reportCards,
      reportComments,
      discipline,
      transcripts,
      assessments,
    ] = await Promise.all([
      prisma.assignment.count({
        where: { termId: id },
      }),

      prisma.grade.count({
        where: { termId: id },
      }),

      prisma.attendanceSession.count({
        where: { termId: id },
      }),

      prisma.reportCard.count({
        where: { termId: id },
      }),

      prisma.reportComment.count({
        where: { termId: id },
      }),

      prisma.discipline.count({
        where: { termId: id },
      }),

      prisma.transcript.count({
        where: { termId: id },
      }),

      prisma.assessment.count({
        where: { termId: id },
      }),
    ]);

    const totalUsage =
      assignments +
      grades +
      attendance +
      reportCards +
      reportComments +
      discipline +
      transcripts +
      assessments;

    if (totalUsage > 0) {
      return res.status(400).json({
        message:
          "Cannot delete term because it contains academic records. Archive the term instead.",

        stats: {
          assignments,
          grades,
          attendance,
          reportCards,
          reportComments,
          discipline,
          transcripts,
          assessments,
        },
      });
    }

    await prisma.term.delete({
      where: {
        id,
      },
    });

    return res.json({
      success: true,
    });

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete term",
      error: error.message,
    });
  }
}