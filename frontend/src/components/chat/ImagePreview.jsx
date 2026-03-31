import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ImagePreview = ({ file, onRemove }) => {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!preview) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-2">
      <div className="glass-card p-2 inline-flex items-end gap-2">
        <img src={preview} alt="preview" className="h-20 rounded-lg object-cover" />
        <button onClick={onRemove} className="text-neon-pink text-xs hover:underline font-mono">✕ Remove</button>
      </div>
    </motion.div>
  );
};

export default ImagePreview;
