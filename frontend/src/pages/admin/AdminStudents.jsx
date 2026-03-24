import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState(""); // ✅ STEP 1
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

  // ✅ NEW — collapsible state
  const [openClasses, setOpenClasses] = useState({});

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

  // ✅ STEP 2 — filtering
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

  // ✅ STEP 3 — grouping
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    const className =
      student.className ||
      student.class?.name ||
      student.class ||
      "Unassigned";

    if (!acc[className]) {
      acc[className] = [];
    }

    acc[className].push(student);
    return acc;
  }, {});

  // ✅ NEW — toggle function
  const toggleClass = (className) => {
    setOpenClasses((prev) => ({
      ...prev,
      [className]: !prev[className],
    }));
  };

  // ✅ OPTIONAL — open all by default
  useEffect(() => {
    const initialState = {};
    Object.keys(groupedStudents).forEach((cls) => {
      initialState[cls] = true;
    });
    setOpenClasses(initialState);
  }, [students]);

  // ✅ DEBUG VERSION
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

      console.log("======================================");
      console.log("🚀 BACKEND VERSION TEST 123");
      console.log("API BASE URL:", apiClient.defaults.baseURL);
      console.log(
        "FULL URL:",
        `${apiClient.defaults.baseURL}/admin/students`
      );
      console.log("PAYLOAD:", payload);
      console.log("======================================");

      const response = await apiClient.post("/admin/students", payload);

      console.log("✅ RESPONSE:", response.data);

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
      console.error("❌ CREATE STUDENT ERROR:", err);
      console.error("❌ RESPONSE:", err?.response);

      alert(
        err?.response?.data?.message ||
        "Failed to create student"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Students</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          + Create Student
        </button>
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
          Object.entries(groupedStudents).map(([className, classStudents]) => (
            <div key={className} className="mb-6">

              {/* ✅ COLLAPSIBLE HEADER */}
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

              {/* ✅ CONDITIONAL TABLE */}
              {openClasses[className] && (
                <div className="bg-white border rounded-lg overflow-hidden mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Admission No</th>
                        <th className="p-3">Parent</th>
                      </tr>
                    </thead>

                    <tbody>
                      {classStudents.map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="p-3">
                            {s.firstName} {s.lastName}
                          </td>
                          <td className="p-3">{s.admissionNo}</td>
                          <td className="p-3">
                            {s.parentName || s.parent?.name || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {showForm && (
        <form
          onSubmit={submitForm}
          className="fixed inset-0 bg-black/30 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded w-96 space-y-4">
            <h2 className="text-lg font-semibold">Create Student</h2>

            <input
              required
              placeholder="First name"
              className="w-full p-2 border rounded"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: e.target.value })
              }
            />

            <input
              required
              placeholder="Last name"
              className="w-full p-2 border rounded"
              value={form.lastName}
              onChange={(e) =>
                setForm({ ...form, lastName: e.target.value })
              }
            />

            <input
              required
              placeholder="Admission number"
              className="w-full p-2 border rounded"
              value={form.admissionNo}
              onChange={(e) =>
                setForm({ ...form, admissionNo: e.target.value })
              }
            />

            <select
              required
              className="w-full p-2 border rounded"
              value={form.classId}
              onChange={(e) =>
                setForm({ ...form, classId: e.target.value })
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
                setForm({ ...form, parentId: e.target.value })
              }
            >
              <option value="">Link parent (optional)</option>
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