import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // NEW
  const [search, setSearch] = useState("");
  const [editingSubject, setEditingSubject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get(
        `/admin/subjects?search=${encodeURIComponent(search)}`
      );

      setSubjects(res.data || []);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      await apiClient.post("/admin/subjects", { name, code });

      setName("");
      setCode("");

      fetchSubjects();

      alert("Subject created successfully");
    } catch (err) {
      console.error("Failed to create subject", err);
      alert("Failed to create subject");
    }
  };

  // NEW
  const handleEdit = async () => {
    try {
      await apiClient.patch(`/admin/subjects/${editingSubject.id}`, {
        name: editName,
        code: editCode,
      });

      alert("Subject updated successfully");

      setEditingSubject(null);
      setEditName("");
      setEditCode("");

      fetchSubjects();
    } catch (err) {
      console.error("Failed to update subject", err);
      alert("Failed to update subject");
    }
  };

  // NEW
  const handleArchive = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this subject?"
    );

    if (!confirmed) return;

    try {
      await apiClient.patch(`/admin/subjects/${id}/archive`);

      alert("Subject archived successfully");

      fetchSubjects();
    } catch (err) {
      console.error("Failed to archive subject", err);
      alert("Failed to archive subject");
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

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search subjects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 w-full mb-4"
      />

      {/* CREATE */}
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
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create Subject
        </button>
      </form>

      {/* SUBJECTS */}
      {subjects.length === 0 ? (
        <p>No subjects found</p>
      ) : (
        <ul className="space-y-2">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between border p-3 rounded"
            >
              <div>
                <div className="font-medium">{s.name}</div>

                <div className="text-sm text-gray-500">
                  Code: {s.code ?? "-"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* WEIGHT */}
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={s.weight ?? 0}
                  className="w-20 border p-1 text-center"
                  onChange={(e) => {
                    const newWeight = e.target.value;

                    setSubjects((prev) =>
                      prev.map((cat) =>
                        cat.id === s.id
                          ? { ...cat, weight: newWeight }
                          : cat
                      )
                    );
                  }}
                  onBlur={async () => {
                    try {
                      await apiClient.put(
                        `/assignment-categories/${s.id}`,
                        { weight: Number(s.weight) }
                      );
                    } catch (err) {
                      console.error("Failed to update weight", err);
                    }
                  }}
                />

                <span className="text-sm text-gray-500">
                  Weight
                </span>

                {/* ASSIGN */}
                <button
                  onClick={() => handleAssignTeacher(s.id)}
                  className="bg-gray-800 text-white px-3 py-1 text-sm rounded"
                >
                  Assign Teacher
                </button>

                {/* EDIT */}
                <button
                  onClick={() => {
                    setEditingSubject(s);
                    setEditName(s.name);
                    setEditCode(s.code || "");
                  }}
                  className="bg-blue-600 text-white px-3 py-1 text-sm rounded"
                >
                  Edit
                </button>

                {/* ARCHIVE */}
                <button
                  onClick={() => handleArchive(s.id)}
                  className="bg-red-600 text-white px-3 py-1 text-sm rounded"
                >
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* EDIT MODAL */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-96 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold">
              Edit Subject
            </h2>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border p-2 w-full"
              placeholder="Subject Name"
            />

            <input
              type="text"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="border p-2 w-full"
              placeholder="Code"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingSubject(null)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleEdit}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}