export const labels = {
  awaiting_receipt: "Virement attendu",
  review: "Paiement à vérifier",
  rejected: "Justificatif refusé",
  verified: "Paiement validé",
  production: "En production",
  shipped: "Expédiée",
  delivered: "Livrée",
};
export const transitions = {
  awaiting_receipt: ["rejected"],
  review: ["verified", "rejected"],
  rejected: [],
  verified: ["production"],
  production: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};
export function price(quantity, reorder = false, shipping = 0) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500)
    throw Error("Quantité invalide");
  const unit = quantity >= 100 ? 200 : quantity >= 50 ? 225 : 250;
  return (reorder ? quantity * unit : 400 + (quantity - 1) * unit) + shipping;
}
export function canPublish(status) {
  return ["shipped", "delivered"].includes(status);
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
