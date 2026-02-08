
import React, { useRef, useState } from 'react';
import { Language, PaymentQRCodes, TelegramConfig } from '../types';
import { TRANSLATIONS } from '../constants';
import { verifyGoogleConnection, ConnectionStatus } from '../services/googleDriveService';

interface SettingsViewProps {
  lang: Language;
  paymentQRCodes: PaymentQRCodes;
  onUpdateQRCodes: (codes: PaymentQRCodes) => void;
  telegramConfig: TelegramConfig;
  onUpdateTelegramConfig: (config: TelegramConfig) => void;
  onLogout: () => void;
  onTestTelegram: () => Promise<boolean | undefined>;
  onForceSync: () => Promise<void>;
  isSyncing?: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  lang, 
  paymentQRCodes, 
  onUpdateQRCodes, 
  telegramConfig, 
  onUpdateTelegramConfig,
  onLogout,
  onTestTelegram,
  onForceSync,
  isSyncing
}) => {
  const t = TRANSLATIONS[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadMethod, setActiveUploadMethod] = React.useState<keyof PaymentQRCodes | null>(null);
  
  // Telegram States
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cloud Diagnostic States
  const [diagStatus, setDiagStatus] = useState<ConnectionStatus | null>(null);
  const [isCheckingDiag, setIsCheckingDiag] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadMethod) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdateQRCodes({ ...paymentQRCodes, [activeUploadMethod]: reader.result as string });
      setActiveUploadMethod(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = (method: keyof PaymentQRCodes) => {
    setActiveUploadMethod(method);
    fileInputRef.current?.click();
  };

  const runTelegramTest = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setErrorMessage(lang === Language.ZH ? '請先填寫 Token 和 ID' : 'Please fill Token & ID first');
      setTestStatus('error');
      return;
    }
    setTestStatus('loading');
    setErrorMessage(null);
    try {
      await onTestTelegram();
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failed');
      setTestStatus('error');
    }
  };

  const runCloudDiagnostic = async () => {
    setIsCheckingDiag(true);
    const result = await verifyGoogleConnection();
    setDiagStatus(result);
    setIsCheckingDiag(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">{t.settings}</h2>
      </div>

      {/* Cloud Diagnostic & Sync Section */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Connectivity & Cloud</h3>
          <div className="flex gap-2">
            <button 
              onClick={runCloudDiagnostic}
              disabled={isCheckingDiag}
              className="px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all"
            >
              {isCheckingDiag ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
              Diagnostic
            </button>
            <button 
              onClick={onForceSync}
              disabled={isSyncing}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-blue-100 text-blue-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}
            >
              {isSyncing ? <i className="fas fa-sync fa-spin mr-2"></i> : null}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {diagStatus && (
          <div className={`p-4 rounded-2xl border ${diagStatus.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} animate-scale-in`}>
            <div className="flex items-center gap-3 mb-2">
              <i className={`fas ${diagStatus.ok ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-circle text-red-500'}`}></i>
              <p className={`text-xs font-black uppercase ${diagStatus.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {diagStatus.ok ? 'Connection Verified' : 'Connection Failed'}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-600">{diagStatus.message}</p>
            {!diagStatus.ok && (
              <div className="mt-3 p-3 bg-white/50 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed">
                Library: {diagStatus.details?.libraryLoaded ? '✅ Loaded' : '❌ Missing'}<br/>
                Token: {diagStatus.details?.tokenPresent ? '✅ Present' : '❌ Missing'}<br/>
                {diagStatus.details?.apiResponse && `Response: ${JSON.stringify(diagStatus.details.apiResponse).slice(0, 100)}...`}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
             <i className="fab fa-google text-blue-500 text-xl"></i>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800">Google Drive Account</p>
            <p className="text-xs text-slate-500">Inventory & Records saved in 'StallMaster_Data'</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${diagStatus?.ok ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.telegramSettings}</h3>
          <button 
            onClick={runTelegramTest}
            disabled={testStatus === 'loading'}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              testStatus === 'success' ? 'bg-green-100 text-green-600' : 
              testStatus === 'error' ? 'bg-red-100 text-red-600' :
              'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {testStatus === 'loading' ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
            {testStatus === 'success' ? 'Success!' : testStatus === 'error' ? 'Failed' : 'Test Connection'}
          </button>
        </div>
        
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 animate-scale-in">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {errorMessage}
            </div>
          )}
          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t.botToken}</label>
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-500 hover:underline">Get Token</a>
            </div>
            <input type="password" value={telegramConfig.botToken} onChange={e => onUpdateTelegramConfig({ ...telegramConfig, botToken: e.target.value })} placeholder="123456789:ABCDE..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t.chatId}</label>
              <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-500 hover:underline">Find ID</a>
            </div>
            <input type="text" value={telegramConfig.chatId} onChange={e => onUpdateTelegramConfig({ ...telegramConfig, chatId: e.target.value })} placeholder="Numeric ID (e.g. 12345678)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Payment Configuration</h3>
        <div className="grid grid-cols-1 gap-4">
          {['PAYME', 'ALIPAY', 'FPS'].map((m) => (
            <div key={m} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className={`fas ${m === 'PAYME' ? 'fa-qrcode' : m === 'ALIPAY' ? 'fa-mobile-screen' : 'fa-bolt'} text-lg`}></i></div>
                <div>
                  <p className="font-black text-slate-800 text-sm">{m}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{paymentQRCodes[m as keyof PaymentQRCodes] ? 'Custom' : 'Default'}</p>
                </div>
              </div>
              <button onClick={() => triggerUpload(m as keyof PaymentQRCodes)} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-black shadow-sm">Update</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100">
        <button onClick={onLogout} className="w-full text-left p-5 text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl transition-colors flex justify-between items-center group">
          <span>Sign Out of Google</span>
          <i className="fas fa-arrow-right-from-bracket group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
    </div>
  );
};

export default SettingsView;
