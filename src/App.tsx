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
  Download,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STAFF_DATABASE } from './constants';
import * as XLSX from 'xlsx';

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
}

interface Person {
  id: string;
  name: string;
  nip: string;
  expenses: ExpenseItem[];
  ket: string;
}

interface DocHeader {
  st: string;
  stDate: string;
  tujuan: string;
  tujuanStartDate: string;
  tujuanEndDate: string;
  bendaharaName: string;
  bendaharaNip: string;
  place: string;
  printDate: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePersonIdForSearch, setActivePersonIdForSearch] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const STORAGE_KEY = 'vortex_perdin_v1';

  const defaultHeader: DocHeader = {
    st: 'B-302/INSP/800.1.2/X/2025',
    stDate: '14 Oktober 2025',
    tujuan: 'Mengikuti Kegiatan Diklat FGD Probity Audit di Grand QIN Hotel Banjarbaru',
    tujuanStartDate: '15',
    tujuanEndDate: '18 Oktober 2025',
    bendaharaName: 'Sumiati. SE',
    bendaharaNip: '19801130 200701 2 006',
    place: 'Tanjung',
    printDate: '20 Oktober 2025'
  };

  const defaultPersons: Person[] = [
    {
      id: '1',
      name: 'Wahyu Gunawan, S.Pd.',
      nip: '19890630 202521 1 045',
      ket: 'H-1 & H+1 Hari H',
      expenses: [
        { id: '1', description: 'Uang Harian', quantity: 2, unit: 'Hari', rate: 380000 },
        { id: '2', description: 'Uang Harian', quantity: 2, unit: 'Hari', rate: 110000 },
        { id: '3', description: 'Biaya Penginapan', quantity: 3, unit: 'Malam', rate: 250000 },
        { id: '4', description: 'Biaya Transportasi', quantity: 1, unit: 'Layanan', rate: 180000 },
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
        if (savedHeader) setHeader(savedHeader);
        if (savedPersons) setPersons(savedPersons);
      } catch (e) {
        console.error('Failed to load saved data', e);
      }
    }
  }, []);

  const handleManualSave = () => {
    setSaveStatus('saving');
    const dataToSave = { header, persons };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
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
      ket: '',
      expenses: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: '', rate: 0 }]
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
          expenses: [...p.expenses, { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', rate: 0 }]
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

  const selectStaffForPerson = (personId: string, staff: { name: string, nip: string }) => {
    setPersons(prev => prev.map(p => p.id === personId ? { ...p, name: staff.name, nip: staff.nip } : p));
    setSearchTerm(staff.name);
    setActivePersonIdForSearch(null);
  };

  const selectStaffForBendahara = (staff: { name: string, nip: string }) => {
    setHeader(prev => ({ ...prev, bendaharaName: staff.name, bendaharaNip: staff.nip }));
    setSearchTerm(staff.name);
    setActivePersonIdForSearch(null);
  };

  const grandTotal = useMemo(() => {
    return persons.reduce((sum, p) => {
      return sum + p.expenses.reduce((pSum, e) => pSum + (e.quantity * e.rate), 0);
    }, 0);
  }, [persons]);

  const handlePrint = () => {
    setActiveTab('preview');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Build array of arrays for the sheet
    const data: any[][] = [
      ['BELANJA BIAYA PERJALANAN DINAS'],
      [''],
      ['ST', ':', `${header.st} Tanggal ${header.stDate}`],
      ['TUJUAN', ':', `${header.tujuan} pada Tanggal ${header.tujuanStartDate} s.d ${header.tujuanEndDate}`],
      [''],
      ['NO', 'NAMA / NIP', 'RINCIAN BIAYA', 'QTY', 'UNIT', '', 'HARGA SATUAN', '', 'JUMLAH', 'TOTAL'],
    ];

    persons.forEach((person, index) => {
      // Name and NIP row
      const pTotal = person.expenses.reduce((sum, e) => sum + (e.quantity * e.rate), 0);
      data.push([
        index + 1,
        person.name,
        person.expenses[0]?.description || '',
        person.expenses[0]?.quantity || '',
        person.expenses[0]?.unit || '',
        'x',
        person.expenses[0]?.rate || 0,
        '=',
        (person.expenses[0]?.quantity || 0) * (person.expenses[0]?.rate || 0),
        pTotal
      ]);

      if (person.nip) {
        data.push(['', `NIP. ${person.nip}`]);
      }

      // Remaining expenses
      person.expenses.slice(1).forEach(exp => {
        data.push([
          '',
          '',
          exp.description,
          exp.quantity,
          exp.unit,
          'x',
          exp.rate,
          '=',
          exp.quantity * exp.rate,
          ''
        ]);
      });

      data.push(['']);
    });

    data.push(['Telah Dibayar Sejumlah Rp', '', '', '', '', '', '', '', grandTotal]);
    data.push(['']);
    data.push(['', '', '', '', '', '', `${header.place}, ${header.printDate}`]);
    data.push(['Bendahara', '', '', '', '', '', 'Pembuat Daftar']);
    data.push(['']);
    data.push(['']);
    data.push(['']);
    data.push([header.bendaharaName, '', '', '', '', '', persons[0]?.name || '']);
    data.push([`NIP. ${header.bendaharaNip}`, '', '', '', '', '', persons[0]?.nip ? `NIP. ${persons[0].nip}` : '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Kwitansi Perdin");
    
    // Save file
    XLSX.writeFile(wb, `Kwitansi_Perdin_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-hidden flex flex-col md:flex-row">
      {/* Background Mesh Gradients */}
      <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] -right-[5%] w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-[10%] left-[20%] w-[600px] h-[300px] bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Sidebar - Control Panel */}
      <div className="relative z-10 w-full md:w-96 bg-white/5 backdrop-blur-2xl border-r border-white/10 overflow-y-auto h-screen p-6 sticky top-0 no-print flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
            <FileText size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Vortex Perdin</h1>
        </div>

        <nav className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('edit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'edit' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Edit
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'preview' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Preview
          </button>
        </nav>

        <div className="space-y-6 flex-grow overflow-y-auto no-scrollbar pr-1">
          <section>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">Header Dokumen</h2>
            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Nomor ST</label>
                <input 
                  type="text" 
                  value={header.st}
                  onChange={(e) => setHeader({...header, st: e.target.value})}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-600 transition-all group-hover:bg-white/10" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tanggal ST</label>
                  <input 
                    type="text" 
                    value={header.stDate}
                    onChange={(e) => setHeader({...header, stDate: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 p-2" 
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Kota/Tempat</label>
                  <input 
                    type="text" 
                    value={header.place}
                    onChange={(e) => setHeader({...header, place: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 p-2" 
                  />
                </div>
              </div>
              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tujuan Kegiatan</label>
                <textarea 
                  value={header.tujuan}
                  onChange={(e) => setHeader({...header, tujuan: e.target.value})}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-xl h-24 text-white group-hover:bg-white/10 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tgl Mulai Kegiatan</label>
                  <input 
                    type="text" 
                    value={header.tujuanStartDate}
                    onChange={(e) => setHeader({...header, tujuanStartDate: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 p-2" 
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tgl Selesai Kegiatan</label>
                  <input 
                    type="text" 
                    value={header.tujuanEndDate}
                    onChange={(e) => setHeader({...header, tujuanEndDate: e.target.value})}
                    className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 p-2" 
                  />
                </div>
              </div>

              <div className="group">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Tanggal Cetak (Kwitansi)</label>
                <input 
                  type="text" 
                  value={header.printDate}
                  onChange={(e) => setHeader({...header, printDate: e.target.value})}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 p-2 font-bold text-indigo-300" 
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">Pejabat & Bendahara</h2>
            <div className="space-y-4">
              <div className="group relative">
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">Bendahara</label>
                <input 
                  type="text" 
                  value={header.bendaharaName}
                  onChange={(e) => {
                    setHeader({...header, bendaharaName: e.target.value});
                    setSearchTerm(e.target.value);
                    setActivePersonIdForSearch('bendahara');
                  }}
                  onFocus={() => {
                    setSearchTerm(header.bendaharaName);
                    setActivePersonIdForSearch('bendahara');
                  }}
                  onBlur={() => {
                    setTimeout(() => setActivePersonIdForSearch(null), 200);
                  }}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 focus:ring-indigo-500 focus:border-indigo-500 transition-all p-2 pr-8" 
                />
                <div className="absolute right-2 top-8 text-white/20">
                  <Search size={14} />
                </div>
                {activePersonIdForSearch === 'bendahara' && filteredStaff.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl mt-2 overflow-hidden backdrop-blur-xl">
                    <div className="p-2 border-b border-white/5 bg-white/5">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-2">Hasil Pencarian Staff</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                      {filteredStaff.map((staff, sIdx) => (
                        <button
                          key={`${staff.nip}-${sIdx}`}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 group/item"
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
                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block uppercase">NIP Bendahara</label>
                <input 
                  type="text" 
                  value={header.bendaharaNip}
                  onChange={(e) => setHeader({...header, bendaharaNip: e.target.value})}
                  className="w-full text-sm bg-white/5 border-white/10 rounded-xl text-white group-hover:bg-white/10 focus:ring-indigo-500 focus:border-indigo-500 transition-all p-2 font-mono" 
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Personel</h2>
              <button 
                onClick={addPerson}
                className="text-[10px] flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-all"
              >
                <Plus size={12} /> Tambah
              </button>
            </div>
            
            <div className="space-y-6">
              {persons.map((p, pIdx) => (
                <div key={p.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl relative group/card transition-all hover:bg-white/[0.07] hover:border-white/20">
                  <button 
                    onClick={() => removePerson(p.id)}
                    className="absolute -top-2 -right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl opacity-0 group-hover/card:opacity-100 transition-all shadow-xl backdrop-blur-md"
                  >
                    <Trash2 size={12} />
                  </button>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute right-0 top-0 p-1 text-slate-600 group-focus-within:text-indigo-400">
                        <Search size={14} />
                      </div>
                      <input 
                        placeholder="Nama Lengkap (Cari di Database...)" 
                        value={p.name}
                        onChange={(e) => {
                          updatePerson(p.id, 'name', e.target.value);
                          setSearchTerm(e.target.value);
                          setActivePersonIdForSearch(p.id);
                        }}
                        onFocus={() => {
                          setSearchTerm(p.name);
                          setActivePersonIdForSearch(p.id);
                        }}
                        onBlur={() => {
                          setTimeout(() => setActivePersonIdForSearch(null), 200);
                        }}
                        className="w-full text-sm font-bold bg-transparent border-b border-white/10 focus:border-indigo-500 focus:ring-0 p-0 pb-1 text-white placeholder-slate-600"
                      />
                      
                      {activePersonIdForSearch === p.id && filteredStaff.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl mt-2 overflow-hidden backdrop-blur-xl">
                          <div className="p-2 border-b border-white/5 bg-white/5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-2">Hasil Pencarian</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto no-scrollbar">
                            {filteredStaff.map((staff, sIdx) => (
                              <button
                                key={`${staff.nip}-${sIdx}`}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 group/item"
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
                    <input 
                      placeholder="NIP" 
                      value={p.nip}
                      onChange={(e) => updatePerson(p.id, 'nip', e.target.value)}
                      className="w-full text-[11px] text-slate-400 bg-transparent border-b border-white/10 focus:border-indigo-500 focus:ring-0 p-0 pb-1 font-mono"
                    />
                    
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Biaya</span>
                        <button 
                          onClick={() => addExpense(p.id)}
                          className="text-[9px] text-fuchsia-400 font-black uppercase hover:text-fuchsia-300 transition-colors"
                        >+ Item</button>
                      </div>
                      
                      {p.expenses.map((e, eIdx) => (
                        <div key={e.id} className="flex gap-1.5 items-start">
                          <input 
                            placeholder="Desc" 
                            value={e.description}
                            onChange={(val) => updateExpense(p.id, e.id, 'description', val.target.value)}
                            className="flex-1 text-[10px] bg-white/5 border-white/5 rounded-lg p-1.5 text-white placeholder-slate-600"
                          />
                          <input 
                            type="number"
                            value={e.quantity}
                            onChange={(val) => updateExpense(p.id, e.id, 'quantity', parseInt(val.target.value) || 0)}
                            className="w-10 text-[10px] bg-white/5 border-white/5 rounded-lg p-1.5 text-white"
                          />
                          <input 
                            placeholder="Unit"
                            value={e.unit}
                            onChange={(val) => updateExpense(p.id, e.id, 'unit', val.target.value)}
                            className="w-12 text-[10px] bg-white/5 border-white/5 rounded-lg p-1.5 text-white"
                          />
                          <input 
                            type="number"
                            value={e.rate}
                            onChange={(val) => updateExpense(p.id, e.id, 'rate', parseInt(val.target.value) || 0)}
                            className="w-20 text-[10px] bg-white/5 border-white/5 rounded-lg p-1.5 text-right text-white font-mono"
                          />
                          <button 
                            onClick={() => removeExpense(p.id, e.id)}
                            className="text-red-400 hover:text-red-300 p-1.5 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
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

        <div className="pt-6 border-t border-white/10 mt-auto space-y-3">
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
            onClick={handleExportExcel}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl transition-all border border-white/10 uppercase text-xs tracking-widest"
          >
            <Download size={14} />
            Export Excel
          </button>
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
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar md:p-12 flex justify-center items-start print:p-0 print:bg-white">
        <div id="print-area" className="bg-white shadow-2xl p-4 md:p-14 w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:max-w-none print:w-full print:p-4 text-black rounded-3xl md:rounded-[40px] print:rounded-none">
          
          {/* Document Header */}
          <div className="text-center mb-8 border-b-2 border-black pb-2">
            <h1 className="text-lg font-bold uppercase tracking-widest border-b-2 border-black inline-block px-4">
              Belanja Biaya Perjalanan Dinas
            </h1>
          </div>

          <div className="space-y-1 mb-6 text-sm">
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

          {/* Table for each person */}
          {persons.map((person, index) => (
            <div key={person.id} className="mb-6 break-inside-avoid">
              <table className="w-full border-collapse border-2 border-black text-[11px]">
                <thead>
                  <tr className="bg-neutral-100 uppercase font-bold text-center border-b-2 border-black transition-colors">
                    <th className="border-r-2 border-black w-8 py-2 text-[10px]">No</th>
                    <th className="border-r-2 border-black w-48 py-2 text-[10px] font-black">Nama / NIP</th>
                    <th className="border-r-2 border-black py-2 text-[10px]">Rincian Komponen Biaya Perjalanan Dinas</th>
                    <th className="border-r-2 border-black w-24 py-2 text-[10px]">Jumlah (Rp)</th>
                    <th className="w-28 py-2 text-[10px]">Tanda Terima</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border-r-2 border-black text-center align-top py-2 font-bold">{index + 1}</td>
                    <td className="border-r-2 border-black align-top p-2 leading-tight">
                      <div className="font-bold underline mb-1 uppercase text-xs">{person.name}</div>
                      <div className="uppercase">NIP. {person.nip}</div>
                    </td>
                    <td className="border-r-2 border-black align-top">
                      <table className="w-full">
                        <tbody>
                          {person.expenses.map((exp, idx) => (
                            <tr key={exp.id} className={idx < person.expenses.length - 1 ? "border-b border-neutral-200" : ""}>
                              <td className="p-1 w-28">{exp.description}</td>
                              <td className="p-1 w-20 text-center italic text-neutral-500">{exp.quantity} {exp.unit}</td>
                              <td className="p-1 w-4 text-center text-neutral-300">x</td>
                              <td className="p-1 text-right w-24 font-mono">{formatCurrency(exp.rate).replace('Rp ', '')}</td>
                              <td className="p-1 w-4 text-center text-neutral-300">=</td>
                              <td className="p-1 text-right font-medium">
                                {formatCurrency(exp.quantity * exp.rate).replace('Rp ', '')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                    <td className="border-r-2 border-black text-right align-top py-2 px-2 text-[11px] font-black">
                      {formatCurrency(person.expenses.reduce((sum, e) => sum + (e.quantity * e.rate), 0)).replace('Rp ', '')}
                    </td>
                    <td className="align-middle text-center p-2 text-neutral-300 relative">
                     <span className="block border-b border-dotted border-neutral-400 w-full mt-4"></span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Grand Total Bar */}
          <div className="bg-neutral-100 border-2 border-black mb-10 break-inside-avoid shadow-sm">
            <div className="p-4 flex justify-between items-center border-b border-black">
              <span className="italic font-black text-lg tracking-wider uppercase">Total Dibayarkan Sejumlah Rp</span>
              <span className="font-black text-3xl italic">{formatCurrency(grandTotal).replace('Rp ', '')}</span>
            </div>
            <div className="p-2 px-4 bg-white italic font-bold text-[11px] uppercase tracking-tight">
              # {terbilang(grandTotal)} Rupiah #
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-10 mt-10 text-sm break-inside-avoid px-8">
            <div className="text-center space-y-16">
              <div className="font-medium min-h-[3rem] flex flex-col justify-end pb-1">
                <span>Bendahara,</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-bold underline uppercase text-[15px]">{header.bendaharaName}</span>
                <span className="uppercase text-xs">NIP. {header.bendaharaNip}</span>
              </div>
            </div>

            <div className="text-center space-y-16">
              <div className="font-medium min-h-[3rem] flex flex-col justify-end pb-1">
                <span className="text-[11px] mb-1">{header.place}, {header.printDate}</span>
                <span>Pembuat Daftar,</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-bold underline uppercase text-[15px]">{persons[0]?.name || '......................................'}</span>
                <span className="uppercase text-xs">NIP. {persons[0]?.nip || '......................................'}</span>
              </div>
            </div>
          </div>

          <div className="mt-20 text-[10px] text-neutral-400 no-print border-t pt-4">
            * Gunakan browser Chrome atau Edge untuk hasil cetak terbaik. Aktifkan "Backround Graphics" di menu printer.
          </div>
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
