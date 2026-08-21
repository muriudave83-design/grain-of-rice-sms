import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { formatTermLabel } from "../../utils/formatTermLabel";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fees, setFees] = useState([]);
  const [discipline, setDiscipline] = useState([]);

  // 🔥 TERMS STATE
  const [terms, setTerms] = useState([]);
  const [currentTermId, setCurrentTermId] = useState("");
  const [currentTerm, setCurrentTerm] = useState(null);

  // 🔥 LOAD TERMS FIRST
  useEffect(() => {
    fetchTerms();
  }, []);

  // 🔥 RELOAD DASHBOARD WHEN TERM CHANGES
  useEffect(() => {
    if (currentTermId) {
      fetchDashboardData();
    }
  }, [currentTermId]);

  const fetchTerms = async () => {
    try {
      const termsRes = await apiClient
        .get("/terms", { silent: true })
        .catch(() => ({ data: [] }));

      const termsData = termsRes.data || [];

      // 🔥 FILTER ONLY THESE TERMS
      const filteredTerms = termsData;

      // 🔥 STORE FILTERED TERMS ONLY
      setTerms(filteredTerms);

      // 🔥 DEFAULT TERM
      if (filteredTerms.length > 0) {
        setCurrentTermId(String(filteredTerms[0].id));
        setCurrentTerm(filteredTerms[0]);
      }
    } catch (err) {
      console.error("Failed to fetch terms:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const query = `?termId=${currentTermId}`;

      // 🔥 GLOBAL DATA
      const studentsRes = await apiClient
        .get("/students", { silent: true })
        .catch(() => ({ data: [] }));

      const teachersRes = await apiClient
        .get("/admin/users", { silent: true })
        .catch(() => ({ data: [] }));

      // 🔥 TERM-BASED DATA
      const classesRes = await apiClient
        .get(`/admin/classes${query}`, {
          silent: true,
        })
        .catch(() => ({ data: [] }));

      const feesRes = await apiClient
        .get(`/fees${query}`, { silent: true })
        .catch(() => ({ data: [] }));

      const disciplineRes = await apiClient
        .get(`/discipline${query}`, {
          silent: true,
        })
        .catch(() => ({ data: [] }));

      setStudents(studentsRes.data || []);

      // ✅ FILTER ONLY TEACHERS
      const allUsers = teachersRes.data || [];

      const teacherList = allUsers.filter(
        (u) => u.role === "TEACHER"
      );

      setTeachers(teacherList);

      setClasses(classesRes.data || []);
      setFees(feesRes.data || []);
      setDiscipline(disciplineRes.data || []);

      // 🔥 UPDATE CURRENT TERM OBJECT
      const selected = terms.find(
        (t) => String(t.id) === String(currentTermId)
      );

      setCurrentTerm(selected || null);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    }
  };

  // 📊 CALCULATIONS
  const totalFees = fees.reduce(
    (sum, f) => sum + (f.amount || 0),
    0
  );

  const totalPaid = fees.reduce(
    (sum, f) => sum + (f.paid || 0),
    0
  );

  const totalOutstanding =
    totalFees - totalPaid;

  // 🔥 TERM FILTERED
  const disciplineThisTerm =
    discipline.length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Dashboard
      </h1>

      {/* 🔥 TERM SELECTOR + LOCK BUTTON */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1" htmlFor="dashboard-term-filter">
          Dashboard filter — class-specific term
        </label>
        <p className="text-sm text-gray-500 mb-2">
          This filters dashboard data only. It does not assign a term to other classes.
        </p>
        <div className="flex items-center">
        <select
          id="dashboard-term-filter"
          value={currentTermId}
          onChange={(e) => {
            const id = e.target.value;

            setCurrentTermId(id);

            const selected = terms.find(
              (t) => String(t.id) === String(id)
            );

            setCurrentTerm(selected || null);
          }}
          className="border p-2"
        >
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {formatTermLabel(t)}
          </option>
        ))}
        </select>

        {/* 🔒 LOCK BUTTON */}
        <button
          onClick={async () => {
            if (!currentTermId) return;

            try {
              await apiClient.put(
                `/terms/${currentTermId}/lock`
              );

              // 🔥 REFRESH TERMS + DASHBOARD
              await fetchTerms();
              await fetchDashboardData();

              alert("Term status updated");
            } catch (err) {
              console.error(err);
              alert("Failed to update term");
            }
          }}
          className={`px-3 py-1 ml-2 ${
            currentTerm?.isLocked
              ? "bg-red-500"
              : "bg-green-500"
          } text-white`}
        >
          {currentTerm?.isLocked
            ? "Unlock Term"
            : "Lock Term"}
        </button>
        </div>
      </div>

      {/* 🔥 FINANCIAL + DISCIPLINE STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Students
          </p>

          <p className="text-xl font-bold">
            {students.length}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Total Fees
          </p>

          <p className="text-xl font-bold">
            {totalFees}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Total Paid
          </p>

          <p className="text-xl font-bold">
            {totalPaid}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Outstanding
          </p>

          <p className="text-xl font-bold">
            {totalOutstanding}
          </p>
        </div>

        <div className="border p-4 rounded col-span-2">
          <p className="text-gray-500">
            Discipline (This Term)
          </p>

          <p className="text-xl font-bold">
            {disciplineThisTerm}
          </p>
        </div>
      </div>

      {/* 🔥 ORIGINAL DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Total Students
          </p>

          <p className="text-xl font-bold">
            {students.length}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Total Teachers
          </p>

          <p className="text-xl font-bold">
            {teachers.length}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Active Classes
          </p>

          <p className="text-xl font-bold">
            {classes.length}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-gray-500">
            Avg Attendance
          </p>

          <p className="text-xl font-bold">
            —
          </p>
        </div>
      </div>

      {/* 🔥 QUICK ACTIONS */}
      <div className="border p-4 rounded">
        <h2 className="mb-3 font-semibold">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() =>
              navigate(
                "/dashboard/admin/students"
              )
            }
            className="bg-yellow-500 text-white p-2 rounded"
          >
            Add Student
          </button>

          <button
            onClick={() =>
              navigate(
                "/dashboard/admin/teachers"
              )
            }
            className="bg-pink-500 text-white p-2 rounded"
          >
            Add Teacher
          </button>

          <button
            onClick={() =>
              navigate(
                "/dashboard/admin/parents"
              )
            }
            className="bg-green-500 text-white p-2 rounded"
          >
            Add Parent
          </button>
        </div>
      </div>
    </div>
  );
}
