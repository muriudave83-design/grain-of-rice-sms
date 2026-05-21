import PDFDocument from "pdfkit";
import { prisma } from "../../prisma/client";
import { ReportCardStatus } from "@prisma/client";

/**
 * Phase-8 v1.1 — Report Card PDF Generator
 * Schema-aligned to PHASE 7 (LOCKED)
 * School: Grain of Rice Academy
 */
export async function generateReportCardPdf(
  reportCardId: number
): Promise<Buffer> {
  // 1️⃣ Fetch report card with VALID relations
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

  // 2️⃣ ATTENDANCE (REAL DB LOGIC FIX)
  const attendanceRecords = await prisma.attendanceEntry.findMany({
    where: {
      studentId: reportCard.student.id,
    },
  });

  console.log("REPORT STUDENT ID:", reportCard.student.id);
  console.log("ATTENDANCE MATCHES:", attendanceRecords.length);

  const allAttendance = await prisma.attendanceEntry.findMany({
    take: 5,
  });

  console.log(
    "SAMPLE ATTENDANCE STUDENT IDS:",
    allAttendance.map(a => a.studentId)
  );

  const present = attendanceRecords.filter(a => a.status === "PRESENT").length;
  const absent = attendanceRecords.filter(a => a.status === "ABSENT").length;
  const late = attendanceRecords.filter(a => a.status === "LATE").length;

  const total = attendanceRecords.length || 1;

  const attendance = {
    present,
    absent,
    late,
    percentage: Math.round((present / total) * 100),
  };

  // 3️⃣ Create PDF document
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // =========================
  // 4️⃣ HEADER (IMPROVED)
  // =========================
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("GRAIN OF RICE ACADEMY", { align: "center" });

  doc.moveDown(0.3);

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("OFFICIAL REPORT CARD", { align: "center" });

  doc.moveDown(0.3);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Academic Year: ${reportCard.term.academicYear}    |    Term: ${reportCard.term.name}`,
      { align: "center" }
    );

  doc.moveDown(1);

  // =========================
  // 5️⃣ STUDENT INFO (GRID)
  // =========================
  const startY = doc.y;

  doc.fontSize(10).font("Helvetica-Bold");

  doc.text("Student Name:", 50, startY);
  doc.text("Admission No:", 50, startY + 15);
  doc.text("Class:", 50, startY + 30);

  doc.text("Term:", 320, startY);
  doc.text("Academic Year:", 320, startY + 15);
  doc.text("Date:", 320, startY + 30);

  doc.font("Helvetica");

  doc.text(
    `${reportCard.student.firstName} ${reportCard.student.lastName}`,
    140,
    startY
  );
  doc.text(reportCard.student.admissionNo, 140, startY + 15);
  doc.text(reportCard.class.name, 140, startY + 30);

  doc.text(reportCard.term.name, 430, startY);
  doc.text(reportCard.term.academicYear, 430, startY + 15);
  doc.text(new Date().toLocaleDateString(), 430, startY + 30);

  doc.moveDown(3);

  // =========================
  // 6️⃣ PERFORMANCE TABLE
  // =========================
  const tableTop = doc.y;

  const col = {
    subject: 50,
    total: 300,
    average: 420,
  };

  doc.font("Helvetica-Bold");
  doc.text("SUBJECT", col.subject, tableTop);
  doc.text("TOTAL", col.total, tableTop);
  doc.text("AVERAGE", col.average, tableTop);

  doc.moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .stroke();

  doc.font("Helvetica");

  let rowY = tableTop + 25;

  for (const entry of reportCard.subjects) {
    if (rowY > 750) {
      doc.addPage();
      rowY = 50;
    }

    doc.text(entry.subject.name, col.subject, rowY);
    doc.text(entry.total.toFixed(1), col.total, rowY);
    doc.text(entry.average.toFixed(1), col.average, rowY);

    rowY += 20;
  }

  doc.moveDown(2);

  // =========================
  // 7️⃣ SUMMARY
  // =========================
  doc.font("Helvetica-Bold").text("Summary");
  doc.moveDown(0.5);
  doc.font("Helvetica");

  doc.text(`Term Total Marks: ${reportCard.total.toFixed(1)}`);
  doc.text(`Term Average: ${reportCard.average.toFixed(1)}`);

  // =========================
  // 8️⃣ ATTENDANCE (FORCED NEW PAGE FIX)
  // =========================

  doc.addPage();

  doc.font("Helvetica-Bold")
     .fontSize(11)
     .text("ATTENDANCE", 50, 100);

  doc.font("Helvetica")
     .fontSize(10)
     .text(`Present: ${attendance.present}`, 50, 130)
     .text(`Absent: ${attendance.absent}`, 50, 145)
     .text(`Late: ${attendance.late}`, 50, 160)
     .text(`Attendance Rate: ${attendance.percentage}%`, 50, 175);

  // =========================
  // 9️⃣ FOOTER (PROFESSIONAL)
  // =========================
  doc
    .fontSize(8)
    .font("Helvetica")
    .text(
      "This is an official academic document generated by Grain of Rice Academy MIS. No signature required.",
      { align: "center" }
    );

  // 🔟 FINALIZE
  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}