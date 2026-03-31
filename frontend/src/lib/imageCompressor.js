/**
 * imageCompressor.js — Compress images before upload
 * Uses OffscreenCanvas / regular Canvas
 * Targets ~80KB for medium mode, ~40KB for low mode
 */

/**
 * Compress a File/Blob image.
 * @param {File} file
 * @param {'high'|'medium'|'low'} mode
 * @returns {Promise<File>} compressed File
 */
export async function compressImage(file, mode = 'high') {
  if (!file.type.startsWith('image/')) return file;

  const quality = mode === 'high' ? 0.9 : mode === 'medium' ? 0.65 : 0.4;
  const maxDim  = mode === 'high' ? 1920 : mode === 'medium' ? 1280 : 640;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Only use compressed if smaller
          const out = blob.size < file.size
            ? new File([blob], file.name, { type: 'image/jpeg' })
            : file;
          resolve(out);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
