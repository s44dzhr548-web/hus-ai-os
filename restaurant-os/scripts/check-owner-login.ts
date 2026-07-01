import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = process.argv[2] || "ownerfix_1781725376513@menuos.sa";
const password = process.argv[3] || "MenuOSmqihab24";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { restaurants: true, staff: true },
  });
  if (!user) {
    console.log("USER NOT FOUND");
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  console.log({
    id: user.id,
    email: user.email,
    restaurants: user.restaurants.length,
    staff: user.staff.length,
    passwordValid: valid,
    hashPrefix: user.passwordHash.slice(0, 7),
  });
}

main()
  .finally(() => prisma.$disconnect());
