/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, Database, Eye, CheckSquare, ShieldAlert,
  UserPlus, Trash2, ShieldCheck as AcceptIcon, Download, RefreshCw,
  Clock, Search, AlertCircle, Radio, Terminal, Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, HealthData, BansosData, AuditLog, BackupHistory, Role } from '../types';
import StatusBadge from './StatusBadge';

interface AdminDashboardProps {
  token: string;
  triggerToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  initialSubTab?: string; // e.g. 'admin-approval' | 'admin-users' | 'admin-logs' | 'admin-backup'
}

export default function AdminDashboard({ token, triggerToast, initialSubTab = 'admin-approval' }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialSubTab);

  // States
  const [verifiedHealth, setVerifiedHealth] = useState<HealthData[]>([]);
  const [verifiedBansos, setVerifiedBansos] = useState<BansosData[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeTracker, setActiveTracker] = useState<{ total: number; users: any[] }>({ total: 0, users: [] });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backupsList, setBackupsList] = useState<BackupHistory[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');

  // Form User States
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formRole, setFormRole] = useState<Role>('user');
  const [formPassword, setFormPassword] = useState('');
  const [formNik, setFormNik] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Fetch functions
  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/admin/pending-approvals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVerifiedHealth(data.health);
        setVerifiedBansos(data.bansos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveTracker = async () => {
    try {
      const res = await fetch('/api/admin/active-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTracker(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-trail', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/admin/backup-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackupsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchApprovals(),
      fetchUsers(),
      fetchActiveTracker(),
      fetchAuditLogs(),
      fetchBackups()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    // Poll active user tracker every 30 seconds for live feedback
    const trackerInterval = setInterval(fetchActiveTracker, 30000);
    return () => clearInterval(trackerInterval);
  }, [token]);

  // Sync tab with sidebar clicks (passed through props)
  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  // Handle Accept Final Approval
  const handleAccept = async (id: string, type: 'health' | 'bansos') => {
    try {
      const res = await fetch('/api/admin/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, type })
      });
      if (res.ok) {
        triggerToast('Data disetujui (Accept) secara permanen. Status dialihkan ke AKTIF.', 'success');
        fetchApprovals();
        fetchAuditLogs(); // refresh log
      } else {
        triggerToast('Gagal menyetujui berkas.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal terhubung ke server.', 'error');
    }
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formUsername || !formNama || !formPassword) {
      triggerToast('Mohon lengkapi seluruh kolom formulir.', 'warning');
      return;
    }
    if (formRole === 'user' && (!formNik || formNik.length !== 16)) {
      triggerToast('Penduduk wajib didaftarkan dengan NIK 16 digit.', 'error');
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formEmail,
          username: formUsername,
          nama: formNama,
          role: formRole,
          password: formPassword,
          nik: formRole === 'user' ? formNik : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast('Pengguna baru berhasil dibuat dengan enkripsi password bcrypt.', 'success');
        // Reset form
        setFormEmail('');
        setFormUsername('');
        setFormNama('');
        setFormPassword('');
        setFormNik('');
        fetchUsers();
        fetchAuditLogs();
      } else {
        triggerToast(data.message || 'Gagal membuat pengguna baru.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Koneksi database gagal.', 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Pengguna berhasil dihapus secara permanen.', 'success');
        fetchUsers();
        fetchAuditLogs();
      } else {
        triggerToast(data.message || 'Gagal menghapus pengguna.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Koneksi server gagal.', 'error');
    }
  };

  // Handle Trigger Manual Backup
  const handleManualBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Backup database manual berhasil dieksekusi. File .json aman di server.', 'success');
        fetchBackups();
        fetchAuditLogs();
      } else {
        triggerToast(data.message || 'Gagal menjalankan backup.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal memproses pemicu backup.', 'error');
    }
  };

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => 
    log.namaPengguna.toLowerCase().includes(logsSearch.toLowerCase()) ||
    log.aksi.toLowerCase().includes(logsSearch.toLowerCase()) ||
    log.tabelTerkait.toLowerCase().includes(logsSearch.toLowerCase()) ||
    log.detailPerubahan.toLowerCase().includes(logsSearch.toLowerCase())
  );

  return (
    <div id="admin-dashboard-layout" className="space-y-8">
      
      {/* Top Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#008080]" />
            <span>Panel Pengendalian Administrator</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Editor &amp; Auditor Sistem Integrasi Sektoral. Mengakses data terverifikasi operator, live user, logs audit, dan database backup.
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Semua Panel</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-200 gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('admin-approval')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 shrink-0 ${
            activeTab === 'admin-approval' 
              ? 'border-[#008080] text-[#008080] bg-teal-50/40 font-black' 
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Final Approval ({verifiedHealth.length + verifiedBansos.length})
        </button>
        <button
          onClick={() => setActiveTab('admin-users')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 shrink-0 ${
            activeTab === 'admin-users' 
              ? 'border-[#008080] text-[#008080] bg-teal-50/40 font-black' 
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Manajemen Pengguna ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('admin-logs')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 shrink-0 ${
            activeTab === 'admin-logs' 
              ? 'border-[#008080] text-[#008080] bg-teal-50/40 font-black' 
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Audit Logs &amp; Live Tracker
        </button>
        <button
          onClick={() => setActiveTab('admin-backup')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 shrink-0 ${
            activeTab === 'admin-backup' 
              ? 'border-[#008080] text-[#008080] bg-teal-50/40 font-black' 
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Backup &amp; Konfigurasi
        </button>
      </div>

      {/* PANEL CONTENTS */}
      <div id="panel-content-body">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500 font-bold tracking-wider">Menyelaraskan data pusat...</span>
          </div>
        ) : (
          <div>
            
            {/* 1. FINAL APPROVAL TAB */}
            {activeTab === 'admin-approval' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-800 tracking-tight flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
                      <span>FinalApprovalTable (Persetujuan Akhir)</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Dokumen di bawah ini telah divalidasi keasliannya oleh Operator Sektoral. Klik tombol <strong className="text-emerald-600">Accept</strong> untuk memasukkannya ke rekapitulasi data nasional.
                    </p>
                  </div>

                  {verifiedHealth.length === 0 && verifiedBansos.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-xl text-xs text-gray-400">
                      Tidak ada data terverifikasi operator yang menunggu persetujuan akhir.
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Health list */}
                      {verifiedHealth.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 inline-block uppercase tracking-wider">
                            Sektor Layanan Kesehatan ({verifiedHealth.length})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                  <th className="p-4">NIK</th>
                                  <th className="p-4">Nama Penduduk</th>
                                  <th className="p-4">Jenis Layanan</th>
                                  <th className="p-4">BPJS</th>
                                  <th className="p-4">Verifikator (Operator)</th>
                                  <th className="p-4 text-center">Status</th>
                                  <th className="p-4 text-right">Aksi Final</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 text-xs">
                                {verifiedHealth.map((h) => (
                                  <tr key={h.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 font-mono font-bold text-gray-700 tracking-wider">{h.nik}</td>
                                    <td className="p-4 font-medium text-gray-800">{h.namaPenduduk}</td>
                                    <td className="p-4 font-medium">{h.jenisLayanan}</td>
                                    <td className="p-4">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${h.statusBpjs === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {h.statusBpjs}
                                      </span>
                                    </td>
                                    <td className="p-4 text-gray-500 italic">verified by {h.verifikator}</td>
                                    <td className="p-4 text-center">
                                      <StatusBadge status={h.status} />
                                    </td>
                                    <td className="p-4 text-right">
                                      <button
                                        onClick={() => handleAccept(h.id, 'health')}
                                        className="px-3.5 py-1.5 bg-[#2ECC71] hover:bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/15 flex items-center gap-1 inline-flex transition-colors"
                                      >
                                        <AcceptIcon className="w-3.5 h-3.5" />
                                        <span>Accept</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Bansos list */}
                      {verifiedBansos.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block uppercase tracking-wider">
                            Sektor Jaminan Sosial / Bansos ({verifiedBansos.length})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                  <th className="p-4">NIK</th>
                                  <th className="p-4">Nama Penduduk</th>
                                  <th className="p-4">Program Bansos</th>
                                  <th className="p-4">Mulai Penerimaan</th>
                                  <th className="p-4">Verifikator (Operator)</th>
                                  <th className="p-4 text-center">Status</th>
                                  <th className="p-4 text-right">Aksi Final</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 text-xs">
                                {verifiedBansos.map((b) => (
                                  <tr key={b.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 font-mono font-bold text-gray-700 tracking-wider">{b.nik}</td>
                                    <td className="p-4 font-medium text-gray-800">{b.namaPenduduk}</td>
                                    <td className="p-4 font-bold text-indigo-900">{b.jenisBansos}</td>
                                    <td className="p-4 text-gray-600">{b.tanggalMulai}</td>
                                    <td className="p-4 text-gray-500 italic">verified by {b.verifikator}</td>
                                    <td className="p-4 text-center">
                                      <StatusBadge status={b.status} />
                                    </td>
                                    <td className="p-4 text-right">
                                      <button
                                        onClick={() => handleAccept(b.id, 'bansos')}
                                        className="px-3.5 py-1.5 bg-[#2ECC71] hover:bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/15 flex items-center gap-1 inline-flex transition-colors"
                                      >
                                        <AcceptIcon className="w-3.5 h-3.5" />
                                        <span>Accept</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. USER MANAGEMENT TAB */}
            {activeTab === 'admin-users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Add User */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 h-fit">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#008080]" />
                      <span>Tambah Pengguna Baru</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Sistem secara otomatis meng-hash password penduduk/petugas dengan bcryptjs.</p>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                        placeholder="Nama Lengkap"
                        value={formNama}
                        onChange={(e) => setFormNama(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Username *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                          placeholder="username"
                          value={formUsername}
                          onChange={(e) => setFormUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Peran Akses (RBAC) *</label>
                        <select
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value as Role)}
                        >
                          <option value="user">Penduduk (User)</option>
                          <option value="operator_kesehatan">Operator Kesehatan</option>
                          <option value="operator_sosial">Operator Sosial / Dukcapil</option>
                          <option value="admin">Administrator</option>
                          <option value="supervisor">Supervisor</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                        placeholder="user@kementerian.go.id"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                      />
                    </div>

                    {formRole === 'user' && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">NIK Penduduk (16 Digit) *</label>
                        <input
                          type="text"
                          maxLength={16}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono tracking-wider focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                          placeholder="NIK 16 Digit"
                          value={formNik}
                          onChange={(e) => setFormNik(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kata Sandi (Password) *</label>
                      <input
                        type="password"
                        required
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingUser}
                      className="w-full py-2.5 bg-[#008080] hover:opacity-90 active:scale-[0.99] text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-[#008080]/10 flex items-center justify-center gap-2"
                    >
                      {submittingUser ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Buat Pengguna (Bcrypt Hash)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* User List */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#008080]" />
                        <span>Manajemen Database Pengguna</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Daftar penduduk, operator, admin, dan supervisor yang berhak mengakses portal.</p>
                    </div>
                    <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-full font-bold text-gray-600 font-mono">
                      {usersList.length} Total
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          <th className="p-3">Nama Pengguna / Email</th>
                          <th className="p-3">Username</th>
                          <th className="p-3">NIK</th>
                          <th className="p-3">Akses (Role)</th>
                          <th className="p-3 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs">
                        {usersList.map((usr) => (
                          <tr key={usr.id} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 block">{usr.nama}</span>
                                <span className="text-[10px] text-gray-400 block">{usr.email}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-gray-600">{usr.username}</td>
                            <td className="p-3 font-mono text-gray-500">{usr.nik || '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                usr.role === 'admin' 
                                  ? 'bg-red-100 text-red-800' 
                                  : usr.role === 'supervisor' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : usr.role.startsWith('operator')
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}>
                                {usr.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteUser(usr.id)}
                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-gray-400 rounded-lg transition-colors cursor-pointer inline-flex"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. AUDIT LOGS & LIVE TRACKER TAB */}
            {activeTab === 'admin-logs' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Active user tracker + search logs widget */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Live User Tracker (ActiveUserList) */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                          <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                          <span>ActiveUserList (Live Tracker)</span>
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Sesi token JWT aktif berinteraksi 15 menit terakhir.</p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-1 border border-emerald-100 rounded-lg font-mono">
                        {activeTracker.total} Aktif
                      </span>
                    </div>

                    {activeTracker.users.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 italic">
                        Tidak ada pengguna lain yang online saat ini.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {activeTracker.users.map((act) => (
                          <div key={act.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 border border-gray-100 rounded-xl text-xs">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                              {act.nama.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <span className="font-bold text-gray-700 block truncate">{act.nama}</span>
                              <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[9px] font-semibold">{act.role}</span>
                                <span className="font-mono flex items-center gap-1">
                                  <Laptop className="w-3 h-3 text-gray-300" />
                                  {act.ipAddress}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AuditTrailTable logs search and intro */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-[#008080]" />
                        <span>AuditTrailTable (Sistem Pengawasan)</span>
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Tabel log aktivitas di bawah ini bersifat <strong>read-only</strong> dan tidak dapat didelete/dimodifikasi demi integritas audit hukum. Mencatat audit detail perubahan JSON, aksi pemicu, waktu, serta alamat IP pengakses.
                      </p>
                    </div>

                    <div className="relative w-full mt-4">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-[#008080] focus:outline-none"
                        placeholder="Saring log berdasarkan aksi (CREATE, BACKUP, AUTH, VERIFY, ACCEPT), nama, atau target..."
                        value={logsSearch}
                        onChange={(e) => setLogsSearch(e.target.value)}
                      />
                    </div>
                  </div>

                </div>

                {/* AuditTrailTable actual records */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left border-collapse" id="audit-trail-table">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          <th className="p-3.5">Waktu</th>
                          <th className="p-3.5">ID &amp; Pelaku</th>
                          <th className="p-3.5">Aksi</th>
                          <th className="p-3.5">Target Sektor</th>
                          <th className="p-3.5">Detail Perubahan (JSON Payload)</th>
                          <th className="p-3.5">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-[11px] font-medium">
                        {filteredLogs.slice(0, 50).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/50">
                            <td className="p-3.5 font-mono text-gray-400 whitespace-nowrap">
                              {new Date(log.waktu).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5">
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 block">{log.namaPengguna}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">ID: {log.idPengguna} ({log.rolePengguna})</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ['CREATE', 'VERIFY', 'ACCEPT'].includes(log.aksi)
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : log.aksi === 'REJECT' || log.aksi === 'DELETE'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {log.aksi}
                              </span>
                            </td>
                            <td className="p-3.5 font-semibold text-gray-600 uppercase tracking-wide">
                              {log.tabelTerkait}
                            </td>
                            <td className="p-3.5 max-w-sm">
                              <code className="block p-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] text-gray-600 font-mono truncate hover:whitespace-normal hover:break-all transition-all max-h-20 overflow-y-auto leading-normal">
                                {log.detailPerubahan}
                              </code>
                            </td>
                            <td className="p-3.5 font-mono text-gray-500">{log.ipAddress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[11px] text-gray-400 text-right mt-3 font-semibold">
                    Menampilkan {Math.min(50, filteredLogs.length)} log aktivitas terbaru.
                  </div>
                </div>

              </motion.div>
            )}

            {/* 4. BACKUP & CONFIGURATION TAB */}
            {activeTab === 'admin-backup' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Backup Control (BackupWidget) */}
                  <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-5 h-fit">
                    <div className="border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#008080]" />
                        <span>BackupWidget Database</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Automasi keamanan data pusat sektoral.</p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl leading-relaxed text-emerald-800">
                        <span className="font-bold block text-emerald-900 mb-1">Automasi Berjalan</span>
                        Fitur pencadangan otomatis (Auto Daily Backup) dijadwalkan secara background untuk berjalan setiap hari pada pukul <strong>02.00 WIB</strong> dini hari.
                      </div>

                      <div className="space-y-2">
                        <span className="block font-bold text-gray-500 uppercase tracking-wider text-[10px]">Pemicu Backup Manual</span>
                        <p className="text-[11px] text-gray-400 leading-normal">Picu pencadangan status database riil saat ini secara instan sebagai titik pemulihan darurat.</p>
                      </div>

                      <button
                        onClick={handleManualBackup}
                        className="w-full py-3 bg-[#008080] hover:opacity-90 active:scale-[0.99] text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-[#008080]/15 flex items-center justify-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        <span>Picu Backup Manual Sekarang</span>
                      </button>
                    </div>
                  </div>

                  {/* Backup History list */}
                  <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
                    <div className="border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#008080]" />
                        <span>Riwayat Backup Log</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Daftar file arsip database JSON yang tersimpan aman di direktori server.</p>
                    </div>

                    {backupsList.length === 0 ? (
                      <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-xl text-xs text-gray-400">
                        Belum ada riwayat backup database terekam.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              <th className="p-3.5">Waktu Backup</th>
                              <th className="p-3.5">Nama File Backup (.json)</th>
                              <th className="p-3.5">Metode</th>
                              <th className="p-3.5 text-right">Ukuran File</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs">
                            {backupsList.map((bk) => (
                              <tr key={bk.id} className="hover:bg-gray-50/50">
                                <td className="p-3.5 font-mono text-gray-600">
                                  {new Date(bk.timestamp).toLocaleString('id-ID')}
                                </td>
                                <td className="p-3.5 font-mono text-gray-700 font-bold max-w-xs truncate" title={bk.filename}>
                                  {bk.filename}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    bk.type === 'AUTO' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-sky-100 text-sky-800'
                                  }`}>
                                    {bk.type}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right font-mono text-gray-500">{bk.size}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
