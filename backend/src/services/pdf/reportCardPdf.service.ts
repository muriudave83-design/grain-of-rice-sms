import PDFDocument from "pdfkit";
import { prisma } from "../../prisma/client";
import { ReportCardStatus } from "@prisma/client";

/**
 * Phase-8 v1.1 â€” Report Card PDF Generator
 * Schema-aligned to PHASE 7 (LOCKED)
 * School: Grain of Rice Academy
 */
export async function generateReportCardPdf(
  reportCardId: number
): Promise<Buffer> {
  // 1ï¸âƒ£ Fetch report card with VALID relations
  const reportCard = await prisma.reportCard.findUnique({
    where: { id: reportCardId },
    include: {
      student: true,
      class: true,
      term: true,
      subjects: {
        include: {
          subject: true,
        },
        orderBy: {
          subject: { name: "asc" },
        },
      },
    },
  });

  if (!reportCard) {
    throw new Error("Report card not found");
  }

  if (reportCard.status !== ReportCardStatus.PUBLISHED) {
    throw new Error("Report card is not published");
  }

  // 2ï¸âƒ£ Create PDF document
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // 3ï¸âƒ£ HEADER
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Grain of Rice Academy", { align: "center" });

  doc.moveDown(0.5);

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("REPORT CARD", { align: "center" });

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Academic Year: ${reportCard.term.academicYear}  |  Term: ${reportCard.term.name} of 3`,
      { align: "center" }
    );

  doc.moveDown(1);

  // 4ï¸âƒ£ STUDENT METADATA (2 columns)
  const startY = doc.y;
  const studentName = `${reportCard.student.firstName} ${reportCard.student.lastName}`;

  doc.fontSize(10).font("Helvetica-Bold").text("Student Name:", 50, startY);
  doc.font("Helvetica").text(studentName, 140, startY);

  doc.font("Helvetica-Bold").text("Admission No:", 50, startY + 15);
  doc
    .font("Helvetica")
    .text(reportCard.student.admissionNo, 140, startY + 15);

  doc.font("Helvetica-Bold").text("Class:", 50, startY + 30);
  doc.font("Helvetica").text(reportCard.class.name, 140, startY + 30);

  doc.font("Helvetica-Bold").text("Date Generated:", 320, startY);
  doc
    .font("Helvetica")
    .text(new Date().toLocaleDateString(), 430, startY);

  doc.font("Helvetica-Bold").text("Term:", 320, startY + 15);
  doc.font("Helvetica").text(reportCard.term.name, 430, startY + 15);

  doc.font("Helvetica-Bold").text("Academic Year:", 320, startY + 30);
  doc
    .font("Helvetica")
    .text(reportCard.term.academicYear, 430, startY + 30);

  doc.moveDown(3);

  // 5ï¸âƒ£ PERFORMANCE TABLE (Phase-7 correct)
  const tableTop = doc.y;
  const columnX = {
    subject: 50,
    total: 260,
    average: 340,
  };

  doc.font("Helvetica-Bold");
  doc.text("Subject", columnX.subject, tableTop);
  doc.text("Total", columnX.total, tableTop);
  doc.text("Average", columnX.average, tableTop);

  doc.moveDown(0.5);
  doc.font("Helvetica");

  let rowY = tableTop + 20;

  for (const entry of reportCard.subjects) {
    if (rowY > 750) {
      doc.addPage();
      rowY = 50;
    }

    doc.text(entry.subject.name, columnX.subject, rowY);
    doc.text(entry.total.toFixed(1), columnX.total, rowY);
    doc.text(entry.average.toFixed(1), columnX.average, rowY);

    rowY += 18;
  }

  doc.moveDown(2);

  // 6ï¸âƒ£ SUMMARY (schema fields only)
  doc.font("Helvetica-Bold").text("Summary");
  doc.moveDown(0.5);
  doc.font("Helvetica");

  doc.text(`Term Total Marks: ${reportCard.total.toFixed(1)}`);
  doc.text(`Term Average: ${reportCard.average.toFixed(1)}`);

  doc.moveDown(2);

  // 7ï¸âƒ£ FOOTER
  doc
    .fontSize(8)
    .text(
      "This report is system-generated and valid without signature.",
      { align: "center" }
    );

  // 8ï¸âƒ£ Finalize
  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
