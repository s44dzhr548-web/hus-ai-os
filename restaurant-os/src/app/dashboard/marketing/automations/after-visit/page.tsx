import { redirect } from "next/navigation";

/** Legacy route — settings moved to WhatsApp Business hub */
export default function AfterVisitRedirectPage() {
  redirect("/dashboard/marketing/whatsapp?tab=automation");
}
