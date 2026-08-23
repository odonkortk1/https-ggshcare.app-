import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { getPaystackConfig, generateReference } from "../../shared/paystack.ts";

export default async function(req) {
  try {
    const body = await req.json();
    const { items, customer_name, pickup_note, phone_number, client_phone } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Items are required" }, { status: 400 });
    }
    if (!customer_name) {
      return Response.json({ error: "Customer name is required" }, { status: 400 });
    }

    const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    if (total <= 0) {
      return Response.json({ error: "Total must be greater than zero" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const order = await base44.asServiceRole.entities.Order.create({
      customer_name,
      items,
      total,
      status: "pending",
      pickup_note: pickup_note || "",
      payment_method: "momo",
      client_phone: client_phone || "",
    });

    const { secretKey, baseUrl } = getPaystackConfig();
    const origin = new URL(req.url).origin;
    const reference = generateReference();
    const email = phone_number
      ? `${phone_number.replace(/\D/g, "")}@ggshcanteen.com`
      : "orders@ggshcanteen.com";

    const res = await fetch(`${baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(total * 100),
        currency: "GHS",
        channels: ["mobile_money"],
        callback_url: `${origin}/?payment=paystack&reference=${reference}`,
        reference,
        metadata: {
          base44_app_id: secrets.get("BASE44_APP_ID"),
          order_id: order.id,
          customer_name,
          phone_number: phone_number || "",
        },
      }),
    });

    const data = await res.json();

    if (!data.status) {
      console.error("Paystack initialize failed:", data.message);
      return Response.json({ error: `Paystack init failed: ${data.message}` }, { status: 502 });
    }

    return Response.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      order_id: order.id,
    });
  } catch (error) {
    console.error("paystack-initialize error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}