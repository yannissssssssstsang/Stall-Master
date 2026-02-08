
import React, { useState, useRef, useEffect, useMemo } from 'react';
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

// Utility to resize images aggressively for performance
const optimizeImage = (base64: string, maxWidth: number = 500): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6)); // High compression for fast sync
    };
  });
};

const InventoryView: React.FC<InventoryViewProps> = ({ products, lang, onAddProduct, onUpdateProduct, onDeleteProduct, changeLogs }) => {
  const t = TRANSLATIONS[lang];
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [selectedDriveItems, setSelectedDriveItems] = useState<string[]>([]);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<number | null>(null);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category?.trim()).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const getCategoryColor = (cat: string) => {
    if (!cat) return 'bg-slate-100 text-slate-500';
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['bg-blue-50 text-blue-600 border-blue-100', 'bg-emerald-50 text-emerald-600 border-emerald-100', 'bg-purple-50 text-purple-600 border-purple-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-rose-50 text-rose-600 border-rose-100'];
    return colors[Math.abs(hash) % colors.length];
  };

  // Perform AI extraction for a product already in the list
  const runExtraction = async (product: Product) => {
    if (!product.image) return;
    try {
      const result = await extractProductInfo(product.image);
      if (result) {
        onUpdateProduct({
          ...product,
          price: result.price || product.price,
          cost: result.cost || product.cost,
          category: result.category || product.category,
          isExtracting: false
        });
      } else {
        onUpdateProduct({ ...product, isExtracting: false });
      }
    } catch (err) {
      onUpdateProduct({ ...product, isExtracting: false });
    }
    setProcessingProgress(prev => ({ ...prev, current: prev.current + 1 }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    
    // Step 1: Process thumbnails for ALL items immediately (Optimistic UI)
    const newProducts: Product[] = [];
    // Fix: Explicitly cast Array.from result to File[] to ensure 'file' in loop is not unknown
    const fileList = Array.from(files) as File[];
    for (const file of fileList) {
      const base64 = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        // Fix: 'file' is now correctly typed as File, avoiding unknown conversion error
        reader.readAsDataURL(file);
      });
      const thumb = await optimizeImage(base64, 400);
      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        // Fix: Correctly access name from typed File object
        name: file.name.replace(/\.[^/.]+$/, ""),
        price: 0,
        cost: 0,
        category: '',
        stock: 0,
        image: thumb,
        isExtracting: true
      };
      newProducts.push(product);
      onAddProduct(product); // Add to UI immediately
    }

    // Step 2: Parallel AI Extraction (Chunked)
    const CONCURRENCY = 3;
    for (let i = 0; i < newProducts.length; i += CONCURRENCY) {
      const chunk = newProducts.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(p => runExtraction(p)));
    }

    setIsProcessing(false);
    e.target.value = '';
  };

  const handleBatchDriveImport = async () => {
    if (selectedDriveItems.length === 0) return;
    setIsProcessing(true);
    const total = selectedDriveItems.length;
    setProcessingProgress({ current: 0, total });
    setShowDrivePicker(false);

    const newItems: Product[] = [];
    for (const id of selectedDriveItems) {
      const mockUrl = `https://picsum.photos/seed/${id}/500`;
      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Cloud_Item_${id}`,
        price: 0,
        cost: 0,
        category: '',
        stock: 0,
        image: mockUrl,
        isExtracting: true
      };
      newItems.push(product);
      onAddProduct(product);
    }

    const CONCURRENCY = 3;
    for (let i = 0; i < newItems.length; i += CONCURRENCY) {
      const chunk = newItems.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(p => runExtraction(p)));
    }

    setSelectedDriveItems([]);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-8 pb-24 md:pb-12">
      {/* Background Processing Banner */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-blue-600 text-white py-3 px-6 shadow-xl animate-slide-down flex justify-between items-center">
          <div className="flex items-center gap-4">
             <i className="fas fa-magic animate-pulse"></i>
             <p className="text-xs font-black uppercase tracking-widest">
               AI Extraction in progress ({processingProgress.current}/{processingProgress.total})
             </p>
          </div>
          <div className="w-32 bg-white/20 h-1.5 rounded-full overflow-hidden">
             <div className="bg-white h-full transition-all" style={{ width: `${(processingProgress.current/processingProgress.total)*100}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">{t.inventory}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Products & Stock</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
            className="w-full sm:w-auto p-4 px-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 shadow-xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-blue-100"
          >
            <i className="fas fa-plus"></i>
            {lang === Language.ZH ? '批量新增產品' : 'Add Multiple Products'}
          </button>
          
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setShowAddMenu(false)}></div>
              <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[120] animate-scale-in overflow-hidden w-64">
                <button onClick={() => { setShowAddMenu(false); addFileInputRef.current?.click(); }} className="w-full p-4 flex items-center gap-4 hover:bg-blue-50 transition-colors border-b border-slate-50">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><i className="fas fa-camera-retro"></i></div>
                  <div className="text-left"><p className="text-xs font-black text-slate-700">Photos</p><p className="text-[9px] text-slate-400 font-bold">Fast Multi-Upload</p></div>
                </button>
                <button onClick={() => { setShowAddMenu(false); setShowDrivePicker(true); }} className="w-full p-4 flex items-center gap-4 hover:bg-blue-50 transition-colors">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500"><i className="fab fa-google-drive"></i></div>
                  <div className="text-left"><p className="text-xs font-black text-slate-700">Google Drive</p><p className="text-[9px] text-slate-400 font-bold">Import Batch</p></div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <input type="file" ref={addFileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="relative overflow-hidden rounded-[24px]">
            <div 
              style={{ transform: swipedId === p.id ? 'translateX(-96px)' : 'translateX(0)' }}
              className={`bg-white p-5 border border-slate-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-transform duration-300 group relative z-10 rounded-[24px] ${p.isExtracting ? 'opacity-70' : ''}`}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 relative">
                 {p.image && <img src={p.image} className="w-full h-full object-cover" />}
                 {p.isExtracting && (
                   <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[1px] flex items-center justify-center">
                     <i className="fas fa-magic text-white animate-spin text-sm"></i>
                   </div>
                 )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate text-base">{p.name}</h3>
                {p.isExtracting ? (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="h-2 w-16 bg-slate-100 rounded-full animate-pulse"></div>
                    <div className="h-2 w-24 bg-slate-50 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border mt-1 ${getCategoryColor(p.category)}`}>
                      {p.category || (lang === Language.ZH ? '未分類' : 'Uncategorized')}
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] font-bold text-slate-400">Cost: <span className="text-slate-600">${p.cost}</span></span>
                      <span className="text-[11px] font-bold text-blue-600">Price: ${p.price}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">Qty: {p.stock}</div>
                <button onClick={() => setEditingProduct(p)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fas fa-pencil"></i></button>
              </div>
            </div>
            <button onClick={() => onDeleteProduct(p.id)} className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 text-white flex flex-col items-center justify-center gap-1"><i className="fas fa-trash-alt"></i></button>
          </div>
        ))}
      </div>

      {showDrivePicker && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
               <h3 className="text-xl font-black text-slate-800">Drive Multiple Import</h3>
               <button onClick={() => setShowDrivePicker(false)} className="w-10 h-10 bg-slate-50 rounded-full text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-6">
               {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                 <button key={i} onClick={() => setSelectedDriveItems(prev => prev.includes(`${i}`) ? prev.filter(x => x !== `${i}`) : [...prev, `${i}`])} className="relative group">
                   <div className={`aspect-square bg-slate-50 rounded-2xl overflow-hidden border-2 transition-all ${selectedDriveItems.includes(`${i}`) ? 'border-blue-600 scale-95' : 'border-transparent'}`}>
                      <img src={`https://picsum.photos/seed/${i}/300`} className="w-full h-full object-cover" />
                      {selectedDriveItems.includes(`${i}`) && <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center"><div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-check"></i></div></div>}
                   </div>
                   <p className="text-[10px] font-bold mt-2 uppercase text-slate-400">Item_{i}.JPG</p>
                 </button>
               ))}
            </div>
            <div className="p-6 bg-slate-50">
               <button onClick={handleBatchDriveImport} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100">Import Selected ({selectedDriveItems.length})</button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 space-y-6 animate-scale-in overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
             <h3 className="text-2xl font-black text-slate-800">{t.editProduct}</h3>
             <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name</label>
                 <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Cost</label>
                 <input type="number" value={editingProduct.cost} onChange={e => setEditingProduct({...editingProduct, cost: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Price</label>
                 <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-blue-600" />
               </div>
               <div className="col-span-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                 <input value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
               </div>
             </div>
             <button onClick={() => { onUpdateProduct(editingProduct); setEditingProduct(null); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;