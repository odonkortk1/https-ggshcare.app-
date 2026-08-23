import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { action, staff_email, staff_id, item_id, data } = body;

    if (!action || !staff_email || !staff_id) {
      return Response.json({ error: "action, staff_email, and staff_id are required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Verify the caller is a valid staff member
    const staff = await base44.asServiceRole.entities.Staff.filter({ email: staff_email.toLowerCase().trim() });
    if (staff.length === 0 || staff[0].id !== staff_id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "create") {
      if (!data || !data.name || !data.price || !data.category) {
        return Response.json({ error: "name, price, and category are required" }, { status: 400 });
      }
      const item = await base44.asServiceRole.entities.MenuItem.create(data);
      return Response.json(item);
    }

    if (action === "update") {
      if (!item_id) {
        return Response.json({ error: "item_id is required for update" }, { status: 400 });
      }
      const item = await base44.asServiceRole.entities.MenuItem.update(item_id, data || {});
      return Response.json(item);
    }

    if (action === "delete") {
      if (!item_id) {
        return Response.json({ error: "item_id is required for delete" }, { status: 400 });
      }
      await base44.asServiceRole.entities.MenuItem.delete(item_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action. Use 'create', 'update', or 'delete'." }, { status: 400 });
  } catch (error) {
    console.error("menu-crud error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}