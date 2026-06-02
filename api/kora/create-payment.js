/**
 * Vercel Serverless Function: /api/kora/create-payment
 *
 * Creates a payment session with Korapay and returns checkout details.
 * This endpoint validates the payment request on the backend before sending to Korapay.
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency = 'NGN', customer, metadata, is_tokenized } = req.body;

  // Validate required fields
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount. Must be greater than 0.' });
  }

  if (!customer || !customer.email || !customer.name) {
    return res.status(400).json({ error: 'Missing customer information (email, name required)' });
  }

  const publicKey = process.env.VITE_KORA_PUBLIC_KEY;
  if (!publicKey) {
    console.error('VITE_KORA_PUBLIC_KEY is not configured on the server.');
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  try {
    // Generate unique reference
    const reference = `ZEAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Return checkout initialization data
    // The client will use window.Korapay.initialize() with these details
    return res.status(200).json({
      success: true,
      reference,
      amount,
      currency,
      customer,
      metadata,
      ...(is_tokenized && { is_tokenized: true }),
      publicKey // Include for client-side initialization
    });
  } catch (err) {
    console.error('Error creating payment session:', err);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
}
