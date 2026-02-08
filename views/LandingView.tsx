
import React from 'react';
import { Language } from '../types';

interface LandingViewProps {
  onLogin: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onLogin, lang, setLang }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-30"></div>

      <div className="max-w-md w-full text-center space-y-10 z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-200 animate-bounce-slow">
            <i className="fas fa-store text-white text-4xl"></i>
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">
              {lang === Language.ZH ? '市集管家' : 'StallMaster'}
            </h1>
            <p className="text-blue-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
              Next-Gen POS Ecosystem
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-600 px-4 leading-relaxed">
            {lang === Language.ZH 
              ? '為流動攤主打造的智能銷售與庫存系統' 
              : 'The Intelligent POS for Modern Market Stalls'}
          </h2>
          <div className="flex justify-center gap-8 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <i className="fas fa-magic text-lg"></i>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Smart Entry</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <i className="fab fa-google-drive text-lg"></i>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Cloud Sync</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <i className="fas fa-chart-pie text-lg"></i>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Analytics</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <button 
            onClick={onLogin}
            className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl flex items-center justify-center gap-4 font-black text-slate-700 shadow-xl shadow-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all active:scale-95 group"
          >
            <div className="w-6 h-6 flex items-center justify-center">
               <svg viewBox="0 0 24 24" className="w-5 h-5">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
            </div>
            <span>{lang === Language.ZH ? '使用 Google 帳號登入' : 'Sign in with Google'}</span>
          </button>
          
          <button 
            onClick={() => setLang(lang === Language.EN ? Language.ZH : Language.EN)}
            className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-blue-600 transition-colors"
          >
            {lang === Language.EN ? '切換為 繁體中文' : 'Switch to English'}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 font-medium px-8 leading-relaxed">
          {lang === Language.ZH 
            ? '登入即表示您同意我們的服務條款，並授權我們使用 Google Drive 儲存您的攤位數據。' 
            : 'By signing in, you agree to our Terms of Service and authorize StallMaster to use Google Drive for your business data storage.'}
        </p>
      </div>
    </div>
  );
};

export default LandingView;
