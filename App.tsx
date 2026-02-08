
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

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('stall_logged_in', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('stall_logged_in', 'false');
    localStorage.removeItem('google_access_token');
  };

  const handleCloudSync = useCallback(async () => {
    if (!navigator.onLine || !isLoggedIn) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const success = await syncToGoogleDrive({
        products,
        transactions,
        reports,
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
    if (!navigator.onLine) {
      setSyncStatus('pending');
    } else {
      handleCloudSync();
    }
  }, [handleCloudSync]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncStatus === 'pending' || syncStatus === 'offline' || syncStatus === 'error') {
        handleCloudSync();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleCloudSync, syncStatus]);

  useEffect(() => {
    const checkCutoff = () => {
      const lastResetStr = localStorage.getItem('stall_last_reset');
      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      if (lastResetStr !== todayDate && transactions.length > 0) {
        const newReport: DailyReport = {
          date: lastResetStr || todayDate,
          transactions: [...transactions],
          totalRevenue: transactions.reduce((a, b) => a + b.total, 0),
          totalProfit: transactions.reduce((a, b) => a + b.profit, 0)
        };
        setReports(prev => [...prev, newReport]);
        setTransactions([]);
        localStorage.setItem('stall_last_reset', todayDate);
        localStorage.setItem('stall_transactions', JSON.stringify([]));
        requestSync();
      } else if (!lastResetStr) {
        localStorage.setItem('stall_last_reset', todayDate);
      }
    };
    const interval = setInterval(checkCutoff, 60000);
    return () => clearInterval(interval);
  }, [transactions, requestSync]);

  useEffect(() => { if(isLoggedIn) localStorage.setItem('stall_products', JSON.stringify(products)); }, [products, isLoggedIn]);
  useEffect(() => { if(isLoggedIn) localStorage.setItem('stall_transactions', JSON.stringify(transactions)); }, [transactions, isLoggedIn]);
  useEffect(() => { if(isLoggedIn) localStorage.setItem('stall_reports', JSON.stringify(reports)); }, [reports, isLoggedIn]);
  useEffect(() => { if(isLoggedIn) localStorage.setItem('stall_payment_qrs', JSON.stringify(paymentQRCodes)); }, [paymentQRCodes, isLoggedIn]);
  useEffect(() => { if(isLoggedIn) localStorage.setItem('stall_change_logs', JSON.stringify(changeLogs)); }, [changeLogs, isLoggedIn]);
  useEffect(() => { if(isLoggedIn) localStorage.setItem('stall_telegram_config', JSON.stringify(telegramConfig)); }, [telegramConfig, isLoggedIn]);

  const sendTelegramMessage = async (htmlText: string) => {
    const token = telegramConfig.botToken.trim();
    const chat = telegramConfig.chatId.trim();
    if (!token || !chat || !navigator.onLine) return;
    const cleanToken = token.startsWith('bot') ? token : `bot${token}`;
    try {
      const response = await fetch(`https://api.telegram.org/${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: htmlText, parse_mode: 'HTML' })
      });
      return response.ok;
    } catch (error) {
      console.error("Telegram API Error:", error);
      throw error;
    }
  };

  const handleTestTelegram = async () => {
    return sendTelegramMessage(`<b>✅ Connection Test Successful</b>\nTime: ${new Date().toLocaleTimeString()}`);
  };

  const handleCompleteSale = (tx: Transaction) => {
    if ("geolocation" in navigator && navigator.onLine) {
      navigator.geolocation.getCurrentPosition((pos) => {
        saveTransaction({ ...tx, location: { lat: pos.coords.latitude, lng: pos.coords.longitude, name: "Stall" } });
      }, () => saveTransaction(tx), { timeout: 3000 });
    } else {
      saveTransaction(tx);
    }
  };

  const saveTransaction = (tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
    const showTx = telegramConfig.alertType === 'transaction' || telegramConfig.alertType === 'both';
    if (showTx && navigator.onLine) {
      sendTelegramMessage(`<b>💰 New Transaction</b>\n<b>Total:</b> $${tx.total.toFixed(1)}`).catch(e => console.error(e));
    }
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
      <Layout lang={lang} setLang={setLang} isSyncing={syncStatus === 'syncing'} lastSyncTime={lastSyncTime}>
        <Routes>
          <Route path="/" element={<OrderingView products={products} lang={lang} onCompleteSale={handleCompleteSale} updateStock={handleUpdateStock} customQRCodes={paymentQRCodes} />} />
          <Route path="/inventory" element={<InventoryView products={products} lang={lang} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} changeLogs={changeLogs} />} />
          {/* Fixed allTransactions typo to transactions */}
          <Route path="/analytics" element={<AnalyticsView transactions={transactions} products={products} lang={lang} />} />
          <Route path="/records" element={<RecordsView transactions={transactions} lang={lang} />} />
          <Route path="/settings" element={<SettingsView lang={lang} paymentQRCodes={paymentQRCodes} onUpdateQRCodes={setPaymentQRCodes} telegramConfig={telegramConfig} onUpdateTelegramConfig={setTelegramConfig} onLogout={handleLogout} onTestTelegram={handleTestTelegram} onForceSync={handleCloudSync} isSyncing={syncStatus === 'syncing'} />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
