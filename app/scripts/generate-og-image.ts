/**
 * Generate OG image for K2K3.ai using Gemini via OpenRouter.
 * Run: npx tsx scripts/generate-og-image.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY');
  process.exit(1);
}

async function generateOgImage() {
  console.log('Generating OG image via Gemini...');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content:
            'Generate a wide banner image (1200x630 pixels, landscape orientation, aspect ratio roughly 2:1).\n\n' +
            'Design:\n' +
            '- Solid dark background, color hex #0a0a0b (almost black)\n' +
            '- Centered horizontally and vertically: the text "K2K3.ai" in very large bold font\n' +
            '- IMPORTANT: "K2K3" should be white, ".ai" should be purple/violet color #a78bfa\n' +
            '- Below that text, on a separate line, centered: exactly this text: "AI-radgivare for svensk redovisning" in smaller gray text (#a1a1aa)\n' +
            '- A soft purple/violet radial glow behind the title\n' +
            '- Minimalist, clean, modern SaaS aesthetic\n' +
            '- No borders, no extra decorations, no icons\n' +
            '- The image must be wider than it is tall (landscape format)',
        },
      ],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('API error:', response.status, error);
    console.log('Falling back to SVG...');
    generateSvgFallback();
    return;
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;

  // Check for images array (OpenRouter format)
  if (message?.images?.length) {
    for (const img of message.images) {
      if (img.type === 'image_url' && img.image_url?.url) {
        saveBase64Image(img.image_url.url);
        return;
      }
    }
  }

  // Check content array for image parts
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.type === 'image_url' && part.image_url?.url) {
        saveBase64Image(part.image_url.url);
        return;
      }
    }
  }

  // Check inline_data format (Gemini native)
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.inline_data?.data) {
        const buffer = Buffer.from(part.inline_data.data, 'base64');
        const outPath = resolve(import.meta.dirname, '../static/og-image.png');
        writeFileSync(outPath, buffer);
        console.log(`OG image saved to ${outPath} (${buffer.length} bytes)`);
        return;
      }
    }
  }

  console.log('No image found in response. Response structure:');
  console.log(JSON.stringify(data, null, 2).slice(0, 1000));
  console.log('\nFalling back to SVG...');
  generateSvgFallback();
}

function saveBase64Image(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const outPath = resolve(import.meta.dirname, '../static/og-image.png');
  writeFileSync(outPath, buffer);
  console.log(`OG image saved to ${outPath} (${buffer.length} bytes)`);
}

function generateSvgFallback() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="45%" r="35%">
      <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="#a78bfa" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#e4e4e7"/>
      <stop offset="100%" stop-color="#a1a1aa"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0a0b"/>
  <ellipse cx="600" cy="270" rx="400" ry="250" fill="url(#glow)"/>
  <text x="600" y="290" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="130" letter-spacing="-6" fill="url(#titleGrad)">K2K3</text>
  <text x="600" y="290" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="130" letter-spacing="-6">
    <tspan fill="transparent">K2K3</tspan><tspan fill="url(#accentGrad)">.ai</tspan>
  </text>
  <text x="600" y="360" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="400" font-size="34" fill="#a1a1aa">AI-rådgivare för svensk redovisning</text>
  <text x="600" y="420" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="500" font-size="20" fill="#52525b" letter-spacing="2">K2 · K3 · BOKFÖRING · BRF · FUSIONER</text>
  <rect x="500" y="465" width="200" height="2" rx="1" fill="#a78bfa" opacity="0.3"/>
  <text x="600" y="530" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="400" font-size="18" fill="#3f3f46">Exakta punktreferenser till BFN:s regelverk</text>
</svg>`;

  const outPath = resolve(import.meta.dirname, '../static/og-image.svg');
  writeFileSync(outPath, svg);
  console.log(`SVG OG image saved to ${outPath}`);
}

generateOgImage().catch(console.error);
