import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherClassDetails() {
  const { id } = useParams();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, [id]);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/teacher/class/${id}/students`);
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setStudents([]);
    }
  };

  return (
    <div>
      <h2>Class Students</h2>

      {students.length === 0 ? (
        <p>No students in this class</p>
      ) : (
        students.map((student) => (
          <div key={student.id}>
            {student.firstName} {student.lastName}
          </div>
        ))
      )}
    </div>
  );
}