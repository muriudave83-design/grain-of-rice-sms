import React from "react";

export default function Grades() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Grading System</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium text-blue-800">
          Core academic engine — already implemented
        </p>

        <p className="text-sm text-blue-700 mt-2">
          This module powers assessment-based grading and automatic aggregation.
        </p>

        <ul className="list-disc ml-6 mt-2 text-sm text-blue-700 space-y-1">
          <li>Create structured assessments</li>
          <li>Enter and submit student scores</li>
          <li>Automatically calculate totals and averages</li>
        </ul>

        <p className="text-sm text-blue-700 mt-3">
          Once grades are submitted, they become immutable and audit-safe.
        </p>

        <p className="text-sm font-medium text-blue-700 mt-2">
          Status: <strong>Production-ready</strong>
        </p>
      </div>
    </div>
  );
}
