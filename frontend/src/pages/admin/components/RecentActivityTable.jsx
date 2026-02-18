import React from "react";

export default function RecentActivityTable({ rows = [] }) {
  const sample = rows.length ? rows : [
    { id: "1", timestamp: new Date().toISOString(), actor: "Admin", action: "CREATE_CLASS", resource: "Form 2B" },
  ];

  return (
    <div className="p-4 bg-white border rounded">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Recent Activity</h3>
        <div className="text-xs text-gray-500">Latest system events</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="pb-2">Time</th>
              <th className="pb-2">Actor</th>
              <th className="pb-2">Action</th>
              <th className="pb-2">Resource</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{new Date(r.timestamp).toLocaleString()}</td>
                <td className="py-2">{r.actor}</td>
                <td className="py-2 uppercase">{String(r.action).replaceAll("_", " ")}</td>
                <td className="py-2">{r.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
