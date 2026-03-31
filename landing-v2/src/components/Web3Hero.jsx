import React from 'react';

/**
 * ─── ChevronDown Icon ───
 * Inline SVG so no extra icon dependency is needed.
 */
const ChevronDown = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * ─── JoinWaitlistButton (Dark variant) ───
 * Layered pill: outer 0.6px white border → black inner pill → white glow streak on top
 */
const JoinWaitlistButtonDark = ({ className = '' }) => (
  <div
    className={`relative inline-flex shrink-0 ${className}`}
    style={{ padding: '0.6px', borderRadius: '9999px', border: '0.6px solid rgba(255,255,255,1)' }}
  >
    {/* Inner black pill */}
    <button
      className="btn-glow-streak relative flex items-center justify-center rounded-full bg-black text-white cursor-pointer transition-opacity hover:opacity-80"
      style={{
        fontSize: '14px',
        fontWeight: '500',
        paddingTop: '11px',
        paddingBottom: '11px',
        paddingLeft: '29px',
        paddingRight: '29px',
        fontFamily: 'inherit',
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}
    >
      Join Waitlist
    </button>
  </div>
);

/**
 * ─── JoinWaitlistButton (White/CTA variant) ───
 * Same layered construction but with white background and black text.
 */
const JoinWaitlistButtonWhite = ({ className = '' }) => (
  <div
    className={`relative inline-flex shrink-0 ${className}`}
    style={{ padding: '0.6px', borderRadius: '9999px', border: '0.6px solid rgba(255,255,255,1)' }}
  >
    {/* Inner white pill */}
    <button
      className="btn-glow-streak relative flex items-center justify-center rounded-full bg-white text-black cursor-pointer transition-opacity hover:opacity-85"
      style={{
        fontSize: '14px',
        fontWeight: '500',
        paddingTop: '11px',
        paddingBottom: '11px',
        paddingLeft: '29px',
        paddingRight: '29px',
        fontFamily: 'inherit',
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}
    >
      Join Waitlist
    </button>
  </div>
);

/**
 * ─── Navbar ───
 */
const Navbar = () => {
  const navLinks = ['Get Started', 'Developers', 'Features', 'Resources'];

  return (
    <nav
      className="relative z-50 flex items-center justify-between w-full"
      style={{
        paddingTop: '20px',
        paddingBottom: '20px',
        paddingLeft: '120px',
        paddingRight: '120px',
      }}
    >
      {/* ── Left: Logo + Nav Links ── */}
      <div className="flex items-center" style={{ gap: '30px' }}>
        {/* Logo wordmark placeholder */}
        <div
          className="flex items-center shrink-0"
          style={{ width: '187px', height: '25px' }}
          aria-label="Logo"
        >
          <span
            style={{
              fontFamily: 'inherit',
              fontWeight: '700',
              fontSize: '18px',
              letterSpacing: '-0.04em',
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            LOGOIPSUM
          </span>
        </div>

        {/* Nav links — hidden on mobile (md:flex) */}
        <div className="hidden md:flex items-center" style={{ gap: '30px' }}>
          {navLinks.map((link) => (
            <button
              key={link}
              className="flex items-center text-white cursor-pointer bg-transparent border-none outline-none transition-opacity hover:opacity-70"
              style={{
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: 'inherit',
                gap: '4px',
                letterSpacing: '-0.01em',
              }}
            >
              {link}
              <ChevronDown size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: CTA ── */}
      <JoinWaitlistButtonDark />
    </nav>
  );
};

/**
 * ─── Hero Badge/Pill ───
 */
const HeroBadge = () => (
  <div
    className="inline-flex items-center"
    style={{
      borderRadius: '20px',
      background: 'rgba(255, 255, 255, 0.10)',
      border: '1px solid rgba(255, 255, 255, 0.20)',
      paddingTop: '8px',
      paddingBottom: '8px',
      paddingLeft: '14px',
      paddingRight: '14px',
      gap: '8px',
    }}
  >
    {/* 4px white dot */}
    <span
      style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
    <span
      style={{
        fontSize: '13px',
        fontWeight: '500',
        fontFamily: 'inherit',
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.6)' }}>Early access available from</span>
      <span style={{ color: '#ffffff' }}> May 1, 2026</span>
    </span>
  </div>
);

/**
 * ─── Web3HeroSection ─── (Main export)
 * Full-screen hero with background video, navbar, and centered content.
 */
const Web3HeroSection = () => {
  const VIDEO_URL =
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4';

  return (
    <section
      className="relative w-full min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* ── 1. Background Video ── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* ── 2. 50% Black Overlay for Readability ── */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.50)' }}
        aria-hidden="true"
      />

      {/* ── 3. All Content (above video + overlay) ── */}
      <div className="relative z-10 flex flex-col w-full min-h-screen">

        {/* ── Navbar ── */}
        {/* Responsive: reduce padding on mobile */}
        <div
          className="w-full"
          style={undefined}
        >
          {/* Mobile navbar wrapper */}
          <nav className="relative z-50 flex items-center justify-between w-full"
            style={{
              paddingTop: '20px',
              paddingBottom: '20px',
            }}
          >
            {/* Responsive horizontal padding via inline + Tailwind */}
            <div
              className="flex items-center justify-between w-full px-6 md:px-[120px]"
            >
              {/* Left */}
              <div className="flex items-center" style={{ gap: '30px' }}>
                {/* Logo */}
                <div
                  className="flex items-center shrink-0"
                  style={{ width: '187px', height: '25px' }}
                >
                  <span
                    style={{
                      fontFamily: 'inherit',
                      fontWeight: '700',
                      fontSize: '18px',
                      letterSpacing: '-0.04em',
                      color: '#ffffff',
                      lineHeight: 1,
                    }}
                  >
                    LOGOIPSUM
                  </span>
                </div>

                {/* Nav links — hidden below md */}
                <div className="hidden md:flex items-center" style={{ gap: '30px' }}>
                  {['Get Started', 'Developers', 'Features', 'Resources'].map((link) => (
                    <button
                      key={link}
                      className="flex items-center text-white cursor-pointer bg-transparent border-none outline-none transition-opacity hover:opacity-70"
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        gap: '4px',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {link}
                      <ChevronDown size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: CTA */}
              <JoinWaitlistButtonDark />
            </div>
          </nav>
        </div>

        {/* ── Hero Content ── */}
        <div
          className="flex flex-col items-center text-center w-full"
          style={{
            paddingTop: 'clamp(200px, 20vw, 280px)',
            paddingBottom: '102px',
            paddingLeft: '24px',
            paddingRight: '24px',
            gap: '40px',
          }}
        >
          {/* Badge */}
          <HeroBadge />

          {/* Heading */}
          <h1
            className="hero-heading-gradient"
            style={{
              maxWidth: '613px',
              fontSize: 'clamp(36px, 5.5vw, 56px)',
              fontWeight: '500',
              lineHeight: '1.28',
              letterSpacing: '-0.03em',
              fontFamily: 'inherit',
            }}
          >
            Web3 at the Speed of Experience
          </h1>

          {/* Subtitle — 24px gap from heading is handled by parent's gap + this margin */}
          <p
            style={{
              maxWidth: '680px',
              fontSize: '15px',
              fontWeight: '400',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.70)',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              marginTop: '-16px', /* offset the 40px gap to achieve 24px visual gap from heading */
            }}
          >
            Powering seamless experiences and real-time connections, EOS is the base for creators who move with purpose, leveraging resilience, speed, and scale to shape the future.
          </p>

          {/* CTA Button */}
          <JoinWaitlistButtonWhite />
        </div>
      </div>
    </section>
  );
};

export default Web3HeroSection;
