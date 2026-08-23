import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAccessToken, getMomoConfig } from "../../shared/momo.ts";

export default async function(req) {
  try {
    const body = await req.json();
    const { reference_id, order_id } = body;

    if (!reference_id) {
      return Response.json({ error: "reference_id is required" }, { status: 400 });
    }

    const { subscriptionKey, env, baseUrl } = getMomoConfig();
    const token = await getAccessToken();

    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${reference_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Target-Environment": env,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("MoMo status check failed:", res.status, text);
      return Response.json({ error: `Status check failed (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const momoStatus = data.status;
    let orderStatus = "pending";

    if (momoStatus === "SUCCESSFUL") {
      orderStatus = "preparing";
    } else if (momoStatus === "FAILED" || momoStatus === "REJECTED") {
      orderStatus = "pending";
    }

    if (order_id) {
      const base44 = createClientFromRequest(req);
      if (momoStatus === "SUCCESSFUL") {
        await base44.asServiceRole.entities.Order.update(order_id, { status: "preparing" });
      }
    }

    return Response.json({
      status: momoStatus,
      order_status: orderStatus,
      financial_status: data.financialStatus,
      reason: data.reason || null,
    });
  } catch (error) {
    console.error("mtn-momo-check-status error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}