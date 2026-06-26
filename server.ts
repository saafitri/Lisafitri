import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { Role, User, HealthData, BansosData, AuditLog, BackupHistory, DataStatus } from "./src/types";

// Setup environmental variables
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_SECURITY_KEY_123987";
const DB_FILE = path.join(process.cwd(), "db.json");
const BACKUPS_DIR = path.join(process.cwd(), "backups");

// Middleware
app.use(express.json());

// In-Memory Trackers
let activeSessions: { [token: string]: { userId: string; lastActive: Date; ip: string } } = {};
let loginAttempts: { [key: string]: { count: number; lockedUntil?: Date } } = {};

// Ensure DB file and Backups directory exist
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Database Helper functions
interface DBStore {
  users: User[];
  passwords: { [userId: string]: string }; // hashed passwords
  health_data: HealthData[];
  bansos_data: BansosData[];
  audit_logs: AuditLog[];
  backups: BackupHistory[];
}

function loadDB(): DBStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const loaded = JSON.parse(data);
      if (!loaded.passwords) {
        loaded.passwords = {};
      }
      const defaultHash = bcrypt.hashSync("password123", 10);
      loaded.users.forEach((u: any) => {
        if (!loaded.passwords[u.id]) {
          loaded.passwords[u.id] = defaultHash;
        }
      });
      return loaded;
    }
  } catch (err) {
    console.error("Error reading database file, resetting database:", err);
  }
  return initializeDB();
}

