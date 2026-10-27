import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Download, 
  Upload, 
  X, 
  Check, 
  Briefcase, 
  Building2, 
  Copy, 
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StaffMember } from '../constants';

interface StaffManagerProps {
  staffList: StaffMember[];
  onUpdateStaffList: (newList: StaffMember[]) => void;
  onResetToDefault: () => void;
  onClose?: () => void;
}

const COMMON_JABATAN_SUGGESTIONS = [
  'Inspektur',
  'Sekretaris Inspektorat Daerah',
  'Inspektur Pembantu I',
  'Inspektur Pembantu II',
  'Inspektur Pembantu III',
  'Inspektur Pembantu IV',
  'Inspektur Pembantu Khusus',
  'Kepala Subbagian Perencanaan',
  'Kepala Subbagian Administrasi Umum dan Keuangan',
  'Kepala Subbagian Analisis dan Evaluasi',
  'Auditor Ahli Utama',
  'Auditor Ahli Madya',
  'Auditor Ahli Muda',
  'Auditor Ahli Pertama',
  'Auditor Ahli Pratama',
  'Auditor Terampil',
  'PPUPD Ahli Madya',
  'PPUPD Ahli Muda',
  'PPUPD Ahli Pertama',
  'Penata Layanan Operasional',
  'Operator Layanan Operasional',
  'Pengadministrasi Umum',
  'Penelaah Teknis Kebijakan',
  'Pengolah data dan informasi',
  'Arsiparis Ahli Pertama',
  'Pramubakti'
];

