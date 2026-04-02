/**
 * ImageEditor — Full-featured image editor modal before sending
 * Crop, Rotate, Zoom, Brightness, Contrast, Filters, Draw, Text
 * SmartChat X v5
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';

/* ─── Helpers ─────────────────────────────────────────────── */
const FILTERS = [
  { name: 'None',      css: '' },
  { name: 'Grayscale', css: 'grayscale(100%)' },
  { name: 'Sepia',     css: 'sepia(80%)' },
  { name: 'Warm',      css: 'sepia(30%) saturate(140%)' },
  { name: 'Cool',      css: 'hue-rotate(180deg) saturate(80%)' },
  { name: 'Vintage',   css: 'sepia(40%) contrast(90%) brightness(95%)' },
  { name: 'Vivid',     css: 'saturate(200%) contrast(110%)' },
  { name: 'Fade',      css: 'contrast(80%) brightness(110%) saturate(70%)' },
];

async function getCroppedImg(imageSrc, crop, rotation, filter, brightness, contrast) {
  const img = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const bw = img.width * cos + img.height * sin;
  const bh = img.width * sin + img.height * cos;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.filter = [
    filter || '',
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
  ].filter(Boolean).join(' ');

  ctx.translate(-crop.x, -crop.y);
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(rad);
  ctx.translate(-img.width / 2, -img.height / 2);
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.92
    );
  });
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/* ─── Draw Canvas Layer ───────────────────────────────────── */
const DrawCanvas = ({ width, height, color, lineWidth, onUpdate }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPt = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = width;
    c.height = height;
  }, [width, height]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    return { x: (x / rect.width) * width, y: (y / rect.height) * height };
  };

  const start = (e) => {
    drawing.current = true;
    lastPt.current = getPos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const pt = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt.current = pt;
  };

  const end = () => {
    drawing.current = false;
    onUpdate?.(canvasRef.current.toDataURL());
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        zIndex: 10, cursor: 'crosshair',
      }}
    />
  );
};

