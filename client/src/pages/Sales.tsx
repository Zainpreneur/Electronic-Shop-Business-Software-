import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Card, ErrorBanner } from "../components/ui";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/Badge";
import { Button } from "../components/ui";
import { money, dateTime } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import type { Sale } from "../types";

export function Sales() {
  const { user } = useAuth();
  const canCancel = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sale | null>(null);

  async function load() {
    try {
      const res = await api.get("/sales");
      setSales(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(sale: Sale) {
    if (!confirm(`Cancel invoice ${sale.invoiceNo}? Stock will be restored.`)) return;
    try {
      await api.put(`/sales/${sale.id}/cancel`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
      <ErrorBanner message={error} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-indigo-600">{s.invoiceNo}</td>
                  <td className="px-4 py-2.5 text-slate-500">{dateTime(s.createdAt)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.customer?.name || "Walk-in"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.user?.name}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">{money(s.total)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Invoice ${selected.invoiceNo}` : ""}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div>
                <span className="text-slate-400">Date: </span>
                {dateTime(selected.createdAt)}
              </div>
              <div>
                <span className="text-slate-400">Status: </span>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <span className="text-slate-400">Customer: </span>
                {selected.customer?.name || "Walk-in"}
              </div>
              <div>
                <span className="text-slate-400">Cashier: </span>
                {selected.user?.name}
              </div>
              <div>
                <span className="text-slate-400">Payment: </span>
                {selected.paymentMethod.replace(/_/g, " ")}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-1.5">Item</th>
                  <th className="py-1.5 text-right">Qty</th>
                  <th className="py-1.5 text-right">Price</th>
                  <th className="py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selected.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-1.5">{i.product?.name || i.productId}</td>
                    <td className="py-1.5 text-right">{i.qty}</td>
                    <td className="py-1.5 text-right">{money(i.unitPrice)}</td>
                    <td className="py-1.5 text-right">{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{money(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{money(selected.discount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span>+{money(selected.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800">
                <span>Total</span>
                <span>{money(selected.total)}</span>
              </div>
            </div>
            {canCancel && selected.status === "COMPLETED" && (
              <div className="flex justify-end pt-2">
                <Button variant="danger" onClick={() => handleCancel(selected)}>
                  Cancel Sale
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
