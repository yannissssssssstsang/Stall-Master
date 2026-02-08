
import React, { useState } from 'react';
import { Product, CartItem, PaymentMethod, Language, Transaction, PaymentQRCodes } from '../types';
import { TRANSLATIONS, PAYMENT_QR_CODES } from '../constants';

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
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  
  const [showReceiptChoice, setShowReceiptChoice] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerEmail(val);
    if (val && !validateEmail(val)) {
      setEmailError(lang === Language.ZH ? '請輸入有效的電子郵件地址' : 'Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartProfit = cart.reduce((acc, item) => acc + ((item.price - item.cost) * item.quantity), 0);

  const handleFinishPayment = () => {
    if (!selectedPayment) return;
    setShowReceiptChoice(true);
  };

  const finalizeTransaction = (emailSent: boolean = false) => {
    if (emailSent && !validateEmail(customerEmail)) {
      setEmailError(lang === Language.ZH ? '請先修正電子郵件' : 'Please fix the email address first');
      return;
    }

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      items: [...cart],
      total: cartTotal,
      paymentMethod: selectedPayment!,
      profit: cartProfit,
      customerEmail: (emailSent && customerEmail) ? customerEmail : undefined
    };
    
    if (emailSent && customerEmail) {
      console.log(`Sending digital receipt to: ${customerEmail}`);
    }

    onCompleteSale(transaction);
    cart.forEach(item => updateStock(item.id, -item.quantity));
    
    setCart([]);
    setIsCheckoutOpen(false);
    setSelectedPayment(null);
    setShowReceiptChoice(false);
    setShowEmailInput(false);
    setCustomerEmail('');
    setEmailError(null);
  };

  const handleCloseModal = () => {
    setIsCheckoutOpen(false);
    setSelectedPayment(null);
    setShowReceiptChoice(false);
    setShowEmailInput(false);
    setCustomerEmail('');
    setEmailError(null);
  };

  const getQuantityInCart = (productId: string) => {
    const item = cart.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const getQRForMethod = (method: string) => {
    return customQRCodes[method as keyof PaymentQRCodes] || PAYMENT_QR_CODES[method as keyof typeof PAYMENT_QR_CODES];
  };

  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const categories = Object.keys(groupedProducts).sort();

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {categories.map(category => {
        const isCollapsed = collapsedCategories[category];
        return (
          <div key={category} className="space-y-3 bg-white/80 md:bg-transparent rounded-2xl p-2 md:p-0 transition-all">
            <button 
              onClick={() => toggleCategory(category)}
              className="w-full flex justify-between items-center px-2 py-2 group hover:bg-slate-100 md:hover:bg-white/50 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-1 bg-blue-600 rounded-full group-hover:h-6 transition-all"></div>
                <h2 className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">{category}</h2>
                <span className="text-[10px] md:text-xs text-slate-300 font-bold">({groupedProducts[category].length})</span>
              </div>
              <i className={`fas fa-chevron-down text-slate-300 text-xs transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}></i>
            </button>
            
            {!isCollapsed && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 animate-scale-in origin-top">
                {groupedProducts[category].map(product => {
                  const qty = getQuantityInCart(product.id);
                  return (
                    <button 
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className={`relative flex flex-col items-start p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left transition-all hover:shadow-md md:hover:-translate-y-1 hover:border-blue-200 ${product.stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                    >
                      {qty > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10 animate-scale-in">
                          {qty}
                        </div>
                      )}

                      <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden relative border border-slate-50">
                        <img 
                          src={product.image || `https://picsum.photos/seed/${product.id}/400`} 
                          alt={product.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      
                      <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{product.name}</h3>
                      <div className="flex justify-between w-full items-center mt-1">
                        <span className="text-blue-600 font-extrabold text-base">${product.price}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                          {product.stock}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {cart.length > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-80 z-40">
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-blue-600 text-white p-4 md:py-5 rounded-2xl shadow-2xl flex justify-between items-center font-bold hover:bg-blue-700 transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white text-blue-600 px-2 py-0.5 rounded text-sm group-hover:scale-110 transition-transform">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              <span>{t.checkout}</span>
            </div>
            <span>${cartTotal.toFixed(1)}</span>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-6 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 space-y-6 animate-slide-up md:animate-scale-in w-full md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {!showReceiptChoice && (
              <>
                <div className="flex justify-between items-center sticky top-0 bg-white pb-4 z-10 border-b border-slate-50">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t.checkout}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Review Items & Pay</p>
                  </div>
                  <button onClick={handleCloseModal} className="text-slate-400 p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-slate-100">
                          <img src={item.image} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider">${item.price} each</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 gap-4">
                          <button onClick={() => setCart(prev => {
                            const existing = prev.find(i => i.id === item.id);
                            if (existing && existing.quantity > 1) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
                            return prev.filter(i => i.id !== item.id);
                          })} className="text-slate-400 hover:text-red-500 w-6 h-6 flex items-center justify-center">
                            <i className="fas fa-minus text-[10px]"></i>
                          </button>
                          <span className="font-bold text-blue-600 text-sm">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="text-slate-400 hover:text-blue-600 w-6 h-6 flex items-center justify-center">
                            <i className="fas fa-plus text-[10px]"></i>
                          </button>
                        </div>
                        <span className="font-bold text-slate-800 text-sm min-w-[60px] text-right">${(item.price * item.quantity).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-6">
                  <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-100">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t.total}</p>
                      <p className="text-3xl font-black">${cartTotal.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: PaymentMethod.CASH, label: t.cash, icon: 'fa-money-bill-wave', color: 'bg-emerald-500' },
                      { id: PaymentMethod.PAYME, label: t.payme, icon: 'fa-qrcode', color: 'bg-red-500' },
                      { id: PaymentMethod.ALIPAY, label: t.alipay, icon: 'fa-mobile-screen', color: 'bg-sky-500' },
                      { id: PaymentMethod.FPS, label: t.fps, icon: 'fa-bolt', color: 'bg-orange-500' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPayment(p.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group ${selectedPayment === p.id ? 'border-blue-600 bg-blue-50 text-blue-600 scale-105' : 'border-slate-50 hover:border-blue-100 hover:bg-slate-50'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${p.color}`}>
                          <i className={`fas ${p.icon}`}></i>
                        </div>
                        <span className="font-bold text-xs uppercase tracking-wider">{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {selectedPayment && selectedPayment !== PaymentMethod.CASH && (
                    <div className="flex flex-col items-center bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 animate-scale-in">
                       <p className="text-[10px] font-bold mb-4 text-slate-500 uppercase tracking-[0.3em]">{t.scanToPay}</p>
                       <div className="bg-white p-4 rounded-3xl shadow-lg">
                        <img src={getQRForMethod(selectedPayment)} alt="QR" className="w-48 h-48 md:w-56 md:h-56 object-contain" />
                       </div>
                    </div>
                  )}

                  <button 
                    onClick={handleFinishPayment}
                    disabled={!selectedPayment}
                    className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${selectedPayment ? 'bg-green-600 text-white shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  >
                    {t.confirmPayment}
                  </button>
                </div>
              </>
            )}

            {showReceiptChoice && (
              <div className="text-center py-10 px-4 space-y-6">
                {!showEmailInput ? (
                  <>
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl">
                      <i className="fas fa-check text-4xl"></i>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-800">Success!</h3>
                      <p className="text-slate-500 font-bold mt-2">Transaction completed smoothly</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-sm mx-auto pt-4">
                      <button 
                        onClick={() => finalizeTransaction(false)}
                        className="py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        No Receipt
                      </button>
                      <button 
                        onClick={() => setShowEmailInput(true)}
                        className="py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 transition-colors"
                      >
                        Send Receipt
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-left animate-scale-in">
                    <div className="flex items-center gap-4 mb-8">
                      <button 
                        onClick={() => { setShowEmailInput(false); setEmailError(null); }}
                        className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
                      >
                        <i className="fas fa-arrow-left"></i>
                      </button>
                      <h3 className="text-2xl font-black text-slate-800">Enter Email</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Customer Email</label>
                        <input 
                          type="email"
                          value={customerEmail}
                          onChange={handleEmailChange}
                          placeholder="name@example.com"
                          className={`w-full p-5 bg-slate-50 border ${emailError ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl text-lg font-bold outline-none focus:border-blue-500 transition-colors`}
                          autoFocus
                        />
                        {emailError && (
                          <p className="text-xs text-red-500 font-bold mt-2 ml-1 animate-scale-in">
                            <i className="fas fa-circle-exclamation mr-1"></i>
                            {emailError}
                          </p>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => finalizeTransaction(true)}
                        disabled={!validateEmail(customerEmail)}
                        className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${validateEmail(customerEmail) ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      >
                        Finish & Send Receipt
                      </button>
                    </div>
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
