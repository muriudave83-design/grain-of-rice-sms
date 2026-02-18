import React from "react";

export default function Payments() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payments</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="font-medium text-gray-800">
          Payment tracking — future phase
        </p>

        <p className="text-sm text-gray-700 mt-2">
          Payment records will integrate with the Fees module.
        </p>

        <p className="text-sm font-medium text-gray-700 mt-2">
          Status: <strong>Planned</strong>
        </p>
      </div>
    </div>
  );
}
