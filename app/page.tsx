'use client';

import { useState, useEffect, useRef } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, serverTimestamp, 
  query, where, orderBy, getDocs, limit 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, googleProvider } from '@/lib/firebaseClient';

// --- TYPES ---
type AnnotationType = 'ARROW' | 'CIRCLE' | 'UNDERLINE' | 'MARGIN' | 'STRIKETHROUGH' | 'BIG X';

interface Annotation {
  type: AnnotationType;
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
}

interface RoastHistoryItem {
  id: string;
  imageUrl: string;
  createdAt: any;
  roastText: string;
}

export default function Home() {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Roast State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastText, setRoastText] = useState<string | null>(null);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  
  // History State
  const [history, setHistory] = useState<RoastHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastSavedRoastRef = useRef<string | null>(null);

  // Firebase Instances
  const db = auth ? getFirestore(auth.app) : null;
  const storage = auth ? getStorage(auth.app) : null;

  // --- EFFECTS ---

  // 1. Load Font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // 2. Auth Listener
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Fetch History saat User Login
  useEffect(() => {
    if (user && db) {
      fetchHistory();
    } else {
      setHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- ACTIONS ---

  const fetchHistory = async () => {
    if (!user || !db) return;
    setIsLoadingHistory(true);
    try {
      const q = query(
        collection(db, "roast_history"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(8)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedHistory: RoastHistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        fetchedHistory.push({ id: doc.id, ...doc.data() } as RoastHistoryItem);
      });
      setHistory(fetchedHistory);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) return setError("Firebase not configured.");
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Login failed: " + message);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      resetState();
    } catch (err) {
      console.error(err);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRoastText(null);
    lastSavedRoastRef.current = null;
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload image files (JPG/PNG).');
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setRoastText(null);
      lastSavedRoastRef.current = null;
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

      const response = await fetch('/api/roast', { method: 'POST', body: formData });

      if (!response.ok) {
        const errorText = await response.text();
        try {
            const json = JSON.parse(errorText);
            throw new Error(json.error || 'AI Error');
        } catch {
            throw new Error('Failed to connect to AI Service');
        }
      }

      const data = await response.json();
      setRoastText(data.roast);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Roasting Failed: ' + msg);
    } finally {
      setIsRoasting(false);
    }
  };

  // --- CANVAS LOGIC (UNCHANGED LOGIC, JUST RE-IMPLEMENTED) ---
  const parseAnnotations = (text: string, imgWidth: number, imgHeight: number): Annotation[] => {
    const annotations: Annotation[] = [];
    const lines = text.split('\n').filter(l => l.trim());
    const padding = imgWidth * 0.05;
    const usableWidth = imgWidth - (padding * 2);
    const usableHeight = imgHeight - (padding * 2);
    
    lines.forEach((line, index) => {
      let type: AnnotationType = 'MARGIN';
      let cleanText = line;
      
      if (line.includes('[ARROW]')) { type = 'ARROW'; cleanText = line.replace(/\[ARROW\]/gi, '').trim(); }
      else if (line.includes('[CIRCLE]')) { type = 'CIRCLE'; cleanText = line.replace(/\[CIRCLE\]/gi, '').trim(); }
      else if (line.includes('[UNDERLINE]')) { type = 'UNDERLINE'; cleanText = line.replace(/\[UNDERLINE\]/gi, '').trim(); }
      else if (line.includes('[MARGIN]')) { type = 'MARGIN'; cleanText = line.replace(/\[MARGIN\]/gi, '').trim(); }
      else if (line.includes('[STRIKETHROUGH]')) { type = 'STRIKETHROUGH'; cleanText = line.replace(/\[STRIKETHROUGH\]/gi, '').trim(); }
      else if (line.includes('[BIG X]')) { type = 'BIG X'; cleanText = line.replace(/\[BIG X\]/gi, '').trim(); }
      
      const baseY = padding + (index * usableHeight / lines.length);
      const randomY = baseY + (Math.random() - 0.5) * 60;
      let x = padding;
      
      if (type === 'MARGIN' && Math.random() > 0.5) { x = imgWidth - padding - 200; } 
      else { x = padding + Math.random() * (usableWidth * 0.3); }
      
      let fontSize = Math.max(20, Math.floor(imgWidth / 40));
      if (type === 'CIRCLE' || type === 'BIG X') fontSize *= 1.3;
      if (type === 'MARGIN') fontSize *= 0.9;
      
      annotations.push({
        type, text: cleanText, x: Math.max(padding, Math.min(x, imgWidth - padding)),
        y: Math.max(padding, Math.min(randomY, imgHeight - padding - 50)),
        rotation: (Math.random() - 0.5) * 0.08, fontSize
      });
    });
    return annotations;
  };

  const drawCanvasHelpers = (ctx: CanvasRenderingContext2D) => {
     // Helper functions for drawing (same as before)
     return {
        arrow: (fx: number, fy: number, tx: number, ty: number) => {
            const headlen = 15;
            const angle = Math.atan2(ty - fy, tx - fx);
            ctx.beginPath();
            ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
            ctx.lineTo(tx - headlen * Math.cos(angle - Math.PI/6), ty - headlen * Math.sin(angle - Math.PI/6));
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - headlen * Math.cos(angle + Math.PI/6), ty - headlen * Math.sin(angle + Math.PI/6));
            ctx.stroke();
        },
        circle: (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); },
        underline: (x: number, y: number, w: number) => {
            ctx.beginPath(); ctx.moveTo(x, y);
            for (let i = 0; i <= w; i += 5) ctx.lineTo(x + i, y + Math.sin(i * 0.1) * 2);
            ctx.stroke();
        },
        bigX: (x: number, y: number, s: number) => {
            ctx.beginPath(); ctx.moveTo(x-s, y-s); ctx.lineTo(x+s, y+s); ctx.moveTo(x+s, y-s); ctx.lineTo(x-s, y+s); ctx.stroke();
        },
        wrap: (text: string, maxW: number) => {
            const words = text.split(' '); const lines = []; let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
                if (ctx.measureText(currentLine + " " + words[i]).width < maxW) currentLine += " " + words[i];
                else { lines.push(currentLine); currentLine = words[i]; }
            }
            lines.push(currentLine); return lines;
        }
     }
  }

  // --- SAVE TO FIREBASE ---
  const saveResultToFirebase = async (canvas: HTMLCanvasElement) => {
    if (!user || !db || !storage) return;
    setIsSavingToCloud(true);
    try {
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
        if (!blob) throw new Error("Blob creation failed");

        const filename = `roasts/${user.uid}/${Date.now()}.png`;
        const uploadResult = await uploadBytes(ref(storage, filename), blob);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        await addDoc(collection(db, "roast_history"), {
            uid: user.uid,
            displayName: user.displayName || "Anonymous",
            email: user.email,
            imageUrl: downloadURL,
            roastText: roastText,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent
        });
        
        // Refresh history list
        fetchHistory();

    } catch (err) {
        console.error("Save error:", err);
    } finally {
        setIsSavingToCloud(false);
    }
  };

  // --- RENDER EFFECT ---
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
          ctx.drawImage(img, 0, 0);
          
          const annotations = parseAnnotations(roastText, img.width, img.height);
          const draw = drawCanvasHelpers(ctx);
          
          ctx.strokeStyle = "#ff0000"; ctx.fillStyle = "#ff0000"; ctx.lineWidth = 3;
          
          annotations.forEach(ann => {
            ctx.save();
            ctx.font = `${ann.fontSize}px "Patrick Hand", cursive`;
            ctx.textBaseline = "top";
            ctx.translate(ann.x, ann.y); ctx.rotate(ann.rotation);
            
            const lines = draw.wrap(ann.text, img.width * 0.4);
            const lh = ann.fontSize * 1.2;
            
            // Helper logic for specific types (Simplified for brevity but functionally same)
            if (ann.type === 'ARROW') {
                 ctx.translate(-ann.x, -ann.y);
                 draw.arrow(ann.x - 30, ann.y + 10, ann.x - 5, ann.y + 10);
                 ctx.translate(ann.x, ann.y);
            } else if (ann.type === 'CIRCLE') {
                 const tw = ctx.measureText(ann.text).width;
                 ctx.translate(-ann.x, -ann.y);
                 draw.circle(ann.x + tw/2, ann.y + ann.fontSize/2, Math.max(tw, ann.fontSize)*0.7);
                 ctx.translate(ann.x, ann.y);
            } else if (ann.type === 'BIG X') {
                 ctx.translate(-ann.x, -ann.y);
                 draw.bigX(ann.x, ann.y + ann.fontSize, ann.fontSize*1.5);
                 ctx.translate(ann.x, ann.y);
            }
            
            lines.forEach((line, i) => {
                ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 4;
                ctx.strokeText(line, 0, i * lh + (ann.type==='BIG X'?ann.fontSize*2:0));
                ctx.strokeStyle = "#ff0000"; ctx.lineWidth = 3;
                ctx.fillText(line, 0, i * lh + (ann.type==='BIG X'?ann.fontSize*2:0));
                
                if (ann.type === 'UNDERLINE') {
                     const w = ctx.measureText(line).width;
                     ctx.translate(-ann.x, -ann.y);
                     draw.underline(ann.x, ann.y + (i+1)*lh - 5, w);
                     ctx.translate(ann.x, ann.y);
                } else if (ann.type === 'STRIKETHROUGH') {
                     const w = ctx.measureText(line).width;
                     ctx.beginPath(); ctx.moveTo(0, i*lh + lh/2); ctx.lineTo(w, i*lh + lh/2); ctx.stroke();
                }
            });
            ctx.restore();
          });

          // Watermark
          ctx.font = `${Math.max(14, img.width / 60)}px "Patrick Hand", sans-serif`;
          ctx.textAlign = "right";
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.lineWidth = 2;
          const wm = "roasted by LinkedIn Roaster";
          ctx.strokeText(wm, canvas.width - 20, canvas.height - 20);
          ctx.fillText(wm, canvas.width - 20, canvas.height - 20);

          // Auto Save
          if (roastText !== lastSavedRoastRef.current) {
            lastSavedRoastRef.current = roastText;
            saveResultToFirebase(canvas);
          }
        };
      });
    }
  }, [roastText, selectedFile]); // eslint-disable-line

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `roast-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    }
  };

  // --- RENDER UI ---
  if (authLoading) return (
    <div className="flex h-screen w-full justify-center items-center bg-slate-50">
       <div className="flex flex-col items-center gap-3">
         <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
         <span className="text-slate-500 text-sm font-medium">Loading Application...</span>
       </div>
    </div>
  );

  // VIEW: NOT LOGGED IN
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-r from-red-600 to-red-500 h-3 w-full"></div>
            <div className="p-10 text-center">
                <div className="mb-6 inline-flex p-3 bg-red-50 rounded-full text-4xl">🔥</div>
                <h1 className="text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">LinkedIn Roaster</h1>
                <p className="text-slate-500 mb-10 text-lg leading-relaxed">
                    AI-powered career roasting. Upload your profile screenshot and get humbled instantly.
                    <br/><span className="text-sm text-slate-400 mt-2 block">(Warning: High level damage guaranteed)</span>
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center justify-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                <button 
                    onClick={handleLogin}
                    className="group w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                >
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                    Continue with Google
                </button>
                <p className="mt-6 text-xs text-slate-400">By continuing, you agree to handle the roast with dignity.</p>
            </div>
        </div>
      </div>
    );
  }

  // VIEW: LOGGED IN
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center max-w-6xl">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="font-bold text-xl tracking-tight text-slate-900">LinkedIn Roaster</span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />}
                    <span className="text-sm font-medium text-slate-600">{user.displayName}</span>
                </div>
                <button 
                    onClick={handleLogout}
                    className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
                >
                    Sign Out
                </button>
            </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 max-w-5xl pt-10">
        
        {/* MAIN UPLOAD & PREVIEW AREA */}
        {!roastText ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 text-center transition-all">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Upload your Profile</h2>
                    <p className="text-slate-500 mb-8">Take a screenshot of your LinkedIn profile header (or any section) and drop it below.</p>
                    
                    {error && <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                    <div className="relative group w-full">
                        <label className={`
                            flex flex-col items-center justify-center w-full h-80 
                            border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                            ${previewUrl ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}
                        `}>
                            {previewUrl ? (
                                <div className="relative w-full h-full p-4 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={previewUrl} alt="Preview" className={`max-h-full max-w-full object-contain rounded-lg shadow-sm ${isRoasting ? 'opacity-50 blur-sm' : ''}`} />
                                    {isRoasting && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <p className="font-bold text-slate-700 bg-white/80 px-4 py-1 rounded-full">Analyzing Tone... (This may take some time)</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 group-hover:text-slate-600 transition-colors">
                                    <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                    <p className="mb-2 text-lg font-medium">Click to upload or drag image</p>
                                    <p className="text-sm opacity-70">PNG, JPG up to 5MB</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isRoasting} />
                        </label>
                    </div>

                    <div className="mt-8 flex justify-center">
                         <button 
                            onClick={handleRoastProcess}
                            disabled={!selectedFile || isRoasting}
                            className={`
                                py-4 px-12 rounded-full font-bold text-lg shadow-xl transition-all transform active:scale-95
                                ${!selectedFile || isRoasting 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 hover:shadow-red-300'}
                            `}
                        >
                            {isRoasting ? "Roasting in progress..." : "🔥 ROAST IT NOW"}
                        </button>
                    </div>
                    <p className="mt-6 text-xs text-left text-slate-400 max-w-lg mx-auto leading-relaxed">
                        *This service is strictly for entertainment and self-evaluation; any use for bullying, hate speech, or defamation is strictly prohibited. To ensure responsible use and platform safety, please be aware that all uploaded images are logged.
                    </p>
                </div>
            </div>
        ) : (
            // RESULT VIEW
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 md:p-10 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-red-500">🔥</span> Result
                    </h2>
                    {isSavingToCloud && (
                         <span className="text-xs font-medium text-blue-500 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                            Saving to cloud...
                         </span>
                    )}
                </div>

                <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl mb-8 flex justify-center items-center border border-slate-800">
                    <canvas ref={canvasRef} className="max-w-full h-auto mx-auto" style={{ maxHeight: '75vh' }}></canvas>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        onClick={handleDownload} 
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Download Image
                    </button>
                    <button 
                        onClick={() => setRoastText(null)} 
                        className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-slate-300 hover:bg-slate-50 font-medium transition-colors"
                    >
                        Roast Another
                    </button>
                </div>
            </div>
        )}

        {/* HISTORY GALLERY SECTION */}
        <div className="mt-16 mb-20">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 px-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Your Roast History
            </h3>
            
            {isLoadingHistory ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-slate-200 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : history.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {history.map((item) => (
                        <div key={item.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <a 
                                    href={item.imageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-900"
                                    title="View Full"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                </a>
                             </div>
                             <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                             </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400">No roast history yet.</p>
                </div>
            )}
        </div>

      </div>
    </main>
  );
}