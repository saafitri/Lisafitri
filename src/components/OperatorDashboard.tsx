/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, CheckCircle2, XCircle, Search, Eye, AlertCircle, 
  Calendar, FileText, User, RefreshCw, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HealthData, BansosData, DataStatus, Role } from '../types';
import StatusBadge from './StatusBadge';

interface OperatorDashboardProps {
  user: {
    id: string;
    nama: string;
    role: Role;
  };
  token: string;
  triggerToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function OperatorDashboard({ user, token, triggerToast }: OperatorDashboardProps) {
  const [queue, setQueue] = useState<{ type: 'health' | 'bansos'; items: any[] }>({ type: 'health', items: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State for DataChecker
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operator/queue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      } else {
        triggerToast('Gagal memuat antrean data.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Koneksi terganggu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  const handleAction = async (id: string, action: 'verify' | 'reject') => {
    if (action === 'reject' && !showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (action === 'reject' && !rejectReason.trim()) {
      triggerToast('Silakan isi alasan penolakan data.', 'warning');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch('/api/operator/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          type: queue.type,
          action,
          catatanPenolakan: action === 'reject' ? rejectReason : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast(
          `Data berhasil ${action === 'verify' ? 'diverifikasi' : 'ditolak'} dan diteruskan.`,
          action === 'verify' ? 'success' : 'error'
        );
        setShowModal(false);
        setSelectedItem(null);
        setRejectReason('');
        setShowRejectInput(false);
        fetchQueue();
      } else {
        triggerToast(data.message || 'Gagal merespons data.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal terhubung ke server.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const openChecker = (item: any) => {
    setSelectedItem(item);
    setShowModal(true);
    setRejectReason('');
    setShowRejectInput(false);
  };

  const filteredItems = queue.items.filter(item => 
    item.nik.includes(searchQuery) || 
    item.namaPenduduk.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (queue.type === 'health' && item.diagnosa?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (queue.type === 'bansos' && item.jenisBansos.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="operator-dashboard-block" className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2.5 py-1 rounded-md border border-sky-100 uppercase tracking-wider">
            Sektor: {queue.type === 'health' ? 'KEMENTERIAN KESEHATAN' : 'KEMENTERIAN SOSIAL (DUKCAPIL)'}
          </span>
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight mt-2 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#008080]" />
            <span>Verifikasi Berkas Kependudukan</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Petugas: <strong className="text-gray-700">{user.nama}</strong>. Harap verifikasi kesesuaian data NIK penduduk dengan database sektoral.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Antrean</span>
        </button>
      </div>

      {/* Main Table Block */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-5">
        
        {/* Search filter row */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="relative max-w-sm w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none"
              placeholder="Cari berdasarkan NIK atau Nama Penduduk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="text-xs text-gray-400 font-medium">
            Total Antrean: <span className="text-[#008080] font-bold font-mono text-sm">{filteredItems.length}</span> Berkas
          </div>
        </div>

        {/* VerificationTable */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500 font-medium">Memuat berkas antrean...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3">
            <Layers className="w-10 h-10 text-gray-300" />
            <p className="text-xs font-bold text-gray-500">Antrean Verifikasi Bersih</p>
            <p className="text-[11px] text-gray-400">Semua dokumen dari penduduk telah selesai diproses oleh Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse" id="verification-table">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4">NIK (Kunci Utama)</th>
                  <th className="p-4">Nama Penduduk</th>
                  <th className="p-4">Jenis Data</th>
                  <th className="p-4">Tanggal Masuk</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi Pemeriksaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono font-bold text-gray-700 tracking-wider">{item.nik}</td>
                    <td className="p-4 font-medium text-gray-800">{item.namaPenduduk}</td>
                    <td className="p-4">
                      {queue.type === 'health' ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-teal-700">Layanan Kesehatan</span>
                          <span className="block text-[10px] text-gray-400 font-mono">{item.jenisLayanan}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-indigo-700">Jaminan Sosial</span>
                          <span className="block text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{item.jenisBansos}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(item.tanggalMasuk).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openChecker(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#008080]/10 hover:bg-[#008080] text-[#008080] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Periksa Data</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POP-UP DETAIL MODAL (DataChecker) */}
      <AnimatePresence>
        {showModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            {/* Backdrop to close */}
            <div className="absolute inset-0" onClick={() => setShowModal(false)}></div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              id="datachecker-modal"
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full relative overflow-hidden z-10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-[#66B9BF] p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-5 h-5" />
                  <h3 className="font-bold text-sm tracking-wide">DataChecker: Lembar Validasi Keaslian</h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-white/80 hover:text-white font-bold cursor-pointer focus:outline-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                
                {/* Warning message */}
                <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl text-[11px] text-sky-700 leading-relaxed flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
                  <span>
                    Pastikan Anda mencocokkan dokumen fisik atau database kependudukan Dukcapil untuk NIK ini sebelum melakukan persetujuan.
                  </span>
                </div>

                {/* Patient / Citizen Profile */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">PROFIL PENDUDUK</span>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-gray-400">Nama Lengkap</span>
                      <strong className="text-gray-700 block font-semibold mt-0.5">{selectedItem.namaPenduduk}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400">NIK Utama (16 Digit)</span>
                      <strong className="text-gray-700 block font-mono font-bold tracking-wide mt-0.5">{selectedItem.nik}</strong>
                    </div>
                  </div>
                </div>

                {/* Sektoral Details */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">DETAIL TRANSAKSI DATA</span>
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3.5 text-xs">
                    {queue.type === 'health' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 block">Tanggal Layanan Medis</span>
                            <span className="font-semibold text-gray-700 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {selectedItem.tanggalLayanan}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Jenis Pelayanan</span>
                            <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-100 rounded-md inline-block mt-0.5">
                              {selectedItem.jenisLayanan}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 block">Status BPJS Kesehatan</span>
                            <span className={`font-semibold inline-block px-2.5 py-0.5 rounded-md text-[10px] mt-0.5 ${selectedItem.statusBpjs === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {selectedItem.statusBpjs}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Diagnosa Utama</span>
                            <span className="font-semibold text-gray-700 block mt-0.5">{selectedItem.diagnosa || 'Tanpa diagnosa'}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-400 block">Catatan Medis &amp; Terapi</span>
                          <p className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 mt-1 italic leading-relaxed text-[11px]">
                            "{selectedItem.catatanMedis || 'Tidak ada catatan khusus.'}"
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 block">Jenis Program Bantuan</span>
                            <span className="font-bold text-indigo-800 block mt-0.5">{selectedItem.jenisBansos}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Tanggal Mulai Menerima</span>
                            <span className="font-semibold text-gray-700 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {selectedItem.tanggalMulai}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-400 block">Catatan Sosial Pengajuan</span>
                          <p className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 mt-1 italic leading-relaxed text-[11px]">
                            "{selectedItem.catatanPengajuan || 'Tidak ada catatan khusus.'}"
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Reject Input (Conditional) */}
                {showRejectInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider">
                      Alasan Penolakan Berkas *
                    </label>
                    <textarea
                      rows={3}
                      required
                      className="w-full px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none"
                      placeholder="Tuliskan alasan penolakan, misal: NIK tidak terdaftar di database Dukcapil atau dokumen palsu."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </motion.div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-5 border-t border-gray-100 flex items-center justify-between">
                <div>
                  {showRejectInput ? (
                    <button
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Batal Tolak
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Tutup
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Reject button */}
                  {(!showRejectInput || rejectReason.trim()) && (
                    <button
                      onClick={() => handleAction(selectedItem.id, 'reject')}
                      disabled={submittingAction}
                      className="px-4 py-2 bg-[#E74C3C] hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/10 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{showRejectInput ? 'Kirim Penolakan' : 'Tolak Berkas'}</span>
                    </button>
                  )}

                  {/* Verify button */}
                  {!showRejectInput && (
                    <button
                      onClick={() => handleAction(selectedItem.id, 'verify')}
                      disabled={submittingAction}
                      className="px-4 py-2 bg-[#2ECC71] hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Diverifikasi (Kirim ke Admin)</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
