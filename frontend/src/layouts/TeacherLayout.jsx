import { Outlet } from "react-router-dom";
import TeacherNavbar from "../components/TeacherNavbar";

export default function TeacherLayout() {
  return (
    <div className="min-h-screen">
      {/* 🔥 Global Navbar */}
      <TeacherNavbar />

      {/* Page Content */}
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}