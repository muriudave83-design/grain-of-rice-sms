import { useEffect, useState } from "react";
import api from "../../services/apiClient";

export default function AdminArchived() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    try {
      const res = await api.get("/admin/archived/students");
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to load archived students", err);
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/admin/students/${id}/restore`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Restore failed", err);
      alert("Failed to restore student");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        Archived Students
      </h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Admission No</th>
              <th className="p-3">Class</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.admissionNo}</td>
                <td className="p-3">{s.className || "—"}</td>

                <td className="p-3">
                  <button
                    onClick={() => handleRestore(s.id)}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="p-4 text-sm text-gray-500">
            No archived students
          </div>
        )}
      </div>
    </div>
  );
}