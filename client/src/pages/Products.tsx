import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, ErrorBanner, Field, Input, Select } from "../components/ui";
import { Modal } from "../components/Modal";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import type { Category, Product } from "../types";

const emptyForm = {
  sku: "",
  name: "",
  brand: "",
  categoryId: "",
  costPrice: "0",
  sellingPrice: "0",
  stockQty: "0",
  reorderLevel: "5",
  description: "",
};

export function Products() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(params.get("lowStock") === "true");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/products", { params: { q, lowStock: lowStockOnly || undefined } });
      setProducts(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, lowStockOnly]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      brand: p.brand || "",
      categoryId: p.categoryId || "",
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      stockQty: String(p.stockQty),
      reorderLevel: String(p.reorderLevel),
      description: p.description || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      sku: form.sku,
      name: form.name,
      brand: form.brand || undefined,
      categoryId: form.categoryId || null,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      stockQty: Number(form.stockQty),
      reorderLevel: Number(form.reorderLevel),
      description: form.description || undefined,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(p: Product) {
    if (!confirm(`Deactivate "${p.name}"? It will no longer appear in POS.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const totalStockValue = useMemo(() => products.reduce((s, p) => s + p.costPrice * p.stockQty, 0), [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-sm text-slate-500">{products.length} items · Stock value {money(totalStockValue)}</p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ Add Product</Button>}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search by name, SKU, or brand…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>
      </Card>

      <ErrorBanner message={error} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className={p.stockQty <= p.reorderLevel ? "bg-rose-50/40" : ""}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-700">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.brand}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{p.category?.name || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{money(p.costPrice)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">{money(p.sellingPrice)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={p.stockQty <= p.reorderLevel ? "font-semibold text-rose-600" : "text-slate-700"}>
                      {p.stockQty}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openEdit(p)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDeactivate(p)} className="text-xs font-medium text-rose-600 hover:underline">
                        Deactivate
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU">
              <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Brand">
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
          </div>
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Category">
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cost Price">
              <Input type="number" step="0.01" min="0" required value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </Field>
            <Field label="Selling Price">
              <Input type="number" step="0.01" min="0" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
            </Field>
            <Field label="Stock Quantity">
              <Input type="number" min="0" required disabled={!!editing} value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
            </Field>
            <Field label="Reorder Level">
              <Input type="number" min="0" required value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </Field>
          </div>
          {editing && (
            <p className="text-xs text-slate-400">
              Stock quantity can't be edited here — use Purchases to receive stock or the stock adjustment endpoint.
            </p>
          )}
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