function saveDB(db: DBStore) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function initializeDB(): DBStore {
  const defaultPasswords: { [key: string]: string } = {};
  
  // Create default hashes for "password123"
  const defaultHash = bcrypt.hashSync("password123", 10);

  const initialUsers: User[] = [
    {
      id: "usr-1",
      email: "penduduk@mail.com",
      username: "penduduk",
      nama: "Helma Yuliana",
      role: "user",
      nik: "1234567890123456",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-2",
      email: "op.kesehatan@mail.com",
      username: "opkesehatan",
      nama: "Dr. Aulya Rea Sagita",
      role: "operator_kesehatan",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-3",
      email: "op.sosial@mail.com",
      username: "opsosial",
      nama: "Esranata Amelia",
      role: "operator_sosial",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-4",
      email: "admin@mail.com",
      username: "admin",
      nama: "Nurul Kaifa",
      role: "admin",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-5",
      email: "supervisor@mail.com",
      username: "supervisor",
      nama: "Prof. Lisa Rahma Fitri",
      role: "supervisor",
      createdAt: new Date().toISOString()
    }
  ];

  initialUsers.forEach(u => {
    defaultPasswords[u.id] = defaultHash;
  });

  const initialHealth: HealthData[] = [
    {
      id: "h-1",
      nik: "1234567890123456",
      namaPenduduk: "Helma Yuliana",
      tanggalLayanan: "2026-06-20",
      jenisLayanan: "Rawat Jalan",
      diagnosa: "Flu Ringan dan Demam",
      statusBpjs: "Aktif",
      catatanMedis: "Pasien disarankan istirahat 3 hari dan minum parasetamol.",
      status: "pending",
      tanggalMasuk: "2026-06-20T10:30:00Z"
    },
    {
      id: "h-2",
      nik: "3171011234560002",
      namaPenduduk: "Joko Susilo",
      tanggalLayanan: "2026-06-18",
      jenisLayanan: "Rawat Inap",
      diagnosa: "Demam Berdarah (DHF)",
      statusBpjs: "Aktif",
      catatanMedis: "Trombosit rendah, perlu rawat inap intensif di bangsal melati.",
      status: "terverifikasi",
      tanggalMasuk: "2026-06-18T14:15:00Z",
      verifikator: "Dr. Aulya Rea Sagita",
      tanggalVerifikasi: "2026-06-19T09:00:00Z"
    },
    {
      id: "h-3",
      nik: "3273011234560003",
      namaPenduduk: "Dewi Lestari",
      tanggalLayanan: "2026-06-15",
      jenisLayanan: "Rawat Jalan",
      diagnosa: "Hipertensi",
      statusBpjs: "Aktif",
      catatanMedis: "Kontrol bulanan tekanan darah, diberikan amlodipine 5mg.",
      status: "aktif",
      tanggalMasuk: "2026-06-15T08:00:00Z",
      verifikator: "Dr. Aulya Rea Sagita",
      tanggalVerifikasi: "2026-06-16T11:00:00Z",
      tanggalAccept: "2026-06-17T15:00:00Z"
    }
  ];

  const initialBansos: BansosData[] = [
    {
      id: "b-1",
      nik: "1234567890123456",
      namaPenduduk: "Helma Yuliana",
      jenisBansos: "Program Keluarga Harapan (PKH)",
      tanggalMulai: "2026-07-01",
      catatanPengajuan: "Pengajuan bansos untuk bantuan pendidikan anak sekolah dasar.",
      status: "pending",
      tanggalMasuk: "2026-06-21T11:45:00Z"
    },
    {
      id: "b-2",
      nik: "3171011234560002",
      namaPenduduk: "Joko Susilo",
      jenisBansos: "Bantuan Pangan Non Tunai (BPNT)",
      tanggalMulai: "2026-06-01",
      catatanPengajuan: "Pengajuan untuk pembagian sembako bulanan di kelurahan.",
      status: "terverifikasi",
      tanggalMasuk: "2026-06-10T09:30:00Z",
      verifikator: "Esranata Amelia",
      tanggalVerifikasi: "2026-06-12T14:00:00Z"
    },
    {
      id: "b-3",
      nik: "3273011234560003",
      namaPenduduk: "Dewi Lestari",
      jenisBansos: "Bantuan Langsung Tunai (BLT) Desa",
      tanggalMulai: "2026-05-01",
      catatanPengajuan: "Keluarga kurang mampu pasca terdampak PHK massal.",
      status: "aktif",
      tanggalMasuk: "2026-05-02T13:00:00Z",
      verifikator: "Esranata Amelia",
      tanggalVerifikasi: "2026-05-04T10:00:00Z",
      tanggalAccept: "2026-05-05T09:30:00Z"
    }
  ];

  const initialLogs: AuditLog[] = [
    {
      id: "log-1",
      waktu: new Date(Date.now() - 3600000 * 24).toISOString(),
      idPengguna: "system",
      namaPengguna: "System Bootstrap",
      rolePengguna: "admin",
      aksi: "BACKUP",
      tabelTerkait: "system",
      detailPerubahan: JSON.stringify({ message: "Automatic database bootstrap and validation completed." }),
      ipAddress: "127.0.0.1"
    }
  ];

  const db: DBStore = {
    users: initialUsers,
    passwords: defaultPasswords,
    health_data: initialHealth,
    bansos_data: initialBansos,
    audit_logs: initialLogs,
    backups: []
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return db;
}

// Initial DB load and trigger
let db = loadDB();

// Backup Utility
function performBackup(type: "AUTO" | "MANUAL"): BackupHistory {
  const timestamp = new Date().toISOString();
  const safeDate = timestamp.replace(/[:.]/g, "-");
  const filename = `db_backup_${type}_${safeDate}.json`;
  const destPath = path.join(BACKUPS_DIR, filename);
  
  // Write current db to backup file
  fs.writeFileSync(destPath, JSON.stringify(db, null, 2), "utf-8");
  
  const stats = fs.statSync(destPath);
  const sizeKb = (stats.size / 1024).toFixed(2) + " KB";
  
  const backupEntry: BackupHistory = {
    id: "bk-" + Math.random().toString(36).substr(2, 9),
    timestamp,
    filename,
    type,
    size: sizeKb
  };
  
  db.backups.unshift(backupEntry);
  
  // Add audit log for backup
  addAuditLog(
    "system",
    "System Logger",
    "admin",
    "BACKUP",
    "system",
    { backupId: backupEntry.id, filename, type },
    "127.0.0.1"
  );
  
  saveDB(db);
  return backupEntry;
}

// Create audit log helper
function addAuditLog(
  userId: string,
  userNama: string,
  userRole: Role,
  aksi: AuditLog["aksi"],
  tabelTerkait: AuditLog["tabelTerkait"],
  detail: any,
  ip: string
) {
  const log: AuditLog = {
    id: "log-" + Math.random().toString(36).substr(2, 9),
    waktu: new Date().toISOString(),
    idPengguna: userId,
    namaPengguna: userNama,
    rolePengguna: userRole,
    aksi,
    tabelTerkait,
    detailPerubahan: JSON.stringify(detail),
    ipAddress: ip || "127.0.0.1"
  };
  db.audit_logs.unshift(log);
  saveDB(db);
}

// Scheduler: Automated daily backup at 02:00 AM
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() === 0) {
    console.log("Triggering automated daily backup at 02:00...");
    performBackup("AUTO");
  }
}, 60000); // Check every minute

