import { redirect } from "next/navigation";

export default function LegacyVideoRedirect() {
  redirect("/dashboard/marketing/creative");
}
