
import React, { useState, useRef, useEffect } from 'react';
import { Product, Language, ProductChangeLog } from '../types';
import { TRANSLATIONS } from '../constants';
import { extractProductInfo } from '../services/geminiService';

interface InventoryViewProps {
  products: Product[];
  lang: Language;
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (productId: string) => void;
  changeLogs: ProductChangeLog[];
}

const InventoryView: React.FC<InventoryViewProps> = ({ products, lang, onAddProduct, onUpdateProduct, onDeleteProduct, changeLogs }) => {
  const t = TRANSLATIONS[lang];
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<number | null>(null);

  // Close swipe state on click elsewhere
  useEffect(() => {
    const handleGlobalClick = () => setSwipedId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const processFile = async (file: File, isEditing: boolean = false) => {
    setIsLoading(true);
    setExtractError(null);
    
    // Use filename (without extension) as product name
    const fileNameAsName = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (isEditing && editingProduct) {
        setEditingProduct({ ...editingProduct, image: base64 });
        setIsLoading(false);
      } else {
        try {
          const extracted = await extractProductInfo(base64);
          onAddProduct({
            id: Math.random().toString(36).substr(2, 9),
            name: fileNameAsName, // Enforce filename as name
            price: extracted?.price || 0,
            cost: extracted?.cost || 0,
            category: extracted?.category || 'General',
            stock: 0,
            image: base64
          });
        } catch (err) {
          // Fallback if AI fails, still add product with filename
          onAddProduct({
            id: Math.random().toString(36).substr(2, 9),
            name: fileNameAsName,
            price: 0,
            cost: 0,
            category: 'General',
            stock: 0,
            image: base64
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, isEditing);
    e.target.value = '';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartRef.current - currentX;

    if (diff > 50) {
      setSwipedId(id);
    } else if (diff < -50) {
      setSwipedId(null);
    }
  };

  const simulateDriveSelection = async (imageUrl: string, fileName: string) => {
    setIsLoading(true);
    setShowDrivePicker(false);
    const nameFromDrive = fileName.replace(/\.[^/.]+$/, "");
    try {
      const extracted = await extractProductInfo(imageUrl);
      onAddProduct({
        id: Math.random().toString(36).substr(2, 9),
        name: nameFromDrive,
        price: extracted?.price || 0,
        cost: extracted?.cost || 0,
        category: extracted?.category || 'Drive',
        stock: 0,
        image: imageUrl
      });
    } catch (e) {
      setExtractError('Drive extraction failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">{t.inventory}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Products & Stock</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <button 
            disabled={isLoading}
            onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
            className={`w-full sm:w-auto p-4 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-xl font-black text-sm transition-all ${isLoading ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700 active:scale-95'}`}
          >
            {isLoading ? <i className="fas fa-sync fa-spin"></i> : <i className="fas fa-plus"></i>}
            {isLoading ? t.extracting : (lang === Language.ZH ? '新增產品' : 'Add Product')}
          </button>
          
          {showAddMenu && !isLoading && (
            <>
              <div className="fixed inset-0 bg-black/20 md:bg-transparent z-[110]" onClick={() => setShowAddMenu(false)}></div>
              <div className="fixed md:absolute left-4 right-4 bottom-24 md:left-auto md:right-0 md:top-full md:bottom-auto md:mt-2 bg-white rounded-[28px] md:rounded-2xl shadow-2xl border border-slate-100 z-[120] animate-scale-in overflow-hidden w-auto md:w-64">
                <div className="p-2 md:p-0">
                  <button 
                    onClick={() => { setShowAddMenu(false); addFileInputRef.current?.click(); }}
                    className="w-full p-4 md:p-4 flex items-center gap-4 hover:bg-blue-50 transition-colors border-b border-slate-50"
                  >
                    <div className="w-12 h-12 md:w-10 md:h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <i className="fas fa-camera text-lg md:text-base"></i>
                    </div>
                    <div className="text-left">
                       <p className="text-sm md:text-xs font-black text-slate-700">{lang === Language.ZH ? '上傳相片' : 'Upload Photo'}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Auto-name by file</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setShowAddMenu(false); setShowDrivePicker(true); }}
                    className="w-full p-4 md:p-4 flex items-center gap-4 hover:bg-blue-50 transition-colors"
                  >
                    <div className="w-12 h-12 md:w-10 md:h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                      <i className="fab fa-google-drive text-lg md:text-base"></i>
                    </div>
                    <div className="text-left">
                       <p className="text-sm md:text-xs font-black text-slate-700">{lang === Language.ZH ? 'Google Drive' : 'Google Drive'}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Browse Cloud Photos</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <input type="file" ref={addFileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

      {extractError && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-scale-in">
           <i className="fas fa-circle-exclamation"></i>
           <p className="text-xs font-bold uppercase tracking-wider">{extractError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div 
            key={p.id} 
            className="relative overflow-hidden rounded-[24px]"
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleTouchMove(e, p.id)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Delete Action (Underneath) */}
            <button 
              onClick={() => onDeleteProduct(p.id)}
              className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 text-white flex flex-col items-center justify-center gap-1 transition-all"
            >
              <i className="fas fa-trash-alt text-lg"></i>
              <span className="text-[10px] font-black uppercase">Delete</span>
            </button>

            {/* Product Card Content */}
            <div 
              style={{ transform: swipedId === p.id ? 'translateX(-96px)' : 'translateX(0)' }}
              className="bg-white p-5 border border-slate-100 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-transform duration-300 group relative z-10 rounded-[24px]"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                 {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-image text-slate-200 text-2xl"></i></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate text-base">{p.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.category}</p>
                <div className="flex items-center gap-3 mt-2">
                   <span className="text-[11px] font-bold text-slate-400">Cost: <span className="text-slate-600">${p.cost}</span></span>
                   <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Price: ${p.price}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${p.stock < (p.threshold || 5) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Qty: {p.stock}</div>
                <button 
                  onClick={() => { setEditingProduct(p); setActiveTab('details'); }} 
                  className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <i className="fas fa-pencil text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-box-archive text-slate-200 text-4xl"></i></div>
            <p className="font-bold text-slate-400">{t.noProducts}</p>
          </div>
        )}
      </div>

      {showDrivePicker && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><i className="fab fa-google-drive"></i></div>
                 <h3 className="text-xl font-black text-slate-800">Google Drive</h3>
               </div>
               <button onClick={() => setShowDrivePicker(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-6">
               {[1,2,3,4,5,6].map(i => (
                 <button 
                  key={i} 
                  onClick={() => simulateDriveSelection(`https://picsum.photos/seed/drive${i}/600`, `Item_${i}.JPG`)}
                  className="group"
                 >
                   <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-green-500 transition-all shadow-sm group-hover:shadow-lg">
                      <img src={`https://picsum.photos/seed/drive${i}/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase text-center truncate">Item_{i}.JPG</p>
                 </button>
               ))}
            </div>
            <div className="p-6 bg-slate-50 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select a photo from Drive</p>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 z-[110] p-0 md:p-6 flex items-center justify-center backdrop-blur-md" onClick={() => setEditingProduct(null)}>
          <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-lg p-0 animate-slide-up md:animate-scale-in max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{t.editProduct}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Product Details & History</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <div className="flex px-8 border-b border-slate-100">
              <button onClick={() => setActiveTab('details')} className={`py-4 px-6 font-bold text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Details</button>
              <button onClick={() => setActiveTab('history')} className={`py-4 px-6 font-bold text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>{t.history}</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              {activeTab === 'details' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 flex justify-center">
                      <div onClick={() => editImageInputRef.current?.click()} className="relative w-40 h-40 rounded-3xl overflow-hidden border-4 border-slate-50 shadow-xl cursor-pointer group">
                        {editingProduct.image ? <img src={editingProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center"><i className="fas fa-image text-slate-200 text-4xl"></i></div>}
                        <input type="file" ref={editImageInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                           <i className="fas fa-camera text-2xl"></i>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Product Name</label>
                      <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Cost ($)</label>
                      <input type="number" value={editingProduct.cost} onChange={e => setEditingProduct({...editingProduct, cost: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Price ($)</label>
                      <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm font-black text-blue-600 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Stock</label>
                      <input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Low Stock Threshold</label>
                      <input type="number" value={editingProduct.threshold || 5} onChange={e => setEditingProduct({...editingProduct, threshold: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                  </div>
                  <button onClick={() => { onUpdateProduct(editingProduct); setEditingProduct(null); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all">Save Changes</button>
                  <button onClick={() => { if(confirm('Are you sure you want to delete this product?')){ onDeleteProduct(editingProduct.id); setEditingProduct(null); }}} className="w-full bg-red-50 text-red-500 py-3 rounded-2xl font-bold text-sm transition-all">Delete Product</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeLogs.filter(log => log.productId === editingProduct.id).map(log => (
                    <div key={log.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.field === 'price' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><i className={`fas ${log.field === 'price' ? 'fa-tag' : 'fa-box'} text-xs`}></i></div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{log.field}</p>
                          <p className="text-sm font-bold">{log.oldValue} → {log.newValue}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {changeLogs.filter(log => log.productId === editingProduct.id).length === 0 && <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-[10px]">No History</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