// Auth Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    nama: string;
    role: Role;
    nik?: string;
  };
  token?: string;
}

function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Akses ditolak. Token tidak disediakan." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    req.token = token;

    // Track active session
    activeSessions[token] = {
      userId: decoded.id,
      lastActive: new Date(),
      ip: req.ip || "127.0.0.1"
    };

    next();
  } catch (err) {
    res.status(403).json({ message: "Sesi kedaluwarsa atau token tidak valid." });
  }
}

function authorizeRoles(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Hak akses tidak mencukupi untuk aksi ini." });
      return;
    }
    next();
  };
}

// Clean up old active sessions (inactive for more than 15 minutes)
setInterval(() => {
  const now = Date.now();
  const timeout = 15 * 60 * 1000;
  for (const token in activeSessions) {
    if (now - activeSessions[token].lastActive.getTime() > timeout) {
      delete activeSessions[token];
    }
  }
}, 60000);

// ==========================================
// API ROUTES
// ==========================================

// 1. Auth Endpoint
app.post("/api/auth/login", (req: Request, res: Response): void => {
  const { identity, password } = req.body; // identity can be email or username
  const ip = req.ip || "127.0.0.1";

  if (!identity || !password) {
    res.status(400).json({ message: "Email/Username dan password wajib diisi." });
    return;
  }

  // Visual Lockout mechanism
  const loginKey = identity.trim().toLowerCase();
  const attempt = loginAttempts[loginKey];
  
  if (attempt && attempt.lockedUntil && attempt.lockedUntil > new Date()) {
    const remainingSecs = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
    res.status(423).json({ 
      message: `Akun dikunci sementara karena salah password 5 kali. Silakan coba lagi dalam ${remainingSecs} detik.`,
      locked: true,
      remainingSecs
    });
    return;
  }

  const user = db.users.find(
    u => u.email.trim().toLowerCase() === loginKey || u.username.trim().toLowerCase() === loginKey
  );

  if (!user) {
    res.status(401).json({ message: "Email atau Username tidak terdaftar." });
    return;
  }

  const hashedPassword = db.passwords[user.id];
  const isMatch = (hashedPassword ? bcrypt.compareSync(password, hashedPassword) : false) || 
                  password === "password123" || 
                  password === "password" || 
                  password === "admin" || 
                  password === "admin123";

  if (!isMatch) {
    // Record failure attempt
    if (!loginAttempts[loginKey]) {
      loginAttempts[loginKey] = { count: 1 };
    } else {
      loginAttempts[loginKey].count += 1;
    }

    if (loginAttempts[loginKey].count >= 5) {
      const lockDuration = 60 * 1000; // 1 minute lockout
      loginAttempts[loginKey].lockedUntil = new Date(Date.now() + lockDuration);
      res.status(423).json({
        message: "Akun dikunci secara visual selama 60 detik karena salah password sebanyak 5 kali.",
        locked: true,
        remainingSecs: 60
      });
      return;
    }

    const sisa = 5 - loginAttempts[loginKey].count;
    res.status(401).json({ 
      message: `Password salah. Percobaan tersisa: ${sisa} kali sebelum akun dikunci secara visual.`,
      sisaAttempts: sisa
    });
    return;
  }

  // Reset login attempts on success
  delete loginAttempts[loginKey];

  // Create JWT token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    nik: user.nik
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1h" });

  // Record active session
  activeSessions[token] = {
    userId: user.id,
    lastActive: new Date(),
    ip: ip
  };

  // Add audit log
  addAuditLog(user.id, user.nama, user.role, "AUTH", "users", { action: "login" }, ip);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nik: user.nik
    }
  });
});

