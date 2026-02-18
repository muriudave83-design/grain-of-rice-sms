import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TermManagement() {
  const [terms, setTerms] = useState([]);
  const [form, setForm] = useState({
    name: "",
    academicYear: "",
    startDate: "",
    endDate: "",
  });

  async function fetchTerms() {
    const res = await fetch("/api/terms", { credentials: "include" });
    const data = await res.json();
    setTerms(data || []);
  }

  async function createTerm() {
    await fetch("/api/terms", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", academicYear: "", startDate: "", endDate: "" });
    fetchTerms();
  }

  useEffect(() => {
    fetchTerms();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Academic Terms</h1>

      <div className="grid grid-cols-4 gap-4">
        <Input placeholder="Term name" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Academic year" value={form.academicYear}
          onChange={e => setForm({ ...form, academicYear: e.target.value })} />
        <Input type="date" value={form.startDate}
          onChange={e => setForm({ ...form, startDate: e.target.value })} />
        <Input type="date" value={form.endDate}
          onChange={e => setForm({ ...form, endDate: e.target.value })} />
      </div>

      <Button onClick={createTerm}>Create Term</Button>

      <div className="border rounded p-4">
        {terms.map(t => (
          <div key={t.id} className="flex justify-between py-2 border-b">
            <span>{t.name} ({t.academicYear})</span>
            <span>{t.isActive ? "Active" : "Inactive"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
