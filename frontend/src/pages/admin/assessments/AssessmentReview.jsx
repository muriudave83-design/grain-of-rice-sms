import api from "@/services/apiClient";

export default function AssessmentReview({ assessment, reload }) {

  async function publish() {
    if (!window.confirm("Publish this assessment?"))
      return;

    await api.post(`/assessments/${assessment.id}/publish`);
    alert("Published");
    reload();
  }

  async function unpublish() {
    if (!window.confirm("Return to submitted state?"))
      return;

    await api.post(`/assessments/${assessment.id}/unpublish`);
    alert("Unpublished");
    reload();
  }

  return (
    <div className="p-4 border rounded">

      <h3 className="font-bold mb-2">
        {assessment.title}
      </h3>

      <p>Status: {assessment.status}</p>

      {assessment.status === "SUBMITTED" && (
        <button
          onClick={publish}
          className="bg-green-600 text-white px-3 py-1 mt-2"
        >
          Publish
        </button>
      )}

      {assessment.status === "PUBLISHED" && (
        <button
          onClick={unpublish}
          className="bg-yellow-600 text-white px-3 py-1 mt-2"
        >
          Unpublish
        </button>
      )}
    </div>
  );
}
