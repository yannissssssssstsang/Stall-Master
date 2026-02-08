
import React from 'react';
import { Transaction, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface RecordsViewProps {
  transactions: Transaction[];
  lang: Language;
}

const RecordsView: React.FC<RecordsViewProps> = ({ transactions, lang }) => {
  const t = TRANSLATIONS[lang];

  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = transactions.reduce((acc, curr) => acc + curr.profit, 0);

  // Group items for display in a cleaner format if needed, but currently items are already itemized in transaction
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.records}</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">{t.revenue}</p>
          <p className="text-2xl font-bold text-blue-700">${totalRevenue.toFixed(1)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-green-500 uppercase mb-1">{t.profit}</p>
          <p className="text-2xl font-bold text-green-700">${totalProfit.toFixed(1)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {sortedTransactions.map((tx) => (
          <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {new Date(tx.timestamp).toLocaleDateString(lang === Language.ZH ? 'zh-HK' : 'en-US')}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                  {tx.paymentMethod}
                </span>
                <p className="text-lg font-bold text-blue-600 mt-1">${tx.total.toFixed(1)}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 space-y-1">
              {tx.items.map((item, idx) => (
                <div key={`${tx.id}-item-${idx}`} className="flex justify-between text-xs text-slate-600">
                  <span>{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                  <span className="font-medium">${(item.price * item.quantity).toFixed(1)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-[10px] pt-1">
              <span className="text-slate-400">ID: {tx.id}</span>
              <span className="text-green-600 font-bold">+{t.profit}: ${tx.profit.toFixed(1)}</span>
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-history text-slate-300 text-2xl"></i>
            </div>
            <p className="text-slate-400">{t.noRecords}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsView;
