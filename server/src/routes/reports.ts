import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Sales report grouped by day within a date range.
router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const where = {
      status: "COMPLETED" as const,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
    const sales = await prisma.sale.findMany({ where, include: { items: true } });
    const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
    const totalOrders = sales.length;
    const itemsSold = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);
    res.json({ totalRevenue, totalOrders, itemsSold, avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0 });
  })
);

// Best-selling products by quantity sold, within an optional date range.
router.get(
  "/top-products",
  asyncHandler(async (req, res) => {
    const { from, to, limit } = req.query as Record<string, string | undefined>;
    const items = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: "COMPLETED",
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
      },
      include: { product: true },
    });
    const map = new Map<string, { product: string; sku: string; qty: number; revenue: number }>();
    for (const item of items) {
      const key = item.productId;
      const entry = map.get(key) || { product: item.product.name, sku: item.product.sku, qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += item.lineTotal;
      map.set(key, entry);
    }
    const sorted = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, Number(limit) || 10);
    res.json(sorted);
  })
);

// Full inventory valuation report (admin/manager only — cost prices are sensitive).
router.get(
  "/inventory",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ where: { active: true }, include: { category: true } });
    const totalCostValue = products.reduce((s, p) => s + p.costPrice * p.stockQty, 0);
    const totalRetailValue = products.reduce((s, p) => s + p.sellingPrice * p.stockQty, 0);
    res.json({
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category?.name || null,
        stockQty: p.stockQty,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stockValue: p.costPrice * p.stockQty,
      })),
    });
  })
);

export default router;
