import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminClassSubjects() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadAssignments(selectedClass);
    }
  }, [selectedClass]);

  async function loadClasses() {
    const res = await apiClient.get("/admin/classes");
    setClasses(res.data);
  }

  async function loadSubjects() {
    const res = await apiClient.get("/admin/subjects");
    setSubjects(res.data);
  }

  async function loadAssignments(classId) {
    const res = await apiClient.get(`/admin/class-subjects/${classId}`);
    setAssignments(res.data);
  }

  async function assign(subjectId) {
    try {
      await apiClient.post("/admin/class-subjects", {
        classId: selectedClass,
        subjectId,
      });

      loadAssignments(selectedClass);
    } catch (err) {
      alert(err.response?.data?.message || "Could not assign");
    }
  }

  // ✅ SAFE REMOVE WITH CONFIRM + ERROR HANDLING
  async function remove(id) {
    if (!window.confirm("Remove this subject from the class?")) return;

    try {
      await apiClient.delete(`/admin/class-subjects/${id}`);
      loadAssignments(selectedClass);
    } catch (err) {
      console.error("Failed to remove subject", err);
      alert(
        err.response?.data?.message ||
          "Failed to remove subject"
      );
    }
  }

  const assignedIds = assignments.map((a) => a.subjectId);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Assign Subjects to Classes
      </h2>

      <select
        className="border p-2 mb-4 w-full"
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
      >
        <option value="">-- Select Class --</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {selectedClass && (
        <>
          <h3 className="font-semibold mb-2">
            Available Subjects
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {subjects.map((s) => {
              const isAssigned = assignedIds.includes(s.id);

              return (
                <div
                  key={s.id}
                  className="border p-2 flex justify-between items-center rounded"
                >
                  <span>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </span>

                  {!isAssigned ? (
                    <button
                      className="bg-green-600 text-white px-2 py-1 rounded"
                      onClick={() => assign(s.id)}
                    >
                      Add
                    </button>
                  ) : (
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      onClick={() =>
                        remove(
                          assignments.find(
                            (a) => a.subjectId === s.id
                          )?.id
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}