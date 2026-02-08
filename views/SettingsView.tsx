
import React, { useRef } from 'react';
import { Language, PaymentQRCodes, TelegramConfig } from '../types';
import { TRANSLATIONS } from '../constants';

interface SettingsViewProps {
  lang: Language;
  paymentQRCodes: PaymentQRCodes;
  onUpdateQRCodes: (codes: PaymentQRCodes) => void;
  telegramConfig: TelegramConfig;
  onUpdateTelegramConfig: (config: TelegramConfig) => void;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  lang, 
  paymentQRCodes, 
  onUpdateQRCodes, 
  telegramConfig, 
  onUpdateTelegramConfig,
  onLogout
}) => {
  const t = TRANSLATIONS[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadMethod, setActiveUploadMethod] = React.useState<keyof PaymentQRCodes | null>(null);

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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">{t.settings}</h2>
      </div>

      {/* Account Info */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Google Account</h3>
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
             <i className="fab fa-google text-blue-500 text-xl"></i>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800">Linked to Google Drive</p>
            <p className="text-xs text-slate-500">Inventory & Records automatically synced</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">{t.telegramSettings}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">{t.botToken}</label>
            <input type="password" value={telegramConfig.botToken} onChange={e => onUpdateTelegramConfig({ ...telegramConfig, botToken: e.target.value })} placeholder="Enter Token" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">{t.chatId}</label>
            <input type="text" value={telegramConfig.chatId} onChange={e => onUpdateTelegramConfig({ ...telegramConfig, chatId: e.target.value })} placeholder="Enter ID" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500" />
          </div>
          <div className="pt-4 border-t border-slate-50">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-4 ml-1">{t.notificationPref}</label>
            <div className="space-y-2">
              {['none', 'transaction', 'stock', 'both'].map((opt) => (
                <label key={opt} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-colors border-2 border-transparent has-[:checked]:border-blue-200">
                  <input type="radio" checked={telegramConfig.alertType === opt} onChange={() => onUpdateTelegramConfig({ ...telegramConfig, alertType: opt as any })} className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-600">{(t as any)[`notif${opt.charAt(0).toUpperCase() + opt.slice(1)}`]}</span>
                </label>
              ))}
            </div>
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
