import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get("/admin/subjects");
      setSubjects(res.data || []);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/admin/subjects", { name, code });
      setName("");
      setCode("");
      fetchSubjects();
    } catch (err) {
      console.error("Failed to create subject", err);
    }
  };

  const handleAssignTeacher = async (subjectId) => {
    const teacherId = prompt("Enter Teacher ID to assign:");
    if (!teacherId) return;

    try {
      await apiClient.put(
        `/admin/subjects/${subjectId}/assign-teacher`,
        { teacherId: Number(teacherId) }
      );
      alert("Teacher assigned successfully");
    } catch (err) {
      console.error("Failed to assign teacher", err);
      alert("Failed to assign teacher");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Subjects</h1>

      <form onSubmit={handleCreate} className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <input
          type="text"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2"
        >
          Create Subject
        </button>
      </form>

      {subjects.length === 0 ? (
        <p>No subjects yet</p>
      ) : (
        <ul className="space-y-2">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between border p-2 rounded"
            >
              <span>
                {s.name} ({s.code})
              </span>
              <button
                onClick={() => handleAssignTeacher(s.id)}
                className="bg-gray-800 text-white px-3 py-1 text-sm rounded"
              >
                Assign Teacher
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
