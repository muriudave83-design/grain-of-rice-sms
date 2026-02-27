import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function StudentsPanel({ students = [] }) {
  const [search, setSearch] = useState("");
  const [openGrades, setOpenGrades] = useState({});

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`;
      return (
        fullName.toLowerCase().includes(search.toLowerCase()) ||
        student.admissionNo
          ?.toLowerCase()
          .includes(search.toLowerCase())
      );
    });
  }, [students, search]);

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
            className="mb-6 border border-gray-200 rounded overflow-hidden"
          >
            <button
              onClick={() => toggleGrade(grade)}
              className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 text-left font-medium text-gray-800"
            >
              <span>
                {grade} ({gradeStudents.length})
              </span>
              <span>
                {openGrades[grade] ? "−" : "+"}
              </span>
            </button>

            {openGrades[grade] && (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Admission No</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStudents.map((student) => {
                      const fullName = `${student.firstName} ${student.lastName}`;

                      const parentName =
                        student.parentLinks?.[0]?.parent?.name || "-";

                      return (
                        <tr
                          key={student.id}
                          className="border-t border-gray-200 hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3">{fullName}</td>
                          <td className="px-4 py-3">
                            {student.admissionNo}
                          </td>
                          <td className="px-4 py-3">
                            {student.class?.name || "-"}
                          </td>
                          <td className="px-4 py-3">{parentName}</td>
                        </tr>
                      );
                    })}
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