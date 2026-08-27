import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const today = startOfDay(new Date());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todaySales,
      monthSales,
      totalProducts,
      lowStockProducts,
      openRepairs,
      totalCustomers,
      recentSales,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: today }, status: "COMPLETED" },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: monthStart }, status: "COMPLETED" },
        _sum: { total: true },
        _count: true,
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.product.findMany({
        where: { active: true },
        select: { id: true, name: true, sku: true, stockQty: true, reorderLevel: true },
      }),
      prisma.repairJob.count({
        where: { status: { in: ["RECEIVED", "DIAGNOSING", "IN_PROGRESS", "WAITING_FOR_PARTS"] } },
      }),
      prisma.customer.count(),
      prisma.sale.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { customer: true, user: { select: { name: true } } },
      }),
    ]);

    const lowStock = lowStockProducts.filter((p) => p.stockQty <= p.reorderLevel);

    // Last 7 days sales totals, for a simple trend chart.
    const days: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const agg = await prisma.sale.aggregate({
        where: { createdAt: { gte: day, lt: next }, status: "COMPLETED" },
        _sum: { total: true },
      });
      days.push({ date: day.toISOString().slice(0, 10), total: agg._sum.total || 0 });
    }

    res.json({
      todayRevenue: todaySales._sum.total || 0,
      todayOrders: todaySales._count,
      monthRevenue: monthSales._sum.total || 0,
      monthOrders: monthSales._count,
      totalProducts,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 10),
      openRepairs,
      totalCustomers,
      recentSales,
      salesTrend: days,
    });
  })
);

export default router;
