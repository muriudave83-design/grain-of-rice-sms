  import { useEffect, useState } from "react";
  import { useParams, Link } from "react-router-dom";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import api from "@/services/apiClient";
  
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
        <Button
          onClick={() =>
            api.post("/attendance/sessions", { classId })
              .then(res =>
                window.location.href =
                    `/teacher/attendance/session/${res.data.id}`
              )
          }
        >
          Take Attendance
        </Button>
      );
    }

    return (
      <div className="space-y-2">
        {sessions.map(s => (
          <div key={s.id} className="flex justify-between items-center">
            <span>{new Date(s.date).toDateString()}</span>

            <Badge className={s.status === "DRAFT" ? "bg-yellow-500" : "bg-green-600"}>
              {s.status}
            </Badge>

            <Link to={`/dashboard/teacher/attendance/session/${s.id}`}>
              <Button variant="outline">
                {s.status === "DRAFT" ? "Continue" : "View"}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    );
  }
