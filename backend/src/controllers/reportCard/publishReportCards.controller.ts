import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { ReportCardStatus } from "@prisma/client";

/**
 * POST /report-cards/publish
 * Body: { termId: number; classId: number }
 *
 * Rules:
 * - ADMIN only
 * - Only GENERATED report cards may be published
 * - All report cards must be complete (no missing subject entries)
 * - Operation is atomic
 */
export async function publishReportCards(req: Request, res: Response) {
  try {
    const { termId, classId } = req.body ?? {};

    if (!termId || !classId) {
      return res.status(400).json({
        message: "termId and classId are required",
      });
    }

    // Validate term
    const term = await prisma.term.findUnique({
      where: { id: Number(termId) },
    });

    if (!term) {
      return res.status(400).json({ message: "Invalid termId" });
    }

    // Validate class
    const classroom = await prisma.class.findUnique({
      where: { id: Number(classId) },
    });

    if (!classroom) {
      return res.status(400).json({ message: "Invalid classId" });
    }

    // Fetch all GENERATED report cards for this class + term
    const reportCards = await prisma.reportCard.findMany({
      where: {
        termId: Number(termId),
        classId: Number(classId),
        status: ReportCardStatus.GENERATED,
      },
      include: {
        subjects: true, // ✅ FIX: include relation
      },
    });

    if (reportCards.length === 0) {
      return res.status(400).json({
        message: "No GENERATED report cards found to publish",
      });
    }

    // Validate completeness
    const incomplete: Array<{ studentId: number; reason: string }> = [];

    for (const rc of reportCards) {
      // ✅ FIX: subjects is guaranteed because of include, but keep safety check
      if (!rc.subjects || rc.subjects.length === 0) {
        incomplete.push({
          studentId: rc.studentId,
          reason: "No subject entries",
        });
        continue;
      }

      // ✅ FIX: typed param (no implicit any)
      const hasMissing = rc.subjects.some(
        (s: { total: number }) => Number.isNaN(s.total)
      );

      if (hasMissing) {
        incomplete.push({
          studentId: rc.studentId,
          reason: "Missing or invalid subject scores",
        });
      }
    }

    if (incomplete.length > 0) {
      return res.status(422).json({
        message: "Some report cards are incomplete and cannot be published",
        details: incomplete,
      });
    }

    // Publish atomically
    const result = await prisma.$transaction(async (tx) => {
      const update = await tx.reportCard.updateMany({
        where: {
          termId: Number(termId),
          classId: Number(classId),
          status: ReportCardStatus.GENERATED,
        },
        data: {
          status: ReportCardStatus.PUBLISHED,
          publishedAt: new Date(), // ✅ GOOD PRACTICE (optional but recommended)
        },
      });

      return update.count;
    });

    return res.status(200).json({
      message: "Report cards published successfully",
      termId: Number(termId),
      classId: Number(classId),
      publishedCount: result,
    });
  } catch (error) {
    console.error("publishReportCards error:", error);

    return res.status(500).json({
      message: "Failed to publish report cards",
      error: (error as Error).message,
    });
  }
}