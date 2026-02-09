
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  lang: Language;
  setLang: (l: Language) => void;
  onLogout: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang, onLogout, isSyncing, lastSyncTime }) => {
  const t = TRANSLATIONS[lang];
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const NavItem = ({ to, icon, label }: { to: string, icon: string, label: string }) => (
    <NavLink 
      to={to} 
      className={({ isActive }) => `flex flex-col md:flex-row items-center gap-1 md:gap-4 p-2 md:px-6 md:py-4 transition-all rounded-2xl ${isActive ? 'text-blue-600 bg-blue-50 md:bg-blue-600 md:text-white' : 'text-slate-400 hover:text-slate-600 md:hover:bg-slate-50'}`}
    >
      <i className={`fas ${icon} text-lg md:text-xl`}></i>
      <span className="text-[9px] md:text-sm uppercase md:capitalize font-bold">{label}</span>
    </NavLink>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white md:bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <i className="fas fa-store text-white"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{t.appName}</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem to="/" icon="fa-cash-register" label={t.ordering} />
          <NavItem to="/inventory" icon="fa-boxes-stacked" label={t.inventory} />
          <NavItem to="/records" icon="fa-receipt" label={t.records} />
          <NavItem to="/analytics" icon="fa-chart-line" label={t.analytics} />
          <NavItem to="/settings" icon="fa-cog" label={t.settings} />
        </nav>

        <div className="pt-6 border-t border-slate-100 space-y-4">
          <button 
            onClick={onLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-black transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <i className="fas fa-arrow-right-from-bracket"></i>
            Sign Out
          </button>
          
          <div className="flex items-center justify-between px-3">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
               {isSyncing ? 'Syncing...' : (isOnline ? 'Cloud Active' : 'Offline')}
             </span>
             <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 sync-pulse' : (isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse')}`}></div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={`md:hidden text-white p-4 flex justify-between items-center shrink-0 z-50 shadow-md ${isSyncing ? 'bg-blue-500' : (isOnline ? 'bg-blue-600' : 'bg-slate-800')}`}>
        <div className="flex items-center gap-3">
           <h1 className="text-xl font-bold tracking-tight">{t.appName}</h1>
           {isSyncing ? (
             <i className="fas fa-sync fa-spin text-[10px]"></i>
           ) : !isOnline && (
             <span className="text-[10px] bg-amber-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Offline</span>
           )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onLogout}
            className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors"
          >
            <i className="fas fa-arrow-right-from-bracket"></i>
          </button>
          <button 
            onClick={() => setLang(lang === Language.EN ? Language.ZH : Language.EN)}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
          >
            {lang === Language.EN ? '繁中' : 'EN'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center py-2 px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <NavItem to="/" icon="fa-cash-register" label={t.ordering} />
        <NavItem to="/inventory" icon="fa-boxes-stacked" label={t.inventory} />
        <NavItem to="/records" icon="fa-receipt" label={t.records} />
        <NavItem to="/analytics" icon="fa-chart-line" label={t.analytics} />
        <NavItem to="/settings" icon="fa-cog" label={t.settings} />
      </nav>
    </div>
  );
};

export default Layout;
