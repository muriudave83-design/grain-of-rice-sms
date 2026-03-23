import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";

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

// =======================
// TEACHER PAGES
// =======================
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

// =======================
// PARENT PAGES
// =======================
import ParentDashboard from "../pages/parent/ParentDashboard";
import ParentReportCards from "../pages/parent/report-cards/ParentReportCards";
import ParentReportCardView from "../pages/parent/report-cards/ParentReportCardView";
import ParentAttendanceSummary from "../pages/parent/attendance/ParentAttendanceSummary";

// =======================
// STUDENT PAGES
// =======================
import StudentReportCardsList from "../pages/student/StudentReportCardsList";
import StudentReportCardView from "../pages/student/StudentReportCardView";
import StudentDashboard from "@/pages/student/StudentDashboard";

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
  const storedUser = localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  if (token && user) {
    if (user.role === "ADMIN") {
      return <Navigate to="/dashboard/admin" replace />;
    }

    if (user.role === "TEACHER") {
      return <Navigate to="/teacher" replace />;
    }

    if (user.role === "PARENT") {
      return <Navigate to="/parent" replace />;
    }

    if (user.role === "STUDENT") {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return children;
}


export default function AppRoutes() {

  return (
    <BrowserRouter>

      <Routes>

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
            <Route path="/dashboard/admin/teachers" element={<AdminTeachers />} />
            <Route path="/dashboard/admin/classes" element={<Classes />} />

            <Route
              path="/dashboard/admin/classes/:classId/students"
              element={<AdminClassStudents />}
            />

            <Route path="/dashboard/admin/grades" element={<Grades />} />
            <Route path="/dashboard/admin/exams" element={<Exams />} />
            <Route path="/dashboard/admin/fees" element={<Fees />} />
            <Route path="/dashboard/admin/payments" element={<Payments />} />
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
              element={<AdminAttendanceOverview />}
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

          </Route>
        </Route>


        {/* ======================= */}
        {/* TEACHER */}
        {/* ======================= */}

        <Route element={<ProtectedRoute allowedRoles={["TEACHER"]} />}>
          <Route element={<TeacherLayout />}>

            <Route
              path="/teacher"
              element={<Navigate to="/teacher/assessments" replace />}
            />

            <Route
              path="/teacher/assessments"
              element={<TeacherAssessments />}
            />

            <Route
              path="/teacher/assessments/create"
              element={<CreateAssessment />}
            />

            <Route
              path="/teacher/homework/create"
              element={<CreateHomework />}
            />

            <Route
              path="/teacher/assessments/:id/edit"
              element={<EditAssessmentRedirect />}
            />

            <Route
              path="/teacher/assessments/:id/scores"
              element={<ScoresEntry />}
            />

            <Route
              path="/teacher/assessments/:id/review"
              element={<AssessmentReview />}
            />

            {/* ✅ GRADEBOOK (kept original) */}
            <Route
              path="/teacher/gradebook"
              element={<Gradebook />}
            />

            {/* ✅ NEW HOMEWORK ROUTE */}
            <Route
              path="/teacher/homework/create"
              element={<CreateHomework />}
            />

            {/* 🔧 FIXED duplicate safely */}
            <Route
              path="/teacher/gradebook-legacy"
              element={<TeacherGradebook />}
            />

            {/* ✅ NEW REPORT CARDS ROUTE */}
            <Route
              path="/teacher/report-cards/:classId/:term"
              element={<ClassReportCards />}
            />

            {/* Attendance Redirect */}
            <Route
              path="/teacher/attendance"
              element={<Navigate to="/teacher/attendance/class/1" replace />}
            />

            {/* Attendance by Class */}
            <Route
              path="/teacher/attendance/class/:classId"
              element={<TeacherAttendanceClass />}
            />

            {/* Attendance Session */}
            <Route
              path="/teacher/attendance/session/:sessionId"
              element={<TeacherAttendanceSession />}
            />

          </Route>
        </Route>


        {/* ======================= */}
        {/* PARENT */}
        {/* ======================= */}

        <Route element={<ProtectedRoute allowedRoles={["PARENT"]} />}>

          <Route path="/parent" element={<ParentDashboard />} />

          <Route path="/parent/report-cards" element={<ParentReportCards />} />

          <Route
            path="/parent/report-cards/:id"
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

          <Route
            path="/student"
              element={<Navigate to="/student/dashboard" replace />}
          />

          <Route
            path="/student/dashboard"
            element={<StudentDashboard />}
          />

          <Route
            path="/student/report-cards"
            element={<StudentReportCardsList />}
          />

          <Route
            path="/student/report-cards/:classId/:term"
            element={<StudentReportCardView />}
          />

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