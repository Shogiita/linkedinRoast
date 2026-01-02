'use client';

import { useState, useEffect, useRef } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import Image from 'next/image';
import { auth, googleProvider } from '@/lib/firebaseClient';

// Type untuk annotation
type AnnotationType = 'ARROW' | 'CIRCLE' | 'UNDERLINE' | 'MARGIN' | 'STRIKETHROUGH' | 'BIG X';

interface Annotation {
  type: AnnotationType;
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastText, setRoastText] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("Login gagal: " + (err.message || "Unknown error"));
    }
  };

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

  // Parse annotations dari text AI
  const parseAnnotations = (text: string, imgWidth: number, imgHeight: number): Annotation[] => {
    const annotations: Annotation[] = [];
    const lines = text.split('\n').filter(l => l.trim());
    
    const padding = imgWidth * 0.05;
    const usableWidth = imgWidth - (padding * 2);
    const usableHeight = imgHeight - (padding * 2);
    
    lines.forEach((line, index) => {
      let type: AnnotationType = 'MARGIN';
      let cleanText = line;
      
      // Detect annotation type
      if (line.includes('[ARROW→]') || line.includes('[ARROW]')) {
        type = 'ARROW';
        cleanText = line.replace(/\[ARROW[→]?\]/gi, '').trim();
      } else if (line.includes('[CIRCLE]')) {
        type = 'CIRCLE';
        cleanText = line.replace(/\[CIRCLE\]/gi, '').trim();
      } else if (line.includes('[UNDERLINE]')) {
        type = 'UNDERLINE';
        cleanText = line.replace(/\[UNDERLINE\]/gi, '').trim();
      } else if (line.includes('[MARGIN]')) {
        type = 'MARGIN';
        cleanText = line.replace(/\[MARGIN\]/gi, '').trim();
      } else if (line.includes('[STRIKETHROUGH]')) {
        type = 'STRIKETHROUGH';
        cleanText = line.replace(/\[STRIKETHROUGH\]/gi, '').trim();
      } else if (line.includes('[BIG X]')) {
        type = 'BIG X';
        cleanText = line.replace(/\[BIG X\]/gi, '').trim();
      }
      
      // Random positioning dengan slight variation
      const baseY = padding + (index * usableHeight / lines.length);
      const randomY = baseY + (Math.random() - 0.5) * 60;
      
      let x = padding;
      // Margin notes go to the right side sometimes
      if (type === 'MARGIN' && Math.random() > 0.5) {
        x = imgWidth - padding - 200;
      } else {
        x = padding + Math.random() * (usableWidth * 0.3);
      }
      
      // Font size variation based on type
      const baseFontSize = Math.max(20, Math.floor(imgWidth / 40));
      let fontSize = baseFontSize;
      if (type === 'CIRCLE' || type === 'BIG X') fontSize *= 1.3;
      if (type === 'MARGIN') fontSize *= 0.9;
      
      // Slight rotation for hand-drawn effect
      const rotation = (Math.random() - 0.5) * 0.08; // -0.04 to 0.04 radians (~2-3 degrees)
      
      annotations.push({
        type,
        text: cleanText,
        x: Math.max(padding, Math.min(x, imgWidth - padding)),
        y: Math.max(padding, Math.min(randomY, imgHeight - padding - 50)),
        rotation,
        fontSize
      });
    });
    
    return annotations;
  };

  // Draw arrow
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  // Draw circle annotation
  const drawCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Draw underline with wobble
  const drawUnderline = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= width; i += 5) {
      ctx.lineTo(x + i, y + Math.sin(i * 0.1) * 2);
    }
    ctx.stroke();
  };

  // Draw X mark
  const drawX = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
  };

  // Wrap text
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
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

  // Main canvas rendering effect
  useEffect(() => {
    if (roastText && selectedFile && canvasRef.current) {
      document.fonts.ready.then(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        const img = new window.Image();
        img.src = URL.createObjectURL(selectedFile);
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Parse annotations
          const annotations = parseAnnotations(roastText, img.width, img.height);
          
          // Setup base style
          ctx.strokeStyle = "#ff0000";
          ctx.fillStyle = "#ff0000";
          ctx.lineWidth = 3;
          
          // Draw each annotation
          annotations.forEach(annotation => {
            ctx.save();
            
            // Set font
            ctx.font = `${annotation.fontSize}px "Patrick Hand", "Comic Sans MS", cursive`;
            ctx.textBaseline = "top";
            
            // Apply rotation
            ctx.translate(annotation.x, annotation.y);
            ctx.rotate(annotation.rotation);
            
            // Wrap text
            const maxWidth = img.width * 0.4;
            const lines = wrapText(ctx, annotation.text, maxWidth);
            const lineHeight = annotation.fontSize * 1.2;
            
            // Draw based on type
            if (annotation.type === 'ARROW') {
              // Draw arrow first
              ctx.translate(-annotation.x, -annotation.y);
              const arrowStartX = annotation.x - 30;
              const arrowEndX = annotation.x - 5;
              drawArrow(ctx, arrowStartX, annotation.y + 10, arrowEndX, annotation.y + 10);
              ctx.translate(annotation.x, annotation.y);
              
              // Then text
              lines.forEach((line, i) => {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 4;
                ctx.strokeText(line, 0, i * lineHeight);
                ctx.strokeStyle = "#ff0000";
                ctx.fillText(line, 0, i * lineHeight);
              });
              
            } else if (annotation.type === 'CIRCLE') {
              // Draw circle around text area
              const textWidth = ctx.measureText(annotation.text).width;
              ctx.translate(-annotation.x, -annotation.y);
              drawCircle(ctx, annotation.x + textWidth / 2, annotation.y + annotation.fontSize / 2, Math.max(textWidth, annotation.fontSize) * 0.7);
              ctx.translate(annotation.x, annotation.y);
              
              lines.forEach((line, i) => {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 4;
                ctx.strokeText(line, 0, i * lineHeight);
                ctx.strokeStyle = "#ff0000";
                ctx.fillText(line, 0, i * lineHeight);
              });
              
            } else if (annotation.type === 'UNDERLINE') {
              lines.forEach((line, i) => {
                const width = ctx.measureText(line).width;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 4;
                ctx.strokeText(line, 0, i * lineHeight);
                ctx.strokeStyle = "#ff0000";
                ctx.fillText(line, 0, i * lineHeight);
                
                // Draw underline
                ctx.translate(-annotation.x, -annotation.y);
                drawUnderline(ctx, annotation.x, annotation.y + (i + 1) * lineHeight - 5, width);
                ctx.translate(annotation.x, annotation.y);
              });
              
            } else if (annotation.type === 'BIG X') {
              // Draw big X
              ctx.translate(-annotation.x, -annotation.y);
              drawX(ctx, annotation.x, annotation.y + annotation.fontSize, annotation.fontSize * 1.5);
              ctx.translate(annotation.x, annotation.y);
              
              lines.forEach((line, i) => {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 4;
                ctx.strokeText(line, 0, i * lineHeight + annotation.fontSize * 2);
                ctx.strokeStyle = "#ff0000";
                ctx.fillText(line, 0, i * lineHeight + annotation.fontSize * 2);
              });
              
            } else {
              // Default: MARGIN or STRIKETHROUGH
              lines.forEach((line, i) => {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 4;
                ctx.strokeText(line, 0, i * lineHeight);
                ctx.strokeStyle = "#ff0000";
                ctx.fillText(line, 0, i * lineHeight);
                
                if (annotation.type === 'STRIKETHROUGH') {
                  const width = ctx.measureText(line).width;
                  ctx.beginPath();
                  ctx.moveTo(0, i * lineHeight + lineHeight / 2);
                  ctx.lineTo(width, i * lineHeight + lineHeight / 2);
                  ctx.stroke();
                }
              });
            }
            
            ctx.restore();
          });
          
          // Watermark
          ctx.font = `${Math.max(14, img.width / 60)}px "Patrick Hand", sans-serif`;
          ctx.textAlign = "right";
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.lineWidth = 2;
          const watermark = "🔥 roasted by nano banana";
          ctx.strokeText(watermark, canvas.width - 20, canvas.height - 20);
          ctx.fillText(watermark, canvas.width - 20, canvas.height - 20);
        };
      });
    }
  }, [roastText, selectedFile]);

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