import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { email, pin } = body;

    if (!email || !pin) {
      return Response.json({ error: "Email and PIN are required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(pin)) {
      return Response.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const staff = await base44.asServiceRole.entities.Staff.filter({ email: email.toLowerCase().trim(), pin });
    if (staff.length === 0) {
      return Response.json({ error: "Invalid email or PIN" }, { status: 401 });
    }

    const s = staff[0];
    return Response.json({
      staff_id: s.id,
      email: s.email,
      full_name: s.full_name,
      role: s.role || "staff",
    });
  } catch (error) {
    console.error("staff-auth error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}