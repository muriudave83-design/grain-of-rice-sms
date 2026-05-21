import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import Papa from "papaparse";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    parentId: "",
  });

  const [openClasses, setOpenClasses] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const [studentDetails, setStudentDetails] = useState({});

  // ✅ NEW STATE (FIX)
  const [logInputs, setLogInputs] = useState({});
  const [healthInputs, setHealthInputs] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const studentsRes = await apiClient.get("/admin/students");
      const classesRes = await apiClient.get("/admin/classes");
      const parentsRes = await apiClient.get("/admin/users?role=PARENT");

      setStudents(studentsRes.data || []);
      setClasses(classesRes.data || []);
      setParents(parentsRes.data || []);
    } catch (err) {
      console.error("Failed to load students data", err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW FUNCTION (FIX)
  const handleAddLog = async (studentId) => {
    const note = logInputs[studentId];

    if (!note) {
      alert("Enter a note");
      return;
    }

    try {
      await apiClient.post(`/students/${studentId}/contact-log`, {
        message: note,
      });

      // clear input
      setLogInputs((prev) => ({
        ...prev,
        [studentId]: "",
      }));

      // refresh details
      const res = await apiClient.get(`/students/${studentId}/details`);

      setStudentDetails((prev) => ({
        ...prev,
        [studentId]: res.data,
      }));
    } catch (err) {
      console.error("Failed to save log", err);
      alert("Failed to save log");
    }
  };

  const handleSaveHealth = async (studentId) => {
  const healthNotes = healthInputs[studentId];

  try {
    await apiClient.put(`/students/${studentId}/health`, {
      healthNotes,
    });

    // refresh details
    const res = await apiClient.get(`/students/${studentId}/details`);

    setStudentDetails((prev) => ({
      ...prev,
      [studentId]: res.data,
    }));

    alert("Health notes saved");
  } catch (err) {
    console.error("Failed to save health notes", err);
    alert("Failed to save");
  }
};

  // ✅ FIXED CSV IMPORT HANDLER
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results) => {
        try {
          console.log("RAW PARSED:", results.data);

          const cleaned = results.data
            .map((row) => {
              if (!row.firstName || !row.admissionNo) return null;

              return {
                firstName: row.firstName.trim(),
                lastName: row.lastName?.trim() || "",
                admissionNo: row.admissionNo.toString().trim(),
                className: row.className?.trim(),
                parentName: row.parentName?.trim() || "",
                userId: 1,
              };
            })
            .filter(Boolean);

          console.log("CLEANED CSV:", cleaned);

          const res = await apiClient.post("/students/bulk", cleaned);

          console.log("IMPORT RESULT:", res.data);

          alert(`Created: ${res.data.created}, Failed: ${res.data.failed}`);

          fetchData();
        } catch (err) {
          console.error("IMPORT FAILED:", err);
          alert("Import failed");
        }
      },
    });
  };
    const filteredStudents = students.filter((s) => {
    const query = search.toLowerCase();

    return (
      `${s.firstName || ""} ${s.lastName || ""}`
        .toLowerCase()
        .includes(query) ||
      s.admissionNo?.toLowerCase().includes(query) ||
      (s.class?.name || "").toLowerCase().includes(query)
    );
  });

  const groupedStudents = filteredStudents.reduce((acc, student) => {
    const className = student.class?.name?.trim() || "Unassigned";

    if (!acc[className]) {
      acc[className] = [];
    }

    acc[className].push(student);
    return acc;
  }, {});

  const toggleClass = (className) => {
    setOpenClasses((prev) => ({
      ...prev,
      [className]: !prev[className],
    }));
  };

  // ✅ EXPAND + FETCH DETAILS
  const toggleExpand = async (id) => {
    if (expandedStudentId === id) {
      setExpandedStudentId(null);
      return;
    }

    setExpandedStudentId(id);

    try {
      const res = await apiClient.get(`/students/${id}/details`);

      setStudentDetails((prev) => ({
        ...prev,
        [id]: res.data,
      }));
    } catch (err) {
      console.error("Failed to load student details", err);
    }
  };

  // ✅ AUTO-OPEN CLASSES
  useEffect(() => {
    const initialState = {};
    Object.keys(groupedStudents).forEach((cls) => {
      initialState[cls] = true;
    });
    setOpenClasses(initialState);
  }, [students]);

  const handleEdit = (student) => {
    navigate(`/dashboard/admin/students/${student.id}/edit`, {
      state: {
        student,
        parents,
        classes,
      },
    });
  };

  const handleDelete = async (student) => {
    const fullName = `${student.firstName} ${student.lastName}`;

    const confirmDelete = window.confirm(
      `Delete ${fullName}? This will archive the student.`
    );

    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/admin/students/${student.id}`);
      setStudents((prev) =>
        prev.filter((s) => s.id !== student.id)
      );
    } catch (err) {
      console.error("Failed to delete student", err);
      alert("Failed to delete student");
    }
  };

  async function submitForm(e) {
    e.preventDefault();

    if (!form.classId) {
      alert("Please select a class");
      return;
    }

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        admissionNo: form.admissionNo.trim(),
        classId: Number(form.classId),
      };

      if (form.parentId) {
        payload.parentId = Number(form.parentId);
      }

      await apiClient.post("/admin/students", payload);

      setForm({
        firstName: "",
        lastName: "",
        admissionNo: "",
        classId: "",
        parentId: "",
      });

      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("CREATE STUDENT ERROR:", err);
      alert(err?.response?.data?.message || "Failed to create student");
    }
  }
    return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Students</h1>

        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="text-sm"
          />

          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + Create Student
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* SEARCH */}
      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by name, class, or admission no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-3 py-2 border rounded-md text-sm"
        />
      </div>

      <div className="bg-white border rounded overflow-x-auto">
        {loading ? (
          <div className="p-4 text-center">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No students yet
          </div>
        ) : (
          Object.entries(groupedStudents).map(
            ([className, classStudents]) => (
              <div key={className} className="mb-6">

                {/* CLASS HEADER */}
                <div
                  onClick={() => toggleClass(className)}
                  className="flex justify-between items-center cursor-pointer bg-gray-100 px-4 py-3 rounded-md hover:bg-gray-200"
                >
                  <h2 className="text-md font-semibold text-gray-800">
                    {className}
                  </h2>

                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {classStudents.length} students
                    </span>

                    <span className="text-sm">
                      {openClasses[className] ? "▼" : "▶"}
                    </span>
                  </div>
                </div>

                {openClasses[className] && (
                  <div className="bg-white border rounded-lg overflow-hidden mt-2">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-left">
                        <tr>
                          <th className="p-3">Name</th>
                          <th className="p-3">Admission No</th>
                          <th className="p-3">Parent</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {classStudents.map((s) => (
                          <React.Fragment key={s.id}>

                            {/* MAIN ROW */}
                            <tr className="border-t">
                              <td className="p-3">
                                {s.firstName} {s.lastName}
                              </td>

                              <td className="p-3">
                                {s.admissionNo}
                              </td>

                              <td className="p-3">
                                {s.parentName ||
                                  s.parent?.name ||
                                  "—"}
                              </td>

                              <td className="p-3 flex gap-2">
                                <button
                                  onClick={() => toggleExpand(s.id)}
                                  className="px-2 py-1 text-xs bg-gray-700 text-white rounded"
                                >
                                  {expandedStudentId === s.id ? "Hide" : "View"}
                                </button>

                                <button
                                  onClick={() => handleEdit(s)}
                                  className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                >
                                  Edit
                                </button>

                                <Link
                                  to={`/reports/student/${s.id}`}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Report
                                </Link>

                                <Link
                                  to={`/dashboard/admin/students/${s.id}`}
                                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                  Profile
                                </Link>

                                <button
                                  onClick={() => handleDelete(s)}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>

                            {/* EXPANDED ROW */}
                            {expandedStudentId === s.id && (
                              <tr>
                                <td colSpan="4">
                                  <div className="bg-gray-900 text-white p-4 rounded-md mt-2">

                                    {/* ATTENDANCE */}
                                    <div className="mb-3">
                                      <strong>Attendance</strong>
                                      <div className="text-sm mt-1">
                                        Present: {studentDetails[s.id]?.present ?? "--"} |
                                        Absent: {studentDetails[s.id]?.absent ?? "--"}
                                      </div>
                                    </div>

                                    {/* 🔥 CONTACT LOG (FIXED) */}
                                    <div className="mb-3">
                                      <strong>Parent Contact Log</strong>

                                      <div className="text-sm opacity-70 mt-1 space-y-1">
                                        {studentDetails[s.id]?.logs?.length
                                          ? studentDetails[s.id].logs.map((log, i) => (
                                              <div key={i}>
                                                • {log.message} —{" "}
                                                <span className="text-xs opacity-60">
                                                  {log.createdAt && new Date(log.createdAt).toLocaleString()}
                                                </span>
                                              </div>
                                            ))
                                          : "No logs yet"}
                                      </div>

                                      {/* ✅ FIXED INPUT */}
                                      <input
                                        type="text"
                                        placeholder="Add note..."
                                        value={logInputs[s.id] || ""}
                                        onChange={(e) =>
                                          setLogInputs({
                                            ...logInputs,
                                            [s.id]: e.target.value,
                                          })
                                        }
                                        className="w-full mt-2 p-2 text-black rounded"
                                      />

                                      {/* ✅ SAVE BUTTON */}
                                      <button
                                        onClick={() => handleAddLog(s.id)}
                                        className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded"
                                      >
                                        Save Note
                                      </button>
                                    </div>

                                    {/* DISCIPLINE HISTORY */}
                                    <div className="mb-3">
                                      <strong>Discipline History</strong>

                                      <div className="text-sm opacity-70 mt-1 space-y-1">
                                        {studentDetails[s.id]?.discipline?.length ? (
                                          studentDetails[s.id].discipline.map((item, i) => (
                                            <div
                                              key={i}
                                              className="border border-gray-700 rounded p-2"
                                            >
                                              <div>
                                                <strong>{item.type}</strong>
                                              </div>

                                              <div className="text-xs mt-1">
                                                {item.notes || "No notes"}
                                              </div>

                                              <div className="text-xs opacity-60 mt-1">
                                                {item.date
                                                  ? new Date(item.date).toLocaleDateString()
                                                  : ""}
                                                {item.term?.name
                                                  ? ` • ${item.term.name}`
                                                  : ""}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          "No discipline records"
                                        )}
                                      </div>
                                    </div>

                                    {/* HEALTH */}
                                    <div>
                                      <strong>Health Notes</strong>
                                        <textarea
                                          value={
                                            healthInputs[s.id] ??
                                            studentDetails[s.id]?.healthNotes ??
                                            ""
                                          }
                                          onChange={(e) =>
                                            setHealthInputs({
                                              ...healthInputs,
                                              [s.id]: e.target.value,
                                            })
                                          }
                                          placeholder="Allergies, medication, etc..."
                                          className="w-full mt-2 p-2 text-black rounded"
                                        />

                                        <button
                                          onClick={() => handleSaveHealth(s.id)}
                                          className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded"
                                        >
                                          Save Health Notes
                                        </button>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}

                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )
        )}
      </div>
            {showForm && (
        <form
          onSubmit={submitForm}
          className="fixed inset-0 bg-black/30 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded w-96 space-y-4">
            <h2 className="text-lg font-semibold">
              Create Student
            </h2>

            <input
              required
              placeholder="First name"
              className="w-full p-2 border rounded"
              value={form.firstName}
              onChange={(e) =>
                setForm({
                  ...form,
                  firstName: e.target.value,
                })
              }
            />

            <input
              required
              placeholder="Last name"
              className="w-full p-2 border rounded"
              value={form.lastName}
              onChange={(e) =>
                setForm({
                  ...form,
                  lastName: e.target.value,
                })
              }
            />

            <input
              required
              placeholder="Admission number"
              className="w-full p-2 border rounded"
              value={form.admissionNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  admissionNo: e.target.value,
                })
              }
            />

            <select
              required
              className="w-full p-2 border rounded"
              value={form.classId}
              onChange={(e) =>
                setForm({
                  ...form,
                  classId: e.target.value,
                })
              }
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-2 border rounded"
              value={form.parentId}
              onChange={(e) =>
                setForm({
                  ...form,
                  parentId: e.target.value,
                })
              }
            >
              <option value="">
                Link parent (optional)
              </option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}