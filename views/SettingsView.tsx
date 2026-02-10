
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

interface HKMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  brandColor: string;
}

const HK_METHODS: HKMethod[] = [
  { id: 'PAYME', name: 'PayMe', icon: 'fa-qrcode', color: 'text-red-600', bgColor: 'bg-red-50', brandColor: '#e60000' },
  { id: 'ALIPAYHK', name: 'AlipayHK', icon: 'fa-brands fa-alipay', color: 'text-sky-500', bgColor: 'bg-sky-50', brandColor: '#00aaee' },
  { id: 'WECHATPAY', name: 'WeChat Pay HK', icon: 'fa-brands fa-weixin', color: 'text-emerald-500', bgColor: 'bg-emerald-50', brandColor: '#07c160' },
  { id: 'FPS', name: 'FPS (轉數快)', icon: 'fa-bolt-lightning', color: 'text-orange-500', bgColor: 'bg-orange-50', brandColor: '#ff8c00' },
  { id: 'OCTOPUS', name: 'Octopus (八達通)', icon: 'fa-credit-card', color: 'text-purple-600', bgColor: 'bg-purple-50', brandColor: '#f48020' },
  { id: 'BOCPAY', name: 'BOC Pay', icon: 'fa-building-columns', color: 'text-red-700', bgColor: 'bg-red-50', brandColor: '#b31c1c' },
];

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
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadMethod, setActiveUploadMethod] = useState<string | null>(null);
  
  // Telegram States
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cloud Diagnostic States
  const [diagStatus, setDiagStatus] = useState<ConnectionStatus | null>(null);
  const [isCheckingDiag, setIsCheckingDiag] = useState(false);

  // New Payment Method Modal state
  const [isAddingNewMethod, setIsAddingNewMethod] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [tempQRData, setTempQRData] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (activeUploadMethod) {
        onUpdateQRCodes({ ...paymentQRCodes, [activeUploadMethod]: result });
        setActiveUploadMethod(null);
      } else {
        setTempQRData(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = (method: string) => {
    setActiveUploadMethod(method);
    fileInputRef.current?.click();
  };

  const removePaymentMethod = (method: string) => {
    const next = { ...paymentQRCodes };
    delete next[method];
    onUpdateQRCodes(next);
  };

  const addNewMethod = (name: string, qrData?: string | null) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) return;
    onUpdateQRCodes({ ...paymentQRCodes, [trimmed]: qrData || undefined });
    setNewMethodName('');
    setTempQRData(null);
    setIsAddingNewMethod(false);
    setIsCustomMode(false);
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
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.settings}</h2>
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

      {/* Telegram Configuration */}
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

      {/* Payment Configuration */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Digital Payments (QR)</h3>
          <button 
            onClick={() => { setIsAddingNewMethod(true); setIsCustomMode(false); setTempQRData(null); }}
            className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Add New
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Object.keys(paymentQRCodes).map((m) => {
            const preset = HK_METHODS.find(h => h.id === m);
            return (
              <div key={m} className="flex flex-col p-4 border border-slate-100 rounded-2xl bg-slate-50 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 p-1">
                      {paymentQRCodes[m] ? (
                        <img src={paymentQRCodes[m]} className="w-full h-full object-contain" />
                      ) : (
                        <i className={`fas ${preset?.icon || 'fa-wallet'} text-lg ${preset?.color || 'text-slate-300'}`}></i>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{m}</p>
                      <p className={`text-[10px] font-bold uppercase ${paymentQRCodes[m] ? 'text-emerald-500' : 'text-red-400'}`}>
                        {paymentQRCodes[m] ? 'QR Ready' : 'Awaiting QR Code'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => triggerUpload(m)} 
                      className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black shadow-sm uppercase hover:bg-slate-50 transition-colors"
                    >
                      Update QR
                    </button>
                    <button 
                      onClick={() => removePaymentMethod(m)} 
                      className="w-10 h-10 bg-white text-red-400 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm hover:text-red-500 transition-colors"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {Object.keys(paymentQRCodes).length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
              <i className="fas fa-qrcode text-slate-100 text-3xl mb-2"></i>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Digital Payments Configured</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100">
        <button onClick={onLogout} className="w-full text-left p-5 text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl transition-colors flex justify-between items-center group">
          <span>Sign Out of Google</span>
          <i className="fas fa-arrow-right-from-bracket group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>

      {/* Redesigned Dropdown-Style Modal for Adding Payment Methods */}
      {isAddingNewMethod && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[48px] p-6 md:p-8 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {isCustomMode ? 'Custom Payment' : 'Choose Provider'}
              </h3>
              <button onClick={() => { setIsAddingNewMethod(false); setIsCustomMode(false); setTempQRData(null); }} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shadow-sm"><i className="fas fa-times"></i></button>
            </div>

            {!isCustomMode ? (
              <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Available in Hong Kong</p>
                <div className="space-y-2">
                  {HK_METHODS.map(method => (
                    <button 
                      key={method.id}
                      onClick={() => addNewMethod(method.id)}
                      className={`w-full p-4 rounded-3xl border border-slate-100 flex items-center gap-4 transition-all hover:border-blue-200 hover:bg-slate-50 group active:scale-[0.98] ${method.bgColor.replace('bg-', 'hover:bg-')}`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 bg-white`}>
                        <i className={`fas ${method.icon} text-xl ${method.color}`}></i>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 tracking-tight">{method.name}</p>
                      </div>
                      <i className="fas fa-chevron-right ml-auto text-slate-200 group-hover:translate-x-1 transition-transform"></i>
                    </button>
                  ))}
                  <button 
                    onClick={() => setIsCustomMode(true)}
                    className="w-full p-4 rounded-3xl border border-dashed border-slate-200 flex items-center gap-4 transition-all hover:bg-slate-50 group active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400">
                      <i className="fas fa-plus"></i>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800 tracking-tight">Other / International</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custom Payment Provider</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Method Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newMethodName}
                    onChange={e => setNewMethodName(e.target.value)}
                    placeholder="e.g. STRIPE, VENMO, LINEPAY"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-black outline-none focus:border-blue-500 uppercase shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Upload QR Code</label>
                  <div 
                    onClick={() => modalFileInputRef.current?.click()}
                    className={`w-full aspect-square md:aspect-video rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${tempQRData ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                  >
                    {tempQRData ? (
                      <img src={tempQRData} className="w-full h-full object-contain p-4" alt="QR Preview" />
                    ) : (
                      <>
                        <i className="fas fa-qrcode text-3xl text-slate-300 mb-2"></i>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tap to Select QR Image</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={modalFileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={() => setIsCustomMode(false)} className="p-5 bg-slate-100 text-slate-500 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-colors hover:bg-slate-200">Back</button>
                  <button 
                    onClick={() => addNewMethod(newMethodName, tempQRData)} 
                    disabled={!newMethodName}
                    className="p-5 bg-blue-600 text-white rounded-[28px] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
                  >
                    Add Method
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Setting Page File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
    </div>
  );
};

export default SettingsView;
