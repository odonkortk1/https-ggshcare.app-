import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getPaystackConfig } from "../../shared/paystack.ts";

export default async function(req) {
  try {
    const body = await req.json();
    const { reference, order_id } = body;

    if (!reference) {
      return Response.json({ error: "reference is required" }, { status: 400 });
    }

    const { secretKey, baseUrl } = getPaystackConfig();

    const res = await fetch(`${baseUrl}/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
      },
    });

    const data = await res.json();

    if (!data.status) {
      console.error("Paystack verify failed:", data.message);
      return Response.json({ error: `Verification failed: ${data.message}` }, { status: 502 });
    }

    const isSuccess = data.data.status === "success";
    const resolvedOrderId = order_id || data.data.metadata?.order_id;
    const base44 = createClientFromRequest(req);

    if (isSuccess && resolvedOrderId) {
      await base44.asServiceRole.entities.Order.update(resolvedOrderId, { status: "preparing" });
    }

    return Response.json({
      status: data.data.status,
      success: isSuccess,
      amount: data.data.amount / 100,
      currency: data.data.currency,
      order_id: resolvedOrderId,
    });
  } catch (error) {
    console.error("paystack-verify error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}