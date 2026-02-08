
import React, { useState, useRef } from 'react';
import { Product, Language, ProductChangeLog } from '../types';
import { TRANSLATIONS } from '../constants';
import { extractProductInfo, extractBulkProductsWithImages } from '../services/geminiService';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface InventoryViewProps {
  products: Product[];
  lang: Language;
  onAddProduct: (p: Product) => void;
  onAddProducts: (prods: Product[]) => void;
  onUpdateProduct: (p: Product) => void;
  changeLogs: ProductChangeLog[];
}

const InventoryView: React.FC<InventoryViewProps> = ({ products, lang, onAddProduct, onAddProducts, onUpdateProduct, changeLogs }) => {
  const t = TRANSLATIONS[lang];
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [driveFolder, setDriveFolder] = useState<string | null>(localStorage.getItem('stall_drive_folder'));
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, cost: 0, stock: 10, category: '', image: '' });
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [duplicateItems, setDuplicateItems] = useState<{name: string, reason: 'name' | 'image'}[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      try {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csvData = XLSX.utils.sheet_to_csv(ws);
        
        const extractedImages: string[] = [];
        try {
          const zip = await JSZip.loadAsync(ab);
          const mediaFolder = zip.folder("xl/media");
          if (mediaFolder) {
            const imagePromises: Promise<void>[] = [];
            mediaFolder.forEach((relativePath, file) => {
              if (relativePath.match(/\.(png|jpe?g)$/i)) {
                imagePromises.push(
                  file.async("base64").then(b64 => {
                    const mime = relativePath.toLowerCase().endsWith('png') ? 'image/png' : 'image/jpeg';
                    extractedImages.push(`data:${mime};base64,${b64}`);
                  })
                );
              }
            });
            await Promise.all(imagePromises);
          }
        } catch (zipErr) { console.warn(zipErr); }

        if (csvData && csvData.trim().length > 0) {
          const extractedItems = await extractBulkProductsWithImages(csvData, extractedImages);
          if (extractedItems && extractedItems.length > 0) {
            const newProds: Product[] = extractedItems.map(item => ({
              id: Math.random().toString(36).substr(2, 9),
              name: item.name.trim(),
              price: item.price || 0,
              cost: item.cost || 0,
              category: item.category || 'Excel Import',
              stock: 0,
              image: item.image || ''
            }));
            onAddProducts(newProds);
            setIsAdding(false);
          }
        }
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    } else {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (isEditing && editingProduct) {
          setEditingProduct({ ...editingProduct, image: base64 });
          setIsLoading(false);
        } else {
          const extracted = await extractProductInfo(base64);
          if (extracted) {
            setNewProduct({
              id: Math.random().toString(36).substr(2, 9),
              name: extracted.name.trim(),
              price: extracted.price,
              cost: extracted.cost,
              category: extracted.category,
              stock: 10,
              image: base64
            });
          } else {
            setNewProduct(prev => ({ ...prev, image: base64 }));
          }
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleUpdate = () => {
    if (editingProduct) {
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
    }
  };

  const selectDriveFolder = () => {
    const mockFolder = `Drive_Store_${Math.floor(Math.random() * 9000) + 1000}`;
    setDriveFolder(mockFolder);
    localStorage.setItem('stall_drive_folder', mockFolder);
  };

  return (
    <div className="space-y-8 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">{t.inventory}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Products & Stock</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={selectDriveFolder}
            className={`flex-1 sm:flex-none p-3 px-4 rounded-xl flex items-center justify-center gap-2 border font-bold text-xs transition-all ${driveFolder ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <i className={`fab fa-google-drive ${driveFolder ? 'text-green-600' : 'text-slate-400'}`}></i>
            <span className="hidden lg:inline">{driveFolder ? 'Drive Synced' : t.selectDrive}</span>
            <span className="lg:hidden">{driveFolder ? 'Synced' : 'Drive'}</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 sm:flex-none bg-blue-600 text-white p-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-blue-100 font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <i className="fas fa-plus"></i>
            {t.aiScan}
          </button>
        </div>
      </div>

      {/* Product List/Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 shadow-inner">
               {p.image ? (
                 <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center"><i className="fas fa-image text-slate-200 text-2xl"></i></div>
               )}
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
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${p.stock < (p.threshold || 5) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                Qty: {p.stock}
              </div>
              <button 
                onClick={() => { setEditingProduct(p); setActiveTab('details'); }}
                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                <i className="fas fa-pencil text-sm"></i>
              </button>
            </div>
          </div>
        ))}
        
        {products.length === 0 && (
          <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-box-archive text-slate-200 text-4xl"></i>
            </div>
            <p className="font-bold text-slate-400">{t.noProducts}</p>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 z-[110] p-0 md:p-6 flex items-center justify-center backdrop-blur-md">
          <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-lg p-0 animate-slide-up md:animate-scale-in max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{t.editProduct}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Product Details & History</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
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
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-camera text-white mb-2"></i><span className="text-[10px] text-white font-bold uppercase">Change</span></div>
                        <input type="file" ref={editImageInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Product Name</label>
                      <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Price ($)</label>
                      <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm font-black text-blue-600 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 ml-1">Stock Level</label>
                      <input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                  </div>
                  <button onClick={handleUpdate} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Save Changes</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeLogs.filter(log => log.productId === editingProduct.id).length > 0 ? (
                    changeLogs.filter(log => log.productId === editingProduct.id).map(log => (
                      <div key={log.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.field === 'price' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            <i className={`fas ${log.field === 'price' ? 'fa-tag' : 'fa-box'} text-xs`}></i>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{log.field}</p>
                            <p className="text-sm font-bold">{log.oldValue} → {log.newValue}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleDateString()}</p>
                      </div>
                    ))
                  ) : <div className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No History</div>}
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
