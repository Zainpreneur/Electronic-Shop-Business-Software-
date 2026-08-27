import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, ErrorBanner, Field, Input, Select } from "../components/ui";
import { money } from "../lib/format";
import type { Customer, PaymentMethod, Product } from "../types";

interface CartLine {
  product: Product;
  qty: number;
}

export function POS() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);

  useEffect(() => {
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/products", { params: { q } }).then((res) => setProducts(res.data));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        if (existing.qty >= p.stockQty) return prev;
        return prev.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (p.stockQty <= 0) return prev;
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, qty: Math.max(1, Math.min(qty, l.product.stockQty)) } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.qty * l.product.sellingPrice, 0), [cart]);
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/sales", {
        customerId: customerId || null,
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty, unitPrice: l.product.sellingPrice })),
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        paymentMethod,
      });
      setLastInvoice(res.data.invoiceNo);
      setCart([]);
      setDiscount("0");
      setTax("0");
      setCustomerId("");
      // Refresh product stock levels shown in the picker.
      api.get("/products", { params: { q } }).then((r) => setProducts(r.data));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">New Sale (POS)</h1>
        {lastInvoice && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            ✅ Sale completed — Invoice <span className="font-mono font-semibold">{lastInvoice}</span>
            <button onClick={() => navigate("/sales")} className="font-medium underline">
              View
            </button>
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <Input placeholder="Search products by name, SKU, or brand…" value={q} onChange={(e) => setQ(e.target.value)} />
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stockQty <= 0}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="text-sm font-medium text-slate-700 line-clamp-2">{p.name}</div>
                <div className="mt-1 text-xs text-slate-400">{p.sku}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-indigo-600">{money(p.sellingPrice)}</span>
                  <span className={`text-xs ${p.stockQty <= p.reorderLevel ? "text-rose-500" : "text-slate-400"}`}>
                    {p.stockQty} in stock
                  </span>
                </div>
              </button>
            ))}
            {products.length === 0 && <p className="col-span-full py-8 text-center text-slate-400">No products match.</p>}
          </div>
        </div>

        <Card className="flex h-fit flex-col p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Cart</h2>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-700">{l.product.name}</div>
                  <div className="text-xs text-slate-400">{money(l.product.sellingPrice)} each</div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={l.product.stockQty}
                  value={l.qty}
                  onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                  className="w-14 rounded-md border border-slate-300 px-1 py-1 text-center text-sm"
                />
                <span className="w-16 text-right font-medium text-slate-700">{money(l.qty * l.product.sellingPrice)}</span>
                <button onClick={() => removeLine(l.product.id)} className="text-rose-500 hover:text-rose-700">
                  ✕
                </button>
              </div>
            ))}
            {cart.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Cart is empty. Click a product to add it.</p>}
          </div>

          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <Field label="Customer (optional)">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount">
                <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </Field>
              <Field label="Tax">
                <Input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </Field>
            </div>
            <Field label="Payment Method">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>

            <div className="space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{money(Number(discount || 0))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span>+{money(Number(tax || 0))}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <Button className="w-full" disabled={cart.length === 0 || submitting} onClick={handleCheckout}>
              {submitting ? "Processing…" : `Checkout — ${money(total)}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
