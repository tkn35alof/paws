export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { securePhotoUrl } = req.body
    const hfToken = process.env.HF_TOKEN

    if (!hfToken) return res.status(500).json({ error: 'HF_TOKEN not configured' })

    const hfUrl = 'https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d'
    console.log('Vercel Proxy: Initiating connection with Hugging Face production engine...')

    let hfRes
    let success = false
    const maxAttempts = 4

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000)
        hfRes = await fetch(hfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
          },
          body: JSON.stringify({ inputs: securePhotoUrl }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (hfRes.ok) {
          success = true
          break
        }

        console.warn(`HF Attempt ${attempt} returned status: ${hfRes.status}`)
      } catch (err) {
        console.error(`DNS or Connection Attempt ${attempt} failed:`, err.message)
      }
      if (attempt < maxAttempts) {
        console.log(`Waiting 10 seconds for Hugging Face container to warm up (Attempt ${attempt})...`)
        await new Promise(r => setTimeout(r, 10000))
      }
    }

    if (!success || !hfRes) {
      const errText = hfRes ? await hfRes.text() : 'Network timeout'
      return res.status(hfRes ? hfRes.status : 500).json({
        error: `HF Inference Engine exhausted: ${errText}`,
      })
    }

    const arrayBuffer = await hfRes.arrayBuffer()
    res.setHeader('Content-Type', 'model/gltf-binary')
    return res.status(200).send(Buffer.from(arrayBuffer))
  } catch (error) {
    console.error('Vercel Proxy Critical Crash:', error)
    return res.status(500).json({ error: error.message })
  }
}