import express from 'express';
import Stripe from 'stripe';
import db from '../db/index.js';
import { getMomoConfig, getAccessToken, validateGhanaMsisdn } from '../services/momo.js';
import { getPaystackConfig, generateReference } from '../services/paystack.js';

const router = express.Router();

async function createOrder({ customer_name, items, pickup_note, payment_method, client_phone }) {
  const total = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO orders (id, customer_name, items, total, total_amount, status, pickup_note, payment_method, client_phone) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    args: [id, customer_name, JSON.stringify(items), total, total, pickup_note || '', payment_method, client_phone || ''],
  });
  return { id, total };
}

router.post('/momo/request', async (req, res) => {
  try {
    const { items, customer_name, pickup_note, phone_number } = req.body;
    if (!items?.length || !customer_name || !phone_number) return res.status(400).json({ error: 'items, customer_name, and phone_number are required' });
    const payerMsisdn = validateGhanaMsisdn(phone_number);
    const { subscriptionKey, env, baseUrl } = getMomoConfig();
    const { id: orderId, total } = await createOrder({ customer_name, items, pickup_note, payment_method: 'momo', client_phone: phone_number });
    const referenceId = crypto.randomUUID();
    const token = await getAccessToken();
    const momoRes = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Reference-Id': referenceId, 'X-Target-Environment': env, 'Ocp-Apim-Subscription-Key': subscriptionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: String(Math.round(total)), currency: 'GHS', externalId: orderId, payer: { partyIdType: 'MSISDN', partyId: payerMsisdn }, payerMessage: `Order for ${customer_name}`, payeeNote: 'GGSH Canteen' }),
    });
    if (momoRes.status !== 202) return res.status(502).json({ error: `MoMo request failed (${momoRes.status}): ${await momoRes.text()}` });
    await db.execute({ sql: 'UPDATE orders SET payment_reference = ? WHERE id = ?', args: [referenceId, orderId] });
    res.json({ reference_id: referenceId, order_id: orderId, status: 'pending', total });
  } catch (err) { console.error('momo/request error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/momo/status', async (req, res) => {
  try {
    const { reference_id, order_id } = req.body;
    if (!reference_id) return res.status(400).json({ error: 'reference_id is required' });
    const { subscriptionKey, env, baseUrl } = getMomoConfig();
    const token = await getAccessToken();
    const r = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${reference_id}`, { headers: { Authorization: `Bearer ${token}`, 'X-Target-Environment': env, 'Ocp-Apim-Subscription-Key': subscriptionKey } });
    if (!r.ok) return res.status(502).json({ error: `Status check failed (${r.status})` });
    const data = await r.json();
    let orderStatus = 'pending';
    if (data.status === 'SUCCESSFUL') {
      orderStatus = 'preparing';
      if (order_id) await db.execute({ sql: "UPDATE orders SET status = 'preparing' WHERE id = ?", args: [order_id] });
    }
    res.json({ status: data.status, order_status: orderStatus, financial_status: data.financialStatus, reason: data.reason || null });
  } catch (err) { console.error('momo/status error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/paystack/initialize', async (req, res) => {
  try {
    const { items, customer_name, pickup_note, phone_number, client_phone } = req.body;
    if (!items?.length || !customer_name) return res.status(400).json({ error: 'items and customer_name are required' });
    const { secretKey, baseUrl } = getPaystackConfig();
    const { id: orderId, total } = await createOrder({ customer_name, items, pickup_note, payment_method: 'momo', client_phone: client_phone || phone_number });
    const reference = generateReference();
    const email = phone_number ? `${phone_number.replace(/\D/g, '')}@ggshcanteen.com` : 'orders@ggshcanteen.com';
    const r = await fetch(`${baseUrl}/transaction/initialize`, { method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, amount: Math.round(total * 100), currency: 'GHS', channels: ['mobile_money'], callback_url: `${req.protocol}://${req.get('host')}/payment/paystack?reference=${reference}`, reference, metadata: { order_id: orderId, customer_name, phone_number: phone_number || '' } }) });
    const data = await r.json();
    if (!data.status) return res.status(502).json({ error: `Paystack init failed: ${data.message}` });
    await db.execute({ sql: 'UPDATE orders SET payment_reference = ? WHERE id = ?', args: [reference, orderId] });
    res.json({ authorization_url: data.data.authorization_url, reference: data.data.reference, order_id: orderId });
  } catch (err) { console.error('paystack/initialize error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/paystack/verify', async (req, res) => {
  try {
    const { reference, order_id } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference is required' });
    const { secretKey, baseUrl } = getPaystackConfig();
    const r = await fetch(`${baseUrl}/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${secretKey}` } });
    const data = await r.json();
    if (!data.status) return res.status(502).json({ error: `Verification failed: ${data.message}` });
    const isSuccess = data.data.status === 'success';
    const resolvedOrderId = order_id || data.data.metadata?.order_id;
    if (isSuccess && resolvedOrderId) await db.execute({ sql: "UPDATE orders SET status = 'preparing' WHERE id = ?", args: [resolvedOrderId] });
    res.json({ status: data.data.status, success: isSuccess, amount: data.data.amount / 100, currency: data.data.currency, order_id: resolvedOrderId });
  } catch (err) { console.error('paystack/verify error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { items, customer_name, pickup_note } = req.body;
    if (!items?.length || !customer_name) return res.status(400).json({ error: 'items and customer_name are required' });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { id: orderId } = await createOrder({ customer_name, items, pickup_note, payment_method: 'stripe' });
    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({ payment_method_types: ['card'], line_items: items.map((i) => ({ price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: Math.round(i.price * 100) }, quantity: i.quantity })), mode: 'payment', success_url: `${origin}/?payment=success&order=${orderId}`, cancel_url: `${origin}/?payment=cancelled`, metadata: { order_id: orderId, customer_name } });
    res.json({ url: session.url, order_id: orderId });
  } catch (err) { console.error('stripe/create-checkout-session error:', err); res.status(500).json({ error: err.message }); }
});

router.post('/stripe/webhook', async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) return res.status(400).json({ error: 'Missing signature or webhook secret' });
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret); } catch (err) { return res.status(400).json({ error: 'Invalid signature' }); }
    if (event.type === 'checkout.session.completed') {
      const orderId = event.data.object.metadata?.order_id;
      if (orderId) await db.execute({ sql: "UPDATE orders SET status = 'preparing' WHERE id = ?", args: [orderId] });
    }
    res.json({ received: true });
  } catch (err) { console.error('stripe/webhook error:', err); res.status(500).json({ error: err.message }); }
});

export default router;