export const StaffManager: React.FC<StaffManagerProps> = ({
  staffList,
  onUpdateStaffList,
  onResetToDefault,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'auditor' | 'ppupd' | 'struktural' | 'operasional'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaffMember>({
    name: '',
    nip: '',
    jabatan: '',
    unitKerja: 'Inspektorat Daerah Kabupaten Tabalong'
  });
  const [formError, setFormError] = useState('');

  // Delete confirm state
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.jabatan && s.jabatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.unitKerja && s.unitKerja.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterRole === 'all') return true;
      const j = (s.jabatan || '').toLowerCase();
      if (filterRole === 'auditor') return j.includes('auditor');
      if (filterRole === 'ppupd') return j.includes('ppupd');
      if (filterRole === 'struktural') return j.includes('inspektur') || j.includes('sekretaris') || j.includes('kepala');
      if (filterRole === 'operasional') return !j.includes('auditor') && !j.includes('ppupd') && !j.includes('inspektur') && !j.includes('sekretaris');
      return true;
    });
  }, [staffList, searchTerm, filterRole]);

  // Open add modal
  const handleOpenAdd = () => {
    setEditingStaffId(null);
    setFormData({
      id: crypto.randomUUID(),
      name: '',
      nip: '',
      jabatan: '',
      unitKerja: 'Inspektorat Daerah Kabupaten Tabalong'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaffId(staff.id || staff.nip || staff.name);
    setFormData({ ...staff });
    setFormError('');
    setIsModalOpen(true);
  };

  // Save staff (create or update)
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama lengkap pegawai tidak boleh kosong.');
      return;
    }

    if (editingStaffId) {
      // Update existing
      const updated = staffList.map(s => {
        const idToMatch = s.id || s.nip || s.name;
        if (idToMatch === editingStaffId) {
          return {
            ...formData,
            id: s.id || crypto.randomUUID()
          };
        }
        return s;
      });
      onUpdateStaffList(updated);
      showToast(`Data pegawai "${formData.name}" berhasil diperbarui.`);
    } else {
      // Add new to beginning of list
      const newItem: StaffMember = {
        ...formData,
        id: formData.id || crypto.randomUUID(),
        unitKerja: formData.unitKerja.trim() || 'Inspektorat Daerah Kabupaten Tabalong'
      };
      onUpdateStaffList([newItem, ...staffList]);
      showToast(`Pegawai baru "${formData.name}" berhasil ditambahkan.`);
    }

    setIsModalOpen(false);
  };

  // Delete staff confirmation
  const handleConfirmDelete = () => {
    if (!deletingStaff) return;
    const idToMatch = deletingStaff.id || deletingStaff.nip || deletingStaff.name;
    const updated = staffList.filter(s => (s.id || s.nip || s.name) !== idToMatch);
    onUpdateStaffList(updated);
    showToast(`Pegawai "${deletingStaff.name}" berhasil dihapus.`);
    setDeletingStaff(null);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(staffList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `database_pegawai_inspektorat_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Database pegawai berhasil diekspor ke file JSON.');
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated: StaffMember[] = parsed.map(item => ({
            id: item.id || crypto.randomUUID(),
            name: item.name || '',
            nip: item.nip || '-',
            jabatan: item.jabatan || '',
            unitKerja: item.unitKerja || 'Inspektorat Daerah Kabupaten Tabalong'
          })).filter(item => item.name.trim().length > 0);

          if (validated.length > 0) {
            onUpdateStaffList(validated);
            showToast(`${validated.length} data pegawai berhasil diimpor.`);
          } else {
            alert('File tidak memuat data pegawai yang valid.');
          }
        } else {
          alert('Format berkas tidak valid. Harap gunakan berkas JSON array pegawai.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON. Pastikan format berkas valid.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyNIP = (nip: string) => {
    navigator.clipboard.writeText(nip);
    showToast(`NIP "${nip}" disalin ke clipboard.`);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toast alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400/60 hover:text-emerald-200">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-4 md:p-5 rounded-2xl border border-indigo-500/20 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">Database Pegawai</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {staffList.length} Pegawai
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kelola data pegawai untuk pencarian cepat & pengisian otomatis dokumen SPJ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={15} />
              Tambah Pegawai
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors"
                title="Tutup Database"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-[10px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'struktural', label: 'Pimpinan/Struktural' },
              { id: 'auditor', label: 'Auditor' },
              { id: 'ppupd', label: 'PPUPD' },
              { id: 'operasional', label: 'Staf Operasional' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterRole === tab.id
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportJSON} 
              accept=".json" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors flex items-center gap-1 font-bold"
              title="Impor dari cadangan file JSON"
            >
              <Upload size={12} />
              Impor JSON
            </button>
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors flex items-center gap-1 font-bold"
              title="Unduh cadangan database ke file JSON"
            >
              <Download size={12} />
              Ekspor JSON
            </button>
            <button
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin mengembalikan seluruh daftar pegawai ke 62 data pegawai awal Inspektorat Tabalong? Perubahan kustom yang belum diekspor akan digantikan.')) {
                  onResetToDefault();
                  showToast('Database pegawai berhasil direset ke daftar bawaan.');
                }
              }}
              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/15 transition-colors flex items-center gap-1 font-bold"
              title="Reset ke daftar bawaan Inspektorat"
            >
              <RotateCcw size={12} />
              Reset Bawaan
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative shrink-0">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari berdasarkan nama pegawai, NIP, atau jabatan..."
          className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-md"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <Search size={15} />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 shrink-0">
        <span>Menampilkan <strong className="text-slate-300">{filteredStaff.length}</strong> dari {staffList.length} pegawai</span>
        {searchTerm && (
          <span className="text-indigo-400/80">Pencarian untuk: "{searchTerm}"</span>
        )}
      </div>

      {/* Staff List Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
        {filteredStaff.length === 0 ? (
          <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center">
            <AlertCircle size={32} className="text-slate-500 mb-2" />
            <p className="text-sm font-bold text-slate-300">Tidak ada pegawai ditemukan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchTerm 
                ? `Tidak ada data yang cocok dengan "${searchTerm}". Silakan periksa kembali ejaan atau tambah pegawai baru.`
                : 'Belum ada data pegawai yang tersimpan.'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              Tambah Pegawai Sekarang
            </button>
          </div>
        ) : (
          filteredStaff.map((staff, idx) => {
            const initial = staff.name ? staff.name.charAt(0).toUpperCase() : '?';
            return (
              <motion.div
                key={staff.id || `${staff.nip}-${idx}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-indigo-500/30 p-3.5 rounded-xl transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-900/70 to-slate-800 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                    {initial}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                        {staff.name}
                      </h3>
                      {staff.jabatan && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-indigo-300 border border-white/10">
                          {staff.jabatan}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-500">NIP:</span>
                        <span className="text-slate-300 bg-black/30 px-1.5 py-0.5 rounded">{staff.nip || '-'}</span>
                        {staff.nip && staff.nip !== '-' && (
                          <button
                            onClick={() => handleCopyNIP(staff.nip)}
                            className="text-slate-500 hover:text-indigo-300 transition-colors p-0.5"
                            title="Salin NIP"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>

                      {staff.unitKerja && (
                        <div className="flex items-center gap-1 text-slate-500 truncate max-w-xs">
                          <Building2 size={11} className="shrink-0" />
                          <span className="truncate">{staff.unitKerja}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                  <button
                    onClick={() => handleOpenEdit(staff)}
                    className="p-2 bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-all text-xs flex items-center gap-1.5 font-bold"
                    title="Edit Data Pegawai"
                  >
                    <Edit3 size={13} />
                    <span className="text-[10px]">Edit</span>
                  </button>
                  <button
                    onClick={() => setDeletingStaff(staff)}
                    className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 rounded-lg border border-white/5 hover:border-red-500/30 transition-all text-xs flex items-center gap-1.5 font-bold"
                    title="Hapus Pegawai"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-4 md:p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    {editingStaffId ? <Edit3 size={16} /> : <Plus size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {editingStaffId ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {editingStaffId ? 'Perbarui informasi pegawai di database' : 'Masukkan rincian pegawai baru ke database'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Nama Lengkap & Gelar <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: DIYANTO, SE, MT, FRMP"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:bg-white/10 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-500">Gunakan huruf kapital atau sesuai penulisan SK dinas.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    NIP Pegawai
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Contoh: 19890630 202521 1 045 (atau '-' jika Non-ASN)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:bg-white/10 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-500">Format 18 digit dengan spasi, atau tanda strip (-) untuk honorer.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    placeholder="Contoh: Auditor Ahli Pertama / PPUPD / Penata Layanan..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:bg-white/10 focus:border-indigo-500 focus:outline-none transition-all"
                    list="jabatan-suggestions"
                  />
                  <datalist id="jabatan-suggestions">
                    {COMMON_JABATAN_SUGGESTIONS.map((j, i) => (
                      <option key={i} value={j} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Unit Kerja
                  </label>
                  <input
                    type="text"
                    value={formData.unitKerja}
                    onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                    placeholder="Contoh: Inspektorat Daerah Kabupaten Tabalong"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:bg-white/10 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {editingStaffId ? 'Simpan Perubahan' : 'Tambah Pegawai'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-5 text-center font-sans space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Hapus Data Pegawai?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pegawai <strong className="text-white">"{deletingStaff.name}"</strong> akan dihapus dari database pencarian otomatis.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDeletingStaff(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
