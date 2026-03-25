/**
 * ─── Toast.jsx ─────────────────────────────────────────
 * Toast notification wrapper using react-hot-toast.
 * Provides custom styled toasts matching the app design.
 */
import toast, { Toaster } from 'react-hot-toast';

// Custom toast styles matching our glassmorphism design
export const ToastContainer = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 3000,
      style: {
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(16px)',
        color: '#f1f5f9',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        fontSize: '0.875rem',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      success: {
        iconTheme: { primary: '#22c55e', secondary: '#020617' },
      },
      error: {
        iconTheme: { primary: '#ef4444', secondary: '#020617' },
      },
    }}
  />
);

// Helper functions for consistent toast usage
export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
export const showInfo = (message) => toast(message, { icon: 'ℹ️' });

export default toast;
