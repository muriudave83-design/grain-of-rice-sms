import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function GenerateReportCards() {
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [force, setForce] = useState(false);
  const [strict, setStrict] = useState(false);
  const [result, setResult] = useState(null);

  async function generate() {
    const res = await fetch("/api/report-cards/generate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termId: Number(termId),
        classId: Number(classId),
        options: { force, strict },
      }),
    });
    const data = await res.json();
    setResult(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Generate Report Cards</h1>

      <div className="grid grid-cols-2 gap-4">
        <Input placeholder="Term ID" value={termId}
          onChange={e => setTermId(e.target.value)} />
        <Input placeholder="Class ID" value={classId}
          onChange={e => setClassId(e.target.value)} />
      </div>

      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2">
          <Checkbox checked={force} onCheckedChange={setForce} />
          Force regenerate
        </label>

        <label className="flex items-center gap-2">
          <Checkbox checked={strict} onCheckedChange={setStrict} />
          Strict mode
        </label>
      </div>

      <Button onClick={generate}>Generate</Button>

      {result && (
        <pre className="bg-muted p-4 rounded text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
