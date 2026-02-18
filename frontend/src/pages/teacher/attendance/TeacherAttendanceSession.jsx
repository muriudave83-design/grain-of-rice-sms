import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/services/apiClient";

export default function TeacherAttendanceSession() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/attendance/sessions/${sessionId}`)
      .then(res => setSession(res.data))
      .catch(err => setError(err.response?.status));
  }, [sessionId]);

  if (error === 404) return <p>Not found</p>;
  if (error === 403) return <p>Forbidden</p>;
  if (!session) return <p>Loading…</p>;

  const isDraft = session.status === "DRAFT";

  return (
    <div className="space-y-4">
      <Badge className={isDraft ? "bg-yellow-500" : "bg-green-600"}>
        {session.status}
      </Badge>

      {!isDraft && (
        <div className="text-sm text-gray-600">
          <p>Class ID: {session.classId}</p>
          <p>Date: {new Date(session.date).toDateString()}</p>
          <p>Submitted at: {new Date(session.updatedAt).toLocaleString()}</p>
        </div>
      )}

      {isDraft && (
        <Button
          onClick={() => {
            if (
              !confirm(
                "Once submitted, attendance cannot be changed. Continue?"
              )
            ) {
              return;
            }

            api
              .post(`/attendance/sessions/${session.id}/submit`)
              .then(() => {
                alert("Attendance submitted successfully");
                setSession(prev => ({
                  ...prev,
                  status: "SUBMITTED",
                }));
              })
              .catch(err =>
                alert(
                  err.response?.status === 409
                    ? "Attendance already submitted"
                    : "Error submitting attendance"
                )
              );
          }}
        >
          Submit Attendance
        </Button>
      )}
    </div>
  );
}
