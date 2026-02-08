
import React, { useRef } from 'react';
import { Language, PaymentQRCodes, TelegramConfig } from '../types';
import { TRANSLATIONS } from '../constants';

interface SettingsViewProps {
  lang: Language;
  paymentQRCodes: PaymentQRCodes;
  onUpdateQRCodes: (codes: PaymentQRCodes) => void;
  telegramConfig: TelegramConfig;
  onUpdateTelegramConfig: (config: TelegramConfig) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ lang, paymentQRCodes, onUpdateQRCodes, telegramConfig, onUpdateTelegramConfig }) => {
  const t = TRANSLATIONS[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadMethod, setActiveUploadMethod] = React.useState<keyof PaymentQRCodes | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadMethod) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onUpdateQRCodes({
        ...paymentQRCodes,
        [activeUploadMethod]: base64
      });
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
      <h2 className="text-xl font-bold">{t.settings}</h2>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold mb-4 text-slate-500 uppercase tracking-wider">Account Information</h3>
        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
          <img src="https://picsum.photos/seed/profile/100" alt="Profile" className="w-12 h-12 rounded-full" />
          <div>
            <p className="font-bold">Market Stall #12</p>
            <p className="text-xs text-slate-400">Synced to: stall-owner@gmail.com</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold mb-4 text-slate-500 uppercase tracking-wider">{t.telegramSettings}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">{t.botToken}</label>
            <input 
              type="password"
              value={telegramConfig.botToken} 
              onChange={e => onUpdateTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
              placeholder="Enter Telegram Bot Token"
              className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">{t.chatId}</label>
            <input 
              type="text"
              value={telegramConfig.chatId} 
              onChange={e => onUpdateTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
              placeholder="Enter Chat ID"
              className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="pt-2 border-t border-slate-50">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3 ml-1">{t.notificationPref}</label>
            <div className="space-y-2">
              {[
                { id: 'none', label: t.notifNone },
                { id: 'transaction', label: t.notifTransaction },
                { id: 'stock', label: t.notifStock },
                { id: 'both', label: t.notifBoth }
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors border border-transparent has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50">
                  <input 
                    type="radio" 
                    name="alertType"
                    checked={telegramConfig.alertType === opt.id}
                    onChange={() => onUpdateTelegramConfig({ ...telegramConfig, alertType: opt.id as any })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm font-medium ${telegramConfig.alertType === opt.id ? 'text-blue-700' : 'text-slate-600'}`}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold mb-4 text-slate-500 uppercase tracking-wider">Payment Settings</h3>
        <p className="text-xs text-slate-400 mb-4 italic">Upload your personal static QR codes for customers to scan during checkout.</p>
        
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'PAYME', label: 'PayMe', icon: 'fa-qrcode' },
            { id: 'ALIPAY', label: 'Alipay', icon: 'fa-mobile-screen' },
            { id: 'FPS', label: 'FPS', icon: 'fa-bolt' }
          ].map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                  <i className={`fas ${m.icon}`}></i>
                </div>
                <div>
                  <p className="font-bold text-sm">{m.label}</p>
                  <p className="text-[10px] text-slate-400">
                    {paymentQRCodes[m.id as keyof PaymentQRCodes] ? 'Custom code uploaded' : 'Default system code'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => triggerUpload(m.id as keyof PaymentQRCodes)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                {paymentQRCodes[m.id as keyof PaymentQRCodes] ? 'Replace' : 'Upload'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-2">
        <button className="w-full text-left p-3 border-b text-sm flex justify-between items-center hover:bg-slate-50 rounded-lg transition-colors">
          <span>Sync with Google Sheets</span>
          <i className="fas fa-chevron-right text-slate-300 text-xs"></i>
        </button>
        <button className="w-full text-left p-3 text-sm text-red-500 font-bold hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
      />
    </div>
  );
};

export default SettingsView;
