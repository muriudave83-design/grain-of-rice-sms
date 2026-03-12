import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../../services/apiClient";

export default function TeacherAttendanceClass() {

  const { classId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/attendance/classes/${classId}`)
      .then(res => setSessions(res.data))
      .catch(err => setError(err.response?.status));
  }, [classId]);

  if (error === 403) return <p>Forbidden</p>;

  if (!sessions.length) {
    return (
      <button
        onClick={() =>
          api.post("/attendance/sessions", { classId })
            .then(res =>
              window.location.href =
                `/teacher/attendance/session/${res.data.id}`
            )
        }
      >
        Take Attendance
      </button>
    );
  }

  return (
    <div>

      <h2>Attendance Sessions</h2>

      {sessions.map(s => (

        <div key={s.id} style={{marginBottom:"10px"}}>

          <span>{new Date(s.date).toDateString()}</span>

          <span style={{marginLeft:"10px"}}>
            {s.status}
          </span>

          <Link
            style={{marginLeft:"10px"}}
            to={`/teacher/attendance/session/${s.id}`}
          >
            <button>
              {s.status === "DRAFT" ? "Continue" : "View"}
            </button>
          </Link>

        </div>

      ))}

    </div>
  );
}