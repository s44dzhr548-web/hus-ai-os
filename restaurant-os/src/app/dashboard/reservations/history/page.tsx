import { redirect } from "next/navigation";

export default function ReservationsHistoryPage() {
  redirect("/dashboard/customers?tab=reservations");
}
