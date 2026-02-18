📘 PHASE 6 — REPORT CARD PDF TEMPLATE STRUCTURE

This template defines layout, sections, placeholders, and rendering structure that the backend PDF engine (likely pdfkit or similar) will use.

The structure is designed so the backend can fill it using Prisma data from:

ReportCard

ReportCardSubjectEntry

Student

Classroom

User

Term

============================
⭐ 1. PDF PAGE LAYOUT (A4)
============================
Paper Size: A4
Margins: 30px left/right, 40px top, 40px bottom
Font: System sans-serif (Helvetica or equivalent)
Structure: Single page (expandable to multiple pages)
============================
⭐ 2. PDF HEADER SECTION
============================
Placement:

Top 80px area

Elements:

School Logo (Left-aligned)

Placeholder: {{ SCHOOL_LOGO_URL }}

School Details (Centered)

SCHOOL NAME

Address

Phone

Website

Placeholder object:

{{ SCHOOL_INFO }}


Report Title (Center)

“OFFICIAL REPORT CARD”

Bold, 18–22px

Horizontal Divider Line

============================
⭐ 3. STUDENT INFO BLOCK
============================
Placement:

Below header, left-aligned

Fields:
Student Name:       {{ student.fullName }}
Student ID:         {{ student.id }}
Class:              {{ class.name }}
Term:               {{ term.name }}
Academic Year:      {{ academicYear }}
Status:             {{ reportCard.status }}   (Draft / Published)

Layout:

Two-column grid or simple stacked items.

============================
⭐ 4. SUBJECT SCORES TABLE
============================
Placement:

Centered, full width.

Table Columns:

Subject Name

Continuous Assessment Score

Exam Score

Final Score

Grade (A/B/C/D/E)

Data Source:

From:

reportCard.ReportCardSubjectEntry[]

Example Row Mapping:
subject.name
continuousAssessmentScore
examScore
finalScore
grade

Table Styling:

Header row background: light gray

Borders: thin lines

Font: 10–12px

============================
⭐ 5. TOTAL / AVERAGE / POSITION SECTION
============================
Placement:

Below subjects table

Fields:
Total Score:      {{ reportCard.totalScore }}
Average:          {{ reportCard.average }}
Class Position:   {{ reportCard.gradePosition }}

Style:

Bold labels

Optional small summary box

============================
⭐ 6. TEACHER & ADMIN COMMENTS
============================
Placement:

Below summary section

Comments Block:
Teacher Comments:
{{ reportCard.comments.teacher }}

Admin Comments:
{{ reportCard.comments.admin }}


If only one role has comments — display that one.

If no comments:

No comments provided.

Style:

Multi-line text

Gray bordered box

============================
⭐ 7. SIGNATURE SECTION
============================
Placement:

Bottom of page

Elements:

Teacher Signature Placeholder

Admin Signature Placeholder

Notes (Optional)

Structure:
___________________________     ___________________________
Teacher Signature              Admin Signature

============================
⭐ 8. FOOTER
============================
Content:

“This report card is system-generated and valid without a stamp.”

System timestamp: {{ generatedAt }}

Placement:

Centered bottom

============================
⭐ 9. BACKEND PDF GENERATION DATA MODEL
============================

These are the data objects the PDF generator expects:

Student Object
{
  id,
  fullName,
  gender,
  dateOfBirth,
}

Class Object
{
  id,
  name
}

Term Object
{
  id,
  name,
  startDate,
  endDate
}

ReportCard Object
{
  id,
  totalScore,
  average,
  gradePosition,
  status,
  comments: {
    teacher,
    admin
  }
}

Subject Entries
[
  {
    subject: { name },
    continuousAssessmentScore,
    examScore,
    finalScore,
    grade
  }
]

============================
⭐ 10. FILES THAT WILL BE CREATED (LATER IN CODING STEP)
============================
Backend PDF generator:
backend/src/services/pdf/reportCardPdf.service.ts

Controller binding:
backend/src/controllers/reportCard.controller.ts

Route:
GET /report-cards/:id/pdf

Frontend download button included in:

Admin → ReportCardPreview.jsx

Teacher → TeacherReportCardView.jsx

Parent → ReportCardView.jsx

Student → ReportCardView.jsx