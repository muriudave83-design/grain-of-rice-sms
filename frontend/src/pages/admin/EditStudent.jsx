import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function EditStudent() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await apiClient.get(`/admin/students/${id}`);
        setStudent(res.data);
      } catch (err) {
        console.error("Failed to fetch student", err);
      }
    };

    fetchStudent();
  }, [id]);

  if (!student) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Edit {student.firstName} {student.lastName}
      </h2>

      <div className="bg-white p-4 rounded border space-y-2">
        <p><strong>Admission:</strong> {student.admissionNo}</p>
        <p><strong>Class:</strong> {student.class?.name || "—"}</p>
      </div>
    </div>
  );
}