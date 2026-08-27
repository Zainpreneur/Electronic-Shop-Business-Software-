import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, apiErrorMessage } from "../api/client";
import { Card, ErrorBanner } from "../components/ui";
import { StatusBadge } from "../components/Badge";
import { money, dateOnly } from "../lib/format";
import type { DashboardStats } from "../types";

function StatCard({ label, value, sub, tone = "indigo" }: { label: string; value: string; sub?: string; tone?: string }) {
  const tones: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
  };
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
      {sub && <div className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{sub}</div>}
    </Card>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!stats) return <div className="text-slate-400">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your shop's performance</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={money(stats.todayRevenue)} sub={`${stats.todayOrders} orders`} tone="emerald" />
        <StatCard label="This Month" value={money(stats.monthRevenue)} sub={`${stats.monthOrders} orders`} tone="indigo" />
        <StatCard label="Low Stock Items" value={String(stats.lowStockCount)} sub="Needs reorder" tone={stats.lowStockCount > 0 ? "rose" : "emerald"} />
        <StatCard label="Open Repairs" value={String(stats.openRepairs)} sub={`${stats.totalCustomers} customers total`} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-800">Sales — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.salesTrend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short" })}
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(d) => dateOnly(d as string)} />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Low Stock</h2>
            <Link to="/products?lowStock=true" className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.lowStockItems.length === 0 ? (
            <p className="text-sm text-slate-400">All stock levels are healthy.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.lowStockItems.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-700">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.sku}</div>
                  </div>
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                    {p.stockQty} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Sales</h2>
          <Link to="/sales" className="text-xs font-medium text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Cashier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentSales.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-4 font-medium text-slate-700">{s.invoiceNo}</td>
                  <td className="py-2 pr-4 text-slate-500">{s.customer?.name || "Walk-in"}</td>
                  <td className="py-2 pr-4 text-slate-500">{s.user?.name}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-2 pr-4 text-right font-medium text-slate-700">{money(s.total)}</td>
                </tr>
              ))}
              {stats.recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
