import { Outlet } from "react-router-dom";
import SidebarNav from "../pages/admin/components/SidebarNav";
import Topbar from "../pages/admin/components/Topbar";
import NotificationBell from "../pages/notifications/NotificationBell";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 hidden md:block border-r bg-white">
        <div className="p-4">
          <div className="text-2xl font-semibold text-gray-900">
            Grain of Rice Academy
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Administrator Panel
          </div>
        </div>

        <SidebarNav />
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <div className="flex items-center justify-between px-6 border-b bg-white">
          <Topbar title="Admin Dashboard" />
          <NotificationBell />
        </div>

        {/* PAGE CONTENT */}
        <main className="p-6">
          <div className="max-w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}