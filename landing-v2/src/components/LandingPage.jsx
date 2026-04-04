import React, { useState, useEffect, useRef, Suspense } from 'react';
import { HeroFuturistic } from './ui/hero-futuristic';
import { SpotlightCard } from './ui/spotlight-card';
import { DottedSurface } from './ui/dotted-surface';

/* ── App URL — update here if domain changes ── */
const APP_URL = 'https://smartx.alokkumarsahu.in';

/* ─────────────────────────────────────────────────────────────
   SCROLL ANIMATION HOOK
   ───────────────────────────────────────────────────────────── */
const useScrollReveal = (options = {}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
};

const Reveal = ({ children, delay = 0, y = 40, style = {}, className = '' }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0px)' : `translateY(${y}px)`,
      transition: `opacity 0.75s ease ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
   ───────────────────────────────────────────────────────────── */
const ChevronDown = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const GithubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

const MailIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

/* Glass pill button — dark variant */
const PillDark = ({ children, onClick, style = {} }) => (
  <div style={{ display:'inline-flex', padding:'1px', borderRadius:'9999px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))', ...style }}>
    <button onClick={onClick} className="pill-btn-glass" style={{
      position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
      borderRadius:'9999px', background: 'rgba(10, 10, 15, 0.4)', backdropFilter: 'blur(12px)',
      color:'#fff', cursor:'pointer',
      fontSize:'14px', fontWeight:'500', fontFamily:'inherit',
      paddingTop:'11px', paddingBottom:'11px', paddingLeft:'29px', paddingRight:'29px',
      border:'none', outline:'none', letterSpacing:'-0.01em', lineHeight:1,
      transition:'all 0.3s ease', gap:'8px',
      boxShadow: 'inset 0 0 20px rgba(255,255,255,0.05)' }}>
      {children}
    </button>
  </div>
);

/* Layered pill button — white (CTA) variant */
const PillWhite = ({ children, onClick, style = {} }) => (
  <div style={{ display:'inline-flex', padding:'1px', borderRadius:'9999px',
    background: 'linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.7))', ...style }}>
    <button onClick={onClick} className="pill-btn-white" style={{
      position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
      borderRadius:'9999px', background:'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
      color:'#000', cursor:'pointer',
      fontSize:'14px', fontWeight:'600', fontFamily:'inherit',
      paddingTop:'11px', paddingBottom:'11px', paddingLeft:'29px', paddingRight:'29px',
      border:'none', outline:'none', letterSpacing:'-0.01em', lineHeight:1,
      transition:'all 0.3s ease', gap:'8px' }}>
      {children}
    </button>
  </div>
);

/* Section label pill */
const SectionLabel = ({ children }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:'8px',
    borderRadius:'20px', background:'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
    border:'1px solid rgba(255,255,255,0.15)', padding:'6px 14px', marginBottom:'28px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
    <span style={{ width:'4px', height:'4px', borderRadius:'50%',
      background:'#fff', flexShrink:0, display:'inline-block', boxShadow: '0 0 6px #fff' }} />
    <span style={{ fontSize:'12px', fontWeight:'500', color:'rgba(255,255,255,0.7)',
      letterSpacing:'0.02em' }}>{children}</span>
  </div>
);

/* Gradient heading — white → transparent */
const GH = ({ children, style = {}, as: Tag = 'h2' }) => (
  <Tag className="hero-heading-gradient" style={{
    fontSize:'clamp(32px, 4vw, 52px)', fontWeight:'500', lineHeight:'1.2',
    letterSpacing:'-0.03em', fontFamily:'inherit', maxWidth:'700px', ...style }}>
    {children}
  </Tag>
);

/* Glass Card primitive */
const GlassCard = ({ children, style = {}, className = '', glowColor = 'blue', onMouseEnter, onMouseLeave }) => (
  <SpotlightCard 
    className={`glass-card ${className}`}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={style}
    glowColor={glowColor}
    customSize
  >
    {children}
  </SpotlightCard>
);

/* Feature Card for features section */
const FeatureCard = ({ icon, title, desc, delay, color }) => (
  <Reveal delay={delay} style={{ height: '100%' }}>
    <GlassCard glowColor={color} style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '32px', marginBottom: '20px', background: 'rgba(255,255,255,0.1)', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', boxShadow: 'inset 0 0 12px rgba(255,255,255,0.2)' }}>{icon}</div>
      <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{title}</h3>
      <p style={{ fontSize: '15.5px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.65', fontWeight: '400', flex: 1 }}>{desc}</p>
    </GlassCard>
  </Reveal>
);

/* ─────────────────────────────────────────────────────────────
   NAVBAR
   ───────────────────────────────────────────────────────────── */
const Navbar = ({ scrolled }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinks = ['Features','Architecture','About','Founder'];
  return (
    <>
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingTop:'20px', paddingBottom:'20px',
        background: scrolled ? 'rgba(20, 20, 35, 0.3)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
        transition:'all 0.4s ease',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.1)' : 'none'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'30px',
          paddingLeft:'clamp(24px, 8vw, 120px)' }}>
          <div style={{ height:'25px', display:'flex', alignItems:'center', flexShrink:0 }}>
            <span style={{ fontWeight:'700', fontSize:'18px', letterSpacing:'-0.04em',
              color:'#fff', lineHeight:1, textShadow: '0 2px 10px rgba(255,255,255,0.3)' }}>SmartChat X</span>
          </div>
          <div className="desktop-nav-links" style={{ display:'flex', alignItems:'center', gap:'30px' }}>
            {navLinks.map(link => (
              <a key={link} href={`#${link.toLowerCase()}`}
                style={{ display:'flex', alignItems:'center', gap:'4px',
                  fontSize:'14px', fontWeight:'500', color:'rgba(255,255,255,0.8)',
                  textDecoration:'none', letterSpacing:'-0.01em', cursor:'pointer',
                  transition:'all 0.2s', textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}
                onMouseEnter={e=>e.currentTarget.style.color='#fff'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.8)'}>
                {link} <ChevronDown size={13}/>
              </a>
            ))}
          </div>
        </div>
        <div style={{ paddingRight:'clamp(24px, 8vw, 120px)', display:'flex', alignItems:'center', gap:'16px' }}>
          <div className="desktop-nav-links">
            <PillDark onClick={()=>window.open(APP_URL,'_blank')}>
              Launch App <ArrowRight size={12}/>
            </PillDark>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
            background:'transparent', border:'none', color:'#fff', cursor:'pointer', display:'none', padding:'8px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div style={{
          position:'fixed', top:'65px', left:0, right:0, background:'rgba(15, 10, 25, 0.95)',
          backdropFilter:'blur(24px)', zIndex:199, borderBottom:'1px solid rgba(255,255,255,0.08)',
          padding:'24px', display:'flex', flexDirection:'column', gap:'20px',
          animation: 'fadeInDown 0.3s ease'
        }}>
          {navLinks.map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize:'18px', fontWeight:'500', color:'#fff', textDecoration:'none' }}>
              {link}
            </a>
          ))}
          <div style={{ marginTop:'10px' }}>
            <PillDark onClick={()=>window.open(APP_URL,'_blank')} style={{ width: '100%', justifyContent: 'center' }}>
              Launch App <ArrowRight size={12}/>
            </PillDark>
          </div>
        </div>
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   HERO SECTION — 3D Futuristic Hero with SmartChat X branding
   ───────────────────────────────────────────────────────────── */
