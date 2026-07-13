import { redirect } from "next/navigation";

export default function LegacyWhatsappRedirect() {
  redirect("/dashboard/marketing/automations");
}