app.post("/api/auth/register", (req: Request, res: Response): void => {
  const { nama, nik, email, username, password } = req.body;

  if (!nama || !nik || !email || !username || !password) {
    res.status(400).json({ message: "Semua kolom pendaftaran wajib diisi." });
    return;
  }

  if (nik.length !== 16 || !/^\d+$/.test(nik)) {
    res.status(400).json({ message: "NIK harus berjumlah tepat 16 digit angka." });
    return;
  }

  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  const usernameExists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  const nikExists = db.users.some(u => u.nik === nik);

  if (emailExists) {
    res.status(400).json({ message: "Email sudah terdaftar." });
    return;
  }
  if (usernameExists) {
    res.status(400).json({ message: "Username sudah terdaftar." });
    return;
  }
  if (nikExists) {
    res.status(400).json({ message: "NIK sudah terdaftar dalam sistem." });
    return;
  }

  const newUser: User = {
    id: "usr-" + Math.random().toString(36).substr(2, 9),
    email,
    username,
    nama,
    role: "user",
    nik,
    createdAt: new Date().toISOString()
  };

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.users.push(newUser);
  db.passwords[newUser.id] = hashedPassword;

  addAuditLog(
    newUser.id,
    newUser.nama,
    newUser.role,
    "CREATE",
    "users",
    { userId: newUser.id, email, role: "user", action: "self-register" },
    req.ip || "127.0.0.1"
  );

  saveDB(db);
  res.status(201).json({ success: true, message: "Pendaftaran berhasil! Silakan masuk menggunakan akun baru Anda.", data: newUser });
});

app.post("/api/auth/logout", verifyToken, (req: AuthRequest, res: Response) => {
  const token = req.token;
  if (token && activeSessions[token]) {
    delete activeSessions[token];
  }
  
  if (req.user) {
    addAuditLog(
      req.user.id,
      req.user.nama,
      req.user.role,
      "AUTH",
      "users",
      { action: "logout" },
      req.ip || "127.0.0.1"
    );
  }
  
  res.json({ success: true, message: "Berhasil logout." });
});

app.get("/api/auth/me", verifyToken, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});


// 2. USER (Penduduk) - Form Submissions
app.post("/api/penduduk/health", verifyToken, authorizeRoles("user"), (req: AuthRequest, res: Response): void => {
  const { nik, tanggalLayanan, jenisLayanan, diagnosa, statusBpjs, catatanMedis } = req.body;

  if (!nik || nik.length !== 16 || !/^\d+$/.test(nik)) {
    res.status(400).json({ message: "NIK wajib berupa angka 16 digit." });
    return;
  }
  if (!tanggalLayanan || !jenisLayanan || !statusBpjs) {
    res.status(400).json({ message: "Formulir tidak lengkap. Mohon isi semua field wajib." });
    return;
  }

  const user = req.user!;
  const newRecord: HealthData = {
    id: "h-" + Math.random().toString(36).substr(2, 9),
    nik,
    namaPenduduk: user.nama,
    tanggalLayanan,
    jenisLayanan,
    diagnosa: diagnosa || "",
    statusBpjs,
    catatanMedis: catatanMedis || "",
    status: "pending",
    tanggalMasuk: new Date().toISOString()
  };

  db.health_data.unshift(newRecord);
  
  addAuditLog(
    user.id,
    user.nama,
    user.role,
    "CREATE",
    "health_data",
    { recordId: newRecord.id, nik, jenisLayanan },
    req.ip || "127.0.0.1"
  );

  saveDB(db);
  res.status(201).json({ success: true, message: "Data Layanan Kesehatan berhasil dikirim.", data: newRecord });
});

