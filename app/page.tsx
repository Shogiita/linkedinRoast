'use client';

import { useState, useEffect, useRef } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import Image from 'next/image';
import { auth, googleProvider } from '@/lib/firebaseClient';

export default function Home() {
  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');

  // App States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastText, setRoastText] = useState<string | null>(null);
  
  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Google Font untuk efek "Marker"
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // 1. Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Login
  const handleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("Login gagal: " + (err.message || "Unknown error"));
    }
  };

  // 3. Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedFile(null);
      setPreviewUrl(null);
      setRoastText(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 4. File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Mohon upload file gambar.');
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setRoastText(null);
      setError('');
    }
  };

  // 5. Drawing Helpers
  // Fungsi untuk memecah teks panjang menjadi baris-baris
  const getLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
  };

  // 6. FUNGSI UTAMA: Proses Roasting
  const handleRoastProcess = async () => {
    if (!selectedFile) return;

    setIsRoasting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/roast', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Terjadi kesalahan pada AI');
        } catch (e) {
          throw new Error(`Gagal: ${errorText.slice(0, 50)}...`); 
        }
      }

      const data = await response.json();
      setRoastText(data.roast);

    } catch (err: any) {
      console.error(err);
      setError('Gagal roasting: ' + err.message);
    } finally {
      setIsRoasting(false);
    }
  };

  // 7. Effect: Menggambar Hasil di Canvas
  useEffect(() => {
    // Pastikan font sudah load sebelum menggambar (sedikit delay hack, idealnya pakai document.fonts.ready)
    if (roastText && selectedFile && canvasRef.current) {
      // Tunggu sebentar agar font Patrick Hand terload
      document.fonts.ready.then(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        const img = new window.Image();
        img.src = URL.createObjectURL(selectedFile);
        
        img.onload = () => {
          // A. Setup Canvas Ukuran Asli
          canvas.width = img.width;
          canvas.height = img.height;
          
          // B. Gambar Foto Profil (Original)
          ctx.drawImage(img, 0, 0);

          // C. Setup Style "Spidol Merah"
          // Ukuran font responsif terhadap lebar gambar (minimal 24px)
          const fontSize = Math.max(24, Math.floor(img.width / 30)); 
          const lineHeight = fontSize * 1.2;
          
          ctx.font = `${fontSize}px "Patrick Hand", "Comic Sans MS", cursive`;
          ctx.textBaseline = "top";
          
          // Efek Stroke Putih (Outline) agar teks terbaca di background gelap
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = Math.max(3, fontSize / 6); // Tebal stroke menyesuaikan font
          
          // Warna Teks Merah Terang
          ctx.fillStyle = "#ff0000"; 
          
          // D. Logic Penulisan (Handling Paragraphs)
          const padding = img.width * 0.05; // 5% padding kiri/kanan
          const maxWidth = img.width - (padding * 2);
          
          // Pisahkan berdasarkan Enter/Newline dari AI
          const paragraphs = roastText.split('\n');
          
          let cursorY = padding; // Mulai menulis dari posisi Y

          // Loop setiap paragraf
          paragraphs.forEach((paragraph) => {
            if (!paragraph.trim()) {
                cursorY += lineHeight; // Spasi untuk baris kosong
                return;
            }

            // Pecah paragraf jadi baris-baris (word wrap)
            const lines = getLines(ctx, paragraph, maxWidth);

            lines.forEach((line) => {
              // Cek apakah teks sudah keluar dari bawah gambar
              if (cursorY + lineHeight > img.height) return;

              // Gambar Outline (Stroke) DULU
              ctx.strokeText(line, padding, cursorY);
              // Gambar Teks (Fill) SETELAHNYA
              ctx.fillText(line, padding, cursorY);

              cursorY += lineHeight;
            });
            
            // Tambah jarak antar paragraf
            cursorY += lineHeight * 0.5; 
          });
          
          // Tambahkan watermark kecil di pojok kanan bawah
          const watermark = "🔥 roasted by nano banana";
          ctx.font = `${fontSize * 0.6}px "Patrick Hand", sans-serif`;
          ctx.textAlign = "right";
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.lineWidth = 2;
          ctx.strokeText(watermark, canvas.width - 20, canvas.height - 20);
          ctx.fillText(watermark, canvas.width - 20, canvas.height - 20);
        };
      });
    }
  }, [roastText, selectedFile]);

  // 8. Download Image
  const handleDownload = () => {
    if (canvasRef.current) {
      const imageURI = canvasRef.current.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `linkedin-roast-${Date.now()}.png`;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (authLoading) return <div className="flex h-screen justify-center items-center bg-gray-100"><div className="spinner"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f2ef] p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#d93025]"></div>
          <h1 className="text-3xl font-black text-[#d93025] mb-2 transform -rotate-2" style={{fontFamily: 'cursive'}}>WARNING!</h1>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">LinkedIn Roast Arena</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">AI Roasting Level Tinggi.<br/>Siapkan mental.</p>
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
          <button onClick={handleLogin} className="flex items-center justify-center w-full bg-white border border-gray-300 rounded-full p-3 shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-700 font-medium">
            <Image src="/image/google.png" alt="G" width={24} height={24} className="mr-3"/> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f2ef] pb-20 font-sans">
      <div className="bg-white shadow-sm p-4 flex justify-between items-center mb-8">
        <div className="font-bold text-xl text-gray-800">🔥 LinkedIn Roaster</div>
        <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors text-sm">Keluar</button>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {!roastText && (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-6">Upload Profil LinkedIn</h2>
            <div className="flex items-center justify-center w-full mb-6">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4" style={{opacity: isRoasting ? 0.5 : 1}} />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <p className="mb-2 text-sm text-gray-500 font-semibold">Klik untuk upload</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isRoasting} />
                </label>
            </div>
            {error && <p className="text-red-500 mt-2 mb-4">{error}</p>}
            <button 
              onClick={handleRoastProcess}
              disabled={!selectedFile || isRoasting}
              className={`w-full py-4 rounded-lg text-white font-bold text-lg transition-all flex justify-center items-center ${
                !selectedFile || isRoasting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#d93025] hover:bg-red-700 shadow-md'
              }`}
            >
              {isRoasting ? "Sedang Menganalisa..." : "🔥 ROAST NOW 🔥"}
            </button>
          </div>
        )}

        {roastText && (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
             <h2 className="text-3xl font-black text-[#d93025] mb-2" style={{fontFamily: '"Patrick Hand", cursive'}}>HASIL ROASTING</h2>
             <div className="relative rounded-lg overflow-hidden border-4 border-[#d93025] shadow-xl mb-8 bg-gray-800 flex justify-center items-center">
                <canvas ref={canvasRef} className="max-w-full h-auto mx-auto" style={{ maxHeight: '80vh' }}></canvas>
             </div>
             <div className="flex gap-4 justify-center">
               <button onClick={handleDownload} className="bg-gray-800 text-white px-6 py-3 rounded-full hover:bg-gray-900 transition-colors font-medium">Download Image</button>
               <button onClick={() => { setRoastText(null); }} className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors font-medium">Coba Lagi</button>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}