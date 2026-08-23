import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { action, phone_number, pin, full_name } = body;

    if (!action || !phone_number || !pin) {
      return Response.json({ error: "action, phone_number, and pin are required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(pin)) {
      return Response.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
    }

    if (!/^0\d{9}$/.test(phone_number)) {
      return Response.json({ error: "Phone number must be 10 digits starting with 0" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (action === "register") {
      if (!full_name || !full_name.trim()) {
        return Response.json({ error: "Full name is required" }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.Client.filter({ phone_number });
      if (existing.length > 0) {
        return Response.json({ error: "This phone number is already registered" }, { status: 409 });
      }

      const client = await base44.asServiceRole.entities.Client.create({
        phone_number,
        pin,
        full_name: full_name.trim(),
      });

      return Response.json({
        client_id: client.id,
        phone_number: client.phone_number,
        full_name: client.full_name,
      });
    }

    if (action === "login") {
      const clients = await base44.asServiceRole.entities.Client.filter({ phone_number, pin });
      if (clients.length === 0) {
        return Response.json({ error: "Invalid phone number or PIN" }, { status: 401 });
      }

      const client = clients[0];
      return Response.json({
        client_id: client.id,
        phone_number: client.phone_number,
        full_name: client.full_name,
      });
    }

    if (action === "reset-pin") {
      if (!full_name || !full_name.trim()) {
        return Response.json({ error: "Full name is required for verification" }, { status: 400 });
      }
      const clients = await base44.asServiceRole.entities.Client.filter({
        phone_number,
        full_name: full_name.trim(),
      });
      if (clients.length === 0) {
        return Response.json({ error: "Phone number and name do not match our records" }, { status: 401 });
      }
      const client = clients[0];
      await base44.asServiceRole.entities.Client.update(client.id, { pin });
      return Response.json({ success: true, message: "PIN reset successfully" });
    }

    if (action === "change-pin") {
      const clients = await base44.asServiceRole.entities.Client.filter({ phone_number, pin: body.old_pin });
      if (clients.length === 0) {
        return Response.json({ error: "Current PIN is incorrect" }, { status: 401 });
      }
      const client = clients[0];
      await base44.asServiceRole.entities.Client.update(client.id, { pin: body.new_pin });
      return Response.json({ success: true, message: "PIN changed successfully" });
    }

    return Response.json({ error: "Invalid action. Use 'login', 'register', 'reset-pin', or 'change-pin'." }, { status: 400 });
  } catch (error) {
    console.error("client-auth error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}