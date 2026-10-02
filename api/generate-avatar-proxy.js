export default async function handler(req, res) {
  // 1. Enable standard CORS access parameters
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { securePhotoUrl } = req.body;
    const hfToken = process.env.HF_TOKEN;

    console.log("Vercel Proxy: Forwarding payload directly to Hugging Face production cluster...");

// Before (404 / Missing Task Route Context):
// 'https://hf.space'

// After (Absolute Production Serverless API Gateway Path):
const hfRes = await fetch('https://hf.space', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${hfToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ inputs: securePhotoUrl }),
});



    if (!hfRes.ok) {
      const errText = await hfRes.text();
      return res.status(hfRes.status).json({ error: `HF Inference Engine failed: ${errText}` });
    }

    // 3. Pipe the raw binary stream data right back to the caller
    const arrayBuffer = await hfRes.arrayBuffer();
    res.setHeader('Content-Type', 'model/gltf-binary');
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error("Vercel Proxy Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
