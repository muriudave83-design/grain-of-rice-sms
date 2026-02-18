import React from "react";

export default function QuickActions() {
  return (
    <div className="p-4 bg-white border rounded">
      <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
      <div className="flex flex-col gap-2">
        <button className="px-3 py-2 bg-blue-50 text-blue-700 rounded">Add Student</button>
        <button className="px-3 py-2 bg-green-50 text-green-700 rounded">Add Teacher</button>
      </div>
    </div>
  );
}
