import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { filterAndSortReportStudents, getStudentDisplayName } from "../../utils/adminReportStudents";

export default function AdminReportsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get("/admin/students");
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const classes = Array.from(
    new Map(students.filter((student) => student.class).map((student) => [student.class.id, student.class])).values(),
  ).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) || left.id - right.id);
  const visibleStudents = filterAndSortReportStudents(students, search, classId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Student Reports</h1>

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <label htmlFor="student-report-search" className="mb-1 block text-sm font-medium">Search students</label>
          <div className="flex gap-2">
            <input id="student-report-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student by any name..." className="min-w-0 flex-1 rounded border px-3 py-2" />
            {search && <button type="button" onClick={() => setSearch("")} className="rounded border px-3 py-2">Clear</button>}
          </div>
        </div>
        <label className="block text-sm font-medium">
          Class
          <select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2">
            <option value="">All classes</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
        </label>
      </div>

      {visibleStudents.map((s) => (
        <div
          key={s.id}
          onClick={() => navigate(`/dashboard/admin/reports/${s.id}`)}
          className="p-3 border mb-2 cursor-pointer hover:bg-gray-100"
        >
          <span>{getStudentDisplayName(s)}</span>
          {s.class?.name && <span className="ml-2 text-sm text-gray-500">{s.class.name}</span>}
        </div>
      ))}
      {visibleStudents.length === 0 && <p className="rounded border border-dashed p-4 text-gray-600">No students match your search and class filter.</p>}
    </div>
  );
}
