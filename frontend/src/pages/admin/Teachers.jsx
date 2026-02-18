import React from "react";

export default function Teachers() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Teachers</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium">
          Teacher onboarding module — coming next
        </p>

        <p className="text-sm text-blue-700 mt-2">
          This section will allow administrators to:
        </p>

        <ul className="list-disc ml-6 mt-2 text-sm text-blue-700 space-y-1">
          <li>Create teacher accounts</li>
          <li>Assign subjects and classes</li>
          <li>Control grading permissions</li>
        </ul>

        <p className="text-sm text-blue-700 mt-3">
          Teachers will only see the subjects they teach and can immediately
          begin creating assessments and entering grades.
        </p>

        <p className="text-sm text-blue-700 mt-2 font-medium">
          Estimated delivery: <strong>2–3 days</strong>
        </p>
      </div>
    </div>
  );
}
