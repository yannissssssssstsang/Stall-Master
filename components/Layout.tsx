
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  lang: Language;
  setLang: (l: Language) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang }) => {
  const t = TRANSLATIONS[lang];

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
      {/* Sidebar for Tablet/Desktop */}
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

        <div className="pt-6 border-t border-slate-100">
          <button 
            onClick={() => setLang(lang === Language.EN ? Language.ZH : Language.EN)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors text-sm"
          >
            {lang === Language.EN ? '切換為 繁中' : 'Switch to English'}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center shrink-0 z-50 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">{t.appName}</h1>
        <button 
          onClick={() => setLang(lang === Language.EN ? Language.ZH : Language.EN)}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
        >
          {lang === Language.EN ? '繁中' : 'EN'}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
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
