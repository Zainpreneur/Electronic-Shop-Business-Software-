import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { genPurchaseNo } from "../utils/ids";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const purchases = await prisma.purchase.findMany({
      where: status ? { status: status as never } : undefined,
      include: { supplier: true, user: { select: { name: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(purchases);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, user: { select: { name: true } }, items: { include: { product: true } } },
    });
    if (!purchase) throw new ApiError(404, "Purchase not found");
    res.json(purchase);
  })
);

const itemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(itemSchema).min(1),
  status: z.enum(["ORDERED", "RECEIVED"]).default("ORDERED"),
});

// Creates a purchase order. If status is RECEIVED, stock is added
// immediately; otherwise stock is added later via PUT /:id/receive.
router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const total = data.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          refNo: genPurchaseNo(),
          supplierId: data.supplierId,
          userId: req.user!.id,
          total,
          status: data.status,
          receivedAt: data.status === "RECEIVED" ? new Date() : null,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              unitCost: i.unitCost,
              lineTotal: i.qty * i.unitCost,
            })),
          },
        },
        include: { items: true },
      });

      if (data.status === "RECEIVED") {
        for (const item of created.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              change: item.qty,
              reason: "PURCHASE",
              refId: created.id,
              userId: req.user!.id,
            },
          });
        }
      }
      return created;
    });

    res.status(201).json(purchase);
  })
);

// Marks an ORDERED purchase as RECEIVED and adds the stock.
router.put(
  "/:id/receive",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!purchase) throw new ApiError(404, "Purchase not found");
    if (purchase.status === "RECEIVED") throw new ApiError(400, "Purchase already received");
    if (purchase.status === "CANCELLED") throw new ApiError(400, "Purchase is cancelled");

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.qty } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: item.qty,
            reason: "PURCHASE",
            refId: purchase.id,
            userId: req.user!.id,
          },
        });
      }
      return tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
    });

    res.json(updated);
  })
);

router.put(
  "/:id/cancel",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!purchase) throw new ApiError(404, "Purchase not found");
    if (purchase.status === "RECEIVED") throw new ApiError(400, "Cannot cancel a received purchase");
    const updated = await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  })
);

export default router;