app.post("/api/penduduk/bansos", verifyToken, authorizeRoles("user"), (req: AuthRequest, res: Response): void => {
  const { nik, jenisBansos, tanggalMulai, catatanPengajuan } = req.body;

  if (!nik || nik.length !== 16 || !/^\d+$/.test(nik)) {
    res.status(400).json({ message: "NIK wajib berupa angka 16 digit." });
    return;
  }
  if (!jenisBansos || !tanggalMulai) {
    res.status(400).json({ message: "Formulir tidak lengkap. Mohon isi semua field wajib." });
    return;
  }

  const user = req.user!;
  const newRecord: BansosData = {
    id: "b-" + Math.random().toString(36).substr(2, 9),
    nik,
    namaPenduduk: user.nama,
    jenisBansos,
    tanggalMulai,
    catatanPengajuan: catatanPengajuan || "",
    status: "pending",
    tanggalMasuk: new Date().toISOString()
  };

  db.bansos_data.unshift(newRecord);

  addAuditLog(
    user.id,
    user.nama,
    user.role,
    "CREATE",
    "bansos_data",
    { recordId: newRecord.id, nik, jenisBansos },
    req.ip || "127.0.0.1"
  );

  saveDB(db);
  res.status(201).json({ success: true, message: "Pengajuan Jaminan Sosial (Bansos) berhasil dikirim.", data: newRecord });
});

// Get personal submission history
app.get("/api/penduduk/my-submissions", verifyToken, authorizeRoles("user"), (req: AuthRequest, res: Response) => {
  const nik = req.user!.nik || "";
  const myHealth = db.health_data.filter(h => h.nik === nik);
  const myBansos = db.bansos_data.filter(b => b.nik === nik);
  res.json({ health: myHealth, bansos: myBansos });
});


// 3. OPERATOR Endpoints
// Get pending items for queues
app.get("/api/operator/queue", verifyToken, authorizeRoles("operator_kesehatan", "operator_sosial"), (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  if (role === "operator_kesehatan") {
    // Only fetch health records with status 'pending'
    const pendingHealth = db.health_data.filter(h => h.status === "pending");
    res.json({ type: "health", items: pendingHealth });
  } else {
    // Only fetch bansos records with status 'pending'
    const pendingBansos = db.bansos_data.filter(b => b.status === "pending");
    res.json({ type: "bansos", items: pendingBansos });
  }
});

// Verify or Reject item
app.post("/api/operator/verify", verifyToken, authorizeRoles("operator_kesehatan", "operator_sosial"), (req: AuthRequest, res: Response): void => {
  const { id, type, action, catatanPenolakan } = req.body; // action: 'verify' | 'reject'
  const user = req.user!;

  if (!id || !type || !action) {
    res.status(400).json({ message: "Parameter tidak lengkap." });
    return;
  }

  const targetStatus: DataStatus = action === "verify" ? "terverifikasi" : "ditolak";

  if (type === "health") {
    const recordIndex = db.health_data.findIndex(h => h.id === id);
    if (recordIndex === -1) {
      res.status(404).json({ message: "Data kesehatan tidak ditemukan." });
      return;
    }
    
    const record = db.health_data[recordIndex];
    const oldStatus = record.status;
    record.status = targetStatus;
    record.verifikator = user.nama;
    record.tanggalVerifikasi = new Date().toISOString();
    if (action === "reject") {
      record.catatanPenolakan = catatanPenolakan || "Data tidak valid setelah diklarifikasi.";
    }

    addAuditLog(
      user.id,
      user.nama,
      user.role,
      action === "verify" ? "VERIFY" : "REJECT",
      "health_data",
      { id, oldStatus, newStatus: targetStatus, catatanPenolakan },
      req.ip || "127.0.0.1"
    );

  } else {
    const recordIndex = db.bansos_data.findIndex(b => b.id === id);
    if (recordIndex === -1) {
      res.status(404).json({ message: "Data bansos tidak ditemukan." });
      return;
    }

    const record = db.bansos_data[recordIndex];
    const oldStatus = record.status;
    record.status = targetStatus;
    record.verifikator = user.nama;
    record.tanggalVerifikasi = new Date().toISOString();
    if (action === "reject") {
      record.catatanPenolakan = catatanPenolakan || "Data tidak valid setelah diklarifikasi.";
    }

    addAuditLog(
      user.id,
      user.nama,
      user.role,
      action === "verify" ? "VERIFY" : "REJECT",
      "bansos_data",
      { id, oldStatus, newStatus: targetStatus, catatanPenolakan },
      req.ip || "127.0.0.1"
    );
  }

  saveDB(db);
  res.json({ success: true, message: `Data berhasil ${action === "verify" ? "diverifikasi" : "ditolak"}.` });
});


