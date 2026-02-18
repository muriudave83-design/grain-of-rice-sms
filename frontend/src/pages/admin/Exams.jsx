import React from "react";

export default function Exams() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Exams & Assessments</h1>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="font-medium text-purple-800">
          Assessment definition layer
        </p>

        <p className="text-sm text-purple-700 mt-2">
          Exams and tests are defined here before grading begins.
        </p>

        <ul className="list-disc ml-6 mt-2 text-sm text-purple-700 space-y-1">
          <li>Define exam types and weights</li>
          <li>Associate exams with subjects and terms</li>
          <li>Ensure grading consistency</li>
        </ul>

        <p className="text-sm font-medium text-purple-700 mt-2">
          Estimated delivery: <strong>1 day</strong>
        </p>
      </div>
    </div>
  );
}
