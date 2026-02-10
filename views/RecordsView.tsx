
import React, { useMemo } from 'react';
import { Transaction, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface RecordsViewProps {
  transactions: Transaction[];
  lang: Language;
}

const RecordsView: React.FC<RecordsViewProps> = ({ transactions, lang }) => {
  const t = TRANSLATIONS[lang];

  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ), [transactions]
  );

  const paymentSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    transactions.forEach(tx => {
      summary[tx.paymentMethod] = (summary[tx.paymentMethod] || 0) + tx.total;
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH': return 'fa-money-bill-wave';
      case 'PAYME': return 'fa-qrcode';
      case 'ALIPAY': return 'fa-mobile-screen';
      case 'FPS': return 'fa-bolt';
      default: return 'fa-wallet';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH': return 'bg-emerald-500 shadow-emerald-100 text-white';
      case 'PAYME': return 'bg-red-500 shadow-red-100 text-white';
      case 'ALIPAY': return 'bg-sky-500 shadow-sky-100 text-white';
      case 'FPS': return 'bg-orange-500 shadow-orange-100 text-white';
      default: return 'bg-slate-500 shadow-slate-100 text-white';
    }
  };

  const getMethodBgLite = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH': return 'bg-emerald-50 border-emerald-100';
      case 'PAYME': return 'bg-red-50 border-red-100';
      case 'ALIPAY': return 'bg-sky-50 border-sky-100';
      case 'FPS': return 'bg-orange-50 border-orange-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  const getMethodText = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH': return 'text-emerald-600';
      case 'PAYME': return 'text-red-600';
      case 'ALIPAY': return 'text-sky-600';
      case 'FPS': return 'text-orange-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.records}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction Log & History</p>
        </div>
      </div>

      {/* Payment Method Summary Section */}
      {paymentSummary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-scale-in">
          {paymentSummary.map(([method, amount]) => (
            <div key={method} className={`p-4 rounded-[24px] border shadow-sm ${getMethodBgLite(method)} flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${getMethodColor(method)}`}>
                  <i className={`fas ${getMethodIcon(method)} text-[10px]`}></i>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${getMethodText(method)}`}>{method}</span>
              </div>
              <div>
                <p className={`text-xl font-black ${getMethodText(method)}`}>${amount.toFixed(1)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Total Collected</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Recent Transactions</h3>
        {sortedTransactions.map((tx) => (
          <div key={tx.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                  tx.paymentMethod === 'CASH' ? 'bg-emerald-500' : 
                  tx.paymentMethod === 'PAYME' ? 'bg-red-500' :
                  tx.paymentMethod === 'ALIPAY' ? 'bg-sky-500' : 
                  tx.paymentMethod === 'FPS' ? 'bg-orange-500' : 'bg-slate-500'
                }`}>
                  <i className={`fas ${
                    tx.paymentMethod === 'CASH' ? 'fa-money-bill-wave' : 
                    tx.paymentMethod === 'PAYME' ? 'fa-qrcode' :
                    tx.paymentMethod === 'ALIPAY' ? 'fa-mobile-screen' : 
                    tx.paymentMethod === 'FPS' ? 'fa-bolt' : 'fa-wallet'
                  } text-xs`}></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(tx.timestamp).toLocaleDateString(lang === Language.ZH ? 'zh-HK' : 'en-US', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-sm font-black text-slate-800">
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-blue-600">${tx.total.toFixed(1)}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 uppercase tracking-wider border border-slate-100">
                  {tx.paymentMethod}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-100/50 rounded-2xl p-4 space-y-2">
              {tx.items.map((item, idx) => (
                <div key={`${tx.id}-item-${idx}`} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-[9px] font-black text-blue-600">{item.quantity}</span>
                    <span className="font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-black text-slate-400">${(item.price * item.quantity).toFixed(1)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-[9px] pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-bold uppercase">Transaction ID</span>
                <span className="text-slate-400 font-mono tracking-tighter">{tx.id}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
                <i className="fas fa-chart-line text-[8px]"></i>
                <span className="font-black uppercase tracking-widest">{t.profit}: ${tx.profit.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="text-center py-32 bg-white rounded-[40px] border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-receipt text-slate-200 text-4xl"></i>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">{t.noRecords}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsView;
