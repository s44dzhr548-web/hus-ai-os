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
