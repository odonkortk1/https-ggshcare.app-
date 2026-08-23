import { secrets } from "base44:runtime";

export function getPaystackConfig() {
  const secretKey = secrets.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) {
    throw new Error("Paystack secret key is not configured. Set PAYSTACK_SECRET_KEY in app secrets.");
  }
  return { secretKey, baseUrl: "https://api.paystack.co" };
}

export function generateReference() {
  return `GGSH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}