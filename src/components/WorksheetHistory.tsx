import React from 'react';
import { 
  History, 
  Search, 
  FolderOpen, 
  Copy, 
  Trash2, 
  PlusCircle, 
  Download, 
  Upload 
} from 'lucide-react';
import { motion } from 'motion/react';

// Re-declare local interfaces to remain fully type-safe in this module
interface ExpenseItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  isRiil?: boolean;
  riilPercentage?: number;
}

interface Person {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  unitKerja: string;
  expenses: ExpenseItem[];
  ket: string;
  riilDescription: string;
  spdNumber: string;
  spdDate: string;
  riilPercentage: number;
}

interface DocHeader {
  st: string;
  stDate: string;
  spdNumber: string;
  spdDate: string;
  tujuan: string;
  tujuanStartDate: string;
  tujuanEndDate: string;
  bendaharaName: string;
  bendaharaNip: string;
  place: string;
  signingPlace: string;
  printDate: string;
  listMakerName: string;
  listMakerNip: string;
}

interface SavedWorksheet {
  id: string;
  title: string;
  header: DocHeader;
  persons: Person[];
  savedAt: string;
}

interface WorksheetHistoryProps {
  history: SavedWorksheet[];
  activeWorksheetId: string | null;
  historySearchTerm: string;
  setHistorySearchTerm: (val: string) => void;
  onLoadWorksheet: (item: SavedWorksheet) => void;
  onDeleteWorksheet: (id: string, e: React.MouseEvent) => void;
  onDuplicateWorksheet: (item: SavedWorksheet, e: React.MouseEvent) => void;
  onCreateNewBlank: () => void;
  onExportHistory: () => void;
  onImportHistory: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatCurrency: (amount: number) => string;
  calculateWorksheetTotal: (persons: Person[]) => number;
}

export default function WorksheetHistory({
  history,
  activeWorksheetId,
  historySearchTerm,
  setHistorySearchTerm,
  onLoadWorksheet,
  onDeleteWorksheet,
  onDuplicateWorksheet,
  onCreateNewBlank,
  onExportHistory,
  onImportHistory,
  formatCurrency,
  calculateWorksheetTotal
}: WorksheetHistoryProps) {
  
  const filteredHistory = history.filter(item => {
    const term = historySearchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      (item.header.st && item.header.st.toLowerCase().includes(term)) ||
      (item.header.spdNumber && item.header.spdNumber.toLowerCase().includes(term)) ||
      item.persons.some(p => p.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex-grow flex flex-col min-h-0 no-print" id="riwayat-panel">
      {/* History Actions Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={onCreateNewBlank}
          className="flex-1 py-3.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/15 text-emerald-400 hover:text-emerald-300 rounded-2xl font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <PlusCircle size={13} />
          Buat Baru
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={onExportHistory}
            className="p-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl transition-all active:scale-[0.98]"
            title="Cadangkan Semua Riwayat (Ekspor JSON)"
          >
            <Download size={13} />
          </button>
          <label
            className="p-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl transition-all cursor-pointer flex items-center active:scale-[0.98]"
            title="Pulihkan Riwayat dari Cadangan (Impor JSON)"
          >
            <Upload size={13} />
            <input
              type="file"
              accept=".json"
              onChange={onImportHistory}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Search History bar */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Cari SPJ di riwayat..."
          value={historySearchTerm}
          onChange={(e) => setHistorySearchTerm(e.target.value)}
          className="w-full text-xs bg-white/5 border border-white/10 rounded-2xl pl-10 pr-16 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
        />
        <div className="absolute left-3.5 top-4 text-slate-500">
          <Search size={14} />
        </div>
        {historySearchTerm && (
          <button 
            onClick={() => setHistorySearchTerm('')}
            className="absolute right-3.5 top-3 bg-white/10 px-2 py-1 hover:bg-white/25 rounded-md text-[8px] font-black text-slate-300 hover:text-white transition-all uppercase"
          >
            Bersihan
          </button>
        )}
      </div>

      {/* History Items list */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-white/5 pb-12">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white/[0.01] rounded-[2rem] border border-white/5">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <History size={28} className="text-slate-500 animate-pulse" />
            </div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              {historySearchTerm ? "Tidak Ditemukan" : "Belum Ada Riwayat"}
            </h4>
            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
              {historySearchTerm 
                ? "Tidak ada dokumen SPJ yang merasa cocok dengan pencarian Anda." 
                : "Silakan isi data SPJ di Form SPJ lalu klik tombol 'Simpan' untuk mendata riwayat di sini."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item, index) => {
              const totalNominal = calculateWorksheetTotal(item.persons);
              const isOpenedThis = activeWorksheetId === item.id;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3) }}
                  className={`group/item p-5 rounded-[2rem] border transition-all relative ${
                    isOpenedThis 
                      ? "bg-indigo-550/10 border-indigo-500/40 shadow-[0_0_30px_-15px_rgba(99,102,241,0.5)]" 
                      : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  {isOpenedThis && (
                    <span className="absolute top-4 right-4 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg shadow-indigo-500/25">
                      Sedang Diedit
                    </span>
                  )}

                  <div className="pr-20 mb-4">
                    <h3 className="font-bold text-white text-xs leading-snug line-clamp-2 uppercase tracking-wide">
                      {item.title}
                    </h3>
                    {item.header.st ? (
                      <p className="text-[9px] text-slate-500 font-mono mt-1.5 bg-white/5 py-0.5 px-2 rounded-lg inline-block">
                        ST: {item.header.st}
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-600 italic mt-1.5">
                        Belum ada nomor ST
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-white/5 bg-white/[0.005] px-2 rounded-xl mb-4">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block mb-0.5">Total SPJ</span>
                      <span className="text-xs font-black text-indigo-400 font-mono">
                        {formatCurrency(totalNominal)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block mb-0.5">Tanggal Simpan</span>
                      <span className="text-[9px] font-semibold text-slate-300">
                        {new Date(item.savedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg">
                      {item.persons.length} Pelaksana
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onLoadWorksheet(item)}
                        className="flex items-center gap-1.5 py-2 px-3 bg-indigo-500/15 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-500/20 active:scale-95"
                        title="Buka dokumen untuk diedit kembali"
                      >
                        <FolderOpen size={10} />
                        Buka
                      </button>
                      <button
                        onClick={(e) => onDuplicateWorksheet(item, e)}
                        className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-xl transition-all active:scale-95"
                        title="Gandakan dokumen ini"
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        onClick={(e) => onDeleteWorksheet(item.id, e)}
                        className="p-2 bg-red-500/5 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl transition-all active:scale-95"
                        title="Hapus dari riwayat"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
