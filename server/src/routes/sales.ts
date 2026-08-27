import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { genInvoiceNo } from "../utils/ids";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, status } = req.query as Record<string, string | undefined>;
    const sales = await prisma.sale.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        user: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        user: { select: { name: true } },
        items: { include: { product: true } },
      },
    });
    if (!sale) throw new ApiError(404, "Sale not found");
    res.json(sale);
  })
);

const itemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const createSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  notes: z.string().optional(),
});

// Checkout: validates stock availability, deducts stock, and creates the
// sale + line items + stock movement audit trail atomically.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const item of data.items) {
      const product = byId.get(item.productId);
      if (!product) throw new ApiError(400, `Product ${item.productId} not found`);
      if (product.stockQty < item.qty) {
        throw new ApiError(400, `Insufficient stock for ${product.name} (have ${product.stockQty}, need ${item.qty})`);
      }
    }

    const subtotal = data.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const total = Math.max(0, subtotal - data.discount + data.tax);

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          invoiceNo: genInvoiceNo(),
          customerId: data.customerId || undefined,
          userId: req.user!.id,
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              unitPrice: i.unitPrice,
              lineTotal: i.qty * i.unitPrice,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      for (const item of created.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.qty } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: -item.qty,
            reason: "SALE",
            refId: created.id,
            userId: req.user!.id,
          },
        });
      }

      return created;
    });

    res.status(201).json(sale);
  })
);

// Cancels a completed sale and restocks its items.
router.put(
  "/:id/cancel",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!sale) throw new ApiError(404, "Sale not found");
    if (sale.status !== "COMPLETED") throw new ApiError(400, "Only completed sales can be cancelled");

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.qty } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: item.qty,
            reason: "SALE_CANCELLED",
            refId: sale.id,
            userId: req.user!.id,
          },
        });
      }
      return tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED" } });
    });

    res.json(updated);
  })
);

export default router;
