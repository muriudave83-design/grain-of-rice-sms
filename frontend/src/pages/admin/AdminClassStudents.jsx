import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function AdminClassStudents() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  async function fetchStudents() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.get(
        `/admin/classes/${classId}/students`
      );
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Class Students (Class ID: {classId})
        </h1>
        <Link
          to="/dashboard/admin/classes"
          className="text-sm text-blue-600 underline"
        >
          ← Back to Classes
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Admission No</th>
              <th className="p-3 text-left">Parent</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="p-4 text-center">
                  Loading…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td
                  colSpan="3"
                  className="p-8 text-center text-gray-500"
                >
                  No students are assigned to this class yet.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="p-3">{s.admissionNo}</td>
                  <td className="p-3">
                    {s.parentLinks?.[0]?.parent?.name ||
                      "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
