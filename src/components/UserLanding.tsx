/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, ShieldAlert, FileText, Send, HelpCircle, 
  Clock, CheckCircle, XCircle, AlertCircle, Calendar, CreditCard, Activity, UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { HealthData, BansosData } from '../types';
import StatusBadge from './StatusBadge';

interface UserLandingProps {
  user: {
    id: string;
    nama: string;
    nik?: string;
  };
  token: string;
  triggerToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function UserLanding({ user, token, triggerToast }: UserLandingProps) {
  const [history, setHistory] = useState<{ health: HealthData[]; bansos: BansosData[] }>({ health: [], bansos: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Health Form States
  const [hNik, setHNik] = useState(user.nik || '');
  const [hTanggal, setHTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [hJenis, setHJenis] = useState<'Rawat Jalan' | 'Rawat Inap'>('Rawat Jalan');
  const [hDiagnosa, setHDiagnosa] = useState('');
  const [hBpjs, setHBpjs] = useState<'Aktif' | 'Tidak Aktif'>('Aktif');
  const [hCatatan, setHCatatan] = useState('');
  const [submittingHealth, setSubmittingHealth] = useState(false);

  // Bansos Form States
  const [bNik, setBNik] = useState(user.nik || '');
  const [bJenis, setBJenis] = useState('Program Keluarga Harapan (PKH)');
  const [bTanggal, setBTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [bCatatan, setBCatatan] = useState('');
  const [submittingBansos, setSubmittingBansos] = useState(false);

  // Load user submissions history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/penduduk/my-submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal memuat riwayat pengajuan.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  // Handle Health Submit
  const handleHealthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hNik || hNik.length !== 16 || !/^\d+$/.test(hNik)) {
      triggerToast('Format NIK tidak valid. NIK wajib berupa 16 digit angka.', 'error');
      return;
    }
    if (!hTanggal || !hJenis || !hBpjs) {
      triggerToast('Mohon lengkapi seluruh kolom wajib.', 'error');
      return;
    }

    setSubmittingHealth(true);
    try {
      const res = await fetch('/api/penduduk/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nik: hNik,
          tanggalLayanan: hTanggal,
          jenisLayanan: hJenis,
          diagnosa: hDiagnosa,
          statusBpjs: hBpjs,
          catatanMedis: hCatatan
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast('Formulir Data Layanan Kesehatan berhasil terkirim!', 'success');
        // Clear optional fields
        setHDiagnosa('');
        setHCatatan('');
        fetchHistory();
      } else {
        triggerToast(data.message || 'Gagal mengirim data kesehatan.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal mengirim data ke server.', 'error');
    } finally {
      setSubmittingHealth(false);
    }
  };

  // Handle Bansos Submit
  const handleBansosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bNik || bNik.length !== 16 || !/^\d+$/.test(bNik)) {
      triggerToast('Format NIK tidak valid. NIK wajib berupa 16 digit angka.', 'error');
      return;
    }
    if (!bJenis || !bTanggal) {
      triggerToast('Mohon lengkapi seluruh kolom wajib.', 'error');
      return;
    }

    setSubmittingBansos(true);
    try {
      const res = await fetch('/api/penduduk/bansos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nik: bNik,
          jenisBansos: bJenis,
          tanggalMulai: bTanggal,
          catatanPengajuan: bCatatan
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast('Formulir Pengajuan Bansos berhasil terkirim!', 'success');
        setBCatatan('');
        fetchHistory();
      } else {
        triggerToast(data.message || 'Gagal mengirim pengajuan bansos.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal mengirim pengajuan ke server.', 'error');
    } finally {
      setSubmittingBansos(false);
    }
  };

  return (
    <div id="user-landing-page" className="space-y-10">
      
      {/* Welcome Banner */}
      <div className="bg-[#008080]/10 border border-[#008080]/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Halo, {user.nama}!</h2>
          <p className="text-xs md:text-sm text-gray-600 max-w-xl leading-relaxed">
            Portal Mandiri Penduduk memudahkan Anda mengisi data layanan kesehatan dan bantuan sosial secara terpadu menggunakan Nomor Induk Kependudukan (NIK) sebagai basis integrasi.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm shrink-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#008080]">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">NIK Terverifikasi</span>
            <span className="block font-mono text-sm font-bold text-gray-700 tracking-wider">{user.nik || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Grid Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Form Layanan Kesehatan */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          id="card-form-kesehatan"
          className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col"
        >
          <div className="bg-[#008080] p-5 text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Formulir Layanan Kesehatan</h3>
              <p className="text-[10px] text-teal-100 mt-0.5">Integrasi fasilitas kesehatan &amp; BPJS</p>
            </div>
          </div>

          <form onSubmit={handleHealthSubmit} className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* NIK Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  NIK (Nomor Induk Kependudukan) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono tracking-widest focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none"
                  placeholder="NIK 16 Digit"
                  value={hNik}
                  onChange={(e) => setHNik(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Tanggal Layanan */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Tanggal Layanan *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none"
                      value={hTanggal}
                      onChange={(e) => setHTanggal(e.target.value)}
                    />
                  </div>
                </div>

                {/* Jenis Layanan */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Jenis Layanan *
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none cursor-pointer"
                    value={hJenis}
                    onChange={(e) => setHJenis(e.target.value as any)}
                  >
                    <option value="Rawat Jalan">Rawat Jalan</option>
                    <option value="Rawat Inap">Rawat Inap</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status BPJS */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Status BPJS Kesehatan *
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none cursor-pointer"
                    value={hBpjs}
                    onChange={(e) => setHBpjs(e.target.value as any)}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>

                {/* Diagnosa */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Diagnosa Utama (Opsional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none"
                    placeholder="Flu, Hipertensi, dll."
                    value={hDiagnosa}
                    onChange={(e) => setHDiagnosa(e.target.value)}
                  />
                </div>
              </div>

              {/* Catatan Medis */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Catatan Medis &amp; Terapi Obat
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none resize-none"
                  placeholder="Isikan catatan obat, dosis atau anjuran kontrol faskes lanjutan."
                  value={hCatatan}
                  onChange={(e) => setHCatatan(e.target.value)}
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-kesehatan"
              disabled={submittingHealth}
              className="mt-6 w-full py-3 bg-[#008080] text-white rounded-xl font-bold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-[#008080]/15"
            >
              {submittingHealth ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Data Kesehatan</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Form Jaminan Sosial */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          id="card-form-bansos"
          className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col"
        >
          <div className="bg-[#008080] p-5 text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Formulir Jaminan Sosial (Bansos)</h3>
              <p className="text-[10px] text-teal-100 mt-0.5">Integrasi data kependudukan &amp; jaring sosial</p>
            </div>
          </div>

          <form onSubmit={handleBansosSubmit} className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* NIK Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  NIK (Nomor Induk Kependudukan) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono tracking-widest focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none"
                  placeholder="NIK 16 Digit"
                  value={bNik}
                  onChange={(e) => setBNik(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {/* Jenis Bansos */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Jenis Bantuan Sosial *
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none cursor-pointer"
                  value={bJenis}
                  onChange={(e) => setBJenis(e.target.value)}
                >
                  <option value="Program Keluarga Harapan (PKH)">Program Keluarga Harapan (PKH)</option>
                  <option value="Bantuan Pangan Non Tunai (BPNT)">Bantuan Pangan Non Tunai (BPNT)</option>
                  <option value="Bantuan Langsung Tunai (BLT) Desa">Bantuan Langsung Tunai (BLT) Desa</option>
                  <option value="Bantuan Sosial Tunai (BST)">Bantuan Sosial Tunai (BST)</option>
                  <option value="Kartu Sembako">Kartu Sembako</option>
                </select>
              </div>

              {/* Tanggal Penerimaan */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Tanggal Mulai Menerima *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none"
                  value={bTanggal}
                  onChange={(e) => setBTanggal(e.target.value)}
                />
              </div>

              {/* Catatan Pengajuan */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Catatan Pengajuan &amp; Keterangan Ekonomi
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] focus:outline-none resize-none"
                  placeholder="Isikan alasan pengajuan jaminan sosial atau detail kondisi sosial ekonomi keluarga."
                  value={bCatatan}
                  onChange={(e) => setBCatatan(e.target.value)}
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-bansos"
              disabled={submittingBansos}
              className="mt-6 w-full py-3 bg-[#008080] text-white rounded-xl font-bold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-[#008080]/15"
            >
              {submittingBansos ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Pengajuan Bansos</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* SUBMISSION HISTORY TABLE */}
      <div id="submissions-history-block" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="font-bold text-base text-gray-800 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <span>Daftar Riwayat Pengajuan Anda</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">Daftar rekapan integrasi data lintas sektor yang Anda submit</p>
          </div>
          <button
            onClick={fetchHistory}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Segarkan Data
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500 font-medium">Memuat riwayat data...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Health History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2 border-l-2 border-[#008080] pl-2 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Riwayat Sektor Kesehatan</span>
              </h4>
              {history.health.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-gray-100 rounded-xl text-xs text-gray-400">
                  Belum ada data kesehatan yang dikirimkan.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <th className="p-4">Tanggal Layanan</th>
                        <th className="p-4">Jenis Layanan</th>
                        <th className="p-4">Diagnosa</th>
                        <th className="p-4">BPJS</th>
                        <th className="p-4">Status Portal</th>
                        <th className="p-4">Keterangan Verifikator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {history.health.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-medium text-gray-800">{h.tanggalLayanan}</td>
                          <td className="p-4">{h.jenisLayanan}</td>
                          <td className="p-4 italic text-gray-500">{h.diagnosa || '-'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${h.statusBpjs === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                              {h.statusBpjs}
                            </span>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={h.status} />
                          </td>
                          <td className="p-4">
                            {h.status === 'ditolak' && (
                              <span className="text-rose-600 font-medium block max-w-xs truncate" title={h.catatanPenolakan}>
                                Tolak: {h.catatanPenolakan}
                              </span>
                            )}
                            {h.status === 'terverifikasi' && (
                              <span className="text-emerald-700 font-medium block">
                                Diverifikasi oleh {h.verifikator}
                              </span>
                            )}
                            {h.status === 'aktif' && (
                              <span className="text-teal-800 font-semibold block">
                                Aktif &amp; Terkonsolidasi Permanen
                              </span>
                            )}
                            {h.status === 'pending' && <span className="text-gray-400">Menunggu antrean operator</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bansos History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2 border-l-2 border-[#008080] pl-2 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <span>Riwayat Jaminan Sosial (Bansos)</span>
              </h4>
              {history.bansos.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-gray-100 rounded-xl text-xs text-gray-400">
                  Belum ada data jaminan sosial yang dikirimkan.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <th className="p-4">Jenis Bantuan</th>
                        <th className="p-4">Mulai Menerima</th>
                        <th className="p-4">Catatan Pengajuan</th>
                        <th className="p-4">Status Portal</th>
                        <th className="p-4">Keterangan Verifikator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {history.bansos.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-bold text-gray-700">{b.jenisBansos}</td>
                          <td className="p-4 font-medium text-gray-800">{b.tanggalMulai}</td>
                          <td className="p-4 text-gray-500 truncate max-w-xs">{b.catatanPengajuan || '-'}</td>
                          <td className="p-4">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="p-4">
                            {b.status === 'ditolak' && (
                              <span className="text-rose-600 font-medium block max-w-xs truncate" title={b.catatanPenolakan}>
                                Tolak: {b.catatanPenolakan}
                              </span>
                            )}
                            {b.status === 'terverifikasi' && (
                              <span className="text-emerald-700 font-medium block">
                                Diverifikasi oleh {b.verifikator}
                              </span>
                            )}
                            {b.status === 'aktif' && (
                              <span className="text-teal-800 font-semibold block">
                                Aktif &amp; Terkonsolidasi Permanen
                              </span>
                            )}
                            {b.status === 'pending' && <span className="text-gray-400">Menunggu antrean operator</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating System Guide Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row gap-5 items-start">
        <HelpCircle className="w-8 h-8 text-teal-600 shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-gray-800">Bagaimana Alur Integrasi Data Anda?</h4>
          <ol className="text-xs text-gray-500 list-decimal list-inside space-y-1.5 leading-relaxed">
            <li>Anda melakukan <strong>Submit Formulir</strong> mandiri di halaman ini.</li>
            <li>Data masuk ke antrean <strong>Operator Sektoral</strong> (Operator Kesehatan atau Operator Sosial) untuk divalidasi keasliannya dengan mencocokkan dokumen pendukung.</li>
            <li>Jika asli, status berubah menjadi <strong>Terverifikasi</strong>. Jika palsu, data akan <strong>Ditolak</strong>.</li>
            <li>Data yang terverifikasi dialirkan ke <strong>Admin Utama</strong> untuk disetujui (Accept) secara final agar berstatus <strong>Aktif</strong>.</li>
            <li>Selesai! Data aktif Anda akan masuk secara permanen ke <strong>Dashboard Monitoring Pejabat/Supervisor</strong> untuk dianalisis dan diekspor dalam pelaporan resmi kementerian.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
