import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function MarketingRootRedirect() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "MANAGER") {
    redirect("/dashboard/marketing/whatsapp");
  }
  redirect("/dashboard/marketing/command-center");
}
