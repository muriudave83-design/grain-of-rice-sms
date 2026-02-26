import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function StudentsPanel({ students = [] }) {
  const [search, setSearch] = useState("");
  const [openGrades, setOpenGrades] = useState({});

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      return (
        student.name?.toLowerCase().includes(search.toLowerCase()) ||
        student.admissionNumber
          ?.toLowerCase()
          .includes(search.toLowerCase())
      );
    });
  }, [students, search]);

  // Group by class name
  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((acc, student) => {
      const grade = student.class?.name || "Unassigned";

      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);

      return acc;
    }, {});
  }, [filteredStudents]);

  const toggleGrade = (grade) => {
    setOpenGrades((prev) => ({
      ...prev,
      [grade]: !prev[grade],
    }));
  };

  return (
    <div>
      <UserSearch
        value={search}
        onChange={setSearch}
        placeholder="Search students by name or admission number..."
      />

      {Object.keys(groupedStudents).length === 0 ? (
        <div className="text-center text-gray-500 py-6">
          No students found
        </div>
      ) : (
        Object.entries(groupedStudents).map(([grade, gradeStudents]) => (
          <div
            key={grade}
            className="mb-6 border border-gray-800 rounded-lg overflow-hidden"
          >
            {/* Grade Header */}
            <button
              onClick={() => toggleGrade(grade)}
              className="w-full flex justify-between items-center px-4 py-3 bg-gray-800 text-left text-white font-medium"
            >
              <span>
                {grade} ({gradeStudents.length})
              </span>
              <span className="text-yellow-400">
                {openGrades[grade] ? "−" : "+"}
              </span>
            </button>

            {openGrades[grade] && (
              <div className="bg-gray-900 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 text-gray-300 text-sm uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Admission No</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-t border-gray-800 hover:bg-gray-800 transition"
                      >
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3">
                          {student.admissionNumber}
                        </td>
                        <td className="px-4 py-3">
                          {student.class?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {student.parent?.name || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}