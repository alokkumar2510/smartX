/**
 * ─── Footer.jsx ────────────────────────────────────────
 * Minimal page footer with project info.
 */
const Footer = () => {
  return (
    <footer className="border-t border-white/5 px-6 py-4 text-center">
      <p className="text-xs text-white/20">
        SmartChat X © {new Date().getFullYear()} — TCP/UDP Chat System
      </p>
    </footer>
  );
};

export default Footer;
