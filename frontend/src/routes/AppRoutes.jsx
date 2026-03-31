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
import TeacherClasses from "../pages/teacher/TeacherClasses";
import TeacherClassDetails from "../pages/teacher/TeacherClassDetails";
import TeacherStudentDetails from "../pages/teacher/TeacherStudentDetails";

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
      // 🔥 DO NOT TRUST TOKEN ALONE
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        return children;
      }

      try {
        const user = JSON.parse(userStr);

        // 🔥 OPTIONAL: decode token expiry (extra safety)
        const payload = JSON.parse(atob(token.split(".")[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn("⛔ Token expired — clearing session");

          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");

          return children;
        }

        // ✅ VALID SESSION → redirect
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
     // 🔥 GLOBAL SESSION GUARD (runs once)
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

            <Route
              path="/dashboard/admin/archived"
              element={<AdminArchived />}
            />

            <Route
              path="/dashboard/admin/students/:id/edit"
              element={<EditStudent />}
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
                element={<Navigate to="/teacher/classes" replace />}
            />

            <Route
              path="/teacher/classes"
              element={<TeacherClasses />}
            />

            <Route 
              path="/teacher/class/:id" 
              element={<TeacherClassDetails />} 
            />

            <Route 
              path="/teacher/student/:id" 
              element={<TeacherStudentDetails />} 
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
            path="/parent/report-cards/:studentId/:termId"
            element={<ParentReportCardView />}
          />

          <Route
            path="/parent/attendance"
            element={<ParentAttendanceSummary />}
          />

          <Route path="/parent/dashboard" 
            element={<ParentDashboard />} 
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
            path="/student/report-cards/:classId/:term"
            element={<StudentReportCardView />}
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