import prisma from "@/lib/prisma";

const count = await prisma.reservation.count();
console.log(JSON.stringify({ count }));
