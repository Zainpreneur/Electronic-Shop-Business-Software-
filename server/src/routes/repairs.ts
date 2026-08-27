import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { genRepairNo } from "../utils/ids";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const repairs = await prisma.repairJob.findMany({
      where: status ? { status: status as never } : undefined,
      include: { customer: true, technician: { select: { id: true, name: true } } },
      orderBy: { receivedAt: "desc" },
    });
    res.json(repairs);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const repair = await prisma.repairJob.findUnique({
      where: { id: req.params.id },
      include: { customer: true, technician: { select: { id: true, name: true } } },
    });
    if (!repair) throw new ApiError(404, "Repair job not found");
    res.json(repair);
  })
);

const createSchema = z.object({
  customerId: z.string().min(1),
  deviceType: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(1),
  estimateCost: z.number().nonnegative().optional(),
  technicianId: z.string().optional().nullable(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const repair = await prisma.repairJob.create({
      data: { ...data, jobNo: genRepairNo() },
    });
    res.status(201).json(repair);
  })
);

const updateSchema = z.object({
  deviceType: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().optional(),
  diagnosis: z.string().optional(),
  status: z
    .enum(["RECEIVED", "DIAGNOSING", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "DELIVERED", "CANCELLED"])
    .optional(),
  estimateCost: z.number().nonnegative().optional(),
  finalCost: z.number().nonnegative().optional(),
  technicianId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const extra: Record<string, unknown> = {};
    if (data.status === "COMPLETED") extra.completedAt = new Date();
    if (data.status === "DELIVERED") extra.deliveredAt = new Date();
    const repair = await prisma.repairJob.update({
      where: { id: req.params.id },
      data: { ...data, ...extra },
    });
    res.json(repair);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.repairJob.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
