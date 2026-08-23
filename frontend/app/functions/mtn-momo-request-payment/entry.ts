import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAccessToken, getMomoConfig, validateGhanaMsisdn } from "../../shared/momo.ts";

export default async function(req) {
  try {
    const body = await req.json();
    const { items, customer_name, pickup_note, phone_number } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Items are required" }, { status: 400 });
    }
    if (!customer_name) {
      return Response.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!phone_number) {
      return Response.json({ error: "Phone number is required" }, { status: 400 });
    }

    const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    if (total <= 0) {
      return Response.json({ error: "Total must be greater than zero" }, { status: 400 });
    }

    const payerMsisdn = validateGhanaMsisdn(phone_number);
    const { subscriptionKey, env, baseUrl } = getMomoConfig();

    const base44 = createClientFromRequest(req);
    const order = await base44.asServiceRole.entities.Order.create({
      customer_name,
      items,
      total,
      status: "pending",
      pickup_note: pickup_note || "",
    });

    const referenceId = crypto.randomUUID();
    const token = await getAccessToken();

    const momoRes = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": env,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(Math.round(total)),
        currency: "GHS",
        externalId: order.id,
        payer: {
          partyIdType: "MSISDN",
          partyId: payerMsisdn,
        },
        payerMessage: `Order for ${customer_name}`,
        payeeNote: "GGSH Canteen",
      }),
    });

    if (momoRes.status !== 202) {
      const errText = await momoRes.text();
      await base44.asServiceRole.entities.Order.update(order.id, {
        status: "pending",
        pickup_note: `${pickup_note || ""} [MoMo failed: ${momoRes.status}]`,
      });
      console.error("MoMo request-to-pay failed:", momoRes.status, errText);
      return Response.json({ error: `MoMo request failed (${momoRes.status}): ${errText}` }, { status: 502 });
    }

    return Response.json({
      reference_id: referenceId,
      order_id: order.id,
      status: "pending",
      total,
    });
  } catch (error) {
    console.error("mtn-momo-request-payment error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}