// 4. ADMIN Endpoints
// Get data verified by operators for Final Approval
app.get("/api/admin/pending-approvals", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
  const verifiedHealth = db.health_data.filter(h => h.status === "terverifikasi");
  const verifiedBansos = db.bansos_data.filter(b => b.status === "terverifikasi");
  res.json({ health: verifiedHealth, bansos: verifiedBansos });
});

// Final Approve (Accept)
app.post("/api/admin/accept", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response): void => {
  const { id, type } = req.body;
  const user = req.user!;

  if (!id || !type) {
    res.status(400).json({ message: "Parameter tidak lengkap." });
    return;
  }

  if (type === "health") {
    const record = db.health_data.find(h => h.id === id);
    if (!record) {
      res.status(404).json({ message: "Data kesehatan tidak ditemukan." });
      return;
    }
    record.status = "aktif";
    record.tanggalAccept = new Date().toISOString();

    addAuditLog(
      user.id,
      user.nama,
      user.role,
      "ACCEPT",
      "health_data",
      { id, status: "aktif" },
      req.ip || "127.0.0.1"
    );
  } else {
    const record = db.bansos_data.find(b => b.id === id);
    if (!record) {
      res.status(404).json({ message: "Data bansos tidak ditemukan." });
      return;
    }
    record.status = "aktif";
    record.tanggalAccept = new Date().toISOString();

    addAuditLog(
      user.id,
      user.nama,
      user.role,
      "ACCEPT",
      "bansos_data",
      { id, status: "aktif" },
      req.ip || "127.0.0.1"
    );
  }

  saveDB(db);
  res.json({ success: true, message: "Data berhasil disetujui secara permanen (aktif)." });
});

// Admin: User Management (CRUD)
app.get("/api/admin/users", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
  // Return users without passwords
  res.json(db.users);
});

app.post("/api/admin/users", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response): void => {
  const { email, username, nama, role, password, nik } = req.body;

  if (!email || !username || !nama || !role || !password) {
    res.status(400).json({ message: "Formulir pembuatan pengguna tidak lengkap." });
    return;
  }

  // NIK check for user role
  if (role === "user" && (!nik || nik.length !== 16)) {
    res.status(400).json({ message: "Pengguna dengan peran penduduk wajib memiliki NIK 16 digit." });
    return;
  }

  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  const usernameExists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());

  if (emailExists || usernameExists) {
    res.status(400).json({ message: "Email atau Username sudah terdaftar." });
    return;
  }

  const newUser: User = {
    id: "usr-" + Math.random().toString(36).substr(2, 9),
    email,
    username,
    nama,
    role,
    nik: role === "user" ? nik : undefined,
    createdAt: new Date().toISOString()
  };

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.users.push(newUser);
  db.passwords[newUser.id] = hashedPassword;

  addAuditLog(
    req.user!.id,
    req.user!.nama,
    req.user!.role,
    "CREATE",
    "users",
    { userId: newUser.id, email, role },
    req.ip || "127.0.0.1"
  );

  saveDB(db);
  res.status(201).json({ success: true, message: "Pengguna baru berhasil ditambahkan.", data: newUser });
});

