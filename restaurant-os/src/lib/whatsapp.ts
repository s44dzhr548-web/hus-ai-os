export function buildWhatsAppOrderLink(
  phone: string,
  order: {
    orderNumber: number;
    totalAmount: number;
    items: { name: string; quantity: number }[];
    tableNumber?: number;
  }
) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("966") ? digits : `966${digits.replace(/^0/, "")}`;
  const lines = [
    `طلب #${order.orderNumber}`,
    order.tableNumber ? `طاولة ${order.tableNumber}` : "",
    ...order.items.map((i) => `• ${i.name} x${i.quantity}`),
    `الإجمالي: ${order.totalAmount} ر.س`,
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${intl}?text=${text}`;
}

export function buildWhatsAppReservationLink(
  phone: string,
  reservation: {
    customerName: string;
    date: string;
    time: string;
    guestCount: number;
    restaurantName: string;
    type: "confirmation" | "reminder" | "arrival" | "cancellation";
  }
) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("966") ? digits : `966${digits.replace(/^0/, "")}`;

  const templates: Record<string, string> = {
    confirmation: `مرحباً ${reservation.customerName}،\nتم تأكيد حجزك في ${reservation.restaurantName}\n📅 ${reservation.date} · ${reservation.time}\n👥 ${reservation.guestCount} ضيوف\nنتطلع لاستقبالك!`,
    reminder: `تذكير: حجزك في ${reservation.restaurantName}\n📅 ${reservation.date} · ${reservation.time}\n👥 ${reservation.guestCount} ضيوف`,
    arrival: `مرحباً ${reservation.customerName}! طاولتك جاهزة في ${reservation.restaurantName}.\nنتظرك الآن 🎉`,
    cancellation: `تم إلغاء حجزك في ${reservation.restaurantName}\n📅 ${reservation.date} · ${reservation.time}\nنأمل رؤيتك قريباً.`,
  };

  const text = encodeURIComponent(templates[reservation.type]);
  return `https://wa.me/${intl}?text=${text}`;
}

export function buildWhatsAppCustomerLink(
  customerPhone: string,
  message: string
) {
  const digits = customerPhone.replace(/\D/g, "");
  const intl = digits.startsWith("966") ? digits : `966${digits.replace(/^0/, "")}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
