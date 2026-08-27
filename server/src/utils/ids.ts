// Human-friendly sequential-looking reference numbers for invoices, purchase
// orders and repair jobs (e.g. INV-20260826-4F2A). Not guaranteed globally
// unique under heavy concurrency, but collisions are checked by the DB's
// unique constraint and are astronomically unlikely for a single shop.
const stamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};

const rand = () => Math.random().toString(16).slice(2, 6).toUpperCase();

export const genInvoiceNo = () => `INV-${stamp()}-${rand()}`;
export const genPurchaseNo = () => `PO-${stamp()}-${rand()}`;
export const genRepairNo = () => `RPR-${stamp()}-${rand()}`;
