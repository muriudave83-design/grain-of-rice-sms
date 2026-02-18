import React from "react";

export default function Students() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Students</h1>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="font-medium text-green-800">
          Student enrollment module — coming next
        </p>

        <p className="text-sm text-green-700 mt-2">
          This section manages student records and class placement.
        </p>

        <ul className="list-disc ml-6 mt-2 text-sm text-green-700 space-y-1">
          <li>Enroll students into classes</li>
          <li>Maintain academic profiles</li>
          <li>Link students to grading and report cards</li>
        </ul>

        <p className="text-sm text-green-700 mt-3">
          Student records automatically power grading, attendance, and reports.
        </p>

        <p className="text-sm font-medium text-green-700 mt-2">
          Estimated delivery: <strong>1 day</strong>
        </p>
      </div>
    </div>
  );
}
