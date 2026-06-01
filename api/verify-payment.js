/**
 * Vercel Serverless Function: /api/verify-payment
 *
 * Securely verifies a Korapay payment reference using the secret key.
 * This MUST run server-side so the secret key is never exposed to the browser.
 *
 * Called by Cart.jsx after Korapay's onSuccess fires.
 * Only after this endpoint confirms the payment is real should the frontend create the order.
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid payment reference' });
  }

  const secretKey = process.env.KORA_SECRET_KEY;
  if (!secretKey) {
    console.error('KORA_SECRET_KEY is not configured on the server.');
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  try {
    // Verify the payment with Korapay's API
    const koraRes = await fetch(
      `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const koraData = await koraRes.json();

    if (!koraRes.ok) {
      console.error('Korapay verification API error:', koraData);
      return res.status(400).json({ verified: false, error: koraData.message || 'Verification failed' });
    }

    const status = koraData?.data?.status;
    const amount = koraData?.data?.amount;

    if (status === 'success') {
      return res.status(200).json({
        verified: true,
        reference,
        amount,
        data: koraData.data
      });
    } else {
      return res.status(200).json({
        verified: false,
        reference,
        status,
        error: `Payment status is "${status}", not "success"`
      });
    }
  } catch (err) {
    console.error('Error calling Korapay verification API:', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
}
