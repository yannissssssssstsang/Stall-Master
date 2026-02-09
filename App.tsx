
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import OrderingView from './views/OrderingView';
import InventoryView from './views/InventoryView';
import AnalyticsView from './views/AnalyticsView';
import RecordsView from './views/RecordsView';
import SettingsView from './views/SettingsView';
import LandingView from './views/LandingView';
import { Product, Language, Transaction, DailyReport, PaymentQRCodes, ProductChangeLog, TelegramConfig, SyncStatus } from './types';
import { syncToGoogleDrive } from './services/googleDriveService';

declare const google: any;

// PASTE YOUR CLIENT ID FROM GOOGLE CLOUD CONSOLE HERE
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Artisan Coffee', price: 45, cost: 15, stock: 50, threshold: 5, category: 'Beverage', image: 'https://picsum.photos/seed/coffee/200' },
  { id: '2', name: 'Handmade Cookie', price: 20, cost: 8, stock: 120, threshold: 10, category: 'Food', image: 'https://picsum.photos/seed/cookie/200' },
  { id: '3', name: 'Organic Honey', price: 120, cost: 60, stock: 15, threshold: 5, category: 'Produce', image: 'https://picsum.photos/seed/honey/200' },
];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('stall_logged_in') === 'true');
  const [lang, setLang] = useState<Language>(Language.ZH);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('stall_last_sync'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isEnergySaving, setIsEnergySaving] = useState(localStorage.getItem('stall_energy_saving') === 'true');

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('stall_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('stall_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [reports, setReports] = useState<DailyReport[]>(() => {
    const saved = localStorage.getItem('stall_reports');
    return saved ? JSON.parse(saved) : [];
  });
  const [paymentQRCodes, setPaymentQRCodes] = useState<PaymentQRCodes>(() => {
    const saved = localStorage.getItem('stall_payment_qrs');
    return saved ? JSON.parse(saved) : {};
  });
  const [changeLogs, setChangeLogs] = useState<ProductChangeLog[]>(() => {
    const saved = localStorage.getItem('stall_change_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    const saved = localStorage.getItem('stall_telegram_config');
    return saved ? JSON.parse(saved) : { botToken: '', chatId: '', alertType: 'both' };
  });

  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    const initGsi = () => {
      if (typeof google !== 'undefined') {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send',
            callback: (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                localStorage.setItem('google_access_token', tokenResponse.access_token);
                (window as any).google_access_token = tokenResponse.access_token;
                setIsLoggedIn(true);
                localStorage.setItem('stall_logged_in', 'true');
              }
            },
            error_callback: (err: any) => console.error("GSI Error:", err)
          });
          setTokenClient(client);
        } catch (err) {
          console.error("GSI Init Error:", err);
        }
      }
    };
    if (document.readyState === 'complete') initGsi();
    else { window.addEventListener('load', initGsi); return () => window.removeEventListener('load', initGsi); }
  }, []);

  const handleLogin = () => {
    if (tokenClient && !GOOGLE_CLIENT_ID.startsWith('YOUR_CLIENT')) tokenClient.requestAccessToken();
    else {
      setIsLoggedIn(true);
      localStorage.setItem('stall_logged_in', 'true');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('stall_logged_in', 'false');
    localStorage.removeItem('google_access_token');
    if ((window as any).google_access_token) delete (window as any).google_access_token;
  };

  const toggleEnergySaving = () => {
    setIsEnergySaving(prev => {
      const next = !prev;
      localStorage.setItem('stall_energy_saving', String(next));
      return next;
    });
  };

  const handleCloudSync = useCallback(async () => {
    if (!navigator.onLine || !isLoggedIn) { setSyncStatus('offline'); return; }
    const token = (window as any).google_access_token || localStorage.getItem('google_access_token');
    if (!token) { setSyncStatus('pending'); return; }
    setSyncStatus('syncing');
    try {
      const success = await syncToGoogleDrive({
        products, transactions, reports,
        settings: { lang, telegramConfig, paymentQRCodes }
      });
      if (success) {
        const now = new Date().toISOString();
        setLastSyncTime(now);
        setSyncStatus('synced');
        localStorage.setItem('stall_last_sync', now);
      } else {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('pending'), 5000);
      }
    } catch (e) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('pending'), 5000);
    }
  }, [products, transactions, reports, lang, telegramConfig, paymentQRCodes, isLoggedIn]);

  const requestSync = useCallback(() => {
    if (navigator.onLine) handleCloudSync();
    else setSyncStatus('pending');
  }, [handleCloudSync]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); handleCloudSync(); };
    const handleOffline = () => { setIsOnline(false); setSyncStatus('offline'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [handleCloudSync]);

  const handleCompleteSale = (tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
    requestSync();
  };

  const handleUpdateStock = (productId: string, diff: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, p.stock + diff) } : p));
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    requestSync();
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    requestSync();
  };

  const handleAddProduct = (p: Product) => {
    setProducts(prev => [...prev, p]);
    requestSync();
  };

  if (!isLoggedIn) {
    return <LandingView lang={lang} setLang={setLang} onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout 
        lang={lang} 
        setLang={setLang} 
        onLogout={handleLogout} 
        isSyncing={syncStatus === 'syncing'} 
        lastSyncTime={lastSyncTime}
        isEnergySaving={isEnergySaving}
        onToggleEnergySaving={toggleEnergySaving}
      >
        <Routes>
          <Route path="/" element={<OrderingView products={products} lang={lang} onCompleteSale={handleCompleteSale} updateStock={handleUpdateStock} customQRCodes={paymentQRCodes} />} />
          <Route path="/inventory" element={<InventoryView products={products} lang={lang} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} changeLogs={changeLogs} />} />
          <Route path="/analytics" element={<AnalyticsView transactions={transactions} products={products} lang={lang} />} />
          <Route path="/records" element={<RecordsView transactions={transactions} lang={lang} />} />
          <Route path="/settings" element={<SettingsView lang={lang} paymentQRCodes={paymentQRCodes} onUpdateQRCodes={setPaymentQRCodes} telegramConfig={telegramConfig} onUpdateTelegramConfig={setTelegramConfig} onLogout={handleLogout} onTestTelegram={async () => true} onForceSync={handleCloudSync} isSyncing={syncStatus === 'syncing'} />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
