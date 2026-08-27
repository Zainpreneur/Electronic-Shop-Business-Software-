import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@electroshop.local" },
    update: {},
    create: {
      name: "Shop Admin",
      email: "admin@electroshop.local",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@electroshop.local" },
    update: {},
    create: {
      name: "Sales Staff",
      email: "staff@electroshop.local",
      password: staffPassword,
      role: "STAFF",
    },
  });

  const categoryNames = ["Smartphones", "Laptops", "Audio", "Accessories", "TVs & Displays", "Components"];
  const categories = [];
  for (const name of categoryNames) {
    categories.push(await prisma.category.upsert({ where: { name }, update: {}, create: { name } }));
  }
  const [phones, laptops, audio, accessories, tvs, components] = categories;

  const products = [
    { sku: "SP-IP15-128", name: "iPhone 15 128GB", brand: "Apple", categoryId: phones.id, costPrice: 650, sellingPrice: 799, stockQty: 12, reorderLevel: 4 },
    { sku: "SP-GS24-256", name: "Galaxy S24 256GB", brand: "Samsung", categoryId: phones.id, costPrice: 620, sellingPrice: 749, stockQty: 3, reorderLevel: 5 },
    { sku: "LP-MBA-M3", name: "MacBook Air M3", brand: "Apple", categoryId: laptops.id, costPrice: 950, sellingPrice: 1199, stockQty: 6, reorderLevel: 3 },
    { sku: "LP-XPS13", name: "Dell XPS 13", brand: "Dell", categoryId: laptops.id, costPrice: 780, sellingPrice: 999, stockQty: 2, reorderLevel: 3 },
    { sku: "AU-WH1000XM5", name: "Sony WH-1000XM5 Headphones", brand: "Sony", categoryId: audio.id, costPrice: 220, sellingPrice: 349, stockQty: 15, reorderLevel: 5 },
    { sku: "AU-AIRPODSPRO", name: "AirPods Pro 2", brand: "Apple", categoryId: audio.id, costPrice: 170, sellingPrice: 249, stockQty: 20, reorderLevel: 6 },
    { sku: "AC-CHG65W", name: "65W USB-C Fast Charger", brand: "Anker", categoryId: accessories.id, costPrice: 15, sellingPrice: 29, stockQty: 40, reorderLevel: 10 },
    { sku: "AC-CASE-IP15", name: "iPhone 15 Silicone Case", brand: "Generic", categoryId: accessories.id, costPrice: 4, sellingPrice: 14, stockQty: 60, reorderLevel: 15 },
    { sku: "TV-LG55C3", name: "LG 55\" C3 OLED TV", brand: "LG", categoryId: tvs.id, costPrice: 1100, sellingPrice: 1399, stockQty: 4, reorderLevel: 2 },
    { sku: "CP-SSD1TB", name: "1TB NVMe SSD", brand: "Samsung", categoryId: components.id, costPrice: 55, sellingPrice: 89, stockQty: 25, reorderLevel: 8 },
    { sku: "CP-RAM16", name: "16GB DDR5 RAM", brand: "Corsair", categoryId: components.id, costPrice: 40, sellingPrice: 69, stockQty: 1, reorderLevel: 6 },
  ];

  const createdProducts = [];
  for (const p of products) {
    createdProducts.push(await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p }));
  }

  const customerNames = [
    { name: "John Mwangi", phone: "0712345678", email: "john.mwangi@example.com" },
    { name: "Amina Yusuf", phone: "0723456789", email: "amina.yusuf@example.com" },
    { name: "Carlos Rivera", phone: "0734567890", email: "carlos.rivera@example.com" },
  ];
  const customers = [];
  for (const c of customerNames) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    customers.push(existing || (await prisma.customer.create({ data: c })));
  }

  const supplierNames = [
    { name: "TechDistributors Ltd", phone: "0700111222", email: "sales@techdist.example.com" },
    { name: "Global Electronics Wholesale", phone: "0700333444", email: "orders@globalelec.example.com" },
  ];
  for (const s of supplierNames) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.supplier.create({ data: s });
  }

  // A sample completed sale, if none exist yet, so the dashboard has data to show.
  const existingSales = await prisma.sale.count();
  if (existingSales === 0) {
    const item1 = createdProducts[4]; // headphones
    const item2 = createdProducts[6]; // charger
    const subtotal = item1.sellingPrice * 1 + item2.sellingPrice * 2;
    await prisma.sale.create({
      data: {
        invoiceNo: "INV-DEMO-0001",
        customerId: customers[0].id,
        userId: staff.id,
        subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        paymentMethod: "CASH",
        items: {
          create: [
            { productId: item1.id, qty: 1, unitPrice: item1.sellingPrice, lineTotal: item1.sellingPrice },
            { productId: item2.id, qty: 2, unitPrice: item2.sellingPrice, lineTotal: item2.sellingPrice * 2 },
          ],
        },
      },
    });
  }

  // A sample repair job.
  const existingRepairs = await prisma.repairJob.count();
  if (existingRepairs === 0) {
    await prisma.repairJob.create({
      data: {
        jobNo: "RPR-DEMO-0001",
        customerId: customers[1].id,
        deviceType: "Laptop",
        brand: "Dell",
        model: "XPS 13",
        issueDescription: "Won't power on, suspected battery failure",
        status: "IN_PROGRESS",
        estimateCost: 80,
        technicianId: admin.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Login with: admin@electroshop.local / admin123 (ADMIN)");
  console.log("        or: staff@electroshop.local / staff123 (STAFF)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
