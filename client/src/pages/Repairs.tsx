import { type FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, ErrorBanner, Field, Input, Select } from "../components/ui";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/Badge";
import { money, dateTime } from "../lib/format";
import type { Customer, RepairJob, RepairStatus } from "../types";

const statuses: RepairStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
];

const emptyForm = {
  customerId: "",
  deviceType: "",
  brand: "",
  model: "",
  serialNumber: "",
  issueDescription: "",
  estimateCost: "",
};

export function Repairs() {
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<RepairJob | null>(null);
  const [editStatus, setEditStatus] = useState<RepairStatus>("RECEIVED");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editFinalCost, setEditFinalCost] = useState("");

  async function load() {
    try {
      const res = await api.get("/repairs", { params: { status: statusFilter || undefined } });
      setRepairs(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setCreateOpen(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/repairs", {
        ...form,
        estimateCost: form.estimateCost ? Number(form.estimateCost) : undefined,
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openDetail(r: RepairJob) {
    setSelected(r);
    setEditStatus(r.status);
    setEditDiagnosis(r.diagnosis || "");
    setEditFinalCost(r.finalCost != null ? String(r.finalCost) : "");
  }

  async function handleUpdate() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/repairs/${selected.id}`, {
        status: editStatus,
        diagnosis: editDiagnosis || undefined,
        finalCost: editFinalCost ? Number(editFinalCost) : undefined,
      });
      setSelected(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Repair Jobs</h1>
        <Button onClick={openCreate}>+ New Repair Job</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${!statusFilter ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </Card>

      <ErrorBanner message={error} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="px-4 py-3">Job No</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {repairs.map((r) => (
              <tr key={r.id} onClick={() => openDetail(r)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-indigo-600">{r.jobNo}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.customer?.name}</td>
                <td className="px-4 py-2.5 text-slate-500">
                  {r.deviceType} {r.brand ? `— ${r.brand}` : ""} {r.model || ""}
                </td>
                <td className="px-4 py-2.5 max-w-xs truncate text-slate-500">{r.issueDescription}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2.5 text-slate-500">{dateTime(r.receivedAt)}</td>
              </tr>
            ))}
            {repairs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No repair jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Repair Job">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Customer">
            <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Device Type">
              <Input required placeholder="Smartphone, Laptop, TV…" value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })} />
            </Field>
            <Field label="Brand">
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Model">
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </Field>
            <Field label="Serial Number">
              <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            </Field>
          </div>
          <Field label="Issue Description">
            <Input required value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} />
          </Field>
          <Field label="Estimate Cost">
            <Input type="number" min="0" step="0.01" value={form.estimateCost} onChange={(e) => setForm({ ...form, estimateCost: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create Job"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Repair ${selected.jobNo}` : ""}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div>
                <span className="text-slate-400">Customer: </span>
                {selected.customer?.name}
              </div>
              <div>
                <span className="text-slate-400">Device: </span>
                {selected.deviceType} {selected.brand} {selected.model}
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Issue: </span>
                {selected.issueDescription}
              </div>
              {selected.estimateCost != null && (
                <div>
                  <span className="text-slate-400">Estimate: </span>
                  {money(selected.estimateCost)}
                </div>
              )}
            </div>
            <Field label="Status">
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as RepairStatus)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Diagnosis / Notes">
              <Input value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} />
            </Field>
            <Field label="Final Cost">
              <Input type="number" min="0" step="0.01" value={editFinalCost} onChange={(e) => setEditFinalCost(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? "Saving…" : "Update Job"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
