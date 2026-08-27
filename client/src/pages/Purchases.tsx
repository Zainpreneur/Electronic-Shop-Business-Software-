import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, ErrorBanner, Field, Input, Select } from "../components/ui";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/Badge";
import { money, dateTime } from "../lib/format";
import type { Product, Purchase, Supplier } from "../types";

interface DraftLine {
  productId: string;
  qty: number;
  unitCost: number;
}

export function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [markReceived, setMarkReceived] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Purchase | null>(null);

  async function load() {
    try {
      const res = await api.get("/purchases");
      setPurchases(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    api.get("/suppliers").then((res) => setSuppliers(res.data));
    api.get("/products").then((res) => setProducts(res.data));
  }, []);

  function openCreate() {
    setSupplierId("");
    setLines([{ productId: "", qty: 1, unitCost: 0 }]);
    setMarkReceived(true);
    setModalOpen(true);
  }

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", qty: 1, unitCost: 0 }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const items = lines.filter((l) => l.productId && l.qty > 0);
      await api.post("/purchases", {
        supplierId,
        items,
        status: markReceived ? "RECEIVED" : "ORDERED",
      });
      setModalOpen(false);
      await load();
      api.get("/products").then((res) => setProducts(res.data));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReceive(p: Purchase) {
    try {
      await api.put(`/purchases/${p.id}/receive`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleCancel(p: Purchase) {
    if (!confirm(`Cancel purchase order ${p.refNo}?`)) return;
    try {
      await api.put(`/purchases/${p.id}/cancel`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
        <Button onClick={openCreate}>+ New Purchase Order</Button>
      </div>

      <ErrorBanner message={error} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="px-4 py-3">Ref No</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-indigo-600">{p.refNo}</td>
                <td className="px-4 py-2.5 text-slate-500">{dateTime(p.createdAt)}</td>
                <td className="px-4 py-2.5 text-slate-500">{p.supplier?.name}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{money(p.total)}</td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No purchase orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Purchase Order" wide>
        <div className="space-y-4">
          <Field label="Supplier">
            <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Items</div>
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select className="flex-1" value={line.productId} onChange={(e) => updateLine(idx, { productId: e.target.value })}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={line.qty}
                  onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-28"
                  value={line.unitCost}
                  onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value) })}
                  placeholder="Unit cost"
                />
                <button onClick={() => removeLine(idx)} className="text-rose-500 hover:text-rose-700">
                  ✕
                </button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addLine}>
              + Add Item
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={markReceived} onChange={(e) => setMarkReceived(e.target.checked)} />
            Mark as received now (adds stock immediately)
          </label>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-lg font-bold text-slate-800">Total: {money(total)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!supplierId || lines.every((l) => !l.productId) || saving} onClick={handleSubmit}>
                {saving ? "Saving…" : "Create Purchase Order"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Purchase ${selected.refNo}` : ""} wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div>
                <span className="text-slate-400">Supplier: </span>
                {selected.supplier?.name}
              </div>
              <div>
                <span className="text-slate-400">Status: </span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-1.5">Item</th>
                  <th className="py-1.5 text-right">Qty</th>
                  <th className="py-1.5 text-right">Unit Cost</th>
                  <th className="py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selected.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-1.5">{i.product?.name || i.productId}</td>
                    <td className="py-1.5 text-right">{i.qty}</td>
                    <td className="py-1.5 text-right">{money(i.unitCost)}</td>
                    <td className="py-1.5 text-right">{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-base font-bold text-slate-800">
              <span>Total</span>
              <span>{money(selected.total)}</span>
            </div>
            {selected.status === "ORDERED" && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="danger" onClick={() => handleCancel(selected)}>
                  Cancel Order
                </Button>
                <Button onClick={() => handleReceive(selected)}>Mark Received</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
