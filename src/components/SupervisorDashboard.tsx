/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, HeartPulse, ShieldAlert, Download, Search,
  Calendar, MapPin, SlidersHorizontal, BarChart3, PieChart, RefreshCw, FileSpreadsheet, FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { HealthData, BansosData, SystemStats } from '../types';

interface SupervisorDashboardProps {
  token: string;
  triggerToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function SupervisorDashboard({ token, triggerToast }: SupervisorDashboardProps) {
  const [stats, setStats] = useState<SystemStats>({
    totalPendudukTerintegrasi: 0,
    totalLayananKesehatanTerwujud: 0,
    totalPenerimaBansosAktif: 0
  });

  const [consolidated, setConsolidated] = useState<{ health: HealthData[]; bansos: BansosData[] }>({ health: [], bansos: [] });
  const [loading, setLoading] = useState(false);

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('Semua Wilayah');
  const [filterJenisLayanan, setFilterJenisLayanan] = useState('Semua Layanan');
  const [filterJenisBansos, setFilterJenisBansos] = useState('Semua Bansos');

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/supervisor/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataRes = await fetch('/api/supervisor/consolidated-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsRes.ok && dataRes.ok) {
        const statsData = await statsRes.json();
        const consolidatedData = await dataRes.json();
        setStats(statsData);
        setConsolidated(consolidatedData);
      } else {
        triggerToast('Gagal memuat rekapitulasi data sektoral.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Koneksi supervisor terputus.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Apply filters on clientside to feed charts and table views
  const getFilteredData = () => {
    let filteredHealth = [...consolidated.health];
    let filteredBansos = [...consolidated.bansos];

    if (filterStartDate) {
      filteredHealth = filteredHealth.filter(h => h.tanggalLayanan >= filterStartDate);
      filteredBansos = filteredBansos.filter(b => b.tanggalMulai >= filterStartDate);
    }
    if (filterEndDate) {
      filteredHealth = filteredHealth.filter(h => h.tanggalLayanan <= filterEndDate);
      filteredBansos = filteredBansos.filter(b => b.tanggalMulai <= filterEndDate);
    }
    if (filterJenisLayanan !== 'Semua Layanan') {
      filteredHealth = filteredHealth.filter(h => h.jenisLayanan === filterJenisLayanan);
    }
    if (filterJenisBansos !== 'Semua Bansos') {
      filteredBansos = filteredBansos.filter(b => b.jenisBansos === filterJenisBansos);
    }

    return { health: filteredHealth, bansos: filteredBansos };
  };

  const filtered = getFilteredData();

  // Export functions (trigging real CSV/Text downloads as defined in server)
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      let url = `/api/supervisor/export?format=${format}`;
      if (filterJenisLayanan !== 'Semua Layanan') {
        url += `&filterType=jenis_layanan&filterValue=${encodeURIComponent(filterJenisLayanan)}`;
      } else if (filterJenisBansos !== 'Semua Bansos') {
        url += `&filterType=jenis_bansos&filterValue=${encodeURIComponent(filterJenisBansos)}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = format === 'excel' 
          ? `rekapan_terintegrasi_${new Date().toISOString().split('T')[0]}.csv` 
          : `laporan_resmi_terintegrasi_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        triggerToast(`Unduhan laporan format ${format.toUpperCase()} berhasil dimulai!`, 'success');
      } else {
        triggerToast('Gagal memproses ekspor laporan.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal menghubungi server ekspor.', 'error');
    }
  };

  // Charting Logic (Rawat Jalan vs Rawat Inap proportion)
  const rawatJalanCount = filtered.health.filter(h => h.jenisLayanan === 'Rawat Jalan').length;
  const rawatInapCount = filtered.health.filter(h => h.jenisLayanan === 'Rawat Inap').length;
  const totalHealth = rawatJalanCount + rawatInapCount;

  // Bansos counts for bar charts
  const pkhCount = filtered.bansos.filter(b => b.jenisBansos.includes('PKH')).length;
  const bpntCount = filtered.bansos.filter(b => b.jenisBansos.includes('BPNT')).length;
  const bltCount = filtered.bansos.filter(b => b.jenisBansos.includes('BLT')).length;
  const bstCount = filtered.bansos.filter(b => b.jenisBansos.includes('BST')).length;
  const otherBansosCount = filtered.bansos.length - (pkhCount + bpntCount + bltCount + bstCount);
  const maxBansosVal = Math.max(pkhCount, bpntCount, bltCount, bstCount, otherBansosCount, 1);

  return (
    <div id="supervisor-dashboard-block" className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-md border border-emerald-100 uppercase tracking-wider">
            Hak Akses: READ-ONLY SUPERVISI NASIONAL
          </span>
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight mt-2 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#008080]" />
            <span>Dashboard Pemantauan Terpusat</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Visualisasi integrasi NIK lintas sektor real-time. Memantau sebaran data jaminan sosial dan kesehatan nasional.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#008080]/10 hover:bg-[#008080] text-[#008080] hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Dashboard</span>
        </button>
      </div>

      {/* 1. KARTU STATISTIK DASHBOARD (StatCardWidget) */}
      <div id="stat-cards-widget" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#008080]/5 rounded-full -mr-6 -mt-6"></div>
          <div className="w-12 h-12 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080] shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Penduduk Terintegrasi</span>
            <span className="block text-3xl font-black text-gray-800 mt-1 font-mono">{stats.totalPendudukTerintegrasi}</span>
            <span className="block text-[10px] text-emerald-600 mt-1 font-semibold">● Terhubung Lintas Sektor</span>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full -mr-6 -mt-6"></div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Layanan Kesehatan Terwujud</span>
            <span className="block text-3xl font-black text-gray-800 mt-1 font-mono">{stats.totalLayananKesehatanTerwujud}</span>
            <span className="block text-[10px] text-sky-600 mt-1 font-semibold">● Faskes BPJS Terkonsolidasi</span>
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-6 -mt-6"></div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Penerima Bansos Aktif</span>
            <span className="block text-3xl font-black text-gray-800 mt-1 font-mono">{stats.totalPenerimaBansosAktif}</span>
            <span className="block text-[10px] text-indigo-600 mt-1 font-semibold">● Jaring Pengaman Sosial Aktif</span>
          </div>
        </motion.div>

      </div>

      {/* 2. FILTER & EKSPOR DATA MODULE (ExportReportModule) */}
      <div id="export-report-module" className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-4 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#008080]" />
          <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Penyaringan &amp; Ekspor Rekapitulasi Sektoral</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Tanggal Mulai */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Tanggal Awal</span>
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#008080]/20 focus:outline-none"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Tanggal Akhir</span>
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#008080]/20 focus:outline-none"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>

          {/* Jenis Layanan */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Jenis Layanan Kesehatan</label>
            <select
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer focus:ring-2 focus:ring-[#008080]/20 focus:outline-none"
              value={filterJenisLayanan}
              onChange={(e) => setFilterJenisLayanan(e.target.value)}
            >
              <option value="Semua Layanan">Semua Layanan</option>
              <option value="Rawat Jalan">Rawat Jalan</option>
              <option value="Rawat Inap">Rawat Inap</option>
            </select>
          </div>

          {/* Jenis Bansos */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Jenis Jaminan Sosial</label>
            <select
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer focus:ring-2 focus:ring-[#008080]/20 focus:outline-none"
              value={filterJenisBansos}
              onChange={(e) => setFilterJenisBansos(e.target.value)}
            >
              <option value="Semua Bansos">Semua Bansos</option>
              <option value="Program Keluarga Harapan (PKH)">PKH</option>
              <option value="Bantuan Pangan Non Tunai (BPNT)">BPNT</option>
              <option value="Bantuan Langsung Tunai (BLT) Desa">BLT Desa</option>
              <option value="Bantuan Sosial Tunai (BST)">BST</option>
            </select>
          </div>
        </div>

        {/* Buttons Ekspor */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
          <div className="text-[11px] text-gray-500 font-medium">
            Data Terfilter: <strong className="text-gray-700">{filtered.health.length} Kesehatan</strong> &amp; <strong className="text-gray-700">{filtered.bansos.length} Bansos</strong> aktif terintegrasi.
          </div>

          <div className="flex gap-3">
            {/* Export Excel (Dark Green) */}
            <button
              onClick={() => handleExport('excel')}
              className="px-5 py-2.5 bg-[#1B5E20] hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/10 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Rekapan (Excel)</span>
            </button>

            {/* Export PDF (Dark Red) */}
            <button
              onClick={() => handleExport('pdf')}
              className="px-5 py-2.5 bg-[#C62828] hover:bg-rose-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-rose-950/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Ekspor PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. VISUALISASI GRAFIS DATA SEKTORAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sektor Kesehatan - Donut Proportion SVG */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4.5 h-4.5 text-teal-600" />
              <span>Proporsi Sektor Kesehatan</span>
            </h4>
            <span className="text-[11px] text-gray-400 font-medium font-mono">{totalHealth} Terdaftar</span>
          </div>

          {totalHealth === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400 italic">
              Tidak ada data aktif terfilter untuk ditampilkan di diagram.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-6">
              {/* Custom Animated Donut Pie Chart using SVG */}
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  
                  {/* Rawat Jalan Arc */}
                  {rawatJalanCount > 0 && (
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="15.915" 
                      fill="none" 
                      stroke="#008080" 
                      strokeWidth="3.5" 
                      strokeDasharray={`${(rawatJalanCount / totalHealth) * 100} ${100 - ((rawatJalanCount / totalHealth) * 100)}`}
                      strokeDashoffset="0"
                    />
                  )}

                  {/* Rawat Inap Arc */}
                  {rawatInapCount > 0 && (
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="15.915" 
                      fill="none" 
                      stroke="#38bdf8" 
                      strokeWidth="3.5" 
                      strokeDasharray={`${(rawatInapCount / totalHealth) * 100} ${100 - ((rawatInapCount / totalHealth) * 100)}`}
                      strokeDashoffset={-((rawatJalanCount / totalHealth) * 100)}
                    />
                  )}
                </svg>
                {/* Total text center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-gray-800">{totalHealth}</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Kasus</span>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#008080] shrink-0 block"></span>
                  <div>
                    <span className="block font-bold text-gray-700">Rawat Jalan</span>
                    <span className="text-[10px] text-gray-400 font-medium font-mono">{rawatJalanCount} Kasus ({Math.round((rawatJalanCount/totalHealth)*100)}%)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-md bg-sky-400 shrink-0 block"></span>
                  <div>
                    <span className="block font-bold text-gray-700">Rawat Inap</span>
                    <span className="text-[10px] text-gray-400 font-medium font-mono">{rawatInapCount} Kasus ({Math.round((rawatInapCount/totalHealth)*100)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sektor Jaminan Sosial - Bar sebaran program */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
              <span>Sebaran Program Jaminan Sosial</span>
            </h4>
            <span className="text-[11px] text-gray-400 font-medium font-mono">{filtered.bansos.length} Penerima</span>
          </div>

          {filtered.bansos.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400 italic">
              Tidak ada data aktif terfilter untuk ditampilkan di diagram.
            </div>
          ) : (
            <div className="py-2 space-y-4 text-xs">
              
              {/* PKH */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>Program Keluarga Harapan (PKH)</span>
                  <span className="font-mono">{pkhCount} KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(pkhCount/maxBansosVal)*100}%` }}
                    className="bg-indigo-600 h-full rounded-full"
                  />
                </div>
              </div>

              {/* BPNT */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>Bantuan Pangan Non Tunai (BPNT)</span>
                  <span className="font-mono">{bpntCount} KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(bpntCount/maxBansosVal)*100}%` }}
                    className="bg-purple-600 h-full rounded-full"
                  />
                </div>
              </div>

              {/* BLT */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>BLT Desa</span>
                  <span className="font-mono">{bltCount} KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(bltCount/maxBansosVal)*100}%` }}
                    className="bg-sky-500 h-full rounded-full"
                  />
                </div>
              </div>

              {/* BST */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>BST</span>
                  <span className="font-mono">{bstCount} KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(bstCount/maxBansosVal)*100}%` }}
                    className="bg-teal-500 h-full rounded-full"
                  />
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* 4. DETAILS RECORD VIEW FOR CONSOLIDATION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
        <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3">
          Lembar Konsolidasi Sektoral (Status: Aktif)
        </h4>

        {filtered.health.length === 0 && filtered.bansos.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 italic">
            Tidak ada rekapan data berstatus aktif yang memenuhi kriteria penyaringan.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 text-xs">
            
            {/* Health List */}
            <div className="space-y-3.5">
              <span className="font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-xl inline-block uppercase tracking-wider text-[10px]">
                Rekap Medis Aktif ({filtered.health.length})
              </span>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {filtered.health.map(h => (
                  <div key={h.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                      <span className="font-mono font-bold tracking-wider text-gray-700">NIK: {h.nik}</span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">BPJS: {h.statusBpjs}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed text-gray-500">
                      <div>
                        Nama Penduduk: <strong className="text-gray-700 block font-semibold">{h.namaPenduduk}</strong>
                      </div>
                      <div>
                        Tanggal &amp; Layanan: <strong className="text-gray-700 block font-semibold">{h.tanggalLayanan} ({h.jenisLayanan})</strong>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-[11px] text-gray-600 leading-normal">
                      <strong>Diagnosa:</strong> {h.diagnosa || '-'} <br />
                      <strong>Catatan Medis:</strong> {h.catatanMedis || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bansos List */}
            <div className="space-y-3.5">
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl inline-block uppercase tracking-wider text-[10px]">
                Rekap Jaminan Sosial Aktif ({filtered.bansos.length})
              </span>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {filtered.bansos.map(b => (
                  <div key={b.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                      <span className="font-mono font-bold tracking-wider text-gray-700">NIK: {b.nik}</span>
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">Penerima Aktif</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed text-gray-500">
                      <div>
                        Nama Penduduk: <strong className="text-gray-700 block font-semibold">{b.namaPenduduk}</strong>
                      </div>
                      <div>
                        Mulai Menerima: <strong className="text-gray-700 block font-semibold">{b.tanggalMulai}</strong>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-[11px] text-gray-600 leading-normal">
                      <strong>Program Bantuan:</strong> <span className="font-bold text-indigo-900">{b.jenisBansos}</span> <br />
                      <strong>Catatan Pengajuan:</strong> {b.catatanPengajuan || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
