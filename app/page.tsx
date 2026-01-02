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
  const [roastedResultUrl, setRoastedResultUrl] = useState<string | null>(null);
  
  // Canvas Ref untuk rendering dan download image
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Handle Auth State Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle Login
  const handleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("Login gagal: " + (err.message || "Unknown error"));
    }
  };

  // 3. Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Reset semua state aplikasi saat logout
      setSelectedFile(null);
      setPreviewUrl(null);
      setRoastedResultUrl(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Handle File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Mohon upload file gambar.');
        return;
      }
      setSelectedFile(file);
      // Buat URL preview lokal
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setRoastedResultUrl(null); // Reset hasil sebelumnya jika ada upload baru
      setError('');
    }
  };

  // 5. FUNGSI UTAMA: Proses Roasting (SIMULASI)
  // Ganti handleRoastProcess yang lama dengan ini:
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

      // Cek apakah response sukses
      if (!response.ok) {
        // BACA DULU SEBAGAI TEXT, JANGAN LANGSUNG JSON
        const errorText = await response.text(); 
        console.error("Server Error Full Text:", errorText); // Cek Console browser (F12) untuk lihat ini
        
        try {
          // Coba parsing kalau ternyata formatnya JSON
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Terjadi kesalahan pada AI');
        } catch (e) {
          // Kalau bukan JSON (misal "Server Error"), tampilkan teks aslinya
          throw new Error(`Gagal: ${errorText.slice(0, 50)}...`); 
        }
      }

      const data = await response.json();
      const roastText = data.roast;
      
      // 3. Tampilkan Hasil
      // Kita tempel teks asli dari Gemini ke template gambar
      const safeText = encodeURIComponent(roastText.slice(0, 300)); 
      const realRoastImage = `https://placehold.co/800x1000/e0e0e0/d93025.png?text=${safeText}&font=roboto`;
      
      setRoastedResultUrl(realRoastImage);

    } catch (err: any) {
      console.error(err);
      setError('Gagal roasting: ' + err.message);
    } finally {
      setIsRoasting(false);
    }
  };

  // 6. Effect untuk Menggambar Hasil di Canvas
  // Ini berjalan ketika roastedResultUrl sudah didapatkan
  useEffect(() => {
    if (roastedResultUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      // Penting untuk mengizinkan manipulasi gambar lintas domain jika URL dari eksternal
      img.crossOrigin = "anonymous"; 
      
      img.onload = () => {
        // Set ukuran canvas agar sesuai dengan gambar hasil
        canvas.width = img.width;
        canvas.height = img.height;
        // Gambar image hasil AI ke dalam canvas
        ctx?.drawImage(img, 0, 0);
      };
      img.src = roastedResultUrl;
    }
  }, [roastedResultUrl]);


  // 7. Handle Download Image dari Canvas
  const handleDownload = () => {
    if (canvasRef.current) {
      // Mengubah isi canvas menjadi Data URL (base64 image)
      const imageURI = canvasRef.current.toDataURL("image/png");
      
      // Membuat link sementara untuk men-trigger download
      const link = document.createElement('a');
      link.download = `linkedin-roast-${Date.now()}.png`;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      link.remove();
    }
  };

  // -- Render Loading State Awal --
  if (authLoading) {
    return <div className="flex h-screen justify-center items-center bg-gray-100"><div className="spinner"></div></div>;
  }

  // -- Render Halaman Login (REQ 1: UI Diperbaiki) --
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f2ef] p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center relative overflow-hidden">
          {/* Hiasan peringatan */}
          <div className="absolute top-0 left-0 w-full h-2 bg-[#d93025]"></div>
          <h1 className="text-3xl font-black text-[#d93025] mb-2 transform -rotate-2" style={{fontFamily: 'cursive'}}>WARNING!</h1>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">LinkedIn Roast Arena</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Halaman ini berisi konten "Roasting" tingkat tinggi oleh AI. 
            <br/>Siapkan mental Anda sebelum masuk.
          </p>
          
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
          
          {/* Tombol Google Sign-In yang diperbaiki */}
          <button onClick={handleLogin} className="flex items-center justify-center w-full bg-white border border-gray-300 rounded-full p-3 shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-700 font-medium">
            <Image 
              src="/image/google.png" 
              alt="G" 
              width={24} height={24}
              className="mr-3"
            />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // -- Render Halaman Utama (Setelah Login) --
  return (
    <main className="min-h-screen bg-[#f3f2ef] pb-20">
      {/* Header Bar */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center mb-8">
        <div className="font-bold text-xl text-gray-800">🔥 LinkedIn Roaster</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">Hi, {user.displayName}</span>
          <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors text-sm">
            Keluar
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Area Peringatan */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Sistem menggunakan "Nano Banana AI" (Simulasi). Hasil roasting mungkin menyebabkan sakit hati ringan hingga sedang.
              </p>
            </div>
          </div>
        </div>

        {/* REQ 2: Upload UI */}
        {!roastedResultUrl && (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-6">Langkah 1: Upload Screenshot Profil</h2>
            <p className="text-gray-500 mb-6">Ambil screenshot penuh halaman profil LinkedIn Anda, lalu upload di sini.</p>
            
            {/* Area Dropzone / Input File */}
            <div className="flex items-center justify-center w-full mb-6">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden">
                    {previewUrl ? (
                      // Preview gambar yang dipilih
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4" style={{opacity: isRoasting ? 0.5 : 1}} />
                    ) : (
                      // Placeholder sebelum upload
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-10 h-10 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Klik untuk upload</span> atau drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG (Max. 800x1200px disarankan)</p>
                      </div>
                    )}
                    <input id="dropzone-file" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isRoasting} />
                </label>
            </div>
            
            {error && <p className="text-red-500 mt-2 mb-4">{error}</p>}

            {/* Tombol Eksekusi Roasting */}
            <button 
              onClick={handleRoastProcess}
              disabled={!selectedFile || isRoasting}
              className={`w-full py-4 rounded-lg text-white font-bold text-lg transition-all flex justify-center items-center ${
                !selectedFile || isRoasting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#d93025] hover:bg-red-700 shadow-md hover:shadow-lg'
              }`}
            >
              {isRoasting ? (
                <>
                  <div className="spinner w-6 h-6 border-white border-l-transparent mr-3"></div>
                  Menghubungi Nano Banana AI...
                </>
              ) : (
                "🔥 ROAST ME NOW! 🔥"
              )}
            </button>
          </div>
        )}

        {/* REQ 4 & 5 & 6: Hasil Roasting (Canvas) & Download */}
        {roastedResultUrl && (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
             <h2 className="text-3xl font-black text-[#d93025] mb-2" style={{fontFamily: 'cursive'}}>HASIL ROASTING!</h2>
             <p className="text-gray-600 mb-6">Jangan nangis ya. Ini cuma AI kok.</p>

            {/* Container untuk Canvas */}
             <div className="relative rounded-lg overflow-hidden border-4 border-[#d93025] shadow-xl mb-8 bg-gray-100 min-h-[300px] flex justify-center items-center">
                {/* REQ 4: Menggunakan Element Canvas. 
                  Canvas ini akan digambar oleh useEffect ketika roastedResultUrl tersedia.
                  Kita membuatnya responsif dengan max-w-full.
                */}
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full h-auto mx-auto"
                  style={{ maxHeight: '70vh' }}
                ></canvas>
             </div>

             <div className="flex gap-4 justify-center">
               {/* REQ 6: Tombol Download */}
               <button 
                  onClick={handleDownload}
                  className="bg-gray-800 text-white px-6 py-3 rounded-full hover:bg-gray-900 transition-colors font-medium flex items-center"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                 Download Hasil Roast
               </button>
               
               <button 
                  onClick={() => { setRoastedResultUrl(null); setSelectedFile(null); setPreviewUrl(null); }}
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors font-medium"
               >
                 Coba Lagi
               </button>
             </div>
          </div>
        )}

      </div>
    </main>
  );
}