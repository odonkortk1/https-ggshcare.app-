import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { email, old_pin, new_pin } = body;

    if (!email || !old_pin || !new_pin) {
      return Response.json({ error: "Email, current PIN, and new PIN are required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(new_pin)) {
      return Response.json({ error: "New PIN must be exactly 6 digits" }, { status: 400 });
    }

    if (old_pin === new_pin) {
      return Response.json({ error: "New PIN must be different from current PIN" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const staff = await base44.asServiceRole.entities.Staff.filter({
      email: email.toLowerCase().trim(),
      pin: old_pin,
    });

    if (staff.length === 0) {
      return Response.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }

    const s = staff[0];
    await base44.asServiceRole.entities.Staff.update(s.id, { pin: new_pin });

    return Response.json({ success: true, message: "PIN changed successfully" });
  } catch (error) {
    console.error("staff-change-pin error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}