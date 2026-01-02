import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Daftar prioritas model sesuai request kamu.
// Kode akan mencoba dari atas ke bawah.
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
    
    const prompt = `
      Overlay the image with hand-drawn red-ink annotations, scribbles, arrows, and margin notes.
      Tone: sharp, sarcastic, slightly mean, but genuinely funny.
      Voice: a veteran, no-BS expert in [your field] who has seen this mistake a thousand times.
      Critique should be insightful, technically accurate, and ruthless, but still entertaining.
      Style it like a real expert marking up a bad draft, not a meme
    `;

    // --- LOGIKA LOOPING MODEL ---
    let lastError = null;
    let successText = "";

    for (const modelName of PRIORITY_MODELS) {
      try {
        console.log(`Mencoba model: ${modelName}...`);
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
        console.log(`✅ Berhasil menggunakan model: ${modelName}`);
        break; // Stop loop jika berhasil

      } catch (err: any) {
        console.warn(`❌ Gagal dengan model ${modelName}:`, err.message);
        lastError = err;
        // Lanjut ke model berikutnya di list...
      }
    }

    // Jika semua model gagal
    if (!successText) {
      throw new Error(`Semua model gagal. Error terakhir: ${lastError?.message}`);
    }

    return NextResponse.json({ roast: successText });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}