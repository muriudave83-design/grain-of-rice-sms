import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import StudentLayout from "@/layouts/StudentLayout";

// =======================
// ADMIN PAGES
// =======================
import Dashboard from "../pages/admin/AdminDashboardPage";
import Teachers from "../pages/admin/Teachers";
import Classes from "../pages/admin/Classes";
import Grades from "../pages/admin/Grades";
import Exams from "../pages/admin/Exams";
import Fees from "../pages/admin/Fees";
import Payments from "../pages/admin/Payments";

// ✅ NEW: FINANCIAL / DISCIPLINE MODULES
import Sponsorship from "../pages/admin/Sponsorship";
import Discipline from "../pages/admin/Discipline";
import AdminStudentProfile from "../pages/admin/AdminStudentProfile";

import UsersPage from "../pages/admin/UsersPage";
import AdminStudents from "../pages/admin/AdminStudents";
import AdminClassStudents from "../pages/admin/AdminClassStudents";
import AdminTeachers from "../pages/admin/AdminTeachers";
import AdminSubjects from "../pages/admin/AdminSubjects";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminTeacherSubjectAssignments from "../pages/admin/AdminTeacherSubjectAssignments";
import AdminClassSubjects from "../pages/admin/AdminClassSubjects";
import AdminAttendanceOverview from "../pages/admin/attendance/AdminAttendanceOverview";
import AdminAttendanceClass from "../pages/admin/attendance/AdminAttendanceClass";
import AdminAuditLogs from "../pages/admin/audit/AdminAuditLogs";
import AttendanceAnalytics from "../pages/admin/AttendanceAnalytics";
import AdminArchived from "../pages/admin/AdminArchived";
import EditStudent from "../pages/admin/EditStudent";
import AttendancePage from "../pages/admin/AttendancePage";
import AdminReportsPage from "../pages/admin/AdminReportsPage";
import AttendanceReport from "../pages/admin/AttendanceReport";


// ✅ NEW: PARENTS PAGES
import ParentsPage from "../pages/admin/ParentsPage";
import CreateParentPage from "../pages/admin/CreateParentPage";
import EditParentPage from "../pages/admin/EditParentPage";

// =======================
// TEACHER PAGES
// =======================
import Reports from "../pages/teacher/Reports";
import TeacherAssessments from "../pages/teacher/assessments";
import CreateAssessment from "../pages/teacher/assessments/CreateAssessment";
import ScoresEntry from "../pages/teacher/assessments/ScoresEntry";
import AssessmentReview from "../pages/teacher/assessments/AssessmentReview";
import EditAssessmentRedirect from "../pages/teacher/assessments/Edit";
import Gradebook from "../pages/teacher/gradebook/Gradebook";
import TeacherGradebook from "../pages/teacher/TeacherGradebook";
import TeacherAttendanceClass from "../pages/teacher/attendance/TeacherAttendanceClass";
import TeacherAttendanceSession from "../pages/teacher/attendance/TeacherAttendanceSession";
import CreateHomework from "../pages/teacher/homework/CreateHomework";
import ClassReportCards from "../pages/teacher/report-cards/ClassReportCards";
import TeacherClasses from "../pages/teacher/TeacherClasses";
import TeacherClassDetails from "../pages/teacher/TeacherClassDetails";
import TeacherStudentDetails from "../pages/teacher/TeacherStudentDetails";
import TeacherAttendance from "../pages/teacher/attendance/TeacherAttendance";
import GradebookPage from "../pages/teacher/GradebookPage";
import GradebookDetail from "../pages/teacher/GradebookDetail";
import FinalGrades from "../pages/teacher/FinalGrades";

// =======================
// PARENT PAGES
// =======================
import ParentDashboard from "@/pages/parent/ParentDashboard";
import ParentReportCards from "../pages/parent/report-cards/ParentReportCards";
import ParentReportCardView from "../pages/parent/report-cards/ParentReportCardView";
import ParentAttendanceSummary from "../pages/parent/attendance/ParentAttendanceSummary";

