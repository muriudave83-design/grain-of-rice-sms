import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getOperationalStudentForUser } from "./studentOperational.service";

function clientFor(student: any, terms: any[] = []) {
  return {
    student: { findFirst: async (args: any) => {
      assert.deepEqual(args.where, { userId: 45, isArchived: false });
      return student;
    } },
    term: { findMany: async (args: any) => {
      assert.equal(args.where.classId, student.classId);
      return terms;
    } },
  } as any;
}

const newStudent = {
  id: 205,
  firstName: "JAMES",
  lastName: "mWANGI",
  admissionNo: "001",
  classId: 2,
  class: { id: 2, name: "PP1", isArchived: false },
  classEnrollments: [{ id: 9, classId: 2, classNameSnapshot: "PP1", startedAt: new Date(), status: "CURRENT", source: "ADMISSION" }],
};

test("new active Student resolves from authenticated User with Class and CURRENT history", async () => {
  const result = await getOperationalStudentForUser(clientFor(newStudent), 45);
  assert.equal(result.studentId, 205);
  assert.equal(result.class?.name, "PP1");
  assert.equal(result.currentEnrollment?.status, "CURRENT");
});

test("no Term, grades, attendance, fees, or report card produces a valid empty application state", async () => {
  const result = await getOperationalStudentForUser(clientFor(newStudent, []), 45);
  assert.deepEqual(result.terms, []);
  assert.deepEqual(result.subjects, []);
  assert.equal(result.overallAverage, null);
  assert.equal(result.overallGrade, null);
});

test("mature Student terms remain available without requiring academic rows", async () => {
  const terms = [{ id: 45, name: "Term 3", academicYear: "2026", isActive: true }];
  assert.deepEqual((await getOperationalStudentForUser(clientFor(newStudent, terms), 45)).terms, terms);
});

test("missing or archived Student/User linkage returns a controlled error", async () => {
  await assert.rejects(
    () => getOperationalStudentForUser(clientFor(null), 45),
    (error: any) => error.status === 404 && /Active Student/.test(error.message),
  );
});

test("Student endpoint is self-only and creation writes ADMISSION history transactionally", () => {
  const routes = fs.readFileSync(path.resolve(__dirname, "../routes/studentRoutes.ts"), "utf8");
  const adminUsers = fs.readFileSync(path.resolve(__dirname, "../routes/admin.users.routes.ts"), "utf8");
  const dashboard = fs.readFileSync(path.resolve(__dirname, "../../../frontend/src/pages/student/StudentDashboard.jsx"), "utf8");
  const ownership = fs.readFileSync(path.resolve(__dirname, "../middlewares/ownershipMiddleware.ts"), "utf8");
  assert.match(routes, /"\/me",\s*authenticate,\s*requireRole\(\["STUDENT"\]\)/s);
  assert.match(routes, /getOperationalStudentForUser\(prisma, req\.user!\.id\)/);
  assert.doesNotMatch(routes.slice(routes.indexOf('"/me"'), routes.indexOf("// ✅ Student transcript")), /req\.(params|query).*studentId/);
  assert.match(adminUsers, /\$transaction[\s\S]*studentClassEnrollment\.create[\s\S]*status:\s*"CURRENT"[\s\S]*source:\s*"ADMISSION"/);
  assert.match(dashboard, /api\.get\("\/students\/me"\)/);
  assert.doesNotMatch(dashboard, /report-cards\/me\?term=/);
  assert.match(ownership, /id:\s*studentId,\s*userId:\s*user\.id,\s*isArchived:\s*false/);
  assert.doesNotMatch(ownership, /user\.id === studentId/);
});
