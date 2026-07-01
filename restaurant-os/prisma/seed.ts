import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

async function main() {
  const isProduction = process.env.SEED_ENV === "production";
  const passwordHash = await bcrypt.hash("admin123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@menuos.sa" },
    update: { passwordHash, name: "مدير النظام", isPlatformAdmin: true },
    create: {
      email: "admin@menuos.sa",
      passwordHash,
      name: "مدير النظام",
      isPlatformAdmin: true,
    },
  });

  await prisma.menuItem.deleteMany({
    where: { category: { restaurant: { slug: "menu-os-demo" } } },
  });
  await prisma.menuCategory.deleteMany({
    where: { restaurant: { slug: "menu-os-demo" } },
  });
  await prisma.diningTable.deleteMany({
    where: { branch: { restaurant: { slug: "menu-os-demo" } } },
  });
  await prisma.branch.deleteMany({
    where: { restaurant: { slug: "menu-os-demo" } },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "menu-os-demo" },
    update: {
      name: "Menu OS Demo",
      nameAr: "Menu OS Demo",
      nameEn: "Menu OS Demo",
      moyasarPublishableKey: null,
      moyasarSecretKey: null,
      tapPublishableKey: null,
      tapSecretKey: null,
      defaultPaymentProvider: "MOYASAR",
      paymentTestMode: true,
      whatsappNumber: "+966501234567",
    },
    create: {
      ownerId: user.id,
      name: "Menu OS Demo",
      nameAr: "Menu OS Demo",
      nameEn: "Menu OS Demo",
      slug: "menu-os-demo",
      description: "مطعم تجريبي لمنصة Menu OS",
      descriptionEn: "Demo restaurant for Menu OS platform",
      phone: "+966501234567",
      email: "demo@menuos.sa",
      address: "Jeddah, Saudi Arabia",
      addressAr: "جدة، المملكة العربية السعودية",
      logoUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200",
      defaultPaymentProvider: "MOYASAR",
      paymentTestMode: true,
      whatsappNumber: "+966501234567",
      subscription: { create: { plan: "PRO", status: "ACTIVE" } },
    },
  });

  await prisma.subscription.upsert({
    where: { restaurantId: restaurant.id },
    update: { plan: "PRO", status: "ACTIVE" },
    create: { restaurantId: restaurant.id, plan: "PRO", status: "ACTIVE" },
  });

  const branch = await prisma.branch.create({
    data: {
      restaurantId: restaurant.id,
      name: "Jeddah Branch",
      nameAr: "فرع جدة",
      nameEn: "Jeddah Branch",
      city: "Jeddah",
      address: "Tahlia Street, Jeddah",
      addressAr: "شارع التحلية، جدة",
      phone: "+966501234567",
      isActive: true,
    },
  });

  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const code = `menu-os-demo-t${i}`;
    const table = await prisma.diningTable.create({
      data: {
        branchId: branch.id,
        number: i,
        label: `Table ${i}`,
        capacity: 4,
        tableCode: code,
      },
    });
    await prisma.diningTable.update({
      where: { id: table.id },
      data: { qrCode: `${appUrl}/r/menu-os-demo/table/${code}` },
    });
    tables.push(table);
  }

  const drinks = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Drinks",
      nameAr: "مشروبات",
      nameEn: "Drinks",
      sortOrder: 1,
    },
  });

  const hotCoffee = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      parentId: drinks.id,
      name: "Hot Coffee",
      nameAr: "قهوة ساخنة",
      nameEn: "Hot Coffee",
      sortOrder: 1,
    },
  });

  const coldCoffee = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      parentId: drinks.id,
      name: "Cold Coffee",
      nameAr: "قهوة باردة",
      nameEn: "Cold Coffee",
      sortOrder: 2,
    },
  });

  const juices = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      parentId: drinks.id,
      name: "Juices",
      nameAr: "عصائر",
      nameEn: "Juices",
      sortOrder: 3,
    },
  });

  const mains = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Main Dishes",
      nameAr: "أطباق رئيسية",
      nameEn: "Main Dishes",
      sortOrder: 2,
    },
  });

  const appetizers = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Appetizers",
      nameAr: "مقبلات",
      nameEn: "Appetizers",
      sortOrder: 3,
    },
  });

  const desserts = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Desserts",
      nameAr: "حلويات",
      nameEn: "Desserts",
      sortOrder: 4,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: hotCoffee.id,
        name: "Arabic Coffee",
        nameAr: "قهوة عربية",
        nameEn: "Arabic Coffee",
        descriptionAr: "قهوة عربية أصيلة",
        price: 12,
        imageUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
        calories: 5,
        prepTimeMinutes: 5,
        viewCount: 85,
        orderCount: 40,
        sortOrder: 1,
      },
      {
        categoryId: hotCoffee.id,
        name: "Cappuccino",
        nameAr: "كابتشينو",
        nameEn: "Cappuccino",
        price: 18,
        discountPrice: 15,
        imageUrl:
          "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400",
        calories: 120,
        prepTimeMinutes: 7,
        viewCount: 120,
        orderCount: 55,
        sortOrder: 2,
      },
      {
        categoryId: coldCoffee.id,
        name: "Iced Latte",
        nameAr: "آيس لاتيه",
        nameEn: "Iced Latte",
        price: 20,
        imageUrl:
          "https://images.unsplash.com/photo-1517701551-aa7f8f8b8d0b?w=400",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        calories: 150,
        prepTimeMinutes: 5,
        viewCount: 200,
        orderCount: 70,
        isFeatured: true,
        sortOrder: 1,
      },
      {
        categoryId: juices.id,
        name: "Fresh Orange",
        nameAr: "عصير برتقال طازج",
        nameEn: "Fresh Orange Juice",
        price: 14,
        imageUrl:
          "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400",
        galleryUrls: [
          "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400",
        ],
        calories: 90,
        prepTimeMinutes: 4,
        viewCount: 95,
        orderCount: 35,
        sortOrder: 1,
      },
      {
        categoryId: mains.id,
        name: "Kabsa",
        nameAr: "كبسة",
        nameEn: "Kabsa",
        descriptionAr: "كبسة لحم تقليدية",
        price: 55,
        discountPrice: 49,
        imageUrl:
          "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        calories: 650,
        prepTimeMinutes: 25,
        viewCount: 310,
        orderCount: 90,
        isFeatured: true,
        sortOrder: 1,
      },
      {
        categoryId: mains.id,
        name: "Grilled Chicken",
        nameAr: "دجاج مشوي",
        nameEn: "Grilled Chicken",
        price: 45,
        imageUrl:
          "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400",
        calories: 480,
        prepTimeMinutes: 20,
        viewCount: 180,
        orderCount: 60,
        sortOrder: 2,
      },
      {
        categoryId: appetizers.id,
        name: "Hummus",
        nameAr: "حمص",
        nameEn: "Hummus",
        price: 15,
        imageUrl:
          "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400",
        calories: 180,
        prepTimeMinutes: 5,
        viewCount: 140,
        orderCount: 50,
        sortOrder: 1,
      },
      {
        categoryId: desserts.id,
        name: "Kunafa",
        nameAr: "كنافة",
        nameEn: "Kunafa",
        price: 22,
        imageUrl:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
        calories: 420,
        prepTimeMinutes: 10,
        viewCount: 160,
        orderCount: 45,
        sortOrder: 1,
      },
    ],
  });

  await prisma.coupon.upsert({
    where: {
      restaurantId_code: { restaurantId: restaurant.id, code: "WELCOME10" },
    },
    update: {},
    create: {
      restaurantId: restaurant.id,
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrder: 50,
      maxUses: 100,
      isActive: true,
    },
  });

  console.log("✅ Seed completed", isProduction ? "(production)" : "(development)");
  console.log("📧 Login: admin@menuos.sa / admin123456");
  console.log("🏪 Restaurant:", restaurant.nameAr);
  console.log("🪑 Tables:", tables.length);
  console.log("🔗 Menu URLs:");
  tables.slice(0, 3).forEach((t) => {
    console.log(`   Table ${t.number}: /menu/${t.id}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