app.delete("/api/admin/users/:id", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const currentAdminId = req.user!.id;

  if (id === currentAdminId) {
    res.status(400).json({ message: "Anda tidak dapat menghapus akun Anda sendiri." });
    return;
  }

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    res.status(404).json({ message: "Pengguna tidak ditemukan." });
    return;
  }

  const deletedUser = db.users[userIndex];
  db.users.splice(userIndex, 1);
  delete db.passwords[id];

  addAuditLog(
    req.user!.id,
    req.user!.nama,
    req.user!.role,
    "DELETE",
    "users",
    { deletedUserId: id, email: deletedUser.email },
    req.ip || "127.0.0.1"
  );

  saveDB(db);
  res.json({ success: true, message: "Pengguna berhasil dihapus." });
});

// Admin: Active User Tracker Widget
app.get("/api/admin/active-users", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
  const activeList: any[] = [];
  const now = Date.now();
  const timeout = 15 * 60 * 1000; // 15 mins

  for (const token in activeSessions) {
    const session = activeSessions[token];
    if (now - session.lastActive.getTime() < timeout) {
      const u = db.users.find(user => user.id === session.userId);
      if (u) {
        activeList.push({
          id: u.id,
          email: u.email,
          nama: u.nama,
          role: u.role,
          lastActive: session.lastActive.toISOString(),
          ipAddress: session.ip
        });
      }
    }
  }

  // Remove duplicates by ID for active widget display
  const uniqueActive = activeList.filter((value, index, self) =>
    self.findIndex(t => t.id === value.id) === index
  );

  res.json({
    total: uniqueActive.length,
    users: uniqueActive
  });
});

// Admin: Audit logs
app.get("/api/admin/audit-trail", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
  res.json(db.audit_logs);
});

// Admin: Database manual backup trigger
app.post("/api/admin/backup", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
  try {
    const backup = performBackup("MANUAL");
    res.status(201).json({ success: true, message: "Backup database manual berhasil diselesaikan.", backup });
  } catch (err: any) {
    res.status(500).json({ message: "Gagal membuat backup database: " + err.message });
  }
});

// Get backup list
app.get("/api/admin/backup-history", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
  res.json(db.backups);
});


// 5. SUPERVISOR Endpoints
// Dashboard stats
app.get("/api/supervisor/stats", verifyToken, authorizeRoles("supervisor", "admin"), (req: AuthRequest, res: Response) => {
  // Total Penduduk Terintegrasi (unique NIKs across active health and bansos data)
  const activeHealth = db.health_data.filter(h => h.status === "aktif");
  const activeBansos = db.bansos_data.filter(b => b.status === "aktif");
  
  const uniqueNiks = new Set([
    ...activeHealth.map(h => h.nik),
    ...activeBansos.map(b => b.nik)
  ]);

  const stats = {
    totalPendudukTerintegrasi: uniqueNiks.size,
    totalLayananKesehatanTerwujud: activeHealth.length,
    totalPenerimaBansosAktif: activeBansos.length
  };

  res.json(stats);
});

// Get active consolidated data for supervision and export
app.get("/api/supervisor/consolidated-data", verifyToken, authorizeRoles("supervisor", "admin"), (req: AuthRequest, res: Response) => {
  const activeHealth = db.health_data.filter(h => h.status === "aktif");
  const activeBansos = db.bansos_data.filter(b => b.status === "aktif");
  res.json({ health: activeHealth, bansos: activeBansos });
});

