import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import api from "@/services/apiClient";

export default function TeacherAttendanceList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teacher/classes")
      .then(res => setClasses(res.data))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (!classes.length) return <p>No classes assigned.</p>;

  return (
    <div className="space-y-4">
      {classes.map(cls => (
        <Card key={cls.id}>
          <CardContent className="flex justify-between items-center p-4">
            <span className="font-semibold">{cls.name}</span>

            <Link to={`/dashboard/teacher/attendance/class/${cls.id}`}>
              <Button>View Attendance</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
