import { redirect } from "next/navigation";

export default function LegacyForecastRedirect() {
  redirect("/dashboard/marketing/simulation");
}