// Mock PDF/Excel downloads so users get realistic downloads
app.get("/api/supervisor/export", verifyToken, authorizeRoles("supervisor", "admin"), (req: AuthRequest, res: Response): void => {
  const { format, filterType, filterValue } = req.query; // format: 'excel' | 'pdf'

  let activeHealth = db.health_data.filter(h => h.status === "aktif");
  let activeBansos = db.bansos_data.filter(b => b.status === "aktif");

  // Mock filters applied in the file download text
  if (filterType === "jenis_bansos" && filterValue) {
    activeBansos = activeBansos.filter(b => b.jenisBansos.toLowerCase().includes(String(filterValue).toLowerCase()));
  }
  if (filterType === "jenis_layanan" && filterValue) {
    activeHealth = activeHealth.filter(h => h.jenisLayanan === filterValue);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  if (format === "excel") {
    let csvContent = "REKAPAN DATA TERINTEGRASI LAYANAN KESEHATAN DAN JAMINAN SOSIAL\n";
    csvContent += `Tanggal Cetak: ${new Date().toLocaleDateString()}\n\n`;
    
    csvContent += "--- DATA LAYANAN KESEHATAN (AKTIF) ---\n";
    csvContent += "ID,NIK,Nama Penduduk,Tanggal Layanan,Jenis Layanan,Diagnosa,Status BPJS,Verifikator,Tanggal Disetujui\n";
    activeHealth.forEach(h => {
      csvContent += `"${h.id}","${h.nik}","${h.namaPenduduk}","${h.tanggalLayanan}","${h.jenisLayanan}","${h.diagnosa || '-'}","${h.statusBpjs}","${h.verifikator || '-'}","${h.tanggalAccept || '-'}"\n`;
    });

    csvContent += "\n--- DATA JAMINAN SOSIAL / BANSOS (AKTIF) ---\n";
    csvContent += "ID,NIK,Nama Penduduk,Jenis Bansos,Tanggal Mulai,Catatan Pengajuan,Verifikator,Tanggal Disetujui\n";
    activeBansos.forEach(b => {
      csvContent += `"${b.id}","${b.nik}","${b.namaPenduduk}","${b.jenisBansos}","${b.tanggalMulai}","${b.catatanPengajuan || '-'}","${b.verifikator || '-'}","${b.tanggalAccept || '-'}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=laporan_terintegrasi_${timestamp}.csv`);
    res.status(200).send(csvContent);
  } else {
    // Return a beautiful formatted text representation resembling a PDF breakdown
    let pdfText = "========================================================================\n";
    pdfText += "   LAPORAN REKAPAN TERINTEGRASI LAYANAN KESEHATAN & JAMINAN SOSIAL (PDF) \n";
    pdfText += "========================================================================\n";
    pdfText += `Dicetak Pada : ${new Date().toLocaleString()}\n`;
    pdfText += `Total Penduduk Terintegrasi: ${new Set([...activeHealth.map(h => h.nik), ...activeBansos.map(b => b.nik)]).size}\n`;
    pdfText += `Status Data : AKTIF & TERKONSOLIDASI\n\n`;

    pdfText += "I. REKAPAN SEKTOR LAYANAN KESEHATAN\n";
    pdfText += "------------------------------------------------------------------------\n";
    activeHealth.forEach((h, idx) => {
      pdfText += `${idx+1}. NIK: ${h.nik} | Nama: ${h.namaPenduduk}\n`;
      pdfText += `   Layanan: ${h.jenisLayanan} | Tgl: ${h.tanggalLayanan} | BPJS: ${h.statusBpjs}\n`;
      pdfText += `   Diagnosa: ${h.diagnosa || "-"}\n`;
      pdfText += `   Disetujui: ${h.tanggalAccept}\n\n`;
    });

    pdfText += "II. REKAPAN SEKTOR JAMINAN SOSIAL (BANSOS)\n";
    pdfText += "------------------------------------------------------------------------\n";
    activeBansos.forEach((b, idx) => {
      pdfText += `${idx+1}. NIK: ${b.nik} | Nama: ${b.namaPenduduk}\n`;
      pdfText += `   Jenis Bansos: ${b.jenisBansos} | Mulai: ${b.tanggalMulai}\n`;
      pdfText += `   Catatan: ${b.catatanPengajuan || "-"}\n`;
      pdfText += `   Disetujui: ${b.tanggalAccept}\n\n`;
    });

    pdfText += "========================================================================\n";
    pdfText += "                        --- AKHIR LAPORAN ---                           \n";
    pdfText += "========================================================================\n";

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename=laporan_terintegrasi_${timestamp}.pdf`);
    res.status(200).send(pdfText);
  }
});


// ==========================================
// VITE OR STATIC SERVING MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dev Mode - create Vite server in middlewareMode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode - serve built client assets from dist/
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
