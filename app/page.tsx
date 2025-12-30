'use client'; 

import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from '../lib/firebase';
// import Image from 'next/image';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) { 
      setError("Login gagal: " + (err.message || "Unknown error"));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1 className="roast-title" style={{color: '#d93025', transform: 'rotate(-3deg)', marginBottom: '5px'}}>WARNING!</h1>
          <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '10px'}}>Need Login</div>
          <div style={{color: 'rgba(0,0,0,0.6)', marginBottom: '30px', fontSize: '14px'}}>
            Halaman ini berisi konten "Roasting" tingkat tinggi.<br />
            Silakan login untuk membuktikan Anda siap mental.
          </div>
          
          <button onClick={handleLogin} className="google-btn">
            <img 
              src="/image/google.png" 
              alt="G" 
              style={{marginRight: '12px', width: '18px', height: '18px'}} 
            />
            Sign in with Google
          </button>
          {error && <p style={{color:'red', fontSize:'12px', marginTop:'10px'}}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <main>
      <button onClick={handleLogout} className="logout-btn">
        <i className="fas fa-sign-out-alt"></i> Keluar
      </button>

      <div className="container">
        
        <div className="card">
          <div className="banner">
            <div className="roast-text r-banner">
              "Connect. Create. Celebrate"?<br />More like "Collect. Copy. Congratulate."
            </div>
            <svg className="banner-circle" viewBox="0 0 300 60">
              <path d="M 10,30 Q 150,5 290,30 Q 290,55 150,55 Q 10,55 10,30 M 10,30 L 15,28" />
            </svg>
          </div>

          <div className="profile-pic-container">
            <img src="/image/profilepicture.jpg" alt="Profile" />
          </div>

          <div className="header-content">
            <div className="left-col">
              <div className="roast-layer">
                <div className="roast-text r-headshot">
                  The "serious but approachable" headshot.<br />Seen it a million times.
                </div>
                <svg className="arrow-svg" viewBox="0 0 120 100">
                  <path d="M 100,80 Q 50,60 10,10" />
                </svg>
              </div>

              <h1>
                Esther Setiawan 
                <div className="badges">
                  <i className="fas fa-check-circle" style={{color: '#666'}}></i>
                  <span>(She/Her)</span>
                  <span style={{fontSize:'12px'}}>&bull; 1st</span>
                </div>
              </h1>
              
              <p className="headline">Google Developer Expert AI and Google Cloud, Professor ISTTS, GDG Surabaya Organizer</p>
              
              <div className="location">Surabaya, East Java, Indonesia &middot; <span className="contact-info">Contact info</span></div>
              <div className="connections">500+ connections</div>
              
              <div className="mutual-connections">
                <div className="mutual-avatars">
                  <img src="https://ui-avatars.com/api/?name=W+S&background=random" alt="WS" />
                  <img src="https://ui-avatars.com/api/?name=H+H&background=random" alt="HH" />
                </div>
                <div className="mutual-text">
                  <strong>William Sugiarto</strong>, <strong>Hanvy Hendrawan</strong>, and 44 other mutual connections
                </div>
              </div>

              <div className="btn-group">
                <button className="btn btn-primary"><i className="fas fa-paper-plane"></i> Message</button>
                <button className="btn btn-secondary">More</button>
              </div>
            </div>

            <div className="right-col">
              <div className="roast-layer">
                <div className="roast-text r-headline">
                  GDE, Professor, Organizer?<br />Pick a lane, superstar.<br />Spread too thin much?
                </div>
                <svg className="company-circle" viewBox="0 0 240 95">
                  <path d="M 10,10 Q 120,0 230,10 Q 235,50 230,90 Q 120,95 10,90 Q 0,50 10,10 M 10,10 L 15,15" />
                </svg>
              </div>

              <div className="company-row">
                <img src="/image/gdg.jpg" alt="GDE" />
                <span>Google Developer Experts</span>
              </div>
              <div className="company-row">
                <img src="/image/its.png" alt="ITS" />
                <span>Institut Teknologi Sepuluh Nopember Surabaya</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h2 className="section-title">About</h2>
            <i className="fas fa-pen" style={{color:'#666', cursor:'pointer'}}></i>
          </div>
          <div className="about-text" style={{position:'relative'}}>
            <div className="roast-layer">
              <div className="roast-text r-about" style={{
                top: '-5px', left: '580px', width: '210px', 
                transform: 'rotate(-2deg)', textAlign: 'left', background: 'white', 
                padding: '8px', border: '2px solid var(--roast-color)', 
                boxShadow: '2px 2px 5px rgba(0,0,0,0.1)'
              }}>
                TRANSLATION:<br />
                I STALK PEOPLE ON FACEBOOK FOR "NANO BANANA RESEARCH".
              </div>
            </div>

            I am a Lecturer with more than ten years of research in 
            <span style={{position:'relative', display:'inline-block', margin: '0 4px'}}>
              Social Network/Media Analysis
              <div style={{
                position: 'absolute', width: '105%', height: '140%',
                top: '-15%', left: '-2%', border: '3px solid var(--roast-color)',
                borderRadius: '50% 60% 50% 40%', transform: 'rotate(-2deg)', pointerEvents: 'none'
              }}></div>
            </span> 
           and professional work experience in the computer software industry and machine learning. My background includes the creation of machine learning models; websites using HTML, CSS, and JAVASCRIPT; front-end development of desktop and web-based applications; database management of Cloud systems, as well as designing mobile applications for Android. I also have good experier... <span style={{color:'var(--text-secondary)', cursor:'pointer'}}>see more</span>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Activity</h2>
              <div style={{fontSize:'14px', color:'var(--link-blue)', marginTop:'2px'}}>2,942 followers</div>
            </div>
            <button className="btn btn-secondary" style={{borderRadius:'16px'}}>Following</button>
          </div>

          <div className="activity-nav">
            <button className="pill active">Posts</button>
            <button className="pill">Comments</button>
            <button className="pill">Images</button>
          </div>

          <div className="activity-grid">
            
            <div className="feed-post">
              <div className="post-header">
                <img src="/image/profilepicture.jpg" className="mini-avatar" alt="Avatar" />
                <div className="post-meta">
                  <div>Esther Setiawan <i className="fas fa-check-circle" style={{fontSize:'12px', marginLeft:'4px', color:'#666'}}></i> &bull; 1st</div>
                  <div>4d &bull; <i className="fas fa-globe-americas"></i></div>
                </div>
                <i className="fas fa-ellipsis-h" style={{marginLeft:'auto', color:'#666', cursor:'pointer'}}></i>
              </div>
              <div className="post-caption">
                I’m happy to share that I’ve obtained a new certification: Building RAG Agents with LLMs from <span style={{color:'var(--link-blue)', fontWeight:600}}>NVIDIA!</span>
              </div>
              
              <div style={{position:'relative'}}>
                <div className="post-image-area">
                  <img src="/image/nvidia.gif" alt="NVIDIA" className="post-gif" />
                </div>
                <div className="post-img-text">Celebrating a New Certification</div>
                <div className="roast-text r-post-1">
                  RAG Agents with LLMs? <br />2023 called, it wants its hype back.
                </div>
              </div>
              <div className="post-footer" style={{borderTop:'none'}}>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}>
                   40 Likes
                </span>
                <span style={{marginLeft:'auto'}}>1 comment</span>
              </div>
              <div className="action-bar">
                <button className="action-btn"><i className="far fa-thumbs-up"></i></button>
                <button className="action-btn"><i className="far fa-comment"></i></button>
                <button className="action-btn"><i className="fas fa-share"></i></button>
              </div>
            </div>

            <div className="feed-post">
              <div className="post-header">
                <img src="/image/profilepicture.jpg" className="mini-avatar" alt="Avatar" />
                <div className="post-meta">
                  <div>Esther Setiawan <i className="fas fa-check-circle" style={{fontSize:'12px', marginLeft:'4px', color:'#666'}}></i> &bull; 1st</div>
                  <div>5d &bull; <i className="fas fa-globe-americas"></i></div>
                </div>
              </div>
              <div className="post-caption">
                Stop just visualizing your networks—start talking to them. 🕸️💬
                <br />
                 In the world of Social Network Analysis (SNA), seeing the connections is only half the battle. The real value comes when you can ask your data why those connections exist. I just published a new guide, "Building an Intelligent Social Network Analysis Assistant with Gemini 3 Pro and Flask," where we merge the computational power of Graph Theory with the advanced... Read more
              </div>
              
              <div className="roast-layer">
                <div className="roast-text r-post-2">
                  Intelligent with Gemini?<br />Don't make me laugh.<br /><i className="fas fa-arrow-down"></i>
                </div>
              </div>

              <div className="link-card">
                <img src="https://picsum.photos/seed/chart/200/200" className="link-thumb" alt="Thumb" />
                <div className="link-info">
                  <div className="link-title">Building an Intelligent SNA...</div>
                  <div className="link-domain">medium.com</div>
                </div>
              </div>
              
              <div className="action-bar">
                <button className="action-btn"><i className="far fa-thumbs-up"></i></button>
                <button className="action-btn"><i className="far fa-comment"></i></button>
              </div>
            </div>

          </div>

          <div className="show-all">
            Show all posts <i className="fas fa-arrow-right" style={{marginLeft:'8px'}}></i>
          </div>
        </div>

      </div>

      <div className="meh-stamp">MEH. NEXT.</div>
    </main>
  );
}