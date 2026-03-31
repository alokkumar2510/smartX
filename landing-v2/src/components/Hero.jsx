import React, { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { motion } from 'motion/react';
import useMeasure from 'react-use-measure';
import { Zap, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import InfiniteSlider from './ui/infinite-slider';

/**
 * ─── HERO COMPONENT ───
 * High-end dark mode hero section with glassmorphism and HLS video streaming.
 * Uses hls.js for native video performance and motion/react for smooth entry animations.
 */

// Reliability-first assets: Using JSDelivr for robust SVG loading
const logos = [
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/openai.svg", alt: "OpenAI" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/nvidia.svg", alt: "Nvidia" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/github.svg", alt: "GitHub" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/stripe.svg", alt: "Stripe" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/google.svg", alt: "Google" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/apple.svg", alt: "Apple" },
];

const Hero = () => {
    const videoRef = useRef(null);
    const [boundsRef, bounds] = useMeasure();
    // Using a robust public HLS sample for demonstration
    const hlsUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 30,
                enableWorker: true
            });
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.muted = true;
                video.setAttribute('muted', ''); // Extra insurance for autoplay
                video.play().catch(e => console.log("Auto-play blocked:", e));
            });
            return () => hls.destroy();
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = hlsUrl;
        }
    }, [hlsUrl]);

    return (
        <section ref={boundsRef} className="relative w-full min-h-screen bg-[#010101] flex flex-col items-center justify-start pt-32 sm:pt-40 pb-0 overflow-hidden font-sans selection:bg-purple-500/30">
            {/* 1. Announcement Pill */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="inline-flex items-center justify-center p-[1px] rounded-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 mb-10 z-30"
            >
                <div className="px-5 py-1.5 rounded-full bg-[rgba(28,27,36,0.15)] backdrop-blur-xl border border-white/10 flex items-center gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-[#FA93FA] via-[#C967E8] to-[#983AD6] shadow-[0_0_12px_rgba(201,103,232,0.4)]">
                        <Zap size={10} className="text-white fill-white stroke-none" />
                    </div>
                    <span className="text-white/60 text-xs font-semibold tracking-wide">Used by founders. Loved by devs.</span>
                </div>
            </motion.div>

            {/* 2. Main High-Impact Typography */}
            <div className="relative z-30 flex flex-col items-center text-center px-6 max-w-5xl">
                <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="text-[48px] sm:text-[72px] lg:text-[88px] font-bold leading-[1] tracking-[-0.05em] mb-8"
                >
                    <span className="text-white block sm:inline">Your Vision</span>
                    <br className="sm:hidden" />
                    <span className="block mt-2 sm:mt-0 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-purple-400 drop-shadow-sm">
                         Our Digital Reality.
                    </span>
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-white/80 text-lg sm:text-xl max-w-2xl font-medium leading-relaxed mb-12"
                >
                    We turn bold ideas into modern designs that don't just look amazing, they grow your business fast.
                </motion.p>

                {/* 3. CTA Button (Glass Wrapper + Gradient Icon) */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="relative group"
                >
                    {/* Glass Glow Wrapper */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    
                    <button className="relative flex items-center gap-3 px-8 py-4 bg-white text-[#010101] rounded-full font-bold text-sm tracking-tight transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        Book a 15-min call
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-[#FA93FA] via-[#C967E8] to-[#983AD6]">
                           <ArrowRight size={14} className="text-white stroke-[3px]" />
                        </div>
                    </button>
                </motion.div>
            </div>

            {/* 4. Cinematic Hero Video Integration (HLS) */}
            <div className="relative w-full z-10 -mt-[100px] sm:-mt-[150px] pointer-events-none select-none">
                {/* Gradient Overlays for Seamless Blending */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#010101] via-transparent to-[#010101] z-20"></div>
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#010101] to-transparent z-20"></div>
                
                <video 
                    ref={videoRef}
                    className="w-full h-auto aspect-video mix-blend-screen opacity-100 scale-125 lg:scale-110 transform"
                    playsInline
                    loop
                    muted
                    autoPlay
                    preload="auto"
                >
                   {/* High-quality MP4 Fallback */}
                   <source src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-circuit-board-background-44044-large.mp4" type="video/mp4" />
                </video>
            </div>

            {/* 5. Logo Cloud (InfiniteSlider) */}
            <div className="relative w-full z-30 mt-[-20px] bg-black/20 backdrop-blur-md border-t border-white/5 py-10 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 px-8">
                    <div className="flex items-center gap-6 shrink-0">
                        <span className="text-white/30 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] font-sans">Powering the best teams</span>
                        <div className="hidden md:block w-px h-8 bg-white/10"></div>
                    </div>
                    <div className="w-full overflow-hidden">
                        <InfiniteSlider items={logos} duration={25} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
