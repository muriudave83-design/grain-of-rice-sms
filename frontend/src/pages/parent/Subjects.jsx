import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/services/apiClient";

export default function ParentSubjects() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [subjects, setSubjects] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSubjects() {
      if (!studentId) {
        setError("No student selected.");
        setLoading(false);
        return;
      }

      try {
        /**
         * Expected backend behavior:
         * - /parent/students/:studentId/subjects
         *   → subjects for a child linked to this parent
         */
        const res = await api.get(
          `/parent/students/${studentId}/subjects`
        );

        setStudent(res.data.student);
        setSubjects(res.data.subjects || []);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view these subjects.");
        } else if (err.response?.status === 404) {
          setError("Student not found.");
        } else {
          setError("Failed to load subjects.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, [studentId]);

  if (loading) {
    return <div className="p-6">Loading subjects...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!student) {
    return null;
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6 text-gray-600">
        {student.name} is not enrolled in any subjects.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">
        Subjects — {student.name}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Read-only view
      </p>

      <div className="space-y-4">
        {subjects.map((s) => (
          <div key={s.id} className="border rounded p-4">
            <div className="font-medium">{s.name}</div>

            <div className="text-sm text-gray-600 mt-1">
              <div>
                <span className="font-medium">Class:</span>{" "}
                {s.class?.name || "—"}
              </div>
              <div>
                <span className="font-medium">Teacher:</span>{" "}
                {s.teacher?.name || "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
