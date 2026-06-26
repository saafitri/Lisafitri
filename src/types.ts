/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'user' | 'operator_kesehatan' | 'operator_sosial' | 'admin' | 'supervisor';

export interface User {
  id: string;
  email: string;
  username: string;
  nama: string;
  role: Role;
  nik?: string; // 16 digit NIK for 'user' role
  createdAt: string;
}

export interface ActiveUser {
  id: string;
  email: string;
  nama: string;
  role: Role;
  lastActive: string;
  ipAddress: string;
}

export type DataStatus = 'pending' | 'terverifikasi' | 'ditolak' | 'aktif';

export interface HealthData {
  id: string;
  nik: string;
  namaPenduduk: string;
  tanggalLayanan: string;
  jenisLayanan: 'Rawat Jalan' | 'Rawat Inap';
  diagnosa?: string;
  statusBpjs: 'Aktif' | 'Tidak Aktif';
  catatanMedis?: string;
  status: DataStatus;
  tanggalMasuk: string;
  verifikator?: string;
  tanggalVerifikasi?: string;
  tanggalAccept?: string;
  catatanPenolakan?: string;
}

export interface BansosData {
  id: string;
  nik: string;
  namaPenduduk: string;
  jenisBansos: string; // e.g. "PKH", "BPNT", "BST", "BLT"
  tanggalMulai: string;
  catatanPengajuan?: string;
  status: DataStatus;
  tanggalMasuk: string;
  verifikator?: string;
  tanggalVerifikasi?: string;
  tanggalAccept?: string;
  catatanPenolakan?: string;
}

export interface AuditLog {
  id: string;
  waktu: string;
  idPengguna: string;
  namaPengguna: string;
  rolePengguna: Role;
  aksi: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUTH' | 'BACKUP' | 'VERIFY' | 'ACCEPT' | 'REJECT';
  tabelTerkait: 'health_data' | 'bansos_data' | 'users' | 'system';
  detailPerubahan: string; // JSON string representation
  ipAddress: string;
}

export interface BackupHistory {
  id: string;
  timestamp: string;
  filename: string;
  type: 'AUTO' | 'MANUAL';
  size: string;
}

export interface SystemStats {
  totalPendudukTerintegrasi: number;
  totalLayananKesehatanTerwujud: number;
  totalPenerimaBansosAktif: number;
}
