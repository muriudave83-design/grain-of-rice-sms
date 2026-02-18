import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [studentsRes, subjectsRes] = await Promise.all([
        api.get("/admin/users?role=STUDENT"),
        api.get("/admin/subjects"),
      ]);

      setStudents(studentsRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  }

  function openEnroll(student) {
    setSelectedStudent(student);
    setSelectedSubjectIds(
      student.subjects?.map((s) => s.id) || []
    );
    setShowForm(true);
  }

  async function saveEnrollment(e) {
    e.preventDefault();

    try {
      await api.post(`/admin/students/${selectedStudent.id}/enrollments`, {
        subjectIds: selectedSubjectIds,
      });

      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save enrollment", err);
    }
  }

  function toggleSubject(id) {
    setSelectedSubjectIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6">Students</h1>

        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Subjects</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    Loading students...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.email}</td>
                    <td className="p-3 text-xs">
                      {s.subjects?.length
                        ? s.subjects.map((sub) => sub.name).join(", ")
                        : "—"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openEnroll(s)}
                        className="text-blue-600 text-xs"
                      >
                        Enroll Subjects
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enrollment Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
            <form
              onSubmit={saveEnrollment}
              className="bg-white w-96 p-6 rounded shadow"
            >
              <h2 className="text-lg font-semibold mb-4">
                Enroll Subjects — {selectedStudent.name}
              </h2>

              <div className="space-y-1 max-h-56 overflow-y-auto border p-2 rounded mb-4">
                {subjects.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(sub.id)}
                      onChange={() => toggleSubject(sub.id)}
                    />
                    <span>{sub.name}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1 text-sm border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
