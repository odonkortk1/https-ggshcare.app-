import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { items, customer_name, pickup_note } = await req.json();

    if (!items || !items.length || !customer_name) {
      return Response.json({ error: 'Missing items or customer name' }, { status: 400 });
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    // Create a pending order record
    const order = await base44.asServiceRole.entities.Order.create({
      customer_name,
      items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
      total,
      pickup_note: pickup_note || '',
      status: 'pending',
    });

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((i) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: i.name },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.quantity,
      })),
      mode: 'payment',
      success_url: `${origin}/?payment=success&order=${order.id}`,
      cancel_url: `${origin}/?payment=cancelled`,
      metadata: {
        base44_app_id: secrets.get('BASE44_APP_ID'),
        order_id: order.id,
        customer_name,
      },
    });

    return Response.json({ url: session.url, order_id: order.id });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
