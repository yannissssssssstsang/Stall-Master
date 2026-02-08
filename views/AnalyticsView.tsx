
import React, { useEffect, useRef, useMemo } from 'react';
import { Transaction, Language, Product } from '../types';
import { TRANSLATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

declare const L: any;

interface AnalyticsViewProps {
  transactions: Transaction[];
  products: Product[];
  lang: Language;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions, lang, products }) => {
  const t = TRANSLATIONS[lang];
  const mapRef = useRef<any>(null);

  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = transactions.reduce((acc, curr) => acc + curr.profit, 0);

  // Group transactions by location for the proportional symbol map
  const locationStats = useMemo(() => {
    const stats: Record<string, { lat: number; lng: number; revenue: number; count: number; name: string }> = {};
    transactions.forEach(tx => {
      if (tx.location) {
        // Rounding to 4 decimal places roughly groups points within ~11 meters
        const key = `${tx.location.lat.toFixed(4)},${tx.location.lng.toFixed(4)}`;
        if (!stats[key]) {
          stats[key] = { 
            lat: tx.location.lat, 
            lng: tx.location.lng, 
            revenue: 0, 
            count: 0, 
            name: tx.location.name || 'Unnamed Stall' 
          };
        }
        stats[key].revenue += tx.total;
        stats[key].count += 1;
      }
    });
    return Object.values(stats);
  }, [transactions]);

  const maxRevenue = useMemo(() => {
    return Math.max(...locationStats.map(s => s.revenue), 1);
  }, [locationStats]);

  const hourlyData = useMemo(() => {
    const map: Record<number, number> = {};
    transactions.forEach(tx => {
      const hour = new Date(tx.timestamp).getHours();
      map[hour] = (map[hour] || 0) + tx.total;
    });
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      amount: map[i] || 0
    })).filter((d, i) => d.amount > 0 || (i >= 9 && i <= 21));
  }, [transactions]);

  const bestSellers = useMemo(() => {
    const productSalesMap: Record<string, number> = {};
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        productSalesMap[item.name] = (productSalesMap[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(productSalesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [transactions]);

  useEffect(() => {
    if (!mapRef.current) {
      const center: [number, number] = locationStats.length > 0 ? [locationStats[0].lat, locationStats[0].lng] : [22.3193, 114.1694];
      mapRef.current = L.map('analytics-map', {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; OpenStreetMap' 
      }).addTo(mapRef.current);
      
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    if (mapRef.current) {
      // Clear existing layers
      mapRef.current.eachLayer((layer: any) => { 
        if (layer instanceof L.CircleMarker) mapRef.current?.removeLayer(layer); 
      });

      locationStats.forEach(stat => {
        // Calculate radius: base 5px + relative to revenue sqrt (area scaling)
        // Max radius around 35px
        const radius = 6 + (Math.sqrt(stat.revenue / maxRevenue) * 30);
        
        const bubble = L.circleMarker([stat.lat, stat.lng], {
          radius: radius,
          fillColor: '#3b82f6',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7
        }).addTo(mapRef.current!);

        bubble.bindPopup(`
          <div class="p-2 min-w-[120px]">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">${stat.name}</p>
            <div class="flex justify-between items-baseline mb-1">
              <span class="text-lg font-black text-slate-800">$${stat.revenue.toFixed(1)}</span>
            </div>
            <p class="text-[10px] text-slate-500 font-medium">${stat.count} Total Transactions</p>
          </div>
        `, { closeButton: false, className: 'custom-map-popup' });

        // Hover effect
        bubble.on('mouseover', function (e: any) {
          this.setStyle({ fillOpacity: 0.9, weight: 3, fillColor: '#2563eb' });
          this.openPopup();
        });
        bubble.on('mouseout', function (e: any) {
          this.setStyle({ fillOpacity: 0.7, weight: 2, fillColor: '#3b82f6' });
        });
      });
    }

    return () => { 
      if (mapRef.current) { 
        mapRef.current.remove(); 
        mapRef.current = null; 
      } 
    };
  }, [locationStats, maxRevenue]);

  return (
    <div className="space-y-8 pb-20 md:pb-12">
      {/* Header section with context */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">{t.analytics}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Stall Performance & Spatial Data</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                <img src={`https://picsum.photos/seed/user${i}/100`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="bg-white p-2 px-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Analytics Active</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="dashboard-card p-6 bg-blue-600 text-white border-0 shadow-lg shadow-blue-100 flex flex-col justify-between">
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">{t.revenue}</p>
          <div>
            <p className="text-3xl font-black">${totalRevenue.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1 text-white/70 text-[10px] font-bold uppercase">
              <i className="fas fa-arrow-trend-up"></i>
              <span>+12.5% vs yesterday</span>
            </div>
          </div>
        </div>
        <div className="dashboard-card p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.profit}</p>
          <div>
            <p className="text-3xl font-black text-slate-800">${totalProfit.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Target: $5,000</p>
          </div>
        </div>
        <div className="dashboard-card p-6 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
          <div>
            <p className="text-3xl font-black text-slate-800">{transactions.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Avg: ${(totalRevenue / Math.max(transactions.length, 1)).toFixed(1)}/tx</p>
          </div>
        </div>
        <div className="dashboard-card p-6 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Margin %</p>
          <div>
            <p className="text-3xl font-black text-blue-600">{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(0) : 0}%</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="bg-blue-600 h-full rounded-full" style={{ width: `${totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Insights section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Proportional Symbol Map */}
        <div className="dashboard-card overflow-hidden lg:col-span-8 h-[500px] flex flex-col group">
          <div className="p-4 px-6 border-b border-slate-50 flex justify-between items-center bg-white shrink-0 z-10">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Transaction Density Map</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Dot size indicates revenue scale</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Revenue</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div id="analytics-map" className="h-full w-full grayscale-[0.2] contrast-[1.1]"></div>
            
            {/* Map Legend Overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-xl pointer-events-none space-y-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Revenue Scale</p>
              <div className="flex items-end gap-3 px-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] font-bold text-slate-400">$</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] font-bold text-slate-400">$$</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] font-bold text-slate-400">$$$</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products sidebar */}
        <div className="dashboard-card p-6 lg:col-span-4 h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-8 shrink-0">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">{t.bestSellers}</h3>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
              <i className="fas fa-crown text-sm"></i>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {bestSellers.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bestSellers} layout="vertical" margin={{ left: 0, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 800}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                      <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={32}>
                        {bestSellers.map((_, index) => <Cell key={index} fill={['#2563eb', '#3b82f6', '#60a5fa', '#93c5fa', '#bfdbfe'][index % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50 space-y-4">
                  {bestSellers.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-300">#0{i+1}</span>
                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{item.count} Sold</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                 <i className="fas fa-chart-pie text-5xl mb-4 opacity-10"></i>
                 <p className="font-bold uppercase tracking-widest text-[10px]">No sales recorded</p>
              </div>
            )}
          </div>
        </div>

        {/* Temporal trend full width */}
        <div className="dashboard-card p-6 lg:col-span-12 h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8 shrink-0">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Revenue Velocity</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Real-time hourly breakdown</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Intraday Sales ($)</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="hour" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontWeight: 800}} 
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis 
                  hide={true}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '12px 16px' }} 
                  itemStyle={{ fontWeight: 'black', color: '#1e40af' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
