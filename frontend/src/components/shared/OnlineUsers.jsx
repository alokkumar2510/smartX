/**
 * ─── OnlineUsers.jsx ───────────────────────────────────
 * Compact online users list for sidebar/header.
 */
import UserAvatar from './UserAvatar';

const OnlineUsers = ({ users = [] }) => {
  const online = users.filter((u) => u.status === 'online');

  return (
    <div>
      <p className="text-label mb-2">Online — {online.length}</p>
      <div className="space-y-1">
        {online.map((user) => (
          <UserAvatar key={user.id} user={user} showStatus size="sm" />
        ))}
      </div>
    </div>
  );
};

export default OnlineUsers;