// =======================
// STUDENT PAGES
// =======================
import StudentReportCardsList from "../pages/student/StudentReportCardsList";
import StudentReportCardView from "../pages/student/StudentReportCardView";
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentProfile from "@/pages/student/StudentProfile";

// =======================
// SHARED
// =======================
import Notifications from "../pages/notifications/Notifications";

// =======================
// AUTH
// =======================
import LoginPage from "../pages/Login";
import ChangePassword from "../pages/ChangePassword";


// ======================================
// PUBLIC ROUTE (PREVENT LOGIN IF LOGGED)
// ======================================
function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return children;
  }

  try {
    const user = JSON.parse(userStr);

    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = payload.exp * 1000 < Date.now();

    if (isExpired) {
      console.warn("⛔ Token expired — clearing session");

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      return children;
    }

    if (user.role === "ADMIN") return <Navigate to="/dashboard/admin" replace />;
    if (user.role === "TEACHER") return <Navigate to="/teacher" replace />;
    if (user.role === "PARENT") return <Navigate to="/parent" replace />;
    if (user.role === "STUDENT") return <Navigate to="/student" replace />;

  } catch (err) {
    console.warn("⚠️ Corrupt auth data — clearing");

    localStorage.clear();
    return children;
  }

  return children;
}

export default function AppRoutes() {
  (function enforceSessionValidity() {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.warn("⛔ Token expired → clearing");

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
      }
    } catch (err) {
      console.warn("⚠️ Token parse failed — NOT clearing storage");
    }
  })();

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/teacher/gradebook" element={<div>TEST PAGE</div>} />

        {/* ROOT */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* CHANGE PASSWORD */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>


      {/* ======================= */}
      {/* ADMIN */}
      {/* ======================= */}

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route element={<AdminLayout />}>

          <Route path="/admin" element={<Navigate to="/dashboard/admin" replace />} />

          <Route path="/dashboard/admin" element={<Dashboard />} />

          <Route path="/dashboard/admin/students" element={<AdminStudents />} />
          {/* 🔥 STUDENT PROFILE */}
          <Route path="/dashboard/admin/students/:id" element={<AdminStudentProfile />} />
          <Route path="/dashboard/admin/teachers" element={<AdminTeachers />} />

          {/* ✅ PARENTS */}
          <Route path="/dashboard/admin/parents" element={<ParentsPage />} />
          <Route path="/dashboard/admin/parents/new" element={<CreateParentPage />} />
          <Route path="/dashboard/admin/parents/:id" element={<EditParentPage />} />

          <Route path="/dashboard/admin/classes" element={<Classes />} />

          <Route
            path="/dashboard/admin/classes/:classId/students"
            element={<AdminClassStudents />}
          />

          <Route path="/dashboard/admin/grades" element={<Grades />} />
          <Route path="/dashboard/admin/exams" element={<Exams />} />

          {/* ✅ FINANCIAL */}
          <Route path="/dashboard/admin/fees" element={<Fees />} />
          <Route path="/dashboard/admin/payments" element={<Payments />} />

          {/* ✅ NEW: SPONSORSHIP */}
          <Route path="/dashboard/admin/sponsorship" element={<Sponsorship />} />

          {/* ✅ NEW: DISCIPLINE */}
          <Route path="/dashboard/admin/discipline" element={<Discipline />} />

          <Route path="/dashboard/admin/users" element={<UsersPage />} />
          <Route path="/dashboard/admin/subjects" element={<AdminSubjects />} />
          <Route path="/dashboard/admin/categories" element={<AdminCategories />} />

          <Route
            path="/dashboard/admin/teacher-subjects"
            element={<AdminTeacherSubjectAssignments />}
          />

          <Route
            path="/dashboard/admin/class-subjects"
            element={<AdminClassSubjects />}
          />

          <Route 
            path="/dashboard/admin/attendance" 
            element={<AttendancePage />} 
          />

          <Route
            path="/dashboard/admin/attendance-analytics"
            element={<AttendanceAnalytics />}
          />

          <Route
            path="/dashboard/admin/attendance/:classId"
            element={<AdminAttendanceClass />}
          />

          <Route
            path="/dashboard/admin/audit-logs"
            element={<AdminAuditLogs />}
          />

          <Route
            path="/dashboard/admin/archived"
            element={<AdminArchived />}
          />

          <Route
            path="/dashboard/admin/students/:id/edit"
            element={<EditStudent />}
          />

          {/* ✅ REPORTS */}
          <Route
            path="/dashboard/admin/reports"
            element={<AdminReportsPage />}
          />

          <Route
            path="/dashboard/admin/attendance-reports"
            element={<AttendanceReport />}
          />

          <Route
            path="/dashboard/admin/reports/:studentId"
            element={<StudentReportCardView />}
          />

        </Route>
      </Route>

      {/* ======================= */}
      {/* TEACHER */}
      {/* ======================= */}

      <Route element={<ProtectedRoute allowedRoles={["TEACHER"]} />}>
        <Route path="/teacher" element={<TeacherLayout />}>

          {/* default /teacher */}
          <Route index element={<Navigate to="classes" replace />} />

          {/* CLASSES */}
          <Route path="classes" element={<TeacherClasses />} />
          <Route path="class/:id" element={<TeacherClassDetails />} />

          {/* STUDENTS */}
          <Route path="student/:id" element={<TeacherStudentDetails />} />

          {/* ASSESSMENTS */}
          <Route path="assessments" element={<TeacherAssessments />} />
          <Route path="assessments/create" element={<CreateAssessment />} />
          <Route path="assessments/:id/edit" element={<EditAssessmentRedirect />} />
          <Route path="assessments/:id/scores" element={<ScoresEntry />} />
          <Route path="assessments/:id/review" element={<AssessmentReview />} />

          {/* ✅ FIXED GRADEBOOK FLOW */}
          <Route path="gradebook" element={<TeacherClasses />} />
          <Route path="gradebook/:id" element={<GradebookDetail />} />

          {/* LEGACY */}
          <Route path="gradebook-legacy" element={<TeacherGradebook />} />

          {/* REPORTS */}
          <Route path="reports" element={<Reports />} />
          <Route path="report-cards/:classId/:term" element={<ClassReportCards />} />
          <Route path="final-grades/:classId" element={<FinalGrades />} />

          {/* ATTENDANCE */}
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="attendance/class/:classId" element={<TeacherAttendanceClass />} />
          <Route path="attendance/session/:sessionId" element={<TeacherAttendanceSession />} />

          {/* HOMEWORK */}
          <Route path="homework/create" element={<CreateHomework />} />

        </Route>
      </Route>

        {/* ======================= */}
        {/* PARENT */}
        {/* ======================= */}

        <Route element={<ProtectedRoute allowedRoles={["PARENT"]} />}>

          <Route path="/parent" element={<ParentDashboard />} />

          <Route path="/parent/dashboard" element={<ParentDashboard />} />

          <Route path="/parent/report-cards" element={<ParentReportCards />} />

          <Route
            path="/parent/report-cards/:studentId/:termId"
            element={<ParentReportCardView />}
          />

          <Route
            path="/parent/attendance"
            element={<ParentAttendanceSummary />}
          />

        </Route>


        {/* ======================= */}
        {/* STUDENT */}
        {/* ======================= */}

        <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
          <Route element={<StudentLayout />}>

            <Route
              path="/student"
              element={<Navigate to="/student/dashboard" replace />}
            />

            <Route
              path="/student/dashboard"
              element={<StudentDashboard />}
            />

            <Route
              path="/student/attendance"
              element={<StudentAttendance />}
            />

            <Route
              path="/student/report-cards"
              element={<StudentReportCardsList />}
            />

            <Route
              path="/student/profile"
              element={<StudentProfile />}
            />

          </Route>
        </Route>


        {/* ======================= */}
        {/* SHARED */}
        {/* ======================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "PARENT"]} />
          }
        >
          <Route path="/notifications" element={<Notifications />} />
          
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}