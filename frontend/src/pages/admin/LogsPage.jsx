import React from "react";
import SidebarNav from "./components/SidebarNav";
import Topbar from "./components/Topbar";

export default function LogsPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNav />
      <div className="flex-1 flex flex-col">
        <Topbar title="System Logs" />

        <div className="p-6">
          <h2 className="text-xl font-semibold">System Logs</h2>
          <p className="mt-2 text-gray-600">This page is under construction.</p>
        </div>
      </div>
    </div>
  );
}
