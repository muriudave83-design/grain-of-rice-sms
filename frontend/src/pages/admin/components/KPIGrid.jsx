import React from "react";

export default function KPIGrid({ data = [] }) {
  const items = Array.isArray(data)
    ? data
    : [
        { label: "Students", value: data.students ?? 0 },
        { label: "Teachers", value: data.teachers ?? 0 },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((i, idx) => (
        <div key={idx} className="p-4 bg-white border rounded">
          <div className="text-sm text-gray-500">{i.label}</div>
          <div className="text-2xl font-semibold">{i.value}</div>
        </div>
      ))}
    </div>
  );
}
