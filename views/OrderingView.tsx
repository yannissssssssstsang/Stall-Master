
import React, { useState, useMemo } from 'react';
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

  // Filter products to only show those that aren't being extracted
  const availableProducts = useMemo(() => products.filter(p => !p.isExtracting), [products]);

  const getCategoryColor = (cat: string) => {
    if (!cat || cat === (lang === Language.ZH ? '未分類' : 'Uncategorized')) return 'bg-slate-100 text-slate-500 border-slate-200';
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
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

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartProfit = cart.reduce((acc, item) => acc + ((item.price - item.cost) * item.quantity), 0);

  const finalizeTransaction = (emailSent: boolean = false) => {
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
    onCompleteSale(transaction);
    cart.forEach(item => updateStock(item.id, -item.quantity));
    setCart([]);
    setIsCheckoutOpen(false);
    setSelectedPayment(null);
    setShowReceiptChoice(false);
  };

  const groupedProducts = useMemo(() => {
    return availableProducts.reduce((acc, product) => {
      const cat = product.category?.trim() || (lang === Language.ZH ? '未分類' : 'Uncategorized');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [availableProducts, lang]);

  const categories = useMemo(() => Object.keys(groupedProducts).sort(), [groupedProducts]);

  return (
    <div className="space-y-8 pb-24 md:pb-8">
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
                      <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{product.name}</h3>
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
        <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-80 z-40">
          <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-blue-600 text-white p-5 rounded-2xl shadow-2xl flex justify-between items-center font-bold hover:bg-blue-700 transition-all">
            <div className="flex items-center gap-3"><span className="bg-white text-blue-600 px-2 py-0.5 rounded text-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span><span>{t.checkout}</span></div>
            <span>${cartTotal.toFixed(1)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderingView;
