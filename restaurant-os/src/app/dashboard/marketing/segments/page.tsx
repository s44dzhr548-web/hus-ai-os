import { redirect } from "next/navigation";

export default function LegacySegmentsRedirect() {
  redirect("/dashboard/marketing/audiences");
}
