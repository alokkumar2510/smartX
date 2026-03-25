/**
 * ─── UserAvatar.jsx ────────────────────────────────────
 * User avatar with online/offline status dot and name.
 */
const UserAvatar = ({ user, showStatus = false, size = 'md' }) => {
  const { name, status = 'offline', avatar } = user;

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Generate a consistent color from username
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
      {/* Avatar Circle */}
      <div className="relative">
        <div
          className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white`}
          style={{ background: `hsl(${hue}, 60%, 45%)` }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        {showStatus && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-900
              ${status === 'online' ? 'bg-green-400' : 'bg-white/20'}
            `}
          />
        )}
      </div>

      {/* Name */}
      <span className="text-sm text-white/80 truncate">{name}</span>
    </div>
  );
};

export default UserAvatar;
