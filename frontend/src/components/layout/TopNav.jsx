import React from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useWorkspace } from '../../store/WorkspaceContext';

const TopNav = () => {
  const { user, signOut } = useAuth();
  const { plots, activePlot, switchPlot } = useWorkspace();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Farmer';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-neutral-200 bg-white">
      <div className="flex-1 flex items-center gap-4">
        {activePlot && (
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
            <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Plot:</span>
            <select
              value={activePlot.id}
              onChange={(e) => switchPlot(e.target.value)}
              className="bg-transparent text-sm font-bold text-neutral-900 focus:outline-none cursor-pointer"
            >
              {plots.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-neutral-500">
          <button className="p-2 hover:bg-neutral-100 rounded-md transition-colors" aria-label="Search">
            <Search size={20} />
          </button>
          <button className="p-2 hover:bg-neutral-100 rounded-md transition-colors" aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className="p-2 hover:bg-neutral-100 rounded-md transition-colors text-red-500/80 hover:text-red-600" aria-label="Sign out" onClick={signOut} title="Sign out">
            <LogOut size={20} />
          </button>
        </div>

        <div className="h-6 w-px bg-neutral-200 mx-1" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-medium text-neutral-900">{displayName}</span>
          </div>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="h-8 w-8 rounded-full border border-neutral-200 object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
