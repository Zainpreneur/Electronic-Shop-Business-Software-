import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const categoryId = req.query.categoryId as string | undefined;
    const lowStock = req.query.lowStock === "true";
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { brand: { contains: q } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });
    const filtered = lowStock ? products.filter((p) => p.stockQty <= p.reorderLevel) : products;
    res.json(filtered);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!product) throw new ApiError(404, "Product not found");
    res.json(product);
  })
);

const schema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQty: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(5),
  imageUrl: z.string().optional(),
});

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });
      if (created.stockQty > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            change: created.stockQty,
            reason: "INITIAL_STOCK",
            userId: req.user!.id,
          },
        });
      }
      return created;
    });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    // Soft delete to preserve historical sale/purchase records.
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ ok: true });
  })
);

const adjustSchema = z.object({
  change: z.number().int().refine((n) => n !== 0, "change must be non-zero"),
  reason: z.string().min(1).default("ADJUSTMENT"),
});

router.post(
  "/:id/adjust-stock",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { change, reason } = adjustSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, "Product not found");
    const newQty = product.stockQty + change;
    if (newQty < 0) throw new ApiError(400, "Resulting stock cannot be negative");
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({ where: { id: req.params.id }, data: { stockQty: newQty } });
      await tx.stockMovement.create({
        data: { productId: p.id, change, reason, userId: req.user!.id },
      });
      return p;
    });
    res.json(updated);
  })
);

export default router;
