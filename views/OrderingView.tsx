
import React, { useState, useMemo } from 'react';
import { Product, CartItem, Language, Transaction, PaymentQRCodes } from '../types';
import { TRANSLATIONS } from '../constants';
import { sendReceiptEmail } from '../services/gmailService';

interface OrderingViewProps {
  products: Product[];
  lang: Language;
  onCompleteSale: (transaction: Transaction) => void;
  updateStock: (productId: string, quantity: number) => void;
  customQRCodes?: PaymentQRCodes;
}

const OrderingView: React.FC<OrderingViewProps> = ({ products, lang, onCompleteSale, updateStock, customQRCodes = {} }) => {
  const t = TRANSLATIONS[lang];
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  
  const [showReceiptChoice, setShowReceiptChoice] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const availableProducts = useMemo(() => products.filter(p => !p.isExtracting), [products]);

  const availablePaymentMethods = useMemo(() => {
    const methods = ['CASH'];
    Object.keys(customQRCodes).forEach(key => {
      if (customQRCodes[key]) {
        methods.push(key);
      }
    });
    return methods;
  }, [customQRCodes]);

  const getCategoryColor = (cat: string) => {
    const categoryName = String(cat || '');
    if (!categoryName || categoryName === (lang === Language.ZH ? '未分類' : 'Uncategorized')) return 'bg-slate-100 text-slate-500 border-slate-200';
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['bg-blue-50 text-blue-600 border-blue-100', 'bg-emerald-50 text-emerald-600 border-emerald-100', 'bg-purple-50 text-purple-600 border-purple-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-rose-50 text-rose-600 border-rose-100'];
    return colors[Math.abs(hash) % colors.length];
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerEmail(val);
    setEmailError((val && !validateEmail(val)) ? (lang === Language.ZH ? '請輸入有效的電子郵件地址' : 'Please enter a valid email address') : null);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartProfit = cart.reduce((acc, item) => acc + ((item.price - item.cost) * item.quantity), 0);

  const finalizeTransaction = async (emailSent: boolean = false) => {
    if (emailSent && !validateEmail(customerEmail)) return;

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      items: [...cart],
      total: cartTotal,
      paymentMethod: selectedPayment!,
      profit: cartProfit,
      customerEmail: (emailSent && customerEmail) ? customerEmail : undefined
    };

    if (emailSent) {
      setIsSendingEmail(true);
      const success = await sendReceiptEmail(transaction, customerEmail, lang);
      setIsSendingEmail(false);
      
      if (success) {
        setIsEmailSent(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        alert(lang === Language.ZH ? '電郵發送失敗，請檢查權限設置。' : 'Email failed to send. Please check your permissions.');
        return;
      }
    }

    onCompleteSale(transaction);
    cart.forEach(item => updateStock(item.id, -item.quantity));
    setCart([]);
    setIsCheckoutOpen(false);
    setSelectedPayment(null);
    setShowReceiptChoice(false);
    setShowEmailInput(false);
    setCustomerEmail('');
    setIsEmailSent(false);
  };

  const groupedProducts = useMemo(() => {
    return availableProducts.reduce((acc, product) => {
      const cat = String(product.category || '').trim() || (lang === Language.ZH ? '未分類' : 'Uncategorized');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [availableProducts, lang]);

  const categories = useMemo(() => Object.keys(groupedProducts).sort(), [groupedProducts]);

  return (
    <div className="space-y-8 pb-32 md:pb-8">
      {categories.map((category) => {
        const catColor = getCategoryColor(category);
        const catTextColor = catColor.split(' ')[1];
        return (
          <div key={category} className="space-y-4">
            <button onClick={() => setCollapsedCategories(prev => ({...prev, [category]: !prev[category]}))} className={`w-full flex justify-between items-center p-4 rounded-2xl border ${catColor} shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white shadow-sm"><i className={`fas fa-layer-group text-xs ${catTextColor}`}></i></div>
                <div className="text-left"><h2 className="text-xs font-black uppercase tracking-[0.2em]">{category}</h2><span className="text-[9px] font-bold opacity-70 uppercase">{groupedProducts[category].length} Products</span></div>
              </div>
              <i className={`fas fa-chevron-down text-xs transition-transform ${collapsedCategories[category] ? '-rotate-90' : ''}`}></i>
            </button>
            {!collapsedCategories[category] && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-scale-in origin-top">
                {groupedProducts[category].map(product => {
                  const qty = cart.find(i => i.id === product.id)?.quantity || 0;
                  return (
                    <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0} className={`relative flex flex-col p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left transition-all hover:shadow-md ${product.stock <= 0 ? 'opacity-50 grayscale' : ''}`}>
                      {qty > 0 && <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">{qty}</div>}
                      <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden border border-slate-100">
                        <img src={product.image || `https://picsum.photos/seed/${product.id}/400`} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-800 line-clamp-1 uppercase tracking-tight">{product.name}</h3>
                      <div className="flex justify-between w-full items-center mt-1">
                        <span className="text-blue-600 font-extrabold text-base">${product.price}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock < (product.threshold || 5) ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>{product.stock}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {availableProducts.length === 0 && <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200"><i className="fas fa-box-open text-slate-200 text-4xl mb-4"></i><p className="font-bold text-slate-400">All items are either out of stock or being scanned.</p></div>}
      
      {cart.length > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] animate-scale-in">
          <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-blue-600 text-white p-5 rounded-[24px] shadow-2xl shadow-blue-200 flex justify-between items-center font-black hover:bg-blue-700 transition-all group">
            <div className="flex items-center gap-3">
              <span className="bg-white text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              <span className="uppercase tracking-widest text-xs">{t.checkout}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">${cartTotal.toFixed(1)}</span>
              <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
            </div>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[48px] p-8 shadow-2xl animate-scale-in max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{showReceiptChoice ? 'Transaction Complete' : 'Order Summary'}</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
            </div>

            {!showReceiptChoice ? (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-3xl p-6 space-y-4 max-h-48 overflow-y-auto border border-slate-100">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 pr-3">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><i className="fas fa-minus text-[10px]"></i></button>
                          <span className="text-xs font-black text-slate-700">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><i className="fas fa-plus text-[10px]"></i></button>
                        </div>
                        <span className="text-sm font-bold text-slate-600 truncate max-w-[120px] uppercase tracking-tight">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">${(item.price * item.quantity).toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center px-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t.total}</span>
                  <span className="text-3xl font-black text-blue-600">${cartTotal.toFixed(1)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {availablePaymentMethods.map(method => (
                    <button 
                      key={method}
                      onClick={() => setSelectedPayment(method)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedPayment === method ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:border-slate-100'}`}
                    >
                      <i className={`fas ${
                        method === 'CASH' ? 'fa-money-bill-wave' : 
                        method === 'PAYME' ? 'fa-qrcode' :
                        method === 'ALIPAY' ? 'fa-mobile-screen' : 
                        method === 'FPS' ? 'fa-bolt' : 'fa-wallet'
                      } ${selectedPayment === method ? 'text-blue-600' : 'text-slate-300'}`}></i>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedPayment === method ? 'text-blue-600' : 'text-slate-400'}`}>
                        {method === 'CASH' ? t.cash : (t[method.toLowerCase() as keyof typeof t] || method)}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedPayment && selectedPayment !== 'CASH' && (
                  <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-[32px] animate-scale-in border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.scanToPay}</p>
                    <div className="w-48 h-48 bg-white p-4 rounded-[24px] shadow-sm flex items-center justify-center overflow-hidden border border-slate-100">
                      <img 
                        src={customQRCodes[selectedPayment]} 
                        alt="QR Code" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowReceiptChoice(true)}
                  disabled={!selectedPayment}
                  className="w-full bg-emerald-600 text-white p-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <i className="fas fa-check-circle"></i>
                  {t.confirmPayment}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-scale-in">
                <div className="text-center py-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl transition-all ${isEmailSent ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                    <i className={`fas ${isEmailSent ? 'fa-paper-plane' : 'fa-check'}`}></i>
                  </div>
                  <h4 className="text-slate-800 font-black text-lg uppercase tracking-tight">
                    {isEmailSent ? 'Receipt Sent!' : 'Sale Recorded Successfully'}
                  </h4>
                  <p className="text-slate-400 text-xs font-medium mt-2">
                    {isEmailSent ? `Sent via Gmail to ${customerEmail}` : 'Would the customer like a digital receipt?'}
                  </p>
                </div>

                {showEmailInput ? (
                  <div className="space-y-4">
                    {!isEmailSent && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Customer Email</label>
                          <input 
                            type="email" 
                            disabled={isSendingEmail}
                            value={customerEmail}
                            onChange={handleEmailChange}
                            className={`w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-blue-500 shadow-sm transition-opacity ${isSendingEmail ? 'opacity-50' : ''} ${emailError ? 'border-red-500' : 'border-slate-100'}`}
                            placeholder="customer@email.com"
                          />
                          {emailError && <p className="text-[9px] text-red-500 font-bold mt-2 ml-1">{emailError}</p>}
                        </div>
                        <button 
                          onClick={() => finalizeTransaction(true)}
                          disabled={!customerEmail || !!emailError || isSendingEmail}
                          className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isSendingEmail ? (
                            <>
                              <i className="fas fa-spinner fa-spin"></i>
                              Sending...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane"></i>
                              Send Receipt
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowEmailInput(true)}
                      className="p-5 border-2 border-slate-50 bg-slate-50 text-slate-700 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:border-blue-100 hover:bg-white transition-all flex flex-col items-center gap-3"
                    >
                      <i className="fas fa-envelope text-lg text-blue-500"></i>
                      Email Receipt
                    </button>
                    <button 
                      onClick={() => finalizeTransaction(false)}
                      className="p-5 border-2 border-slate-50 bg-slate-50 text-slate-700 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:border-emerald-100 hover:bg-white transition-all flex flex-col items-center gap-3"
                    >
                      <i className="fas fa-ban text-lg text-slate-300"></i>
                      No Receipt
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderingView;
