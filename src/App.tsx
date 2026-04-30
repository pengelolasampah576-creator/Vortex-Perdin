/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  FileText,
  UserPlus,
  Search,
  RotateCcw,
  CheckCircle2,
  Camera,
  Edit3,
  Eye,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STAFF_DATABASE } from './constants';
import html2pdf from 'html2pdf.js';

// --- Utilities ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount).replace('Rp', 'Rp ');
};

const terbilang = (n: number | string): string => {
  const num = Number(n);
  if (isNaN(num)) return '';
  
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (num < 12) return satuan[num];
  if (num < 20) return terbilang(num - 10) + ' Belas';
  if (num < 100) return terbilang(Math.floor(num / 10)) + ' Puluh ' + terbilang(num % 10);
  if (num < 200) return 'Seratus ' + terbilang(num - 100);
  if (num < 1000) return terbilang(Math.floor(num / 100)) + ' Ratus ' + terbilang(num % 100);
  if (num < 2000) return 'Seribu ' + terbilang(num - 1000);
  if (num < 1000000) return terbilang(Math.floor(num / 1000)) + ' Ribu ' + terbilang(num % 1000);
  if (num < 1000000000) return terbilang(Math.floor(num / 1000000)) + ' Juta ' + terbilang(num % 1000000);
  return 'Angka terlalu besar';
};

