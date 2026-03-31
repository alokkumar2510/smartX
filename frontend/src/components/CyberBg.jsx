/* ─────────────────────────────────────────────────────────────
   VideoBg — Full-screen cinematic background that matches
   the landing page exactly (same URL, opacity, blend mode).
   ───────────────────────────────────────────────────────────── */
const GLOBAL_VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260330_145725_08886141-ed95-4a8e-8d6d-b75eaadce638.mp4';

const CyberBg = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 0,
    pointerEvents: 'none', overflow: 'hidden',
    background: '#05050A',
  }}>
    <video
      src={GLOBAL_VIDEO_URL}
      autoPlay muted loop playsInline preload="auto"
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        opacity: 0.55,
        mixBlendMode: 'screen',
      }}
    />
    {/* Subtle gradient to keep UI readable */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(to bottom, rgba(5,5,10,0.40) 0%, rgba(5,5,10,0.75) 100%)',
    }} />
  </div>
);

export default CyberBg;
