import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const currentAuthorizationFiles = [
  "controllers/teacher.controller.ts",
  "controllers/teacherAssignmentController.ts",
  "controllers/assessmentController.ts",
  "controllers/attendance.controller.ts",
  "controllers/attendance/getAttendanceSession.controller.ts",
  "controllers/attendance/markAttendance.controller.ts",
  "controllers/gradebookController.ts",
  "controllers/gradebookGrid.controller.ts",
  "controllers/reportCardPdf.controller.ts",
  "middlewares/teacherAssignmentGuard.ts",
  "middlewares/ownershipMiddleware.ts",
  "routes/assessmentRoutes.ts",
  "routes/assessmentScores.routes.ts",
  "routes/gradebookRoutes.ts",
  "routes/reportCardReadRoutes.ts",
  "routes/reportCardRoutes.ts",
  "routes/studentRoutes.ts",
  "routes/teacher.routes.ts",
  "routes/teacherAssignments.routes.ts",
  "services/assignmentDeletion.service.ts",
  "services/attendance/attendanceSession.service.ts",
  "services/teacherDiscipline.service.ts",
];

test("current TeacherSubject authorization paths explicitly require active assignments", () => {
  for (const file of currentAuthorizationFiles) {
    const source = read(file);
    assert.match(source, /isActive\s*:\s*true/, `${file} has no active-assignment predicate`);
  }
});

test("class-level access uses any active subject and subject writes retain subject identity", () => {
  assert.match(read("controllers/teacher.controller.ts"), /where:\s*\{\s*classId[^}]*teacherId[^}]*isActive:\s*true/);
  assert.match(read("middlewares/teacherAssignmentGuard.ts"), /teacherId:[\s\S]*classId,[\s\S]*subjectId,[\s\S]*isActive:\s*true/);
});

test("old assignment mutation checks active TeacherSubject ownership", () => {
  const source = read("controllers/teacher.controller.ts") + read("services/assignmentDeletion.service.ts");
  assert.match(source, /teacherSubject:\s*\{[\s\S]*teacherId:[\s\S]*isActive:\s*true/);
});

test("Admin lifecycle routes are Admin-only and normal UI has no physical delete call", () => {
  const routes = read("routes/admin/admin.teacherSubjects.routes.ts");
  assert.match(routes, /teacher-subjects\/:id\/deactivate[\s\S]*requireRole\(\["ADMIN"\]\)/);
  assert.match(routes, /teacher-subjects\/:id\/reactivate[\s\S]*requireRole\(\["ADMIN"\]\)/);
  const ui = fs.readFileSync(path.resolve(root, "../../frontend/src/pages/admin/AdminTeacherSubjectAssignments.jsx"), "utf8");
  assert.doesNotMatch(ui, /apiClient\.delete/);
  assert.match(ui, /Historical assignments, scores, comments and reports will remain unchanged/);
});

test("Admin assignment POST reactivates an inactive exact match and permits replacement teachers", () => {
  const source = read("routes/admin/admin.teacherSubjects.routes.ts");
  assert.match(source, /where:\s*\{ teacherId, subjectId, classId \}/);
  assert.match(source, /if \(existing\)[\s\S]*data:\s*\{ isActive:\s*true \}/);
  assert.doesNotMatch(source, /classId_subjectId_isActive|one.active|single.active/i);
});

test("historical report resolution deliberately retains inactive TeacherSubjects", () => {
  const source = read("controllers/reports.controller.ts");
  assert.match(source, /teacherSubject\.findMany\(\{[\s\S]*classId:\s*student\.classId[\s\S]*include:\s*\{[\s\S]*subject:\s*true/);
});

test("Admin subject options come only from active ClassSubject structure, not TeacherSubject history", () => {
  const source = read("routes/admin/admin.classSubjects.routes.ts");
  assert.match(source, /classSubject\.findMany/);
  assert.match(source, /where:\s*\{ classId, subject:\s*\{ isArchived:\s*false \} \}/);
  assert.doesNotMatch(source, /teacherSubject\.find/);
  assert.match(source, /requireRole\(\[Role\.ADMIN\]\)/);
});

test("subject-first assignment class lookup is Admin-only and excludes archived classes", () => {
  const source = read("routes/admin/admin.classSubjects.routes.ts");
  const subjectRoute = source.indexOf('"/class-subjects/by-subject/:subjectId"');
  const classRoute = source.indexOf('"/class-subjects/:classId"');
  assert.ok(subjectRoute >= 0 && subjectRoute < classRoute, "specific by-subject route must precede dynamic class route");
  assert.match(source.slice(subjectRoute, classRoute), /requireRole\(\[Role\.ADMIN\]\)/);
  assert.match(source.slice(subjectRoute, classRoute), /class:\s*\{ isArchived:\s*false \}/);
  assert.doesNotMatch(read("routes/admin/admin.subjects.routes.ts"), /subjects\/:id\/assign-teacher/);
});