// --- Types ---

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
  dasarPoints?: string[];
  hasilDescriptive?: string;
  hasilPoints?: string[];
  inspectorName?: string;
  inspectorNip?: string;
  inspectorJabatan?: string;
  inspectorUnit?: string;
  photos?: string[];
  tahunAnggaran: string;
  kegiatan: string;
  subKegiatan: string;
  kodeRekening: string;
  bkUmum: string;
  bkTanggal: string;
  penerimaDuit: string;
  pptkName: string;
  pptkNip: string;
  paName: string;
  paNip: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [viewMode, setViewMode] = useState<'sampul' | 'kwitansi' | 'riil' | 'pernyataan' | 'laporan' | 'foto' | 'kwitansi_asli'>('sampul');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePersonIdForSearch, setActivePersonIdForSearch] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sidebarWidth, setSidebarWidth] = useState<'standard' | 'wide'>('standard');

  const STORAGE_KEY = 'vortex_perdin_v1';

  const defaultHeader: DocHeader = {
    st: 'B-302/INSP/800.1.2/X/2025',
    stDate: '14 Oktober 2025',
    spdNumber: '36/INSP/000.1.2.3/I/2025',
    spdDate: '30 Januari 2025',
    tujuan: 'Mengikuti Kegiatan Diklat FGD Probity Audit di Grand QIN Hotel Banjarbaru',
    tujuanStartDate: '15',
    tujuanEndDate: '18 Oktober 2025',
    bendaharaName: 'Sumiati. SE',
    bendaharaNip: '19801130 200701 2 006',
    place: 'Banjarbaru',
    signingPlace: 'Tanjung',
    printDate: '20 Oktober 2025',
    listMakerName: 'Wahyu Gunawan, S.Pd.',
    listMakerNip: '19890630 202521 1 045',
    dasarPoints: [
      'Lembar Disposisi dan Nota Dinas dari Bupati Tabalong : B-46/INSP/000.1.2.3/I/2026 Tgl: 29 Januari 2026',
      'Surat Tugas dari Bupati Kabupaten Tabalong : B-36/INSP/INSP/000.1.2.3/I/2026 Tgl : 30 Januari 2026',
      'Surat Tugas dari Inspektur di Inspektorat Daerah Kabupaten Tabalong : B-38/INSP/INSP/000.1.2.3/I/2026 Tgl : 30 Januari 2026',
      'SPD dari Insperktur Inspektorat Daerah Kabupaten Tabalong : 36/INSP/000.1.2.3/I/2026 Tgl : 30 Januari 2026',
      'SPD dari Insperktur Inspektorat Daerah Kabupaten Tabalong : 35/INSP/000.1.2.3/I/2026 Tgl : 30 Januari 2026'
    ],
    hasilDescriptive: 'Telah melakukan perjalanan dinas dengan hasil sebagai berikut :',
    hasilPoints: [
      'Input Dokumen Perencanaan: Mengunggah dokumen Rencana Strategis (Renstra), Rencana Kerja (Renja), dan Perjanjian Kinerja (PK) tahun berjalan.',
      'Pengunggahan Bukti Dukung (Evidence): Setiap capaian yang diinput wajib disertai dokumen pendukung (seperti laporan kegiatan, foto, atau daftar hadir) sebagai basis validasi.',
      'Tim Reviu dari Inspektorat akan memeriksa keabsahan data dan bukti dukung yang diunggah. Dalam e-SAKIP Pro, terdapat modul khusus reviu yang memungkinkan auditor memberikan catatan atau perbaikan secara langsung di aplikasi.'
    ],
    inspectorName: 'DIYANTO, SE, MT, FRMP',
    inspectorNip: '19711013 200501 1 005',
    inspectorJabatan: 'INSPEKTUR',
    inspectorUnit: 'Pembina Tk.I',
    photos: [],
    tahunAnggaran: '2026',
    kegiatan: 'Administrasi Umum Perangkat Daerah',
    subKegiatan: 'Penyelenggaraan Rapat Koordinasi dan Konsultasi SKPD',
    kodeRekening: '5.1.02.04.01.0001',
    bkUmum: '',
    bkTanggal: '',
    penerimaDuit: 'Bendahara Pengeluaran Inspektorat Daerah Kabupaten Tabalong',
    pptkName: 'SYAHRIADI, S.Sos, M.Si',
    pptkNip: '19781202 200501 1 008',
    paName: 'DIYANTO, SE, MT, FRMP',
    paNip: '19711013 200501 1 005',
  };

  const defaultPersons: Person[] = [
    {
      id: '1',
      name: 'Wahyu Gunawan, S.Pd.',
      nip: '19890630 202521 1 045',
      jabatan: 'Auditor Ahli Pertama',
      unitKerja: 'Inspektorat Kabupaten Tabalong',
      ket: 'H-1 & H+1 Hari H',
      riilDescription: 'Biaya penginapan pegawai dibawah ini yang tidak dapat diperoleh bukti-bukti pengeluaran meliputi :',
      spdNumber: '36/INSP/000.1.2.3/I/2026',
      spdDate: '30 Januari 2026',
      riilPercentage: 30,
      expenses: [
        { id: '1', description: 'Uang Harian', quantity: 2, unit: 'Hari', rate: 380000, isRiil: false, riilPercentage: 30 },
        { id: '2', description: 'Uang Harian', quantity: 2, unit: 'Hari', rate: 110000, isRiil: false, riilPercentage: 30 },
        { id: '3', description: 'Biaya Penginapan', quantity: 3, unit: 'Malam', rate: 250000, isRiil: true, riilPercentage: 30 },
        { id: '4', description: 'Biaya Transportasi', quantity: 1, unit: 'Layanan', rate: 180000, isRiil: false, riilPercentage: 30 },
      ]
    }
  ];

  const [header, setHeader] = useState<DocHeader>(defaultHeader);
  const [persons, setPersons] = useState<Person[]>(defaultPersons);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { header: savedHeader, persons: savedPersons } = JSON.parse(savedData);
        if (savedHeader) {
          setHeader(prev => ({
            ...prev,
            ...savedHeader
          }));
        }
        if (savedPersons) {
          // Merge saved persons with default properties to handle schema updates
          const migratedPersons = savedPersons.map((p: any) => ({
            ...p,
            jabatan: p.jabatan ?? '',
            unitKerja: p.unitKerja ?? 'Inspektorat Daerah Kabupaten Tabalong',
            riilDescription: p.riilDescription ?? 'Biaya penginapan pegawai dibawah ini yang tidak dapat diperoleh bukti-bukti pengeluaran meliputi :',
            spdNumber: p.spdNumber ?? header.spdNumber,
            spdDate: p.spdDate ?? header.spdDate,
            riilPercentage: p.riilPercentage ?? 30,
            expenses: p.expenses.map((e: any) => ({
              ...e,
              isRiil: e.isRiil ?? false,
              riilPercentage: e.riilPercentage ?? p.riilPercentage ?? 30
            }))
          }));
          setPersons(migratedPersons);
        }
      } catch (e) {
        console.error('Failed to load saved data', e);
      }
    }
  }, []);

  const handleManualSave = async () => {
    setSaveStatus('saving');
    const dataToSave = { 
      header, 
      persons,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    
    // Auto-download as JSON for backup/internal storage (phone/laptop)
    try {
      const baseFileName = `SmartLapor_${header.st?.replace(/[\/\\?%*:|"<>]/g, '-') || 'Data'}`;
      const jsonFileName = `${baseFileName}_${new Date().getTime()}.json`;
      const jsonBlob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = jsonFileName;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);
    } catch (err) {
      console.error('Failed to auto-download JSON:', err);
    }

    // Auto-download as PDF for the current active report
    try {
      const element = document.getElementById('report-content-to-export');
      if (element) {
        // Clone element to manipulate without affecting UI
        const opt = {
          margin:       10, 
          filename:     `Laporan_Perdin_${header.st?.replace(/[\/\\?%*:|"<>]/g, '-') || 'Dokumen'}_${viewMode}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: true,
            letterRendering: true,
            windowWidth: 1200,
            onclone: (clonedDoc: Document) => {
              const exportNode = clonedDoc.getElementById('report-content-to-export');
              if (exportNode) {
                exportNode.style.background = 'white';
                exportNode.style.color = 'black';
              }
            }
          },
          jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        
        await html2pdf().set(opt).from(element).save();
      }
    } catch (err) {
      console.error('Failed to auto-generate PDF:', err);
    }

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data dan kembali ke format awal?')) {
      setHeader(defaultHeader);
      setPersons(defaultPersons);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return [];
    return STAFF_DATABASE.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);
  }, [searchTerm]);

  const addPerson = () => {
    const newPerson: Person = {
      id: crypto.randomUUID(),
      name: '',
      nip: '',
      jabatan: '',
      unitKerja: 'Inspektorat Daerah Kabupaten Tabalong',
      ket: '',
      riilDescription: 'Biaya penginapan pegawai dibawah ini yang tidak dapat diperoleh bukti-bukti pengeluaran meliputi :',
      spdNumber: header.spdNumber || '',
      spdDate: header.spdDate || '',
      riilPercentage: 30,
      expenses: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: '', rate: 0, isRiil: false, riilPercentage: 30 }]
    };
    setPersons([...persons, newPerson]);
  };

  const removePerson = (id: string) => {
    setPersons(persons.filter(p => p.id !== id));
  };

  const updatePerson = (id: string, field: keyof Person, value: any) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addExpense = (personId: string) => {
    setPersons(persons.map(p => {
      if (p.id === personId) {
        return {
          ...p,
          expenses: [...p.expenses, { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', rate: 0, isRiil: false, riilPercentage: p.riilPercentage || 30 }]
        };
      }
      return p;
    }));
  };

  const removeExpense = (personId: string, expenseId: string) => {
    setPersons(persons.map(p => {
      if (p.id === personId) {
        return {
          ...p,
          expenses: p.expenses.filter(e => e.id !== expenseId)
        };
      }
      return p;
    }));
  };

  const updateExpense = (personId: string, expenseId: string, field: keyof ExpenseItem, value: any) => {
    setPersons(prev => prev.map(p => {
      if (p.id === personId) {
        return {
          ...p,
          expenses: p.expenses.map(e => e.id === expenseId ? { ...e, [field]: value } : e)
        };
      }
      return p;
    }));
  };

  const selectStaffForPerson = (personId: string, staff: any) => {
    setPersons(prev => prev.map(p => p.id === personId ? { 
      ...p, 
      name: staff.name, 
      nip: staff.nip,
      jabatan: staff.jabatan || p.jabatan,
      unitKerja: staff.unitKerja || p.unitKerja
    } : p));
    setSearchTerm('');
    setActivePersonIdForSearch(null);
  };

  const selectStaffForBendahara = (staff: { name: string, nip: string }) => {
    setHeader(prev => ({ ...prev, bendaharaName: staff.name, bendaharaNip: staff.nip }));
    setSearchTerm(staff.name);
    setActivePersonIdForSearch(null);
  };

  const selectStaffForListMaker = (staff: { name: string, nip: string }) => {
    setHeader(prev => ({ ...prev, listMakerName: staff.name, listMakerNip: staff.nip }));
    setSearchTerm(staff.name);
    setActivePersonIdForSearch(null);
  };

  const grandTotal = useMemo(() => {
    return persons.reduce((sum, p) => {
      return sum + p.expenses.reduce((pSum, e) => {
        const multiplier = e.isRiil ? ((e.riilPercentage === 0 ? 100 : (e.riilPercentage ?? 30)) / 100) : 1;
        return pSum + (e.quantity * e.rate * multiplier);
      }, 0);
    }, 0);
  }, [persons]);

  const handlePrint = () => {
    setActiveTab('preview');
    setTimeout(() => {
      window.print();
    }, 500);
  };
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-hidden flex flex-col md:flex-row">
      {/* Background Mesh Gradients */}
      <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] -right-[5%] w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-[10%] left-[20%] w-[600px] h-[300px] bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Sidebar - Control Panel */}
      <div className={`relative z-10 w-full ${sidebarWidth === 'wide' ? 'md:w-[900px]' : 'md:w-[520px]'} bg-[#0f172a]/95 backdrop-blur-2xl border-r border-white/10 overflow-y-auto h-screen p-6 md:p-8 sticky top-0 no-print flex flex-col shadow-2xl transition-all duration-500`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">SmartLapor Pro</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Management System</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarWidth(sidebarWidth === 'wide' ? 'standard' : 'wide')}
            className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            {sidebarWidth === 'wide' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {sidebarWidth === 'wide' ? 'Samping' : 'Layar Penuh'}
          </button>
        </div>

        <div className={`space-y-6 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-white/5 pr-4 -mr-2 ${sidebarWidth === 'wide' ? 'max-w-4xl mx-auto w-full' : ''}`}>
          <div className="space-y-6 pb-8">
            <section>
              <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-3">Header Dokumen</h2>
              <div className="space-y-4 bg-white/[0.01] p-5 rounded-2xl border border-white/5">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Nomor ST</label>
                  <input 
                    type="text" 
                    value={header.st ?? ''}
                    onChange={(e) => setHeader({...header, st: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-2xl focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-600 transition-all group-hover:bg-white/10 p-4" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tanggal ST</label>
                    <input 
                      type="text" 
                      value={header.stDate ?? ''}
                      onChange={(e) => setHeader({...header, stDate: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4" 
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tempat Acara</label>
                    <input 
                      type="text" 
                      value={header.place ?? ''}
                      onChange={(e) => setHeader({...header, place: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Nomor SPD</label>
                    <input 
                      type="text" 
                      value={header.spdNumber ?? ''}
                      onChange={(e) => setHeader({...header, spdNumber: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4" 
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tanggal SPD</label>
                    <input 
                      type="text" 
                      value={header.spdDate ?? ''}
                      onChange={(e) => setHeader({...header, spdDate: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4" 
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tujuan Kegiatan</label>
                  <textarea 
                    value={header.tujuan ?? ''}
                    onChange={(e) => setHeader({...header, tujuan: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-2xl h-56 text-white group-hover:bg-white/10 p-4 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tgl Mulai Kegiatan</label>
                    <input 
                      type="text" 
                      value={header.tujuanStartDate ?? ''}
                      onChange={(e) => setHeader({...header, tujuanStartDate: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4" 
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tgl Selesai Kegiatan</label>
                    <input 
                      type="text" 
                      value={header.tujuanEndDate ?? ''}
                      onChange={(e) => setHeader({...header, tujuanEndDate: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tempat Tanda Tangan</label>
                    <input 
                      type="text" 
                      value={header.signingPlace ?? ''}
                      onChange={(e) => setHeader({...header, signingPlace: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4 font-bold text-indigo-300" 
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">Tanggal Cetak</label>
                    <input 
                      type="text" 
                      value={header.printDate ?? ''}
                      onChange={(e) => setHeader({...header, printDate: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 p-4 font-bold text-indigo-300" 
                    />
                  </div>
                </div>

                <div className="group relative">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Pembuat Daftar</label>
                  <input 
                    type="text" 
                    placeholder="Cari Pembuat Daftar..."
                    value={header.listMakerName ?? ''}
                    onChange={(e) => {
                      setHeader({...header, listMakerName: e.target.value});
                      setSearchTerm(e.target.value);
                      setActivePersonIdForSearch('listMaker');
                    }}
                    onFocus={() => {
                      setSearchTerm(header.listMakerName ?? '');
                      setActivePersonIdForSearch('listMaker');
                    }}
                    onBlur={() => {
                      setTimeout(() => setActivePersonIdForSearch(null), 200);
                    }}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 focus:ring-indigo-500 focus:border-indigo-500 transition-all p-2 pr-8 font-bold" 
                  />
                  <div className="absolute right-2 top-8 text-white/20">
                    <Search size={14} />
                  </div>
                  {activePersonIdForSearch === 'listMaker' && filteredStaff.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl mt-2 overflow-hidden backdrop-blur-xl font-sans">
                      <div className="p-2 border-b border-white/5 bg-white/5">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-2">Hasil Pencarian Pembuat Daftar</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {filteredStaff.map((staff, sIdx) => (
                          <button
                            key={`${staff.nip}-${sIdx}`}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 group/item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectStaffForListMaker(staff);
                            }}
                          >
                            <div className="font-bold text-white text-xs group-hover/item:text-indigo-300 transition-colors uppercase">{staff.name}</div>
                            <div className="text-slate-500 font-mono text-[9px] mt-0.5">{staff.nip}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">NIP Pembuat Daftar</label>
                  <input 
                    type="text" 
                    value={header.listMakerNip ?? ''}
                    onChange={(e) => setHeader({...header, listMakerNip: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 focus:ring-indigo-500 focus:border-indigo-500 transition-all p-2 font-mono" 
                  />
                </div>
              </div>
            </section>

          <section>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">Data Kwitansi Formal</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tahun Anggaran</label>
                  <input type="text" value={header.tahunAnggaran} onChange={(e) => setHeader({...header, tahunAnggaran: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3 font-bold" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Kode Rekening</label>
                  <input type="text" value={header.kodeRekening} onChange={(e) => setHeader({...header, kodeRekening: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" />
                </div>
              </div>
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Kegiatan</label>
                <textarea value={header.kegiatan} onChange={(e) => setHeader({...header, kegiatan: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-4 h-32 resize-y" />
              </div>
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Sub Kegiatan</label>
                <textarea value={header.subKegiatan} onChange={(e) => setHeader({...header, subKegiatan: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-4 h-32 resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">BK Umum</label>
                  <input type="text" value={header.bkUmum} onChange={(e) => setHeader({...header, bkUmum: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tanggal BK</label>
                  <input type="text" value={header.bkTanggal} onChange={(e) => setHeader({...header, bkTanggal: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" />
                </div>
              </div>
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Sudah Terima Dari</label>
                <textarea value={header.penerimaDuit} onChange={(e) => setHeader({...header, penerimaDuit: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-4 h-16" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">PPTK (Nama)</label>
                  <input type="text" value={header.pptkName} onChange={(e) => setHeader({...header, pptkName: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">PPTK (NIP)</label>
                  <input type="text" value={header.pptkNip} onChange={(e) => setHeader({...header, pptkNip: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">PA (Nama)</label>
                  <input type="text" value={header.paName} onChange={(e) => setHeader({...header, paName: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">PA (NIP)</label>
                  <input type="text" value={header.paNip} onChange={(e) => setHeader({...header, paNip: e.target.value})} className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3 font-mono" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">Pejabat & Bendahara</h2>
            <div className="space-y-4">
              <div className="group relative">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Bendahara</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={header.bendaharaName ?? ''}
                    onChange={(e) => {
                      setHeader({...header, bendaharaName: e.target.value});
                      setSearchTerm(e.target.value);
                      setActivePersonIdForSearch('bendahara');
                    }}
                    onFocus={() => {
                      setSearchTerm(header.bendaharaName ?? '');
                      setActivePersonIdForSearch('bendahara');
                    }}
                    onBlur={() => {
                      setTimeout(() => setActivePersonIdForSearch(null), 200);
                    }}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 focus:ring-indigo-500 focus:border-indigo-500 transition-all p-4 pr-12" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                    <Search size={16} />
                  </div>
                </div>

                {activePersonIdForSearch === 'bendahara' && filteredStaff.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl mt-2 overflow-hidden backdrop-blur-xl">
                    <div className="p-3 border-b border-white/5 bg-white/5">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-2">Hasil Pencarian Staff</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                      {filteredStaff.map((staff, sIdx) => (
                        <button
                          key={`${staff.nip}-${sIdx}`}
                          type="button"
                          className="w-full text-left px-4 py-4 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 group/item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectStaffForBendahara(staff);
                          }}
                        >
                          <div className="font-bold text-white text-xs group-hover/item:text-indigo-300 transition-colors uppercase">{staff.name}</div>
                          <div className="text-slate-500 font-mono text-[9px] mt-0.5">{staff.nip}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-2 block uppercase">NIP Bendahara</label>
                <input 
                  type="text" 
                  value={header.bendaharaNip ?? ''}
                  onChange={(e) => setHeader({...header, bendaharaNip: e.target.value})}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white group-hover:bg-white/10 focus:ring-indigo-500 focus:border-indigo-500 transition-all p-4 font-mono" 
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-3">Data Laporan</h2>
            <div className="space-y-6">
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Dasar (Poin-poin)</label>
                <div className="space-y-3">
                  {(header.dasarPoints || []).map((point, idx) => (
                    <div key={idx} className="flex gap-3">
                      <textarea
                        value={point}
                        onChange={(e) => {
                          const newDasar = [...(header.dasarPoints || [])];
                          newDasar[idx] = e.target.value;
                          setHeader({ ...header, dasarPoints: newDasar });
                        }}
                        className="flex-1 text-sm bg-white/5 border-white/10 rounded-2xl p-3 text-white h-24 resize-y"
                      />
                      <button 
                        onClick={() => {
                          const newDasar = (header.dasarPoints || []).filter((_, i) => i !== idx);
                          setHeader({ ...header, dasarPoints: newDasar });
                        }}
                        className="text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all h-fit self-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setHeader({ ...header, dasarPoints: [...(header.dasarPoints || []), ''] })}
                    className="w-full text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 py-2.5 rounded-xl uppercase font-bold hover:bg-emerald-500/20 transition-all"
                  >
                    + Tambah Dasar
                  </button>
                </div>
              </div>

              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Hasil (Deskripsi)</label>
                <textarea 
                  value={header.hasilDescriptive ?? ''}
                  onChange={(e) => setHeader({...header, hasilDescriptive: e.target.value})}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-2xl h-48 text-white p-3 resize-y"
                />
              </div>

              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Hasil (Poin-poin)</label>
                <div className="space-y-3">
                  {(header.hasilPoints || []).map((point, idx) => (
                    <div key={idx} className="flex gap-3">
                      <textarea
                        value={point}
                        onChange={(e) => {
                          const newHasil = [...(header.hasilPoints || [])];
                          newHasil[idx] = e.target.value;
                          setHeader({ ...header, hasilPoints: newHasil });
                        }}
                        className="flex-1 text-sm bg-white/5 border-white/10 rounded-2xl p-3 text-white h-24 resize-y"
                      />
                      <button 
                        onClick={() => {
                          const newHasil = (header.hasilPoints || []).filter((_, i) => i !== idx);
                          setHeader({ ...header, hasilPoints: newHasil });
                        }}
                        className="text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all h-fit self-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setHeader({ ...header, hasilPoints: [...(header.hasilPoints || []), ''] })}
                    className="w-full text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 py-2.5 rounded-xl uppercase font-bold hover:bg-emerald-500/20 transition-all"
                  >
                    + Tambah Poin Hasil
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Inspektur (Nama)</label>
                  <input 
                    type="text" 
                    value={header.inspectorName ?? ''}
                    onChange={(e) => setHeader({...header, inspectorName: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" 
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Inspektur (NIP)</label>
                  <input 
                    type="text" 
                    value={header.inspectorNip ?? ''}
                    onChange={(e) => setHeader({...header, inspectorNip: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3 font-mono" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Jabatan</label>
                    <input 
                      type="text" 
                      value={header.inspectorJabatan ?? ''}
                      onChange={(e) => setHeader({...header, inspectorJabatan: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" 
                    />
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Pangkat/Gol</label>
                    <input 
                      type="text" 
                      value={header.inspectorUnit ?? ''}
                      onChange={(e) => setHeader({...header, inspectorUnit: e.target.value})}
                      className="w-full text-sm bg-white/5 border-white/10 rounded-2xl text-white p-3" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-3">Dokumentasi</h2>
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-indigo-500/50 transition-colors cursor-pointer group bg-white/5"
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                <Camera className="mx-auto text-slate-500 group-hover:text-indigo-400 mb-2" size={24} />
                <p className="text-xs font-bold text-slate-400 group-hover:text-white">Klik untuk Unggah Foto</p>
                <p className="text-[9px] text-slate-600 mt-1">Maksimal 10 foto terbaik</p>
                <input 
                  id="photo-upload"
                  type="file" 
                  multiple 
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []) as File[];
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result as string;
                        setHeader(h => ({ ...h, photos: [...(h.photos || []), base64] }));
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                {(header.photos || []).map((photo, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-video bg-white/5 border border-white/10">
                    <img src={photo} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setHeader(h => ({ ...h, photos: (h.photos || []).filter((_, i) => i !== idx) }))}
                        className="bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Personel</h2>
              <button 
                onClick={addPerson}
                className="text-[9px] flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl font-bold uppercase transition-all"
              >
                <Plus size={12} /> Personel
              </button>
            </div>
            
            <div className="space-y-4">
              {persons.map((p, pIdx) => (
                <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl relative group/card transition-all hover:bg-white/[0.07] hover:border-white/20">
                  <button 
                    onClick={() => removePerson(p.id)}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover/card:opacity-100 transition-all shadow-lg backdrop-blur-md"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  <div className="space-y-4">
                    <div className="relative group/field">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Cari di Database Staff</label>
                      <div className="relative">
                        <input 
                          placeholder="Ketik Nama Pegawai..." 
                          value={p.name ?? ''}
                          onChange={(e) => {
                            updatePerson(p.id, 'name', e.target.value);
                            setSearchTerm(e.target.value);
                            setActivePersonIdForSearch(p.id);
                          }}
                          onFocus={() => {
                            setSearchTerm(p.name ?? '');
                            setActivePersonIdForSearch(p.id);
                          }}
                          onBlur={() => {
                            setTimeout(() => setActivePersonIdForSearch(null), 200);
                          }}
                          className="w-full text-sm font-bold bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-700 focus:bg-white/10 focus:border-indigo-500 transition-all pr-12" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                          <Search size={16} />
                        </div>
                      </div>
                      
                      {activePersonIdForSearch === p.id && filteredStaff.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl mt-2 overflow-hidden backdrop-blur-xl">
                          <div className="p-3 border-b border-white/5 bg-white/5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-2">Hasil Pencarian Staff</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto no-scrollbar">
                            {filteredStaff.map((staff, sIdx) => (
                              <button
                                key={`${staff.nip}-${sIdx}`}
                                type="button"
                                className="w-full text-left px-4 py-4 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 group/item"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectStaffForPerson(p.id, staff);
                                }}
                              >
                                <div className="font-bold text-white text-xs group-hover/item:text-indigo-300 transition-colors uppercase">{staff.name}</div>
                                <div className="text-slate-500 font-mono text-[9px] mt-0.5">{staff.nip}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">NIP</label>
                        <input 
                          placeholder="NIP" 
                          value={p.nip ?? ''}
                          onChange={(e) => updatePerson(p.id, 'nip', e.target.value)}
                          className="w-full text-sm text-slate-300 bg-white/5 border border-white/10 rounded-xl p-4 font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Jabatan</label>
                        <input 
                          placeholder="Jabatan" 
                          value={p.jabatan ?? ''}
                          onChange={(e) => updatePerson(p.id, 'jabatan', e.target.value)}
                          className="w-full text-sm bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Unit Kerja</label>
                      <input 
                        placeholder="Unit Kerja" 
                        value={p.unitKerja ?? ''}
                        onChange={(e) => updatePerson(p.id, 'unitKerja', e.target.value)}
                        className="w-full text-sm bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Nomor SPD</label>
                        <input 
                          placeholder="Nomor SPD" 
                          value={p.spdNumber ?? ''}
                          onChange={(e) => updatePerson(p.id, 'spdNumber', e.target.value)}
                          className="w-full text-sm bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Tanggal SPD</label>
                        <input 
                          placeholder="Tanggal SPD" 
                          value={p.spdDate ?? ''}
                          onChange={(e) => updatePerson(p.id, 'spdDate', e.target.value)}
                          className="w-full text-sm bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Default % Riil (Item Baru)</label>
                        <input 
                          type="number"
                          placeholder="30" 
                          value={p.riilPercentage ?? 30}
                          onChange={(e) => updatePerson(p.id, 'riilPercentage', parseInt(e.target.value) || 0)}
                          className="w-full text-sm bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Uraian Riil (Kalimat Penjelas)</label>
                      <textarea 
                        placeholder="Kalimat penjelas Pengeluaran Riil..." 
                        value={p.riilDescription ?? ''}
                        onChange={(e) => updatePerson(p.id, 'riilDescription', e.target.value)}
                        className="w-full text-sm bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 h-40 resize-y focus:border-indigo-500 outline-none"
                      />
                    </div>

                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const newExpenses = [
                                { id: crypto.randomUUID(), description: 'Uang Harian', quantity: 4, unit: 'Hari', rate: 430000, isRiil: false, riilPercentage: 30 },
                                { id: crypto.randomUUID(), description: 'Uang Penginapan', quantity: 3, unit: 'Malam', rate: 650000, isRiil: true, riilPercentage: 30 },
                                { id: crypto.randomUUID(), description: 'Transport Bandara (PP)', quantity: 1, unit: 'Layanan', rate: 300000, isRiil: false, riilPercentage: 30 }
                              ];
                              updatePerson(p.id, 'expenses', newExpenses);
                            }}
                            className="flex-1 text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 py-2 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                          >
                            <FileText size={12} /> Template Hotel
                          </button>
                          <button 
                            onClick={() => {
                              const newExpenses = [
                                { id: crypto.randomUUID(), description: 'Uang Harian', quantity: 1, unit: 'Hari', rate: 150000, isRiil: false, riilPercentage: 30 },
                                { id: crypto.randomUUID(), description: 'Transport Lokal', quantity: 1, unit: 'Layanan', rate: 100000, isRiil: true, riilPercentage: 30 }
                              ];
                              updatePerson(p.id, 'expenses', newExpenses);
                            }}
                            className="flex-1 text-[9px] bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/20 py-2 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                          >
                            <FileText size={12} /> Template Lokal
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest w-full mb-1">Quick Add (Riil):</span>
                          <button 
                            onClick={() => {
                              const item = { id: crypto.randomUUID(), description: 'Sewa Hotel', quantity: 1, unit: 'Malam', rate: 0, isRiil: true, riilPercentage: p.riilPercentage || 30 };
                              updatePerson(p.id, 'expenses', [...p.expenses, item]);
                            }}
                            className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 px-2 py-1 rounded-lg font-bold uppercase"
                          >
                            + Hotel
                          </button>
                          <button 
                            onClick={() => {
                              const item = { id: crypto.randomUUID(), description: 'Transportasi Riil', quantity: 1, unit: 'Layanan', rate: 0, isRiil: true, riilPercentage: p.riilPercentage || 30 };
                              updatePerson(p.id, 'expenses', [...p.expenses, item]);
                            }}
                            className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 px-2 py-1 rounded-lg font-bold uppercase"
                          >
                            + Transport
                          </button>
                          <button 
                            onClick={() => {
                              const item = { id: crypto.randomUUID(), description: 'Lain-lain (Riil)', quantity: 1, unit: 'Item', rate: 0, isRiil: true, riilPercentage: p.riilPercentage || 30 };
                              updatePerson(p.id, 'expenses', [...p.expenses, item]);
                            }}
                            className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 px-2 py-1 rounded-lg font-bold uppercase"
                          >
                            + Lainnya
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Biaya</span>
                        <button 
                          onClick={() => addExpense(p.id)}
                          className="text-[9px] text-fuchsia-400 font-black uppercase hover:text-fuchsia-300 transition-colors"
                        >+ Item</button>
                      </div>
                      
                      {p.expenses.map((e, eIdx) => (
                        <div key={e.id} className="flex gap-2 items-start bg-white/5 p-2 rounded-xl border border-white/5">
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] uppercase text-slate-500 font-bold ml-1">Keterangan</label>
                            <input 
                              placeholder="Contoh: Uang Harian" 
                              value={e.description ?? ''}
                              onChange={(val) => updateExpense(p.id, e.id, 'description', val.target.value)}
                              className="w-full text-xs font-bold bg-white/5 border-white/5 rounded-lg p-2 text-white placeholder-slate-600 focus:bg-white/10 transition-all"
                            />
                          </div>
                          <div className="w-16 space-y-1">
                            <label className="text-[8px] uppercase text-slate-500 font-bold ml-1">Qty</label>
                            <input 
                              type="number"
                              value={e.quantity ?? 0}
                              onChange={(val) => updateExpense(p.id, e.id, 'quantity', parseInt(val.target.value) || 0)}
                              className="w-full text-xs bg-white/5 border-white/5 rounded-lg p-2 text-white font-bold"
                            />
                          </div>
                          <div className="w-16 space-y-1">
                            <label className="text-[8px] uppercase text-slate-500 font-bold ml-1">Satuan</label>
                            <input 
                              placeholder="Hari"
                              value={e.unit ?? ''}
                              onChange={(val) => updateExpense(p.id, e.id, 'unit', val.target.value)}
                              className="w-full text-xs bg-white/5 border-white/5 rounded-lg p-2 text-white"
                            />
                          </div>
                          <div className="w-32 space-y-1">
                            <label className="text-[8px] uppercase text-slate-500 font-bold ml-1">Harga Satuan</label>
                            <input 
                              type="number"
                              value={e.rate ?? 0}
                              onChange={(val) => updateExpense(p.id, e.id, 'rate', parseInt(val.target.value) || 0)}
                              className="w-full text-xs bg-white/5 border-white/5 rounded-lg p-2 text-right text-indigo-300 font-mono font-bold"
                            />
                          </div>
                          {e.isRiil && (
                            <div className="w-16 space-y-1">
                              <label className="text-[8px] uppercase text-slate-500 font-bold ml-1">% Riil</label>
                              <input 
                                type="number"
                                value={e.riilPercentage ?? 30}
                                onChange={(val) => updateExpense(p.id, e.id, 'riilPercentage', parseInt(val.target.value) || 0)}
                                className="w-full text-xs bg-indigo-500/10 border-indigo-500/20 rounded-lg p-2 text-center text-indigo-300 font-bold"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-1 pt-5">
                            <button 
                              onClick={() => updateExpense(p.id, e.id, 'isRiil', !e.isRiil)}
                              className={`p-2 rounded-lg border transition-all ${e.isRiil ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}
                              title={e.isRiil ? "Item Riil" : "Bukan Item Riil"}
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              onClick={() => removeExpense(p.id, e.id)}
                              className="text-red-400 hover:text-red-300 p-2 transition-colors bg-red-500/5 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-bold text-white">
                        <span className="uppercase text-[9px] text-slate-500 tracking-wider">Total Nominal</span>
                        <span className="text-indigo-400 font-mono">
                          {formatCurrency(p.expenses.reduce((sum, e) => sum + (e.quantity * e.rate), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 mt-auto space-y-3">
          <div className="bg-white/5 p-1 rounded-xl border border-white/5 mb-2">
            <div className="grid grid-cols-2 gap-1 text-[8px] uppercase font-bold text-center">
              <button 
                onClick={() => setViewMode('sampul')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'sampul' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'} col-span-2`}
              >
                Sampul Laporan
              </button>
              <button 
                onClick={() => setViewMode('kwitansi')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'kwitansi' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Rincian Biaya
              </button>
              <button 
                onClick={() => setViewMode('riil')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'riil' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Pengeluaran Riil
              </button>
              <button 
                onClick={() => setViewMode('pernyataan')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'pernyataan' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Pernyataan
              </button>
              <button 
                onClick={() => setViewMode('laporan')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'laporan' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Laporan
              </button>
              <button 
                onClick={() => setViewMode('foto')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'foto' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Foto
              </button>
              <button 
                onClick={() => setViewMode('kwitansi_asli')}
                className={`py-2 rounded-lg transition-all ${viewMode === 'kwitansi_asli' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Kwitansi
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleReset}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold py-3 rounded-2xl transition-all border border-white/10 uppercase text-[10px] tracking-widest"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            <button 
              onClick={handleManualSave}
              disabled={saveStatus !== 'idle'}
              className={`flex items-center justify-center gap-2 font-bold py-3 rounded-2xl transition-all border uppercase text-[10px] tracking-widest ${
                saveStatus === 'saved' 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
            >
              {saveStatus === 'saving' ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saveStatus === 'saved' ? (
                <CheckCircle2 size={12} />
              ) : (
                <Save size={12} />
              )}
              {saveStatus === 'saved' ? 'Tersimpan' : 'Simpan'}
            </button>
          </div>
          
          <button 
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] uppercase text-xs tracking-widest"
          >
            <Printer size={16} />
            Cetak Dokumen
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div id="report-content-to-export" className={`relative z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 md:p-12 flex flex-col items-center print:p-0 print:bg-white pb-20 ${sidebarWidth === 'wide' ? 'hidden md:flex md:opacity-0 md:pointer-events-none md:absolute md:-z-10' : 'flex'}`}>
        
        {viewMode === 'sampul' && (
          /* SAMPUL LAPORAN PREVIEW */
          <div className="w-full flex flex-col items-center">
            <div className="bg-white shadow-2xl p-16 md:p-24 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-20 text-black rounded-3xl md:rounded-[40px] print:rounded-none flex flex-col items-center border-[12px] border-double border-slate-100 print:border-none relative">
              
              {/* Decorative Corner Elements */}
              <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-slate-200 print:hidden"></div>
              <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-slate-200 print:hidden"></div>
              <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-slate-200 print:hidden"></div>
              <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-slate-200 print:hidden"></div>

              <div className="text-center space-y-6 flex-1 flex flex-col items-center justify-center w-full">
                <div className="space-y-4 mb-12">
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 leading-tight">
                    {header.tujuan}
                  </h1>
                  <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
                    Laporan Perjalanan Dinas
                  </h2>
                </div>

                <div className="w-24 h-1 bg-indigo-500 mb-12 rounded-full"></div>

                <div className="space-y-8 w-full max-w-lg">
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pelaksana:</p>
                    <div className="space-y-2">
                       {persons.map((p, idx) => (
                         <p key={p.id} className="text-base font-bold text-slate-800">
                           {idx + 1}. {p.name}
                         </p>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full mt-auto pt-20 flex flex-col items-center space-y-12">
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold tracking-[0.3em] uppercase text-slate-400">Tahun Anggaran</p>
                  <p className="text-3xl font-black text-indigo-600">{header.tahunAnggaran}</p>
                </div>

                <div className="text-center space-y-1 border-t border-slate-100 pt-8 w-full max-w-lg">
                  <p className="text-base font-black uppercase tracking-widest text-slate-800">
                    {header.penerimaDuit.replace('Bendahara Pengeluaran ', '')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'kwitansi' && (
          <div id="print-area" className="bg-white shadow-2xl p-4 md:p-14 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-4 text-black rounded-3xl md:rounded-[40px] print:rounded-none">
            
            {/* Document Header */}
            <div className="text-center mb-4 border-b-2 border-black pb-1">
              <h1 className="text-lg font-bold uppercase tracking-widest border-b-2 border-black inline-block px-4">
                Rincian Belanja Biaya Perjalanan Dinas
              </h1>
            </div>

            <div className="space-y-0.5 mb-3 text-sm">
              <div className="flex">
                <span className="w-20 font-bold">ST</span>
                <span className="mr-1">:</span>
                <span className="flex-1">{header.st} Tanggal {header.stDate}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-bold">TUJUAN</span>
                <span className="mr-1">:</span>
                <span className="flex-1 leading-tight">
                  {header.tujuan} pada Tanggal {header.tujuanStartDate} s.d {header.tujuanEndDate}
                </span>
              </div>
            </div>

            {/* Combined Table for all persons */}
            <div className="mb-4 break-inside-avoid">
              <table className="w-full border-collapse border-2 border-black text-[11px]">
                <thead>
                  <tr className="bg-neutral-100 uppercase font-bold text-center border-b-2 border-black transition-colors">
                    <th className="border-r-2 border-black w-8 py-1 text-[10px]">No</th>
                    <th className="border-r-2 border-black w-48 py-1 text-[10px] font-black">Nama / NIP</th>
                    <th className="border-r-2 border-black py-1 text-[10px]">Rincian Komponen Biaya Perjalanan Dinas</th>
                    <th className="border-r-2 border-black w-24 py-1 text-[10px]">Jumlah (Rp)</th>
                    <th className="w-28 py-1 text-[10px]">Tanda Terima</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((person, index) => (
                    <tr key={person.id} className="bg-white border-b-2 border-black last:border-b-0">
                      <td className="border-r-2 border-black text-center align-top py-1 font-bold">{index + 1}</td>
                      <td className="border-r-2 border-black align-top p-1 leading-tight">
                        <div className="font-bold underline mb-0.5 uppercase text-xs">{person.name}</div>
                        <div className="uppercase">NIP. {person.nip}</div>
                      </td>
                      <td className="border-r-2 border-black align-top">
                        <table className="w-full text-[10px]">
                          <tbody>
                            {person.expenses.map((exp, idx) => (
                              <tr key={exp.id} className={idx < person.expenses.length - 1 ? "border-b border-neutral-100" : ""}>
                                <td className="p-0.5 w-32 uppercase">{exp.description}</td>
                                <td className="p-0.5 w-16 text-center italic text-neutral-500">{exp.quantity} {exp.unit}</td>
                                <td className="p-0.5 w-4 text-center text-neutral-300">x</td>
                                <td className="p-0.5 text-right w-20 font-mono">{formatCurrency(exp.rate).replace('Rp ', '')}</td>
                                <td className="p-0.5 w-4 text-center text-neutral-300">=</td>
                                <td className="p-0.5 text-right font-medium">
                                  {formatCurrency(exp.quantity * exp.rate).replace('Rp ', '')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td className="border-r-2 border-black text-right align-top py-1 px-1 text-[11px] font-black">
                        {formatCurrency(person.expenses.reduce((sum, e) => sum + (e.quantity * e.rate), 0)).replace('Rp ', '')}
                      </td>
                      <td className="align-middle text-center p-1 text-neutral-300 relative">
                        <span className="block border-b border-dotted border-neutral-400 w-full mt-2"></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total Bar */}
            <div className="bg-neutral-100 border-2 border-black mb-4 break-inside-avoid shadow-sm">
              <div className="p-2 flex justify-between items-center border-b border-black">
                <span className="italic font-black text-lg tracking-wider uppercase">Total Dibayarkan Sejumlah Rp</span>
                <span className="font-black text-3xl italic">{formatCurrency(grandTotal).replace('Rp ', '')}</span>
              </div>
              <div className="p-1 px-4 bg-white italic font-bold text-[11px] uppercase tracking-tight">
                # {terbilang(grandTotal)} Rupiah #
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-10 mt-6 text-sm break-inside-avoid px-8">
              <div className="text-center space-y-12">
                <div className="font-medium min-h-[2.5rem] flex flex-col justify-end pb-1">
                  <span>Bendahara,</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold underline uppercase text-[15px]">{header.bendaharaName}</span>
                  <span className="uppercase text-xs">NIP. {header.bendaharaNip}</span>
                </div>
              </div>

              <div className="text-center space-y-12">
                <div className="font-medium min-h-[2.5rem] flex flex-col justify-end pb-1">
                  <span className="text-[11px] mb-1">{header.signingPlace}, {header.printDate}</span>
                  <span>Pembuat Daftar,</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold underline uppercase text-[15px]">
                    {header.listMakerName || '......................................'}
                  </span>
                  <span className="uppercase text-xs">
                    NIP. {header.listMakerNip || '......................................'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'riil' && (
          /* DAFTAR PENGELUARAN RIIL PREVIEW */
          <div className="space-y-6 w-full flex flex-col items-center">
            {persons.map((person) => (
              <div key={person.id} className="bg-white shadow-2xl p-4 md:p-14 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-4 text-black rounded-3xl md:rounded-[40px] print:rounded-none break-after-page">
                <div className="text-center mb-4">
                  <h1 className="text-lg font-bold uppercase tracking-widest border-b-2 border-black inline-block px-4">
                    SURAT PERNYATAAN DAFTAR PENGELUARAN RIIL
                  </h1>
                </div>

                <div className="space-y-0.5 mb-3 text-[13px]">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="w-32 py-0.5 whitespace-nowrap align-top">Nama</td>
                        <td className="w-4 align-top">:</td>
                        <td className="font-bold">
                          <input 
                            className="w-full font-bold bg-transparent border-none focus:ring-0 p-0" 
                            value={person.name ?? ''} 
                            onChange={(e) => updatePerson(person.id, 'name', e.target.value)}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="w-32 py-0.5 whitespace-nowrap align-top">NIP.</td>
                        <td className="w-4 align-top">:</td>
                        <td>
                          <input 
                            className="w-full bg-transparent border-none focus:ring-0 p-0" 
                            value={person.nip ?? ''} 
                            onChange={(e) => updatePerson(person.id, 'nip', e.target.value)}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="w-32 py-0.5 whitespace-nowrap align-top">Jabatan</td>
                        <td className="w-4 align-top">:</td>
                        <td>
                          <input 
                            className="w-full bg-transparent border-none focus:ring-0 p-0" 
                            value={person.jabatan ?? ''} 
                            onChange={(e) => updatePerson(person.id, 'jabatan', e.target.value)}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="w-32 py-0.5 whitespace-nowrap align-top">Unit Kerja/SKPI</td>
                        <td className="w-4 align-top">:</td>
                        <td>
                          <input 
                            className="w-full bg-transparent border-none focus:ring-0 p-0" 
                            value={person.unitKerja ?? ''} 
                            onChange={(e) => updatePerson(person.id, 'unitKerja', e.target.value)}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-[13px] leading-relaxed mb-3 text-justify">
                  Berdasarkan Surat Perjalanan Dinas (SPD) tanggal {person.spdDate || '....................'}, Nomor : {person.spdNumber || '....................'}, dengan ini kami menyatakan dengan sepenuhnya :
                </div>

                <div className="text-[13px] mb-2 flex gap-1">
                  <span className="whitespace-nowrap">1.</span>
                  <textarea 
                    className="w-full bg-transparent border-none focus:ring-0 p-0 h-12 resize-none align-top leading-relaxed" 
                    value={person.riilDescription ?? ''} 
                    onChange={(e) => updatePerson(person.id, 'riilDescription', e.target.value)}
                  />
                </div>

                <table className="w-full border-collapse border-2 border-black text-[13px] mb-3">
                  <thead>
                    <tr className="border-b-2 border-black font-bold text-center h-8">
                      <th className="border-r-2 border-black w-12">No.</th>
                      <th className="border-r-2 border-black">U r a i a n</th>
                      <th className="w-48 text-center px-2">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {person.expenses.filter(e => e.isRiil).length === 0 ? (
                      <tr className="border-b border-black">
                        <td colSpan={3} className="text-center py-10 italic text-neutral-400">Pilih item "Riil" di menu Edit (klik ikon dokumen pada tiap item biaya)</td>
                      </tr>
                    ) : person.expenses.filter(e => e.isRiil).map((exp, riilIdx) => (
                      <tr key={exp.id} className="border-b border-black">
                        <td className="border-r-2 border-black text-center py-1">{riilIdx + 1}.</td>
                        <td className="border-r-2 border-black px-2 py-1">
                          <div className="flex flex-col gap-0.5 text-[13px]">
                            <div className="font-bold uppercase tracking-tight flex justify-between items-center">
                              <span>{exp.description || '......................................'}</span>
                              <div className="flex items-center gap-1 bg-neutral-50 px-1.5 rounded border border-neutral-200">
                                <input 
                                  type="number"
                                  className="bg-transparent border-none focus:ring-0 p-0 text-[11px] w-8 font-black text-center text-indigo-600"
                                  value={exp.riilPercentage ?? 30}
                                  onChange={(e) => updateExpense(person.id, exp.id, 'riilPercentage', parseInt(e.target.value) || 0)}
                                />
                                <span className="text-[10px] text-neutral-400 font-bold">%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-600 italic">
                              <span className="bg-white px-1">
                                {exp.quantity} {exp.unit}
                              </span>
                              <span>x</span>
                              <span className="font-mono">
                                {formatCurrency(exp.rate).replace('Rp ', '')}
                              </span>
                              <span className="text-neutral-400">→</span>
                              <span className="font-bold text-neutral-800">
                                {formatCurrency(exp.quantity * exp.rate).replace('Rp ', '')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex justify-between w-full">
                            <span>Rp.</span>
                            <span className="font-mono">{formatCurrency((exp.quantity * exp.rate) * ((exp.riilPercentage === 0 ? 100 : (exp.riilPercentage ?? 30)) / 100)).replace('Rp ', '')}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-neutral-50 h-8">
                      <td colSpan={2} className="border-r-2 border-black text-center uppercase tracking-widest">Jumlah</td>
                      <td className="px-2">
                         <div className="flex justify-between w-full">
                            <span>Rp.</span>
                            <span className="font-mono">{formatCurrency(person.expenses.filter(e => e.isRiil).reduce((s, e) => s + (e.quantity * e.rate * ((e.riilPercentage === 0 ? 100 : (e.riilPercentage ?? 30)) / 100)), 0)).replace('Rp ', '')}</span>
                         </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-[13px] space-y-2 leading-relaxed text-justify mb-5">
                  <p>
                    2. Jumlah uang tersebut pada angka 1 diatas benar-benar dikeluarkan untuk pelaksanaan perjalanan dinas dimaksud dan apabila dikemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kembali kelebihan tersebut ke Kas Daerah.
                  </p>
                  <p>
                    Demikian pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
                  </p>
                </div>

                <div className="flex flex-col items-end text-[13px] px-10">
                  <div className="text-center">
                    <div className="mb-16">
                      {header.signingPlace}, {header.printDate} <br/>
                      Yang melakukan perjalanan dinas,
                    </div>
                    <div className="font-bold underline uppercase">{person.name}</div>
                    <div className="uppercase">NIP. {person.nip}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'pernyataan' && (
          /* SURAT PERNYATAAN / SPTJM PREVIEW */
          <div className="space-y-10 w-full flex flex-col items-center">
            {persons.map((person) => (
              <div key={person.id} className="bg-white shadow-2xl p-4 md:p-14 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-20 text-black rounded-3xl md:rounded-[40px] print:rounded-none break-after-page flex flex-col">
                <div className="text-center mb-10">
                  <h1 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black inline-block px-4">
                    SURAT PERNYATAAN
                  </h1>
                </div>

                <div className="text-[14px] mb-4">
                  Yang bertanda tangan di bawah ini :
                </div>

                <div className="space-y-1 mb-8 text-[14px] ml-4">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="w-40 py-1">Nama</td>
                        <td className="w-4">:</td>
                        <td className="font-bold uppercase">{person.name || '......................................'}</td>
                      </tr>
                      <tr>
                        <td className="w-40 py-1">NIP.</td>
                        <td className="w-4">:</td>
                        <td className="uppercase">{person.nip || '......................................'}</td>
                      </tr>
                      <tr>
                        <td className="w-40 py-1">Jabatan</td>
                        <td className="w-4">:</td>
                        <td className="uppercase">{person.jabatan || '......................................'}</td>
                      </tr>
                      <tr>
                        <td className="w-40 py-1">Unit Kerja/SKPD</td>
                        <td className="w-4">:</td>
                        <td className="uppercase">{person.unitKerja || '......................................'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-[14px] leading-relaxed mb-8 text-justify">
                  Berdasarkan Surat Perjalanan Dinas (SPD) Nomor : <span className="font-bold">{person.spdNumber || '......................................'}</span> tanggal <span className="font-bold">{person.spdDate || '......................................'}</span>, dengan ini menyatakan dengan sesungguhnya bahwa biaya-biaya yang saya keluarkan/pertanggungjawabkan berdasarkan bukti-bukti yang terlampir menjadi tanggung jawab mutlak saya sepenuhnya.
                </div>

                <div className="text-[14px] leading-relaxed text-justify mb-20">
                  Demikian Surat Pernyataan ini saya buat, dengan sebenarnya dan apabila di kemudian hari ternyata Surat Pernyataan ini tidak benar, saya bertanggungjawab penuh dan bersedia di proses sesuai ketentuan hukum yang berlaku.
                </div>

                <div className="flex flex-col items-end text-[14px] mt-12">
                  <div className="text-center w-64">
                    <div className="mb-20">
                      {header.signingPlace}, {header.printDate} <br/>
                    </div>
                    <div className="font-bold underline uppercase">{person.name || '......................................'}</div>
                    <div className="uppercase">NIP. {person.nip || '......................................'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'laporan' && (
          /* LAPORAN PERJALANAN DINAS PREVIEW */
          <div className="bg-white shadow-2xl p-4 md:p-14 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-12 text-black rounded-3xl md:rounded-[40px] print:rounded-none">
            <div className="text-center mb-8">
              <h1 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black inline-block px-4">
                LAPORAN PERJALANAN DINAS
              </h1>
            </div>

            <div className="space-y-4 text-[13px] leading-relaxed">
              <div className="flex">
                <span className="w-24">Dasar</span>
                <span className="w-4">:</span>
                <div className="flex-1 space-y-1">
                  {(header.dasarPoints || []).map((point, idx) => (
                    <div key={idx} className="flex gap-2">
                       <span>{idx + 1}.</span>
                       <p className="flex-1">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex">
                <span className="w-24">Tujuan</span>
                <span className="w-4">:</span>
                <div className="flex-1">{header.tujuan}</div>
              </div>

              <div className="flex">
                <span className="w-24">Waktu</span>
                <span className="w-4">:</span>
                <div className="flex-1">Tanggal {header.tujuanStartDate} s.d {header.tujuanEndDate}</div>
              </div>

              <div className="flex">
                <span className="w-24">Tempat</span>
                <span className="w-4">:</span>
                <div className="flex-1">{header.place}</div>
              </div>

              <div className="flex">
                <span className="w-24">Hasil</span>
                <span className="w-4">:</span>
                <div className="flex-1">
                  <p>{header.hasilDescriptive}</p>
                  <div className="mt-2 space-y-2">
                    {(header.hasilPoints || []).map((point, idx) => (
                      <div key={idx} className="flex gap-2">
                         <span>{idx + 1}.</span>
                         <p className="flex-1">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4">Demikian Laporan Perjalanan Dinas ini dibuat untuk diketahui sebagaimana mestinya.</p>
            </div>

            <div className="mt-16 grid grid-cols-2 text-[13px]">
              <div className="text-center">
                <p>Mengetahui</p>
                <p className="font-bold uppercase mb-20">{header.inspectorJabatan}</p>
                <p className="font-bold underline uppercase">{header.inspectorName}</p>
                <p>{header.inspectorUnit}</p>
                <p>NIP. {header.inspectorNip}</p>
              </div>
              <div className="text-center">
                <p>{header.signingPlace}, {header.printDate}</p>
                <p className="mb-4">Yang melakukan perjalanan dinas :</p>
                <div className="space-y-6 text-left inline-block">
                  {persons.map((person, idx) => (
                    <div key={person.id} className="flex flex-col gap-1">
                      <div className="flex gap-2 items-center">
                        <span className="w-4">{idx + 1}.</span>
                        <div className="flex-1 min-w-[150px]">
                          <p className="font-bold underline uppercase whitespace-nowrap">{person.name}</p>
                          <p className="text-[11px]">NIP. {person.nip}</p>
                        </div>
                        <div className="border-b border-black w-24 ml-4 h-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'foto' && (
          /* FOTO DOKUMENTASI PREVIEW (Single A4 Page) */
          <div className="w-full flex flex-col items-center">
            <div className="bg-white shadow-2xl p-4 md:pt-10 md:pb-14 md:px-14 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-12 text-black rounded-3xl md:rounded-[40px] print:rounded-none flex flex-col">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black inline-block px-4">
                  FOTO DOKUMENTASI KEGIATAN
                </h1>
              </div>

              <div className="flex flex-col gap-4">
                {(header.photos || []).length > 0 ? (
                  (header.photos || []).map((photo, idx) => (
                    <div key={idx} className="w-full flex items-center justify-center border-2 border-black p-1 bg-gray-50 overflow-hidden h-[420px]">
                      <img src={photo} className="w-full h-full object-contain" alt={`Dokumentasi ${idx + 1}`} />
                    </div>
                  ))
                ) : (
                  <div className="py-20 flex items-center justify-center text-slate-300 italic border-2 border-dashed border-slate-200">
                    Belum ada foto dokumentasi yang diunggah.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'kwitansi_asli' && (
          /* KWITANSI FORMAL PREVIEW - SINGLE CONSOLIDATED RECEIPT */
          <div className="space-y-6 w-full flex flex-col items-center">
            <div className="bg-white shadow-2xl p-4 md:p-12 w-full max-w-[210mm] min-h-[148mm] print:shadow-none print:max-w-none print:w-full print:p-8 text-black rounded-3xl md:rounded-[40px] print:rounded-none flex flex-col">
              {/* Header Info */}
              <div className="grid grid-cols-2 text-[13px] mb-2">
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-32">Tahun Anggaran</span>
                    <span className="mr-2">:</span>
                    <span>{header.tahunAnggaran}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32">Kegiatan</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1">{header.kegiatan}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32">Sub Kegiatan</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1">{header.subKegiatan}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32">Kode Rekening</span>
                    <span className="mr-2">:</span>
                    <span>{header.kodeRekening}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-64 space-y-0.5">
                    <div className="flex">
                      <span className="w-24">BK. Umum</span>
                      <span className="mr-2">:</span>
                      <span className="flex-1 border-b border-dotted border-black">{header.bkUmum}</span>
                    </div>
                    <div className="flex mt-4">
                      <span className="w-24">Tanggal</span>
                      <span className="mr-2">:</span>
                      <span className="flex-1 border-b border-dotted border-black">{header.bkTanggal}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-2">
                <h2 className="text-xl font-bold uppercase underline">KWITANSI</h2>
              </div>

              <div className="space-y-1.5 text-[14px] mb-4">
                <div className="flex items-start">
                  <span className="w-36 shrink-0">Sudah Terima Dari</span>
                  <span className="mr-3">:</span>
                  <div className="flex-1 font-medium leading-tight">{header.penerimaDuit}</div>
                </div>
                <div className="flex items-start">
                  <span className="w-36 shrink-0">Terbilang</span>
                  <span className="mr-3">:</span>
                  <div className="flex-1 italic font-bold text-lg leading-tight uppercase bg-gray-50 px-1">
                    {terbilang(grandTotal)} Rupiah
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-36 shrink-0">Untuk Pembayaran</span>
                  <span className="mr-3">:</span>
                  <div className="flex-1 leading-tight text-justify">
                    Belanja Perjalanan Dinas Biasa - {header.tujuan} yang dilaksanakan pada Tgl {header.tujuanStartDate} s/d {header.tujuanEndDate} di {header.place}.
                  </div>
                </div>
              </div>

              <div className="flex mb-6">
                 <div className="border border-black py-1 px-4 text-lg font-black italic flex gap-4 items-center bg-gray-50">
                    <span>Nominal Rp.</span>
                    <span>{formatCurrency(grandTotal).replace('Rp ', '')} ,-</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 text-[13px] gap-y-8">
                <div className="text-center flex flex-col items-center">
                  <div className="h-12 flex flex-col justify-end">
                    <p>Mengetahui :</p>
                    <p className="uppercase">PPTK,</p>
                  </div>
                  <div className="mt-10">
                    <p className="font-bold underline uppercase">{header.pptkName}</p>
                    <p className="uppercase whitespace-nowrap">NIP. {header.pptkNip}</p>
                  </div>
                </div>

                <div className="text-center flex flex-col items-center">
                  <div className="h-12 flex flex-col justify-end">
                    <p>{header.signingPlace}, {header.printDate}</p>
                    <p className="mt-1 text-sm">Pembuat daftar,</p>
                  </div>
                  <div className="mt-10">
                    <p className="font-bold underline uppercase">{header.listMakerName || '......................................'}</p>
                    <p className="uppercase whitespace-nowrap">NIP. {header.listMakerNip || '......................................'}</p>
                  </div>
                </div>

                <div className="text-center flex flex-col items-center">
                  <div className="h-12 flex flex-col justify-end">
                    <p>Setuju dibayar :</p>
                    <p className="uppercase">PENGGUNA ANGGARAN</p>
                  </div>
                  <div className="mt-10">
                    <p className="font-bold underline uppercase">{header.paName}</p>
                    <p className="uppercase whitespace-nowrap">NIP. {header.paNip}</p>
                  </div>
                </div>

                <div className="text-center flex flex-col items-center">
                  <div className="h-12 flex flex-col justify-end">
                    <p>Lunas dibayar :</p>
                    <p className="uppercase leading-tight">Bendahara Pengeluaran,</p>
                  </div>
                  <div className="mt-10">
                    <p className="font-bold underline uppercase">{header.bendaharaName}</p>
                    <p className="uppercase whitespace-nowrap">NIP. {header.bendaharaNip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-20 text-[10px] text-neutral-400 no-print border-t pt-4 max-w-[210mm] w-full text-center">
            * Gunakan browser Chrome atau Edge untuk hasil cetak terbaik. Aktifkan "Backround Graphics" di menu printer.
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page {
            margin: 1cm;
            size: A4;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            border: none !important;
            padding: 0 !important;
          }
          table {
            border-collapse: collapse;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
