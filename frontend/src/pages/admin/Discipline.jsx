import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import StudentSearchSelect from "../../components/StudentSearchSelect";
import { formatDisciplineDate, formatDisciplineTime } from "../../utils/disciplineDateTime";

export default function Discipline() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);

  const [filterStudentId, setFilterStudentId] = useState("");
  const [addStudentId, setAddStudentId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [addTermId, setAddTermId] = useState("");

  const [type, setType] = useState("");
  const [note, setNote] = useState("");

  // EDIT STATE
  const [editingId, setEditingId] = useState(null);
  const [editType, setEditType] = useState("");
  const [editNote, setEditNote] = useState("");

  // 🔒 LOCK STATE
  const [isLocked, setIsLocked] = useState(false);

  const fetchLock = async () => {
    try {
      const res = await apiClient.get("/terms");
      const locked = res.data.some((t) => t.isLocked);
      setIsLocked(locked);
    } catch (err) {
      console.error("Failed to fetch lock:", err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await apiClient.get("/discipline");
      const studentsRes = await apiClient.get("/students");
      const termsRes = await apiClient.get("/terms");

      setRecords(res.data);
      setStudents(studentsRes.data);
      setTerms(termsRes.data);
    } catch (err) {
      console.error("Failed to fetch discipline data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLock();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();

    if (isLocked) {
      alert("System locked");
      return;
    }

    if (!addStudentId || !addTermId || !type.trim()) {
      return alert("Student, Term, and type required");
    }

    try {
      await apiClient.post("/discipline", {
        studentId: Number(addStudentId),
        termId: Number(addTermId),
        type,
        note,
      });

      setType("");
      setNote("");

      alert("Record added");
      fetchData();
    } catch (err) {
      console.error("Failed to add record:", err);
      alert("Error adding record");
    }
  };

  // FILTER
  const filtered = records.filter((r) => {
    if (filterStudentId && r.studentId !== Number(filterStudentId)) return false;
    if (filterTermId && r.termId !== Number(filterTermId)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Discipline</h1>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3">
        <StudentSearchSelect
          students={students}
          value={filterStudentId}
          onChange={setFilterStudentId}
          placeholder="Filter student by name or number"
          disabled={isLocked}
        />

        <select
          value={filterTermId}
          onChange={(e) => setFilterTermId(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        >
          <option value="">All Terms</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.class?.name || `Class ${t.classId}`}
            </option>
          ))}
        </select>
      </div>
            {/* ADD FORM */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
        <StudentSearchSelect
          students={students}
          value={addStudentId}
          onChange={(value) => {
            setAddStudentId(value);
            setAddTermId("");
          }}
          placeholder="Select student by name or number"
          disabled={isLocked}
        />

        <select
          value={addTermId}
          onChange={(e) => setAddTermId(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        >
          <option value="">Select Term</option>
          {terms.filter((t) => {
            const student = students.find((item) => String(item.id) === String(addStudentId));
            return student && Number(t.classId) === Number(student.classId);
          }).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Type (e.g. Late, Fighting)"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        />

        <input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        />

        {isLocked ? (
          <span className="text-gray-400 px-4 py-2">Locked</span>
        ) : (
          <button className="bg-red-600 text-white px-4 py-2 rounded">
            Add
          </button>
        )}
      </form>

      {/* EMPTY STATE */}
      {filtered.length === 0 ? (
        <p className="text-gray-500">No discipline records found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border w-full rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Student</th>
                <th className="p-2 text-left">Class</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 text-left">Term</th>
                <th className="p-2 text-left">Recorded By</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">
                    {formatDisciplineDate(r.date)}
                  </td>
                  <td className="p-2">{formatDisciplineTime(r.date)}</td>

                  <td className="p-2">
                    {r.student?.firstName} ({r.student?.admissionNo})
                  </td>
                  <td className="p-2">{r.student?.class?.name || "-"}</td>
                                    {/* EDIT TYPE */}
                  <td className="p-2">
                    {editingId === r.id ? (
                      <input
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="border p-1 mr-2 rounded"
                        disabled={isLocked}
                      />
                    ) : (
                      r.type
                    )}
                  </td>

                  {/* EDIT NOTE */}
                  <td className="p-2">
                    {editingId === r.id ? (
                      <input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="border p-1 rounded"
                        disabled={isLocked}
                      />
                    ) : (
                      r.notes || "-"
                    )}
                  </td>

                  <td className="p-2">{r.term?.name || "-"}</td>
                  <td className="p-2">
                    {r.recordedBy ? `${r.recordedBy.name} — ${r.recordedBy.role === "TEACHER" ? "Teacher" : "Administrator"}` : "Not recorded"}
                  </td>

                  <td className="p-2 flex gap-2 flex-wrap">
                    {/* EDIT */}
                    {isLocked ? (
                      <span className="text-gray-400">Locked</span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(r.id);
                          setEditType(r.type);
                          setEditNote(r.notes || "");
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                    )}

                    {/* SAVE */}
                    {editingId === r.id && !isLocked && (
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.put(`/discipline/${r.id}`, {
                              type: editType,
                              note: editNote,
                            });

                            setEditingId(null);
                            setEditType("");
                            setEditNote("");
                            fetchData();
                            alert("Updated");
                          } catch (err) {
                            console.error("Update failed:", err);
                            alert("Update failed");
                          }
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                    )}

                    {/* DELETE */}
                    {isLocked ? (
                      <span className="text-gray-400">Locked</span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm("Delete record?")) return;

                          try {
                            await apiClient.delete(`/discipline/${r.id}`);
                            fetchData();
                            alert("Deleted");
                          } catch (err) {
                            console.error("Delete failed:", err);
                            alert("Delete failed");
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
