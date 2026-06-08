import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = import.meta.env.VITE_API_URL;

export default function PublishReportCards() {
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [result, setResult] = useState(null);

  async function publish() {
    const res = await fetch(`${API_URL}/report-cards/publish`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termId: Number(termId),
        classId: Number(classId),
      }),
    });

    const data = await res.json();
    setResult(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Publish Report Cards</h1>

      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="Term ID"
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
        />

        <Input
          placeholder="Class ID"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        />
      </div>

      <Button variant="destructive" onClick={publish}>
        Publish Report Cards
      </Button>

      {result && (
        <pre className="bg-muted p-4 rounded text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}