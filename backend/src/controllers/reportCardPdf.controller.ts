import { Request, Response } from "express";
import { generateReportCardPdf } from "../services/pdf/reportCardPdf.service";
import { prisma } from "../prisma/client";
import { Role } from "@prisma/client";

/**
 * GET /api/report-cards/:id/pdf
 */
export async function getReportCardPdf(
  req: Request,
  res: Response
) {
  const reportCardId = Number(req.params.id);

  if (Number.isNaN(reportCardId)) {
    return res.status(400).json({ message: "Invalid report card id" });
  }

  try {
    const reportCard = await prisma.reportCard.findUnique({
      where: { id: reportCardId },
      select: { studentId: true, classId: true },
    });
    if (!reportCard) {
      return res.status(404).json({ message: "Report card not found" });
    }

    const user = req.user!;
    let allowed = user.role === Role.ADMIN;

    if (user.role === Role.TEACHER) {
      allowed = Boolean(await prisma.teacherSubject.findFirst({
        where: { teacherId: user.id, classId: reportCard.classId, isActive: true },
        select: { id: true },
      }));
    } else if (user.role === Role.STUDENT) {
      allowed = Boolean(await prisma.student.findFirst({
        where: { id: reportCard.studentId, userId: user.id },
        select: { id: true },
      }));
    } else if (user.role === Role.PARENT) {
      allowed = Boolean(await prisma.parentStudent.findFirst({
        where: {
          studentId: reportCard.studentId,
          parent: { userId: user.id },
        },
        select: { id: true },
      }));
    }

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed to view this report card" });
    }

    const pdfBuffer = await generateReportCardPdf(reportCardId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="report-card-${reportCardId}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (error: any) {
    // Phase-8 policy: keep errors simple and safe
    if (error.message === "Report card not found") {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === "Report card is not published") {
      return res.status(403).json({ message: error.message });
    }

    console.error("PDF generation error:", error);
    return res.status(500).json({ message: "Failed to generate report card PDF" });
  }
}
