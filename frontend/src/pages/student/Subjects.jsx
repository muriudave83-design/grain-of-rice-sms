import { useEffect, useState } from "react";
import api from "@/services/apiClient";

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        /**
         * Expected backend behavior:
         * - /student/subjects
         *   Returns subjects the authenticated student is enrolled in,
         *   including derived class + teacher information.
         */
        const res = await api.get("/student/subjects");
        setSubjects(res.data || []);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view subjects.");
        } else {
          setError("Failed to load subjects.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  if (loading) {
    return <div className="p-6">Loading subjects...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6 text-gray-600">
        You are not enrolled in any subjects.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">My Subjects</h1>

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
