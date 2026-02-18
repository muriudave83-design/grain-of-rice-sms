import { useParams, Navigate } from "react-router-dom";

/**
 * TEMP v1:
 * Edit page is an alias for Scores Entry.
 * Prevents auth redirect loop.
 */
export default function EditAssessmentRedirect() {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/teacher/assessments" replace />;
  }

  return <Navigate to={`/teacher/assessments/${id}/scores`} replace />;
}