const HeroSection = () => {
  return <HeroFuturistic />;
};



const FeaturesSection = () => {
  const features = [
    {icon:'⚡',title:'Dual Protocol Routing',desc:'TCP for reliability, UDP for raw speed. Auto-switches based on content type and real-time network conditions.'},
    {icon:'🎥',title:'HD Video & Voice Calls',desc:'WebRTC-powered 1-on-1 and group calls for up to 10 participants with active speaker detection and controls.'},
    {icon:'🖥️',title:'Screen Sharing',desc:'Share your screen in 1-on-1 and group sessions using getDisplayMedia with real-time stream switching.'},
    {icon:'🧠',title:'Groq AI Integration',desc:'Context-aware AI powered by Llama 3.3. Smart replies, toxicity detection, study mode, and live chat summaries.'},
    {icon:'🔐',title:'Advanced Privacy Layer',desc:'Granular controls: last seen, profile visibility, message/call permissions, read receipts, and Do Not Disturb.'},
    {icon:'📞',title:'Call History & Analytics',desc:'Incoming, outgoing, and missed calls with duration tracking, timestamps, and a live analytics dashboard.'},
    {icon:'🎤',title:'Voice Messages',desc:'Record and send voice messages inline. Adaptive bitrate ensures quality on poor network conditions.'},
    {icon:'📂',title:'File & Image Sharing',desc:'Share files and images with inline preview, metadata rendering, and compressed delivery.'},
    {icon:'📡',title:'Offline Message Queue',desc:'Messages queued during network loss and delivered automatically when reconnected. Zero message loss.'},
    {icon:'🔔',title:'Status & Stories',desc:'Post ephemeral status updates and read stories from your connections — fully native, no integrations needed.'},
    {icon:'🚫',title:'Block & Privacy Controls',desc:'Block users from messages, calls, and requests. Manage your blocked list from settings anytime.'},
    {icon:'👤',title:'Rich User Profiles',desc:'Upload profile photos, set a display name, bio, and username with optimized instant image loading.'},
  ];

  return (
    <section id="features" style={{ position:'relative', zIndex:10,
      paddingTop:'120px', paddingBottom:'120px' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto',
        paddingLeft:'clamp(24px,8vw,120px)', paddingRight:'clamp(24px,8vw,120px)' }}>

        <Reveal>
          <SectionLabel>Everything you need</SectionLabel>
          <GH style={{ maxWidth:'560px', marginBottom:'20px', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' }}>
            Built for real-time.<br/>Designed for humans.
          </GH>
          <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.7)', maxWidth:'460px',
            lineHeight:'1.65', fontWeight:'400', marginBottom:'64px',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Every feature engineered for speed, privacy, and intelligence — on a WebRTC + WebSocket + FastAPI backbone.
          </p>
        </Reveal>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px,1fr))', gap:'20px' }}>
          {features.map((f, i) => {
            const colors = ['blue', 'purple', 'green', 'orange', 'red'];
            return <FeatureCard key={f.title} {...f} delay={(i % 4) * 80} color={colors[i % colors.length]} />
          })}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   ARCHITECTURE SECTION
   ───────────────────────────────────────────────────────────── */
const ArchSection = () => {
  const steps = [
    {num:'01',title:'Connect & Authenticate',desc:'Secure JWT auth via FastAPI. Supabase-backed user profiles and persistent message storage with real-time cross-device sync.'},
    {num:'02',title:'Choose Your Protocol',desc:'Every message is analyzed. Text rides TCP for guaranteed delivery. Media and voice use UDP for minimal latency.'},
    {num:'03',title:'Establish P2P WebRTC',desc:'Direct peer connections negotiated via ICE/STUN/TURN. HD video with <100ms round-trip on good networks.'},
    {num:'04',title:'AI Runs in Background',desc:'Groq AI monitors context silently — surfaces smart replies, detects toxicity, summarizes threads, powers study mode.'},
  ];

  return (
    <section id="architecture" style={{ position:'relative', zIndex:10,
      paddingTop:'120px', paddingBottom:'120px' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto',
        paddingLeft:'clamp(24px,8vw,120px)', paddingRight:'clamp(24px,8vw,120px)' }}>

        <Reveal>
          <SectionLabel>Architecture</SectionLabel>
          <GH style={{ maxWidth:'520px', marginBottom:'20px', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' }}>
            How SmartChat X works under the hood
          </GH>
          <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.7)', maxWidth:'420px',
            lineHeight:'1.65', fontWeight:'400', marginBottom:'64px',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            A layered, battle-tested stack — no black boxes.
          </p>
        </Reveal>

        <GlassCard style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px,1fr))',
          gap:'1px', overflow:'hidden', background: 'rgba(255,255,255,0.1)', padding: '1px' }}>
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 80} style={{ display: 'flex' }}>
              <div style={{ background:'rgba(20, 15, 40, 0.4)', backdropFilter:'blur(20px)',
                padding:'40px 32px', height:'100%', width: '100%',
                borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize:'12px', fontWeight:'700', color:'#fff',
                  letterSpacing:'0.05em', marginBottom:'20px', fontFamily:'monospace', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>STEP {step.num}</div>
                <h3 style={{ fontSize:'18px', fontWeight:'600', color:'#fff',
                  letterSpacing:'-0.02em', marginBottom:'12px', lineHeight:1.2, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{step.title}</h3>
                <p style={{ fontSize:'14.5px', color:'rgba(255,255,255,0.7)',
                  lineHeight:'1.65', fontWeight:'400' }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </GlassCard>

        {/* Tech stack */}
        <Reveal delay={100} style={{ marginTop:'56px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'12px', alignItems:'center' }}>
            <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.8)', fontWeight:'600',
              letterSpacing:'0.1em', marginRight:'8px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>STACK</span>
            {['React','FastAPI','WebRTC','WebSocket','Supabase','Groq AI','Llama 3.3','TCP/UDP','Vite'].map(t=>(
              <GlassCard key={t} style={{ fontSize:'13px', fontWeight:'600', color:'#fff', padding:'8px 18px', borderRadius:'100px' }}>
                {t}
              </GlassCard>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   ABOUT SECTION
   ───────────────────────────────────────────────────────────── */
const AboutSection = () => {
  const highlights = [
    {title:'Group Calls up to 10',desc:'Dynamic multi-user video layout with active speaker highlight'},
    {title:'Adaptive Bitrate',desc:'Degrades gracefully on poor connections — audio always prioritized'},
    {title:'Dark & Light Mode',desc:'Full theme support with smooth system-preference detection'},
    {title:'Real-time Typing Indicators',desc:'Live typing state via WebSocket with debouncing'},
    {title:'Emoji Reactions & Replies',desc:'React to messages, reply in context, and copy messages'},
    {title:'Desktop Notifications',desc:'Browser push notifications with sound alerts for messages and calls'},
  ];

  return (
    <section id="about" style={{ position:'relative', zIndex:10,
      paddingTop:'120px', paddingBottom:'120px' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto',
        paddingLeft:'clamp(24px,8vw,120px)', paddingRight:'clamp(24px,8vw,120px)' }}>
        <div className="two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:'80px', alignItems:'center' }}>
          <Reveal>
            <SectionLabel>Platform highlights</SectionLabel>
            <GH style={{ maxWidth:'440px', marginBottom:'24px', fontSize:'clamp(28px,3.5vw,46px)', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' }}>
              More than just a chat app
            </GH>
            <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.75)', lineHeight:'1.7',
              fontWeight:'400', marginBottom:'40px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              A full communication suite — instant messaging, HD calls, AI assistance, and granular privacy in one cohesive experience.
            </p>
            <PillWhite onClick={()=>window.open(APP_URL,'_blank')}>
              Try it now <ArrowRight size={12}/>
            </PillWhite>
          </Reveal>

          <Reveal delay={100}>
            <GlassCard glowColor="purple" style={{ padding: '32px' }}>
              {highlights.map((h, i) => (
                <div key={h.title} style={{ paddingTop:'18px', paddingBottom:'18px',
                  borderBottom: i < highlights.length-1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  display:'flex', gap:'16px', alignItems:'flex-start' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#fff',
                    marginTop:'6px', flexShrink:0, boxShadow: '0 0 10px rgba(255,255,255,0.8)' }}/>
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff',
                      letterSpacing:'-0.02em', marginBottom:'4px', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{h.title}</div>
                    <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.7)', lineHeight:'1.5' }}>{h.desc}</div>
                  </div>
                </div>
              ))}
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   STATISTICS SECTION
   ───────────────────────────────────────────────────────────── */
const StatsSection = () => {
  const stats = [
    { value: '< 100ms', label: 'Average WebRTC Latency', color: 'green' },
    { value: '100%', label: 'P2P Privacy Guarantee', color: 'blue' },
    { value: '10x', label: 'Faster than HTTP polling', color: 'orange' },
    { value: 'Zero', label: 'Data Tracking or Ads', color: 'purple' },
  ];

  return (
    <section id="stats" style={{ position:'relative', zIndex:10, paddingTop:'60px', paddingBottom:'60px' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto',
        paddingLeft:'clamp(24px,8vw,120px)', paddingRight:'clamp(24px,8vw,120px)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'20px' }}>
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <GlassCard glowColor={s.color} style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize:'42px', fontWeight:'700', color:'#fff', marginBottom:'8px', letterSpacing:'-0.03em', textShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                  {s.value}
                </div>
                <div style={{ fontSize:'15px', color:'rgba(255,255,255,0.7)', fontWeight:'500' }}>
                  {s.label}
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   FOUNDER SECTION
   ───────────────────────────────────────────────────────────── */
const FounderSection = () => (
  <section id="founder" style={{ position:'relative', zIndex:10,
    paddingTop:'120px', paddingBottom:'60px' }}>
    <div style={{ maxWidth:'1200px', margin:'0 auto',
      paddingLeft:'clamp(24px,8vw,120px)', paddingRight:'clamp(24px,8vw,120px)' }}>

      <GlassCard glowColor="orange" style={{ display:'flex', gap:'60px', alignItems:'center', flexWrap:'wrap', padding: '48px' }}>

        {/* Photo — real founder image */}
        <Reveal y={20} delay={0} style={{ flexShrink:0 }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            {/* Glow ring */}
            <div style={{
              position:'absolute', inset:'-6px', borderRadius:'50%',
              background:'linear-gradient(135deg, rgba(120,80,255,0.8), rgba(60,180,255,0.7), rgba(180,80,255,0.6))',
              filter:'blur(12px)', zIndex:0,
              animation:'ringPulse 4s ease-in-out infinite alternate',
            }}/>
            {/* Subtle border */}
            <div style={{
              position:'absolute', inset:'-2px', borderRadius:'50%',
              border:'2px solid rgba(255,255,255,0.4)', zIndex:1,
            }}/>
            <img
              src="/founder.jpeg"
              alt="Alok Kumar Sahu — Founder"
              style={{ width:'180px', height:'180px', borderRadius:'50%',
                objectFit:'cover', objectPosition:'center top',
                position:'relative', zIndex:2,
                border:'3px solid rgba(25, 20, 40, 0.8)',
                display:'block' }}
            />
            {/* Live indicator */}
            <div style={{ position:'absolute', bottom:'8px', right:'8px', zIndex:3,
              width:'22px', height:'22px', borderRadius:'50%',
              background:'#22c55e', border:'3px solid rgba(20, 15, 30, 0.8)',
              boxShadow:'0 0 12px rgba(34,197,94,0.8)' }}/>
          </div>
        </Reveal>

        {/* Info */}
        <Reveal delay={80} style={{ flex:1, minWidth:'280px' }}>
          <SectionLabel>Built by a human</SectionLabel>
          <h2 style={{ fontSize:'clamp(32px,3.5vw,54px)', fontWeight:'600', color:'#fff',
            letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:'12px',
            textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            Alok Kumar Sahu
          </h2>
          <div style={{ fontSize:'13px', fontWeight:'600', color:'rgba(255,255,255,0.8)',
            letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'24px',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            Full-Stack Engineer · Real-Time Systems · AI Integration
          </div>
          <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.8)', lineHeight:'1.72',
            maxWidth:'520px', marginBottom:'36px', fontWeight:'400',
            textShadow: '0 1px 5px rgba(0,0,0,0.4)' }}>
            SmartChat X is a solo-built, production-grade communication platform.
            Every design decision, every architectural choice — made with intention.
            Because great tools should feel human.
          </p>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            <PillDark onClick={()=>window.open('https://github.com/alokkumar2510','_blank')}>
              <GithubIcon size={14}/> GitHub
            </PillDark>
            <PillDark onClick={()=>window.open('mailto:alok@example.com')}>
              <MailIcon size={14}/> Contact
            </PillDark>
          </div>
        </Reveal>
      </GlassCard>
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────
   FINAL CTA SECTION
   ───────────────────────────────────────────────────────────── */
const CTASection = () => (
  <section style={{ position:'relative', zIndex:10,
    paddingTop:'140px', paddingBottom:'140px', textAlign:'center' }}>
    {/* Galaxy glow orb behind CTA */}
    <div style={{ position:'absolute', top:'50%', left:'50%',
      transform:'translate(-50%,-50%)',
      width:'600px', height:'300px',
      background:'radial-gradient(ellipse, rgba(120,80,250,0.3) 0%, transparent 70%)',
      pointerEvents:'none', filter:'blur(40px)' }}/>

    <div style={{ position:'relative', maxWidth:'660px', margin:'0 auto',
      paddingLeft:'24px', paddingRight:'24px' }}>
      
      <Reveal>
        <GlassCard style={{ display:'inline-flex', alignItems:'center', gap:'10px',
          padding:'10px 20px', marginBottom:'40px', borderRadius:'30px' }}>
          <span style={{ width:'8px', height:'8px', borderRadius:'50%',
            background:'#22c55e', boxShadow:'0 0 10px rgba(34,197,94,0.9)', flexShrink:0 }}/>
          <span style={{ fontSize:'14px', fontWeight:'600', color:'#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            App is live and running
          </span>
        </GlassCard>
      </Reveal>

      <Reveal delay={80}>
        <h2 className="hero-heading-gradient" style={{ fontSize:'clamp(36px,5vw,60px)',
          fontWeight:'600', lineHeight:'1.16', letterSpacing:'-0.04em', marginBottom:'24px',
          filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.5))' }}>
          Ready to communicate at the speed of thought?
        </h2>
      </Reveal>

      <Reveal delay={160}>
        <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.75)', lineHeight:'1.65',
          fontWeight:'400', marginBottom:'48px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          No downloads. No setup. Open SmartChat X in your browser and start messaging, calling, and collaborating instantly.
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
          <PillWhite onClick={()=>window.open(APP_URL,'_blank')}>
            Launch SmartChat X <ArrowRight size={12}/>
          </PillWhite>
          <PillDark onClick={()=>window.open('https://github.com/alokkumar2510','_blank')}>
            <GithubIcon size={14}/> View Source
          </PillDark>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────── */
const Footer = () => (
  <footer style={{ position:'relative', zIndex:10,
    borderTop:'1px solid rgba(255,255,255,0.1)',
    paddingTop:'48px', paddingBottom:'48px',
    background:'rgba(20, 15, 30, 0.4)', backdropFilter:'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    paddingLeft:'clamp(24px,8vw,120px)', paddingRight:'clamp(24px,8vw,120px)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      flexWrap:'wrap', gap:'20px' }}>
      <div>
        <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff',
          letterSpacing:'-0.04em', marginBottom:'6px', textShadow: '0 2px 10px rgba(255,255,255,0.3)' }}>SmartChat X</div>
        <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.6)', fontWeight:'500' }}>
          Made with ❤️ by{' '}
          <a href="https://github.com/alokkumar2510" target="_blank" rel="noopener noreferrer"
            style={{ color:'#fff', textDecoration:'none', fontWeight:'600', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            Alok Kumar Sahu
          </a>
        </div>
      </div>
      <div style={{ display:'flex', gap:'28px', alignItems:'center', flexWrap:'wrap' }}>
        {['Features','Architecture','About','Founder'].map(link=>(
          <a key={link} href={`#${link.toLowerCase()}`}
            style={{ fontSize:'14px', color:'rgba(255,255,255,0.7)', textDecoration:'none',
              fontWeight:'500', transition:'all 0.2s', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
            onMouseEnter={e=>e.currentTarget.style.color='#fff'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'}>
            {link}
          </a>
        ))}
      </div>
      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', fontFamily:'monospace', fontWeight: '500' }}>
        © 2026 SmartChat X
      </div>
    </div>
  </footer>
);

/* ─────────────────────────────────────────────────────────────
   ROOT — LANDING PAGE
   ───────────────────────────────────────────────────────────── */
const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(()=>{
    const onScroll = ()=>setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive:true });
    return ()=>window.removeEventListener('scroll', onScroll);
  },[]);

  return (
    <div style={{ fontFamily:"'General Sans', system-ui, -apple-system, sans-serif",
      background:'transparent', color:'#fff', minHeight:'100vh', position:'relative' }}>

      <style>{`
        /* ── Keyframe animations for hero ── */
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%   { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1;   transform: scale(1.06); }
        }

        /* ── Button hover effects ── */
        .pill-btn-glass:hover { 
          background: rgba(255,255,255,0.2) !important;
          box-shadow: 0 4px 20px rgba(255,255,255,0.2), inset 0 0 20px rgba(255,255,255,0.1) !important;
          transform: translateY(-1px);
        }
        .pill-btn-white:hover {
          background: #ffffff !important;
          box-shadow: 0 0 25px rgba(255,255,255,0.6) !important;
          transform: translateY(-2px);
        }

        /* ── Desktop nav links hidden on mobile ── */
        @media (max-width: 860px) {
          .desktop-nav-links { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .two-col { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
        
        section {
          scroll-margin-top: 80px;
        }
      `}</style>

      {/* Fixed dotted surface background — across entire page */}
      <DottedSurface style={{ background: '#05050A' }} />

      {/* Sticky navbar */}
      <Navbar scrolled={scrolled}/>

      {/* Page content (all sit above the galaxy bg) */}
      <main style={{ position:'relative', zIndex:10 }}>
        <HeroSection />
        <FeaturesSection />
        <ArchSection />
        <AboutSection />
        <StatsSection />
        <FounderSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
