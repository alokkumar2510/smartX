/**
 * ─── SettingsPage.jsx ──────────────────────────────────
 * User settings page for username, protocol preference,
 * theme, and notifications.
 */
import { useState } from 'react';
import PageTransition from '@/animations/PageTransition';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const SettingsPage = () => {
  const [username, setUsername] = useState('');
  const [protocol, setProtocol] = useState('AUTO');

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="heading-section text-2xl gradient-text">
          ⚙️ Settings
        </h1>

        {/* Profile */}
        <Card>
          <h3 className="text-label mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="input-field"
              />
            </div>
          </div>
        </Card>

        {/* Protocol Preferences */}
        <Card>
          <h3 className="text-label mb-4">Default Protocol</h3>
          <div className="grid grid-cols-4 gap-3">
            {['TCP', 'UDP', 'HYBRID', 'AUTO'].map((p) => (
              <button
                key={p}
                onClick={() => setProtocol(p)}
                className={`py-2 rounded-xl text-sm font-semibold transition-all duration-300 border
                  ${protocol === p
                    ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                    : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'
                  }
                `}
              >
                {p}
              </button>
            ))}
          </div>
        </Card>

        <Button variant="primary" id="save-settings-button">
          Save Settings
        </Button>
      </div>
    </PageTransition>
  );
};

export default SettingsPage;
