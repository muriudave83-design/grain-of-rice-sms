import React from "react";

export default function Fees() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fees</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="font-medium text-gray-800">
          Financial module — scheduled after academics
        </p>

        <p className="text-sm text-gray-700 mt-2">
          Fees and billing are intentionally separated from grading logic.
        </p>

        <p className="text-sm text-gray-700 mt-2">
          This ensures academic records remain unaffected by financial data.
        </p>

        <p className="text-sm font-medium text-gray-700 mt-2">
          Status: <strong>Planned</strong>
        </p>
      </div>
    </div>
  );
}
