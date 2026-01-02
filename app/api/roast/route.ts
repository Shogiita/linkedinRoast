import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Pastikan API Key sudah benar di .env.local
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const PRIORITY_MODELS = [
  "models/gemini-3-pro-preview",
  "models/gemini-3-flash-preview",
  "models/gemini-2.5-flash",
  "models/gemini-2.0-flash",      
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    // --- PERBAIKAN PROMPT ---
    const prompt = `
      Act as a visual analyzer. Generate TEXT annotations for a LinkedIn profile roast.
      
      CORE INSTRUCTION:
      "Overlay the image with hand-drawn red-ink annotations. Tone: sharp, sarcastic, slightly mean, but genuinely funny. Voice: a veteran, no-BS expert in recruitment/tech."

      STRICT OUTPUT RULES (Follow these exactly to avoid formatting errors):
      1. Generate 8 to 12 short, biting annotations.
      2. PLAIN TEXT ONLY. Do NOT use Markdown (no **bold**, no headers).
      3. NO BULLET POINTS, NO DASHES, NO HYPHENS at the start of lines. 
      4. START every line IMMEDIATELY with one of these tags: [ARROW], [STRIKE], [NOTE].
      5. Language: ENGLISH ONLY.
      6. Keep each annotation SHORT (max 10-15 words).

      CORRECT OUTPUT EXAMPLE:
      [ARROW] This tie screams "I sell used cars", not "CEO".
      [STRIKE] "Visionary" -> Just say "Unemployed".
      [NOTE] The background is messy. Clean your room.
      [ARROW] Generic banner image. Zero effort detected.
    `;

    let lastError = null;
    let successText = "";

    for (const modelName of PRIORITY_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: file.type
            }
          }
        ]);
        
        successText = result.response.text();
        if (successText) break;

      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!successText) {
      throw new Error(`AI Error: ${lastError?.message}`);
    }

    return NextResponse.json({ roast: successText });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}