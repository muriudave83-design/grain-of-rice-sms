import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";

export default function AdminReportsPage() {
  const [students, setStudents] = useState([]);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Student Reports</h1>

      {students.map((s) => (
        <div
          key={s.id}
          onClick={() => navigate(`/dashboard/admin/reports/${s.id}`)}
          className="p-3 border mb-2 cursor-pointer hover:bg-gray-100"
        >
          {s.firstName} {s.lastName}
        </div>
      ))}
    </div>
  );
}