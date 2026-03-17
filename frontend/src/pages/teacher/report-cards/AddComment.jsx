import { useState } from "react";
import api from "@/services/apiClient";

export default function AddComment({ reportCardId, initialComment, onSaved }) {
  const [comment, setComment] = useState(initialComment || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setError(null);
    setSaved(false);

    if (!comment.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    if (comment.length > 1000) {
      setError("Comment is too long.");
      return;
    }

    try {
      setSaving(true);

      const res = await api.patch(`/report-cards/${reportCardId}/comments`, {
        comment,
      });

      setSaved(true);

      // clear success state after 2 seconds
      setTimeout(() => setSaved(false), 2000);

      onSaved?.(res.data);

    } catch (err) {
      if (err.response?.status === 403) {
        setError("You are not authorized to edit this report card.");
      } else if (err.response?.status === 409) {
        setError("This report card is locked.");
      } else {
        setError("Failed to save comment.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="font-medium mb-2">Teacher Comment</h3>

      <textarea
        className="w-full border rounded p-2 min-h-[120px]"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={saving}
      />

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {saved && (
        <p className="text-green-600 mt-2">
          Comment saved successfully
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Comment"}
      </button>
    </div>
  );
}