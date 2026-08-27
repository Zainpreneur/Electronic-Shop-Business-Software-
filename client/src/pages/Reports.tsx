import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Card, ErrorBanner, Field, Input, Button } from "../components/ui";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  itemsSold: number;
  avgOrderValue: number;
}

interface TopProduct {
  product: string;
  sku: string;
  qty: number;
  revenue: number;
}

interface InventoryReport {
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  products: { id: string; sku: string; name: string; category: string | null; stockQty: number; costPrice: number; sellingPrice: number; stockValue: number }[];
}

export function Reports() {
  const { user } = useAuth();
  const canSeeInventory = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const params = { from: from || undefined, to: to || undefined };
      const [salesRes, topRes] = await Promise.all([
        api.get("/reports/sales", { params }),
        api.get("/reports/top-products", { params }),
      ]);
      setSales(salesRes.data);
      setTop(topRes.data);
      if (canSeeInventory) {
        const invRes = await api.get("/reports/inventory");
        setInventory(invRes.data);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Reports</h1>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button onClick={load}>Apply</Button>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {sales && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <div className="text-sm font-medium text-slate-500">Total Revenue</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{money(sales.totalRevenue)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium text-slate-500">Orders</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{sales.totalOrders}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium text-slate-500">Items Sold</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{sales.itemsSold}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium text-slate-500">Avg. Order Value</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{money(sales.avgOrderValue)}</div>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Top Selling Products</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Qty Sold</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {top.map((t) => (
              <tr key={t.sku}>
                <td className="px-4 py-2.5 font-medium text-slate-700">{t.product}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{t.sku}</td>
                <td className="px-4 py-2.5 text-right">{t.qty}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{money(t.revenue)}</td>
              </tr>
            ))}
            {top.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No sales in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {canSeeInventory && inventory && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <span className="font-semibold text-slate-800">Inventory Valuation</span>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500">
                Cost: <span className="font-semibold text-slate-700">{money(inventory.totalCostValue)}</span>
              </span>
              <span className="text-slate-500">
                Retail: <span className="font-semibold text-slate-700">{money(inventory.totalRetailValue)}</span>
              </span>
              <span className="text-slate-500">
                Potential Profit: <span className="font-semibold text-emerald-600">{money(inventory.potentialProfit)}</span>
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Stock Value (cost)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.category || "—"}</td>
                  <td className="px-4 py-2.5 text-right">{p.stockQty}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">{money(p.stockValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
