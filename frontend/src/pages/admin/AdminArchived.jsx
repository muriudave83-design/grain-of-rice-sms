import { useCallback, useEffect, useState } from "react";
import api from "../../services/apiClient";
import { useNavigate } from "react-router-dom";

export default function AdminArchived() {
  const navigate = useNavigate();
  // ✅ NEW STATE
  const [activeTab, setActiveTab] = useState("students");

  const [students, setStudents] = useState([]);
  const [archivedTeachers, setArchivedTeachers] = useState([]);
  const [archivedParents, setArchivedParents] = useState([]);
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState([]);
  const [restoreClass, setRestoreClass] = useState({});

  // ===============================
  // FETCH FUNCTIONS
  // ===============================
  const fetchArchivedStudents = useCallback(async () => {
    try {
      const res = await api.get("/admin/archived/students", { params: { search, page: 1, pageSize: 100 } });
      setStudents(res.data.records || []);
    } catch (err) {
      console.error("Failed to load archived students", err);
    }
  }, [search]);

  const fetchArchivedTeachers = async () => {
    try {
      const res = await api.get("/admin/archived/teachers");
      setArchivedTeachers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchArchivedParents = async () => {
    try {
      const res = await api.get("/admin/archived/parents");
      setArchivedParents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // LOAD ALL
  // ===============================
  useEffect(() => {
    fetchArchivedTeachers(); // ADD
    fetchArchivedParents(); // ADD
    api.get("/admin/classes").then((res) => setClasses(res.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchArchivedStudents, 250);
    return () => clearTimeout(timer);
  }, [fetchArchivedStudents]);

  // ===============================
  // RESTORE FUNCTIONS
  // ===============================
  const handleRestoreStudent = async (student) => {
    try {
      const classId = Number(restoreClass[student.id]);
      if (!classId || !window.confirm(`Restore ${student.name} to the selected active class?`)) return;
      await api.put(`/admin/students/${student.id}/restore`, { classId });
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      console.error("Restore failed", err);
      alert("Failed to restore student");
    }
  };

  const handleRestoreTeacher = async (id) => {
    try {
      await api.put(`/admin/teachers/${id}/restore`);
      setArchivedTeachers((prev) =>
        prev.filter((t) => t.id !== id)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to restore teacher");
    }
  };

  const handleRestoreParent = async (id) => {
    try {
      await api.put(`/admin/parents/${id}/restore`);
      setArchivedParents((prev) =>
        prev.filter((p) => p.id !== id)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to restore parent");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        Archived Records
      </h1>

      {/* ✅ TABS */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-3 py-1 rounded ${
            activeTab === "students"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Students
        </button>

        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-3 py-1 rounded ${
            activeTab === "teachers"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Teachers
        </button>

        <button
          onClick={() => setActiveTab("parents")}
          className={`px-3 py-1 rounded ${
            activeTab === "parents"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Parents
        </button>
      </div>

      {/* ===============================
          STUDENTS (UNCHANGED LOGIC)
      =============================== */}
      {activeTab === "students" && (
        <div>
        <h2 className="font-semibold">Archived Students</h2>
        <p className="text-sm text-gray-500 mb-3">Permanent records for former students.</p>
        <input className="border rounded px-3 py-2 mb-3 w-full max-w-md" placeholder="Search name or admission number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Admission No</th>
                <th className="p-3">Last Class</th>
                <th className="p-3">Status</th>
                <th className="p-3">Archived Date</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.admissionNo}</td>
                  <td className="p-3">
                    {s.className || "—"}
                  </td>
                  <td className="p-3"><span className="rounded-full bg-amber-100 text-amber-800 px-2 py-1">Former Student</span></td>
                  <td className="p-3">{s.archivedAt ? new Date(s.archivedAt).toLocaleDateString() : "Not recorded"}</td>

                  <td className="p-3">
                    <button onClick={() => navigate(`/dashboard/admin/archived/students/${s.id}`)} className="px-3 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800 mr-2">View Record</button>
                    <select aria-label={`Restore class for ${s.name}`} className="border rounded px-2 py-1 text-xs mr-2" value={restoreClass[s.id] || ""} onChange={(e) => setRestoreClass((old) => ({ ...old, [s.id]: e.target.value }))}><option value="">Select active class…</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                    <button
                      onClick={() =>
                        handleRestoreStudent(s)
                      }
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
              No archived students found.
            </div>
          )}
        </div></div>
      )}

      {/* ===============================
          TEACHERS
      =============================== */}
      {activeTab === "teachers" && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {archivedTeachers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">{t.email}</td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        handleRestoreTeacher(t.id)
                      }
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {archivedTeachers.length === 0 && (
            <div className="p-4 text-sm text-gray-500">
              No archived teachers
            </div>
          )}
        </div>
      )}

      {/* ===============================
          PARENTS
      =============================== */}
      {activeTab === "parents" && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {archivedParents.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.email}</td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        handleRestoreParent(p.id)
                      }
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {archivedParents.length === 0 && (
            <div className="p-4 text-sm text-gray-500">
              No archived parents
            </div>
          )}
        </div>
      )}
    </div>
  );
}