/* ─── Slider Control ──────────────────────────────────────── */
const Slider = ({ label, value, min, max, step, onChange, suffix = '' }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-white/40 w-16 shrink-0">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value}
           onChange={e => onChange(Number(e.target.value))}
           className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
           style={{ background: `linear-gradient(to right, var(--accent) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 0%)` }}
    />
    <span className="text-[10px] text-white/50 w-10 text-right font-mono">{value}{suffix}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   IMAGE EDITOR MODAL
   ═══════════════════════════════════════════════════════════ */
export default function ImageEditor({ file, onSend, onCancel }) {
  const [imageSrc, setImageSrc]       = useState(null);
  const [crop, setCrop]               = useState({ x: 0, y: 0 });
  const [zoom, setZoom]               = useState(1);
  const [rotation, setRotation]       = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [brightness, setBrightness]   = useState(100);
  const [contrast, setContrast]       = useState(100);
  const [activeFilter, setActiveFilter] = useState(0);
  const [sending, setSending]         = useState(false);

  // Tabs: crop | adjust | filter | draw | text
  const [activeTab, setActiveTab]     = useState('crop');

  // Draw state
  const [drawColor, setDrawColor]     = useState('#ff0000');
  const [drawWidth, setDrawWidth]     = useState(3);
  const [drawData, setDrawData]       = useState(null);

  // Text state
  const [textOverlay, setTextOverlay] = useState('');
  const [textColor, setTextColor]     = useState('#ffffff');
  const [textSize, setTextSize]       = useState(24);

  // Load image from file
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSend = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setSending(true);

    try {
      const filterCSS = FILTERS[activeFilter].css;
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, filterCSS, brightness, contrast);

      // If there's draw data, merge it
      if (drawData || textOverlay) {
        const merged = await mergeOverlays(blob, drawData, textOverlay, textColor, textSize);
        const finalFile = new File([merged], file.name || 'image.jpg', { type: 'image/jpeg' });
        onSend(finalFile);
      } else {
        const finalFile = new File([blob], file.name || 'image.jpg', { type: 'image/jpeg' });
        onSend(finalFile);
      }
    } catch (err) {
      console.error('Image processing error:', err);
      // Fallback: send original
      onSend(file);
    }
  };

  if (!imageSrc) return null;

  const TABS = [
    { key: 'crop',   icon: '✂️',  label: 'Crop'   },
    { key: 'adjust', icon: '🔆',  label: 'Adjust' },
    { key: 'filter', icon: '🎨',  label: 'Filter' },
    { key: 'draw',   icon: '✏️',  label: 'Draw'   },
    { key: 'text',   icon: '🔤',  label: 'Text'   },
  ];

  const DRAW_COLORS = ['#ff0000', '#ff6600', '#ffcc00', '#00ff66', '#00ccff', '#6633ff', '#ff33cc', '#ffffff', '#000000'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col"
        style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
             style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
              ✕
            </motion.button>
            <h2 className="text-sm font-bold text-white/80">Edit Image</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={sending}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
            style={{
              background: sending ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: sending ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block">⟳</motion.span>
                Sending…
              </>
            ) : '➤ Send'}
          </motion.button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {activeTab === 'crop' && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#000' },
                mediaStyle: {
                  filter: [
                    FILTERS[activeFilter].css,
                    `brightness(${brightness}%)`,
                    `contrast(${contrast}%)`,
                  ].filter(Boolean).join(' '),
                },
              }}
            />
          )}

          {(activeTab === 'adjust' || activeTab === 'filter') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img
                src={imageSrc}
                alt="preview"
                className="max-w-full max-h-full object-contain"
                style={{
                  filter: [
                    FILTERS[activeFilter].css,
                    `brightness(${brightness}%)`,
                    `contrast(${contrast}%)`,
                  ].filter(Boolean).join(' '),
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                }}
              />
            </div>
          )}

          {activeTab === 'draw' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="relative" style={{ width: '100%', height: '100%' }}>
                <img src={imageSrc} alt="" className="w-full h-full object-contain pointer-events-none"
                     style={{ filter: FILTERS[activeFilter].css + ` brightness(${brightness}%) contrast(${contrast}%)` }} />
                <DrawCanvas
                  width={800} height={600}
                  color={drawColor} lineWidth={drawWidth}
                  onUpdate={setDrawData}
                />
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="relative">
                <img src={imageSrc} alt="" className="max-w-full max-h-[70vh] object-contain"
                     style={{ filter: FILTERS[activeFilter].css + ` brightness(${brightness}%) contrast(${contrast}%)` }} />
                {textOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span style={{
                      color: textColor,
                      fontSize: `${textSize}px`,
                      fontWeight: 'bold',
                      textShadow: '2px 2px 6px rgba(0,0,0,0.7)',
                      wordBreak: 'break-word',
                      maxWidth: '80%',
                      textAlign: 'center',
                    }}>{textOverlay}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center gap-1 px-4 py-2 border-t"
             style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all text-center"
              style={{
                background: activeTab === tab.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeTab === tab.key ? '#818cf8' : 'rgba(255,255,255,0.4)',
                border: activeTab === tab.key ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              }}>
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[9px] font-bold">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Controls Panel */}
        <div className="px-4 py-3 border-t space-y-2 max-h-[180px] overflow-y-auto"
             style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.95)' }}>

          {activeTab === 'crop' && (
            <div className="space-y-2">
              <Slider label="Zoom" value={zoom} min={1} max={3} step={0.1} onChange={setZoom} suffix="×" />
              <Slider label="Rotate" value={rotation} min={0} max={360} step={1} onChange={setRotation} suffix="°" />
              <div className="flex gap-2 mt-2">
                {[0, 90, 180, 270].map(deg => (
                  <button key={deg} onClick={() => setRotation(deg)}
                    className="px-2 py-1 rounded-lg text-[10px] font-mono transition-all"
                    style={{
                      background: rotation === deg ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                      color: rotation === deg ? '#818cf8' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${rotation === deg ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'adjust' && (
            <div className="space-y-2">
              <Slider label="Brightness" value={brightness} min={50} max={150} step={1} onChange={setBrightness} suffix="%" />
              <Slider label="Contrast" value={contrast} min={50} max={150} step={1} onChange={setContrast} suffix="%" />
              <button onClick={() => { setBrightness(100); setContrast(100); }}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors mt-1">
                ↺ Reset adjustments
              </button>
            </div>
          )}

          {activeTab === 'filter' && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {FILTERS.map((f, i) => (
                <button key={f.name} onClick={() => setActiveFilter(i)}
                  className="flex flex-col items-center gap-1 shrink-0 transition-all"
                  style={{ opacity: activeFilter === i ? 1 : 0.5 }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 transition-all"
                       style={{
                         borderColor: activeFilter === i ? '#818cf8' : 'rgba(255,255,255,0.1)',
                         boxShadow: activeFilter === i ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                       }}>
                    <img src={imageSrc} alt="" className="w-full h-full object-cover"
                         style={{ filter: f.css || 'none' }} />
                  </div>
                  <span className="text-[9px] font-bold"
                        style={{ color: activeFilter === i ? '#818cf8' : 'rgba(255,255,255,0.4)' }}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'draw' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-16 shrink-0">Color</span>
                <div className="flex gap-1.5 flex-wrap">
                  {DRAW_COLORS.map(c => (
                    <button key={c} onClick={() => setDrawColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        background: c,
                        borderColor: drawColor === c ? '#fff' : 'rgba(255,255,255,0.15)',
                        boxShadow: drawColor === c ? `0 0 8px ${c}` : 'none',
                      }} />
                  ))}
                </div>
              </div>
              <Slider label="Size" value={drawWidth} min={1} max={12} step={1} onChange={setDrawWidth} suffix="px" />
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-2">
              <input
                type="text"
                value={textOverlay}
                onChange={e => setTextOverlay(e.target.value)}
                placeholder="Type your text here..."
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-16 shrink-0">Color</span>
                <div className="flex gap-1.5">
                  {['#ffffff', '#ff0000', '#00ff66', '#00ccff', '#ffcc00', '#ff33cc', '#000000'].map(c => (
                    <button key={c} onClick={() => setTextColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        background: c,
                        borderColor: textColor === c ? '#fff' : 'rgba(255,255,255,0.15)',
                      }} />
                  ))}
                </div>
              </div>
              <Slider label="Size" value={textSize} min={12} max={72} step={2} onChange={setTextSize} suffix="px" />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Merge draw/text overlays onto the cropped image ──────── */
async function mergeOverlays(baseBlob, drawDataUrl, text, textColor, textSize) {
  const baseImg = await createImage(URL.createObjectURL(baseBlob));
  const canvas = document.createElement('canvas');
  canvas.width = baseImg.width;
  canvas.height = baseImg.height;
  const ctx = canvas.getContext('2d');

  // Draw base
  ctx.drawImage(baseImg, 0, 0);

  // Draw overlay
  if (drawDataUrl) {
    const drawImg = await createImage(drawDataUrl);
    ctx.drawImage(drawImg, 0, 0, canvas.width, canvas.height);
  }

  // Text overlay
  if (text) {
    ctx.fillStyle = textColor;
    ctx.font = `bold ${textSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92);
  });
}
