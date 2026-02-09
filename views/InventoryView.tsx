
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Product, Language, ProductChangeLog } from '../types';
import { TRANSLATIONS } from '../constants';
import { extractProductInfo } from '../services/geminiService';
import * as XLSX from 'xlsx';

interface InventoryViewProps {
  products: Product[];
  lang: Language;
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (productId: string) => void;
  changeLogs: ProductChangeLog[];
}

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
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
  });
};

const InventoryView: React.FC<InventoryViewProps> = ({ products, lang, onAddProduct, onUpdateProduct, onDeleteProduct, changeLogs }) => {
  const t = TRANSLATIONS[lang];
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, message: '' });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [selectedDriveItems, setSelectedDriveItems] = useState<string[]>([]);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const localInputRef = useRef<HTMLInputElement>(null);
  const manualImageInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(products.map(p => String(p.category || '').trim()).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const getCategoryColor = (cat: string) => {
    const categoryName = String(cat || '');
    if (!categoryName) return 'bg-slate-100 text-slate-500';
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['bg-blue-50 text-blue-600 border-blue-100', 'bg-emerald-50 text-emerald-600 border-emerald-100', 'bg-purple-50 text-purple-600 border-purple-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-rose-50 text-rose-600 border-rose-100'];
    return colors[Math.abs(hash) % colors.length];
  };

  const processFileBatch = async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length, message: lang === Language.ZH ? '正在分析批量檔案...' : 'Analyzing batch...' });

    const dataFiles = files.filter(f => f.name.match(/\.(xlsx|xls|csv)$/i));
    const imageFiles = files.filter(f => f.name.match(/\.(jpg|jpeg|png|webp)$/i));

    const batchMap = new Map<string, Product>();

    if (dataFiles.length > 0) {
      setProcessingProgress(prev => ({ ...prev, message: lang === Language.ZH ? '正在解析表格數據...' : 'Parsing spreadsheets...' }));
      for (const file of dataFiles) {
        const data: any[] = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const bstr = e.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
          };
          reader.readAsBinaryString(file);
        });

        data.forEach(row => {
          const name = String(row.Name || row['名稱'] || row.ProductName || '').trim();
          if (!name) return;
          
          const productData = {
            price: parseFloat(row.Price || row['價格'] || row['單價'] || 0),
            cost: parseFloat(row.Cost || row['成本'] || 0),
            stock: parseInt(row.Stock || row['庫存'] || 0),
            category: String(row.Category || row['分類'] || '').trim()
          };

          const existing = products.find(p => p.name.trim().toLowerCase() === name.toLowerCase());
          
          if (existing) {
            const updated = { ...existing, ...productData };
            onUpdateProduct(updated);
            batchMap.set(name.toLowerCase(), updated);
          } else {
            const newProd: Product = {
              id: Math.random().toString(36).substr(2, 9),
              name,
              ...productData,
              isExtracting: false
            };
            onAddProduct(newProd);
            batchMap.set(name.toLowerCase(), newProd);
          }
        });
      }
    }

    if (imageFiles.length > 0) {
      setProcessingProgress(prev => ({ ...prev, current: 0, total: imageFiles.length, message: lang === Language.ZH ? '正在處理並關聯圖片...' : 'Processing images...' }));

      for (const file of imageFiles) {
        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        const thumb = await optimizeImage(base64, 400);
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "").trim();
        const fileNameKey = fileNameWithoutExt.toLowerCase();

        const matchedProduct = products.find(p => p.name.trim().toLowerCase() === fileNameKey) || batchMap.get(fileNameKey);

        if (matchedProduct) {
          onUpdateProduct({ ...matchedProduct, image: thumb });
        } else {
          const newOrphan: Product = {
            id: Math.random().toString(36).substr(2, 9),
            name: fileNameWithoutExt,
            price: 0,
            cost: 0,
            category: '',
            stock: 0,
            image: thumb,
            isExtracting: false
          };
          onAddProduct(newOrphan);
        }
        setProcessingProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }

    setIsProcessing(false);
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFileBatch(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const base64 = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });
      const thumb = await optimizeImage(base64, 400);
      setEditingProduct({ ...editingProduct, image: thumb });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (!touchStartRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartRef.current.x - currentX;
    const diffY = Math.abs(touchStartRef.current.y - currentY);

    // Determine swipe direction once
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > diffY;
      }
    }

    if (isHorizontalSwipe.current) {
      // Swipe left to reveal delete (diffX > 0)
      if (diffX > 50) {
        setSwipedId(id);
      } else if (diffX < -50) {
        setSwipedId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    isHorizontalSwipe.current = null;
  };

  const handleDelete = (id: string) => {
    onDeleteProduct(id);
    setSwipedId(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close swipe on scroll or click outside
  useEffect(() => {
    const handleGlobalClick = () => setSwipedId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.inventory}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Smart Stock & Data Integration</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className={`fas ${showAddMenu ? 'fa-times' : 'fa-plus'}`}></i>
            <span className="hidden sm:inline">{showAddMenu ? 'Close' : 'Add Product'}</span>
          </button>
        </div>
      </div>

      {showAddMenu && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => localInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 p-8 bg-white border border-slate-100 rounded-[32px] hover:bg-slate-50 transition-all shadow-sm group"
          >
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-laptop-code text-2xl"></i>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-800 uppercase tracking-wider text-[11px]">Local Drive</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Photos + Excel Batch</p>
            </div>
          </button>

          <button 
            onClick={() => setShowDrivePicker(true)}
            className="flex flex-col items-center justify-center gap-3 p-8 bg-white border border-slate-100 rounded-[32px] hover:bg-slate-50 transition-all shadow-sm group"
          >
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fab fa-google-drive text-2xl"></i>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-800 uppercase tracking-wider text-[11px]">Google Drive</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cloud Smart Batch</p>
            </div>
          </button>

          <button 
            onClick={() => {
              const newProd: Product = {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                price: 0,
                cost: 0,
                stock: 0,
                category: ''
              };
              setEditingProduct(newProd);
              setShowAddMenu(false);
            }}
            className="flex flex-col items-center justify-center gap-3 p-8 bg-white border border-slate-100 rounded-[32px] hover:bg-slate-50 transition-all shadow-sm group"
          >
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-keyboard text-2xl"></i>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-800 uppercase tracking-wider text-[11px]">Manual Entry</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Single Product Info</p>
            </div>
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100 animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <i className="fas fa-magic animate-pulse"></i>
              <div>
                <p className="font-black text-sm uppercase tracking-[0.2em]">{processingProgress.message}</p>
                <p className="text-[10px] font-bold opacity-70 uppercase">Syncing with Association Engine</p>
              </div>
            </div>
            <span className="text-sm font-black">{Math.round((processingProgress.current / (processingProgress.total || 1)) * 100)}%</span>
          </div>
          <div className="w-full bg-blue-500/50 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-500" 
              style={{ width: `${(processingProgress.current / (processingProgress.total || 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
            onClick={(e) => {
              e.stopPropagation();
              if (swipedId === product.id) setSwipedId(null);
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleTouchMove(e, product.id)}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center transition-transform duration-300 ease-out ${swipedId === product.id ? 'translate-x-0' : 'translate-x-full'}`}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} 
                className="text-white flex flex-col items-center gap-1 w-full h-full justify-center active:bg-red-600 transition-colors"
              >
                <i className="fas fa-trash-can text-sm"></i>
                <span className="text-[9px] font-black uppercase tracking-widest">Delete</span>
              </button>
            </div>

            <div className={`flex items-center gap-4 p-4 transition-transform duration-300 ease-out bg-white ${swipedId === product.id ? '-translate-x-24' : 'translate-x-0'}`}>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 shrink-0 overflow-hidden relative">
                <img src={product.image || `https://picsum.photos/seed/${product.id}/200`} alt={product.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{product.name || 'Unnamed Product'}</h3>
                  {product.category && (
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${getCategoryColor(product.category)}`}>
                      {product.category}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                    <span className="text-sm font-black text-blue-600">${product.price}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stock</span>
                    <span className={`text-sm font-black ${product.stock < (product.threshold || 5) ? 'text-red-500' : 'text-slate-800'}`}>{product.stock}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }}
                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <i className="fas fa-edit text-xs"></i>
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
            <i className="fas fa-boxes-stacked text-slate-200 text-5xl mb-4"></i>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Inventory Empty</p>
          </div>
        )}
      </div>

      {showDrivePicker && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setShowDrivePicker(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <i className="fab fa-google-drive text-emerald-600"></i>
                  Drive Picker
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cloud-to-Stall Sync</p>
              </div>
              <button onClick={() => setShowDrivePicker(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <button 
                  key={i} 
                  onClick={() => setSelectedDriveItems(prev => prev.includes(`drive_${i}`) ? prev.filter(x => x !== `drive_${i}`) : [...prev, `drive_${i}`])}
                  className={`relative p-3 rounded-3xl border-2 transition-all ${selectedDriveItems.includes(`drive_${i}`) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="aspect-square bg-white rounded-2xl mb-2 flex items-center justify-center relative overflow-hidden">
                    <img src={`https://picsum.photos/seed/drive_${i}/300`} className="w-full h-full object-cover" />
                    {selectedDriveItems.includes(`drive_${i}`) && (
                      <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                        <i className="fas fa-check-circle text-white text-3xl"></i>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter truncate">Cloud_Item_{i}.jpg</p>
                </button>
              ))}
            </div>

            <div className="p-8 bg-slate-50">
              <button 
                onClick={() => {
                  const mockFiles = selectedDriveItems.map(id => new File([""], `Cloud_Item_${id.split('_')[1]}.jpg`, { type: "image/jpeg" }));
                  processFileBatch(mockFiles);
                  setShowDrivePicker(false);
                }}
                disabled={selectedDriveItems.length === 0}
                className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                Import Selected ({selectedDriveItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
          <div className="bg-white w-full max-w-lg rounded-[48px] p-8 shadow-2xl animate-scale-in max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {products.find(p => p.id === editingProduct.id) ? 'Edit Item' : 'Manual Entry'}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
            </div>

            <div className="space-y-5">
              <div 
                className="w-full aspect-video bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer group"
                onClick={() => manualImageInputRef.current?.click()}
              >
                {editingProduct.image ? (
                  <>
                    <img src={editingProduct.image} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-black uppercase tracking-widest">Update Photo</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm mb-3">
                      <i className="fas fa-camera text-xl"></i>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tap to add photo</p>
                  </>
                )}
              </div>
              <input type="file" ref={manualImageInputRef} onChange={handleManualImageUpload} className="hidden" accept="image/*" />

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Product Name</label>
                <input 
                  type="text" 
                  value={editingProduct.name} 
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold outline-none focus:border-blue-500 shadow-sm"
                  placeholder="Product Title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Sell Price ($)</label>
                  <input 
                    type="number" 
                    value={editingProduct.price} 
                    onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold outline-none focus:border-blue-500 shadow-sm text-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cost Price ($)</label>
                  <input 
                    type="number" 
                    value={editingProduct.cost} 
                    onChange={e => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold outline-none focus:border-blue-500 shadow-sm text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Available Stock</label>
                  <input 
                    type="number" 
                    value={editingProduct.stock} 
                    onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Category</label>
                  <input 
                    list="cat-list"
                    type="text" 
                    value={editingProduct.category} 
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold outline-none focus:border-blue-500 shadow-sm"
                  />
                  <datalist id="cat-list">
                    {uniqueCategories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    const exists = products.find(p => p.id === editingProduct.id);
                    if (exists) {
                      onUpdateProduct(editingProduct);
                    } else {
                      onAddProduct(editingProduct);
                    }
                    setEditingProduct(null);
                  }}
                  disabled={!editingProduct.name}
                  className="w-full bg-blue-600 text-white p-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-95"
                >
                  Save to Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={localInputRef} onChange={handleLocalUpload} className="hidden" multiple accept=".xlsx,.xls,.csv,image/*" />
    </div>
  );
};

export default InventoryView;
