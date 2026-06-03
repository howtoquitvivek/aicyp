import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sprout, CloudRain, Map, BarChart3, Settings, LogOut, Leaf, Coins, Target, TrendingUp, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { useWorkspace } from '../../store/WorkspaceContext';

const Sidebar = () => {
  const { activePlot, plots } = useWorkspace();

  const globalItems = [
    { icon: LayoutDashboard, label: 'Farm Overview', path: '/dashboard' },
    { icon: Map, label: 'Farm Workspace', path: '/workspace' },
    { icon: CloudRain, label: 'Weather', path: '/weather' },
    { icon: Sprout, label: 'Crops AI', path: '/crops' },
    { icon: TrendingUp, label: 'Market Intel', path: '/global-market' },
  ];

  const plotItems = activePlot ? [
    { icon: LayoutDashboard, label: 'Plot Dashboard', path: `/plot/${activePlot.id}/dashboard` },
    { icon: Target, label: 'Yield Planner', path: `/plot/${activePlot.id}/yield` },
    { icon: BarChart3, label: 'Market Prices', path: `/plot/${activePlot.id}/market` },
  ] : [];

  const renderNavItems = (items, extraClass = "") => items.map((item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          extraClass,
          isActive 
            ? "bg-neutral-100 text-neutral-900" 
            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        )
      }
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  ));

  return (
    <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col h-screen">
      <div className="h-16 flex items-center px-6 border-b border-neutral-100 shrink-0">
        <Leaf className="text-neutral-900 mr-2" size={24} />
        <span className="font-semibold text-lg text-neutral-900">AgriBrain</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        <div>
          <div className="px-3 mb-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Global Farm
          </div>
          <div className="space-y-1">
            {renderNavItems(globalItems)}
          </div>
        </div>

        {plots && plots.length > 0 && (
          <div>
            <div className="px-3 mb-2 mt-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Plot Workspaces
            </div>
            <div className="space-y-1">
              {plots.map(plot => (
                <div key={plot.id} className="space-y-1">
                  <NavLink
                    to={`/plot/${plot.id}/dashboard`}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive || activePlot?.id === plot.id
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      )
                    }
                  >
                    <MapPin size={18} className={activePlot?.id === plot.id ? "text-emerald-600" : ""} />
                    <span className={activePlot?.id === plot.id ? "font-semibold" : ""}>{plot.name}</span>
                  </NavLink>
                  {/* Nested plot items if active */}
                  {activePlot?.id === plot.id && (
                    <div className="space-y-1 mt-1 border-l-2 border-neutral-100 ml-4 pl-2">
                      {renderNavItems(plotItems)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-neutral-100 space-y-1">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => 
            clsx(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive 
                ? "bg-neutral-100 text-neutral-900" 
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            )
          }
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
