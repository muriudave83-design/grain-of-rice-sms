import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/teacher/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error(err);
      setClasses([]);
    }
  };

  return (
    <div>
      <h2>My Classes</h2>

      {classes.length === 0 ? (
        <p>No classes assigned</p>
      ) : (
        classes.map((cls) => (
          <div
            key={cls.id}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              marginBottom: "10px",
              cursor: "pointer",
            }}
            onClick={() => navigate(`/teacher/class/${cls.id}`)}
          >
            {cls.name}
          </div>
        ))
      )}
    </div>
  );
}