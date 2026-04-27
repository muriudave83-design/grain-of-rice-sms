import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function Sponsorship() {
  const [data, setData] = useState([]);
  const [students, setStudents] = useState([]);

  const [studentId, setStudentId] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [type, setType] = useState("FULL");

  // EDIT STATE
  const [editingId, setEditingId] = useState(null);
  const [editType, setEditType] = useState("");

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
      const res = await apiClient.get("/sponsorship");
      const studentsRes = await apiClient.get("/students");

      setData(res.data);
      setStudents(studentsRes.data);
    } catch (err) {
      console.error("Failed to fetch sponsorship data:", err);
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

    if (!studentId || !sponsorName) {
      return alert("Fill all fields");
    }

    try {
      await apiClient.post("/sponsorship", {
        studentId: Number(studentId),
        sponsorName,
        type,
      });

      setStudentId("");
      setSponsorName("");
      setType("FULL");

      alert("Sponsorship added");
      fetchData();
    } catch (err) {
      console.error("Failed to add sponsorship:", err);
      alert("Error adding sponsorship");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Sponsorship</h1>

      {/* FORM */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-center">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} ({s.admissionNo})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Sponsor Name"
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-2 rounded"
          disabled={isLocked}
        >
          <option value="FULL">FULL</option>
          <option value="HALF">HALF</option>
        </select>

        {isLocked ? (
          <span className="text-gray-400 px-4 py-2">Locked</span>
        ) : (
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Add
          </button>
        )}
      </form>
            {/* EMPTY STATE */}
      {data.length === 0 ? (
        <p className="text-gray-500">No sponsorship records found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border w-full rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Student</th>
                <th className="p-2 text-left">Admission No</th>
                <th className="p-2 text-left">Sponsor</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.student?.firstName}</td>

                  <td className="p-2">{s.student?.admissionNo}</td>

                  <td className="p-2">{s.sponsor?.name}</td>

                  {/* EDITABLE TYPE */}
                  <td className="p-2">
                    {editingId === s.id ? (
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="border p-1 rounded"
                        disabled={isLocked}
                      >
                        <option value="FULL">FULL</option>
                        <option value="HALF">HALF</option>
                      </select>
                    ) : (
                      s.type
                    )}
                  </td>

                  <td className="p-2 flex gap-2 flex-wrap">
                    {/* EDIT */}
                    {isLocked ? (
                      <span className="text-gray-400">Locked</span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setEditType(s.type);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                    )}

                    {/* SAVE */}
                    {editingId === s.id && !isLocked && (
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.put(`/sponsorship/${s.id}`, {
                              type: editType,
                            });

                            setEditingId(null);
                            setEditType("");
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
                          if (!confirm("Delete sponsorship?")) return;

                          try {
                            await apiClient.delete(`/sponsorship/${s.id}`);
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