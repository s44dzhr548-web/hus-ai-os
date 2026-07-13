import { redirect } from "next/navigation";

export default function MarketingRootRedirect() {
  redirect("/dashboard/marketing/command-center");
}
