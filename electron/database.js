const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

// Get UserData directory path on Windows / Mac for reliable read & write access
function getDatabasePath() {
  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = path.join(userDataPath, 'pharmacy.db');
  console.log(`📌 [Database] SQLite DB Path: ${dbPath}`);
  return dbPath;
}

const ENCRYPTION_KEY = 'PharmacySQLCipherSecretKey2026!';
let dbInstance = null;

// Helper to wrap SQLite operations in Promises with error logging
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error(`❌ [SQL Error] Query: "${sql}" | Error:`, err);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function getAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error(`❌ [SQL Error] Query: "${sql}" | Error:`, err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error(`❌ [SQL Error] Query: "${sql}" | Error:`, err);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

async function initDatabase() {
  if (dbInstance) return dbInstance;

  const dbPath = getDatabasePath();
  const isFirstRun = !fs.existsSync(dbPath);

  if (isFirstRun) {
    console.log('🆕 [First-Run] No existing SQLite file found. Creating new clean database file for first launch...');
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ [Database Error] Failed to open SQLite connection:', err);
        return reject(err);
      }

      console.log('✅ [Database] SQLite connection opened successfully.');

      try {
        // Apply PRAGMAs safely
        try {
          await runQuery(db, `PRAGMA key = '${ENCRYPTION_KEY}';`);
        } catch (pragmaKeyErr) {
          console.log('ℹ️ [Database] PRAGMA key not supported in standard sqlite3 binary, proceeding with standard SQLite.');
        }

        await runQuery(db, `PRAGMA foreign_keys = ON;`);
        await runQuery(db, `PRAGMA journal_mode = WAL;`);

        // Initialize Schemas & Mandatory Default Data
        await createTables(db);
        await ensureDefaultSupplier(db);
        await ensureDefaultAdmin(db);

        if (isFirstRun) {
          console.log('✨ [First-Run Success] All clean database tables and schemas created successfully!');
        }

        dbInstance = db;
        resolve(db);
      } catch (schemaErr) {
        console.error('❌ [Database Error] Schema initialization error:', schemaErr);
        reject(schemaErr);
      }
    });
  });
}

// Helper to check column existence via PRAGMA table_info for fast migration & startup
async function hasColumn(db, tableName, columnName) {
  try {
    const columns = await getAll(db, `PRAGMA table_info(${tableName});`);
    return columns.some(col => col.name === columnName);
  } catch (err) {
    console.error(`Error checking column ${columnName} in ${tableName}:`, err);
    return false;
  }
}

async function createTables(db) {
  console.log('🔄 [Database] Ensuring database tables exist...');

  // 1. Suppliers table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      company_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Medications table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      trade_name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      category TEXT NOT NULL,
      min_stock INTEGER DEFAULT 10
    );
  `);

  // 3. Batches table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      supplier_id INTEGER,
      batch_number TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL
    );
  `);

  // Fast & Safe Migrations: Check columns using PRAGMA table_info before ALTER TABLE
  if (!(await hasColumn(db, 'batches', 'supplier_id'))) {
    console.log('➕ [Database Migration] Adding missing column "supplier_id" to batches table...');
    await runQuery(db, `ALTER TABLE batches ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;`);
  }
  if (!(await hasColumn(db, 'batches', 'unit'))) {
    console.log('➕ [Database Migration] Adding missing column "unit" to batches table...');
    await runQuery(db, `ALTER TABLE batches ADD COLUMN unit TEXT DEFAULT 'باكيت';`);
  }
  if (!(await hasColumn(db, 'batches', 'units_per_pack'))) {
    console.log('➕ [Database Migration] Adding missing column "units_per_pack" to batches table...');
    await runQuery(db, `ALTER TABLE batches ADD COLUMN units_per_pack INTEGER DEFAULT 1;`);
  }
  if (!(await hasColumn(db, 'batches', 'piece_sell_price'))) {
    console.log('➕ [Database Migration] Adding missing column "piece_sell_price" to batches table...');
    await runQuery(db, `ALTER TABLE batches ADD COLUMN piece_sell_price REAL DEFAULT 0;`);
  }
  if (!(await hasColumn(db, 'batches', 'created_at'))) {
    console.log('➕ [Database Migration] Adding missing column "created_at" to batches table...');
    try {
      await runQuery(db, `ALTER TABLE batches ADD COLUMN created_at DATETIME;`);
      await runQuery(db, `UPDATE batches SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;`);
      console.log('✅ [Database Migration] Successfully added and populated "created_at" in batches table.');
    } catch (e) {
      console.warn('⚠️ [Database Migration] created_at migration warning:', e.message);
    }
  }

  if (!(await hasColumn(db, 'medications', 'units_per_pack'))) {
    console.log('➕ [Database Migration] Adding missing column "units_per_pack" to medications table...');
    await runQuery(db, `ALTER TABLE medications ADD COLUMN units_per_pack INTEGER DEFAULT 1;`);
  }
  if (!(await hasColumn(db, 'medications', 'price'))) {
    console.log('➕ [Database Migration] Adding missing column "price" to medications table...');
    await runQuery(db, `ALTER TABLE medications ADD COLUMN price REAL DEFAULT 0;`);
  }
  if (!(await hasColumn(db, 'medications', 'selling_price'))) {
    console.log('➕ [Database Migration] Adding missing column "selling_price" to medications table...');
    await runQuery(db, `ALTER TABLE medications ADD COLUMN selling_price REAL DEFAULT 0;`);
  }

  // Drop national_code column migration if it exists
  if (await hasColumn(db, 'medications', 'national_code')) {
    try {
      console.log('🗑️ [Database Migration] Attempting to drop column "national_code" from medications table...');
      await runQuery(db, `ALTER TABLE medications DROP COLUMN national_code;`);
      console.log('✅ [Database Migration] Successfully dropped "national_code" column.');
    } catch (e) {
      console.warn('⚠️ [Database Migration] Could not drop national_code column directly (SQLite constraint/version limit):', e.message);
    }
  }


  // 4. Sales table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      currency TEXT DEFAULT 'د.ع',
      pharmacist_name TEXT DEFAULT 'د. أحمد علي (صيدلي مسؤول)',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (!(await hasColumn(db, 'sales', 'pharmacist_name'))) {
    console.log('➕ [Database Migration] Adding missing column "pharmacist_name" to sales table...');
    await runQuery(db, `ALTER TABLE sales ADD COLUMN pharmacist_name TEXT DEFAULT 'د. أحمد علي (صيدلي مسؤول)';`);
  }
  if (!(await hasColumn(db, 'sales', 'status'))) {
    console.log('➕ [Database Migration] Adding missing column "status" to sales table...');
    await runQuery(db, `ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'COMPLETED';`);
  }
  if (!(await hasColumn(db, 'sales', 'returned_amount'))) {
    console.log('➕ [Database Migration] Adding missing column "returned_amount" to sales table...');
    await runQuery(db, `ALTER TABLE sales ADD COLUMN returned_amount REAL DEFAULT 0;`);
  }

  // 5. Sale Items table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      medication_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      unit_sold TEXT DEFAULT 'باكيت',
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (medication_id) REFERENCES medications (id),
      FOREIGN KEY (batch_id) REFERENCES batches (id)
    );
  `);

  if (!(await hasColumn(db, 'sale_items', 'unit_sold'))) {
    console.log('➕ [Database Migration] Adding missing column "unit_sold" to sale_items table...');
    await runQuery(db, `ALTER TABLE sale_items ADD COLUMN unit_sold TEXT DEFAULT 'باكيت';`);
  }

  // 6. License Info table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS license_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL,
      hardware_hash TEXT NOT NULL,
      activation_date TEXT NOT NULL,
      last_server_check TEXT NOT NULL
    );
  `);

  // 7. Supplier Debts table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS supplier_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('CREDIT_PURCHASE', 'PAYMENT')) NOT NULL,
      amount REAL NOT NULL,
      invoice_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
    );
  `);

  // 8. Purchase Invoices table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      invoice_date TEXT NOT NULL,
      payment_type TEXT CHECK(payment_type IN ('CASH', 'CREDIT')) NOT NULL DEFAULT 'CASH',
      currency TEXT CHECK(currency IN ('IQD', 'USD')) NOT NULL DEFAULT 'IQD',
      exchange_rate REAL DEFAULT 1,
      subtotal REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      final_total_iqd REAL NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
    );
  `);

  // 9. Purchase Invoice Items table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS purchase_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_invoice_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      trade_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      category TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      profit_margin REAL NOT NULL,
      expiry_date TEXT,
      unit TEXT DEFAULT 'باكيت',
      units_per_pack INTEGER DEFAULT 1,
      FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices (id) ON DELETE CASCADE
    );
  `);

  if (!(await hasColumn(db, 'purchase_invoice_items', 'expiry_date'))) {
    await runQuery(db, `ALTER TABLE purchase_invoice_items ADD COLUMN expiry_date TEXT;`);
  }
  if (!(await hasColumn(db, 'purchase_invoice_items', 'unit'))) {
    await runQuery(db, `ALTER TABLE purchase_invoice_items ADD COLUMN unit TEXT DEFAULT 'باكيت';`);
  }
  
  if (!(await hasColumn(db, 'purchase_invoices', 'status'))) {
    await runQuery(db, `ALTER TABLE purchase_invoices ADD COLUMN status TEXT DEFAULT 'PAID';`);
  }

  // 11. System Settings table
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );
  `);

  await runQuery(db, `INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES ('near_expiry_months', '9');`);
  await runQuery(db, `INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES ('return_window_days', '90');`);
  if (!(await hasColumn(db, 'purchase_invoice_items', 'units_per_pack'))) {
    await runQuery(db, `ALTER TABLE purchase_invoice_items ADD COLUMN units_per_pack INTEGER DEFAULT 1;`);
  }

  // 10. Purchase Invoices Migrations
  if (!(await hasColumn(db, 'purchase_invoices', 'status'))) {
    console.log('➕ [Database Migration] Adding missing column "status" to purchase_invoices table...');
    await runQuery(db, `ALTER TABLE purchase_invoices ADD COLUMN status TEXT DEFAULT 'UNPAID';`);
    await runQuery(db, `UPDATE purchase_invoices SET status = 'PAID' WHERE payment_type = 'CASH';`);
  }
  if (!(await hasColumn(db, 'purchase_invoices', 'payment_discount'))) {
    console.log('➕ [Database Migration] Adding missing column "payment_discount" to purchase_invoices table...');
    await runQuery(db, `ALTER TABLE purchase_invoices ADD COLUMN payment_discount REAL DEFAULT 0;`);
  }
  if (!(await hasColumn(db, 'purchase_invoices', 'paid_at'))) {
    console.log('➕ [Database Migration] Adding missing column "paid_at" to purchase_invoices table...');
    await runQuery(db, `ALTER TABLE purchase_invoices ADD COLUMN paid_at TEXT;`);
  }

  // 11. Users table (Authentication & Roles)
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'cashier')) NOT NULL DEFAULT 'cashier',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ [Database] All database tables created/verified successfully.');

}

// ----------------------------------------------------
// ENSURE MANDATORY DEFAULT SUPPLIER & ADMIN USER
// ----------------------------------------------------
async function ensureDefaultSupplier(db) {
  try {
    const row = await getOne(db, `SELECT COUNT(*) as count FROM suppliers;`);
    if (!row || row.count === 0) {
      console.log('🌱 [Database] Suppliers table is empty. Auto-creating default supplier: "مذخر الأدوية الرئيسي"...');
      await runQuery(db, `
        INSERT INTO suppliers (name, phone, company_name, notes)
        VALUES ('مذخر الأدوية الرئيسي', '07700000000', 'مذخر الأدوية الرئيسي', 'المورد الافتراضي المدمج بالنظام');
      `);
      console.log('✅ [Database] Default supplier "مذخر الأدوية الرئيسي" created successfully.');
    }
  } catch (err) {
    console.error('❌ [Database Error] Error checking/creating default supplier:', err);
  }
}

async function ensureDefaultAdmin(db) {
  try {
    const row = await getOne(db, `SELECT COUNT(*) as count FROM users;`);
    if (!row || row.count === 0) {
      console.log('🌱 [Database] Users table is empty. Creating default administrator user: "admin"...');
      await runQuery(db, `
        INSERT INTO users (name, username, password, role, is_active)
        VALUES ('مدير النظام', 'admin', 'admin123', 'admin', 1);
      `);
      console.log('✅ [Database] Default administrator user created: (admin / admin123).');
    }
  } catch (err) {
    console.error('❌ [Database Error] Error checking/creating default admin user:', err);
  }
}

// ----------------------------------------------------
// USERS & AUTHENTICATION CRUD
// ----------------------------------------------------
async function loginUser(username, password) {
  console.log(`🔐 [Database] Attempting login for username: "${username}"`);
  const db = await initDatabase();
  const cleanUsername = String(username || '').trim();
  const user = await getOne(db, `SELECT * FROM users WHERE username = ?;`, [cleanUsername]);
  
  if (!user) {
    console.log(`❌ [Database] Login failed: User "${cleanUsername}" not found.`);
    return { success: false, message: 'اسم المستخدم غير مسجل في النظام' };
  }

  if (user.password !== String(password || '').trim()) {
    console.log(`❌ [Database] Login failed: Invalid password for user "${cleanUsername}".`);
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً' };
  }

  if (!user.is_active || user.is_active === 0) {
    console.log(`❌ [Database] Login failed: User "${cleanUsername}" is inactive.`);
    return { success: false, message: 'هذا الحساب معطل أو مجمد، يرجى مراجعة مدير النظام' };
  }

  console.log(`✅ [Database] Login successful for user: "${user.name}" (${user.role})`);
  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at
    }
  };
}

async function getUsers() {
  console.log('👥 [Database] Fetching users list...');
  const db = await initDatabase();
  const rows = await getAll(db, `SELECT id, name, username, role, is_active, created_at FROM users ORDER BY id ASC;`);
  return rows;
}

async function addUser(userData) {
  console.log(`➕ [Database] Adding new user: "${userData?.username}"...`);
  const db = await initDatabase();
  
  const cleanUsername = String(userData.username || '').trim();
  if (!cleanUsername) {
    throw new Error('اسم المستخدم مطلوب ولا يمكن أن يكون فارغاً!');
  }

  const existing = await getOne(db, `SELECT id FROM users WHERE username = ?;`, [cleanUsername]);
  if (existing) {
    throw new Error('اسم المستخدم مستخدم مسبقاً! يرجى اختيار اسم مستخدم آخر.');
  }

  const result = await runQuery(db, `
    INSERT INTO users (name, username, password, role, is_active)
    VALUES (?, ?, ?, ?, ?);
  `, [
    String(userData.name || cleanUsername).trim(),
    cleanUsername,
    String(userData.password || '123456').trim(),
    userData.role === 'admin' ? 'admin' : 'cashier',
    userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1
  ]);

  console.log(`✅ [Database] User added with ID: ${result.id}`);
  return {
    id: result.id,
    name: userData.name,
    username: cleanUsername,
    role: userData.role === 'admin' ? 'admin' : 'cashier',
    is_active: userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1
  };
}

async function updateUser(id, userData) {
  console.log(`✏️ [Database] Updating user ID: ${id}...`);
  const db = await initDatabase();

  const cleanUsername = String(userData.username || '').trim();
  const existing = await getOne(db, `SELECT id FROM users WHERE username = ? AND id != ?;`, [cleanUsername, id]);
  if (existing) {
    throw new Error('اسم المستخدم مستخدم بالفعل لحساب آخر!');
  }

  const is_active = userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1;
  const role = userData.role === 'admin' ? 'admin' : 'cashier';

  if (userData.password && String(userData.password).trim() !== '') {
    await runQuery(db, `
      UPDATE users
      SET name = ?, username = ?, password = ?, role = ?, is_active = ?
      WHERE id = ?;
    `, [
      String(userData.name || cleanUsername).trim(),
      cleanUsername,
      String(userData.password).trim(),
      role,
      is_active,
      id
    ]);
  } else {
    await runQuery(db, `
      UPDATE users
      SET name = ?, username = ?, role = ?, is_active = ?
      WHERE id = ?;
    `, [
      String(userData.name || cleanUsername).trim(),
      cleanUsername,
      role,
      is_active,
      id
    ]);
  }

  console.log(`✅ [Database] User ID ${id} updated successfully.`);
  return { id, ...userData, role, is_active };
}

async function deleteUser(id) {
  console.log(`🗑️ [Database] Deleting user ID: ${id}...`);
  const db = await initDatabase();
  
  const user = await getOne(db, `SELECT * FROM users WHERE id = ?;`, [id]);
  if (!user) {
    throw new Error('المستخدم غير موجود في النظام!');
  }

  if (user.username === 'admin' || user.id === 1) {
    throw new Error('لا يمكن حذف حساب مدير النظام الرئيسي الافتراضي!');
  }

  await runQuery(db, `DELETE FROM users WHERE id = ?;`, [id]);
  console.log(`✅ [Database] User ID ${id} deleted.`);
  return { success: true, id };
}

// ----------------------------------------------------
// CURRENCY & EXPIRY FORMATTING HELPERS
// ----------------------------------------------------
// All financial values format with 'د.ع' suffix
function formatCurrency(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount || 0);
  return `${numeric.toLocaleString('en-US')} د.ع`;
}

// ----------------------------------------------------
// MEDICATIONS CRUD
// ----------------------------------------------------
async function getMedications() {
  console.log('🔍 [Database] Fetching medications list with latest selling prices...');
  const db = await initDatabase();
  const sql = `
    SELECT m.*, 
           COALESCE(
             (SELECT b2.sell_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             m.selling_price, 
             m.price, 
             0
           ) AS selling_price,
           COALESCE(
             (SELECT b2.sell_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             m.selling_price, 
             m.price, 
             0
           ) AS sale_price,
           COALESCE(
             (SELECT b2.sell_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             m.selling_price, 
             m.price, 
             0
           ) AS unit_sale_price,
           COALESCE(
             (SELECT b2.sell_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             m.selling_price, 
             m.price, 
             0
           ) AS sell_price,
           COALESCE(
             (SELECT b2.sell_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             m.selling_price, 
             m.price, 
             0
           ) AS last_sell_price,
           COALESCE(
             (SELECT b2.buy_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             0
           ) AS purchase_price,
           COALESCE(
             (SELECT b2.buy_price FROM batches b2 WHERE b2.medication_id = m.id ORDER BY b2.id DESC LIMIT 1), 
             0
           ) AS buy_price,
           COALESCE(SUM(b.quantity), 0) AS total_stock,
           COUNT(b.id) AS batch_count
    FROM medications m
    LEFT JOIN batches b ON m.id = b.medication_id
    GROUP BY m.id
    ORDER BY m.trade_name ASC;
  `;
  const result = await getAll(db, sql);
  console.log(`✅ [Database] Fetched ${result.length} medications with selling prices.`);
  return result;
}

async function addMedication(med) {
  console.log('➕ [Database] Inserting new medication:', med.trade_name);
  const db = await initDatabase();
  const sql = `
    INSERT INTO medications (barcode, trade_name, generic_name, category, min_stock)
    VALUES (?, ?, ?, ?, ?);
  `;
  const result = await runQuery(db, sql, [
    med.barcode,
    med.trade_name,
    med.generic_name,
    med.category,
    parseInt(med.min_stock || 10, 10)
  ]);
  console.log(`✅ [Database] Medication added with ID: ${result.id}`);
  return { id: result.id, ...med };
}

async function updateMedication(id, med) {
  console.log(`✏️ [Database] Updating medication ID: ${id}`);
  const db = await initDatabase();
  const sql = `
    UPDATE medications
    SET barcode = ?, trade_name = ?, generic_name = ?, category = ?, min_stock = ?
    WHERE id = ?;
  `;
  await runQuery(db, sql, [
    med.barcode,
    med.trade_name,
    med.generic_name,
    med.category,
    parseInt(med.min_stock || 10, 10),
    id
  ]);
  console.log(`✅ [Database] Medication ID ${id} updated.`);
  return { id, ...med };
}

async function deleteMedication(id) {
  console.log(`🗑️ [Database] Deleting medication ID: ${id}`);
  const db = await initDatabase();
  await runQuery(db, `DELETE FROM medications WHERE id = ?;`, [id]);
  console.log(`✅ [Database] Medication ID ${id} deleted.`);
  return { success: true, id };
}

async function bulkImportMedications(medicationsList) {
  console.log(`📦 [Database] Starting bulk import of ${medicationsList?.length || 0} medications...`);
  if (!medicationsList || !Array.isArray(medicationsList) || medicationsList.length === 0) {
    return { success: false, total: 0, inserted: 0, updated: 0, error: 'قائمة الأدوية فارغة' };
  }

  const db = await initDatabase();
  let inserted = 0;
  let updated = 0;

  await runQuery(db, 'BEGIN TRANSACTION;');

  try {
    for (const item of medicationsList) {
      const tradeName = String(item.trade_name || '').trim();
      if (!tradeName) continue; // Skip empty rows

      const genericName = String(item.generic_name || tradeName).trim();
      let barcode = String(item.barcode || '').trim();
      if (!barcode) {
        barcode = `628${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      }

      const category = String(item.category || 'عام').trim();
      const minStock = parseInt(item.min_stock || 10, 10);
      const buyPrice = parseFloat(item.buy_price) || 0;
      const sellPrice = parseFloat(item.sell_price) || 0;
      const unit = String(item.unit || 'باكيت').trim();
      const unitsPerPack = parseInt(item.units_per_pack || 1, 10);

      // Check if medication with this barcode or trade_name already exists
      const existing = await getOne(db, `
        SELECT id FROM medications WHERE barcode = ? OR trade_name = ? LIMIT 1;
      `, [barcode, tradeName]);

      let medId;

      if (existing) {
        // Update existing medication
        medId = existing.id;
        await runQuery(db, `
          UPDATE medications 
          SET barcode = ?, trade_name = ?, generic_name = ?, category = ?, min_stock = ?
          WHERE id = ?;
        `, [barcode, tradeName, genericName, category, minStock, medId]);
        updated++;
      } else {
        // Insert new medication
        const result = await runQuery(db, `
          INSERT INTO medications (barcode, trade_name, generic_name, category, min_stock)
          VALUES (?, ?, ?, ?, ?);
        `, [barcode, tradeName, genericName, category, minStock]);
        medId = result.id;
        inserted++;
      }

      // If buy_price or sell_price provided, update or create batch
      if (buyPrice > 0 || sellPrice > 0) {
        const existingBatch = await getOne(db, `
          SELECT id FROM batches WHERE medication_id = ? ORDER BY id DESC LIMIT 1;
        `, [medId]);

        if (existingBatch) {
          await runQuery(db, `
            UPDATE batches 
            SET buy_price = ?, sell_price = ?, unit = ?, units_per_pack = ?
            WHERE id = ?;
          `, [buyPrice, sellPrice, unit, unitsPerPack, existingBatch.id]);
        } else {
          const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0];
          await runQuery(db, `
            INSERT INTO batches (medication_id, batch_number, expiry_date, buy_price, sell_price, quantity, unit, units_per_pack)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `, [medId, `BAT-${Date.now().toString().slice(6)}`, nextYear, buyPrice, sellPrice, 50, unit, unitsPerPack]);
        }
      }
    }

    await runQuery(db, 'COMMIT;');
    console.log(`✅ [Database] Bulk import completed: ${inserted} new, ${updated} updated.`);
    return { success: true, total: medicationsList.length, inserted, updated };
  } catch (err) {
    await runQuery(db, 'ROLLBACK;');
    console.error('❌ [Database] Bulk import transaction error:', err);
    throw err;
  }
}

async function getMedicationByBarcode(barcode) {
  console.log(`🔍 [Database] Searching medication by barcode: ${barcode}`);
  const db = await initDatabase();
  const sql = `
    SELECT m.*, 
           COALESCE(b.sell_price, m.selling_price, m.price, 0) AS selling_price,
           COALESCE(b.sell_price, m.selling_price, m.price, 0) AS sale_price,
           COALESCE(b.sell_price, m.selling_price, m.price, 0) AS unit_sale_price,
           COALESCE(b.sell_price, m.selling_price, m.price, 0) AS sell_price,
           COALESCE(b.sell_price, m.selling_price, m.price, 0) AS last_sell_price,
           COALESCE(b.buy_price, 0) AS purchase_price,
           COALESCE(b.buy_price, 0) AS buy_price,
           b.id AS batch_id, b.batch_number, b.expiry_date, b.buy_price AS batch_buy_price, b.sell_price AS batch_sell_price, b.quantity AS batch_quantity
    FROM medications m
    LEFT JOIN batches b ON m.id = b.medication_id
    WHERE m.barcode = ?
    ORDER BY b.id DESC
    LIMIT 1;
  `;
  return await getOne(db, sql, [barcode]);
}


// ----------------------------------------------------
// BATCHES CRUD & 9-MONTH EXPIRY ALERT
// ----------------------------------------------------
async function getBatches() {
  console.log('🔍 [Database] Fetching batches list...');
  const db = await initDatabase();
  const sql = `
    SELECT b.*, m.trade_name, m.generic_name, m.barcode, m.category,
           s.name AS supplier_name, s.company_name AS supplier_company
    FROM batches b
    JOIN medications m ON b.medication_id = m.id
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    ORDER BY b.expiry_date ASC;
  `;
  const rows = await getAll(db, sql);
  console.log(`✅ [Database] Fetched ${rows.length} batches.`);
  return rows.map(r => ({
    ...r,
    formatted_buy_price: formatCurrency(r.buy_price),
    formatted_sell_price: formatCurrency(r.sell_price)
  }));
}

async function getSystemSettings() {
  console.log('⚙️ [Database] Fetching system settings...');
  const db = await initDatabase();
  const rows = await getAll(db, `SELECT setting_key, setting_value FROM system_settings;`);
  const settings = {
    near_expiry_months: 9,
    return_window_days: 90
  };
  rows.forEach(r => {
    if (r.setting_key === 'near_expiry_months') settings.near_expiry_months = parseInt(r.setting_value, 10) || 9;
    if (r.setting_key === 'return_window_days') settings.return_window_days = parseInt(r.setting_value, 10) || 90;
  });
  return settings;
}

async function updateSystemSettings(newSettings = {}) {
  console.log('✏️ [Database] Updating system settings:', newSettings);
  const db = await initDatabase();
  for (const [key, val] of Object.entries(newSettings)) {
    await runQuery(db, `
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value;
    `, [key, String(val)]);
  }
  return await getSystemSettings();
}

async function getExpiringBatchesAlert() {
  const settings = await getSystemSettings();
  const months = settings.near_expiry_months || 9;
  console.log(`🔍 [Database] Fetching expiring batches alert (within ${months} months)...`);
  const db = await initDatabase();
  const sql = `
    SELECT b.*, m.trade_name, m.generic_name, m.barcode, m.category,
           s.name AS supplier_name, s.company_name AS supplier_company,
           CAST((julianday(b.expiry_date) - julianday('now')) AS INT) AS days_until_expiry
    FROM batches b
    JOIN medications m ON b.medication_id = m.id
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    WHERE b.expiry_date <= DATE('now', '+' || ? || ' months')
    ORDER BY b.expiry_date ASC;
  `;
  const rows = await getAll(db, sql, [months]);
  console.log(`✅ [Database] Found ${rows.length} expiring batches within ${months} months.`);
  return rows.map(r => ({
    ...r,
    formatted_buy_price: formatCurrency(r.buy_price),
    formatted_sell_price: formatCurrency(r.sell_price),
    is_expired: r.days_until_expiry < 0,
    near_expiry_months: months
  }));
}

async function addBatch(batch) {
  console.log('➕ [Database] Adding new batch for medication ID:', batch.medication_id);
  const db = await initDatabase();
  const sql = `
    INSERT INTO batches (medication_id, supplier_id, batch_number, expiry_date, buy_price, sell_price, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  const supplierId = batch.supplier_id ? parseInt(batch.supplier_id, 10) : null;
  const result = await runQuery(db, sql, [
    parseInt(batch.medication_id, 10),
    supplierId,
    batch.batch_number,
    batch.expiry_date,
    parseFloat(batch.buy_price),
    parseFloat(batch.sell_price),
    parseInt(batch.quantity, 10)
  ]);
  console.log(`✅ [Database] Batch created with ID: ${result.id}`);
  return { id: result.id, ...batch, supplier_id: supplierId };
}

async function updateBatch(id, batch) {
  console.log(`✏️ [Database] Updating batch ID: ${id}`);
  const db = await initDatabase();
  const sql = `
    UPDATE batches
    SET medication_id = ?, supplier_id = ?, batch_number = ?, expiry_date = ?, buy_price = ?, sell_price = ?, quantity = ?
    WHERE id = ?;
  `;
  const supplierId = batch.supplier_id ? parseInt(batch.supplier_id, 10) : null;
  await runQuery(db, sql, [
    parseInt(batch.medication_id, 10),
    supplierId,
    batch.batch_number,
    batch.expiry_date,
    parseFloat(batch.buy_price),
    parseFloat(batch.sell_price),
    parseInt(batch.quantity, 10),
    id
  ]);
  console.log(`✅ [Database] Batch ID ${id} updated.`);
  return { id, ...batch, supplier_id: supplierId };
}

async function deleteBatch(id) {
  console.log(`🗑️ [Database] Deleting batch ID: ${id}`);
  const db = await initDatabase();
  await runQuery(db, `DELETE FROM batches WHERE id = ?;`, [id]);
  console.log(`✅ [Database] Batch ID ${id} deleted.`);
  return { success: true, id };
}

// ----------------------------------------------------
// SALES & INVOICE MANAGEMENT
// ----------------------------------------------------
async function createSale(saleData) {
  console.log('🛍️ [Database] Creating new sale invoice...');
  const db = await initDatabase();
  const { items, discount = 0, pharmacist_name = 'د. أحمد علي (صيدلي مسؤول)' } = saleData;

  let totalAmount = 0;
  for (const item of items) {
    totalAmount += item.sell_price * item.quantity;
  }
  const finalAmount = Math.max(0, totalAmount - discount);
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await runQuery(db, `BEGIN TRANSACTION;`);
  try {
    const saleResult = await runQuery(db, `
      INSERT INTO sales (invoice_number, total_amount, discount, final_amount, currency, pharmacist_name)
      VALUES (?, ?, ?, ?, 'د.ع', ?);
    `, [invoiceNumber, totalAmount, discount, finalAmount, pharmacist_name]);

    const saleId = saleResult.id;

    for (const item of items) {
      const itemTotal = item.sell_price * item.quantity;
      const unitSold = item.unit_sold || 'باكيت';
      const isStripOrPiece = unitSold === 'شريط' || unitSold === 'قطعة';
      const unitsPerPack = parseInt(item.units_per_pack || 1, 10);
      const qtyDeduction = isStripOrPiece ? (item.quantity / (unitsPerPack > 0 ? unitsPerPack : 1)) : item.quantity;

      await runQuery(db, `
        INSERT INTO sale_items (sale_id, medication_id, batch_id, quantity, unit_price, total_price, unit_sold)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `, [saleId, item.medication_id, item.batch_id, item.quantity, item.sell_price, itemTotal, unitSold]);

      await runQuery(db, `
        UPDATE batches
        SET quantity = MAX(0, quantity - ?)
        WHERE id = ?;
      `, [qtyDeduction, item.batch_id]);
    }

    await runQuery(db, `COMMIT;`);
    console.log(`✅ [Database] Sale invoice ${invoiceNumber} created successfully. ID: ${saleId}`);
    return {
      success: true,
      id: saleId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      discount,
      final_amount: finalAmount,
      formatted_total: formatCurrency(finalAmount),
      currency: 'د.ع',
      pharmacist_name
    };
  } catch (err) {
    console.error('❌ [Database Error] Failed to create sale, rolling back transaction:', err);
    await runQuery(db, `ROLLBACK;`);
    throw err;
  }
}

async function getSales() {
  console.log('🔍 [Database] Fetching sales history...');
  const db = await initDatabase();
  const sql = `
    SELECT s.*, 
           COALESCE(SUM(si.quantity), 0) AS total_items_count,
           COUNT(si.id) AS item_lines_count
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    GROUP BY s.id
    ORDER BY s.timestamp DESC;
  `;
  const sales = await getAll(db, sql);
  console.log(`✅ [Database] Fetched ${sales.length} sales records.`);
  return sales.map(s => ({
    ...s,
    formatted_total: formatCurrency(s.total_amount),
    formatted_final: formatCurrency(s.final_amount),
    formatted_discount: formatCurrency(s.discount)
  }));
}

async function getSaleDetails(saleId) {
  console.log(`🔍 [Database] Fetching details for sale ID: ${saleId}`);
  const db = await initDatabase();
  const saleSql = `SELECT * FROM sales WHERE id = ?;`;
  const sale = await getOne(db, saleSql, [saleId]);
  if (!sale) return null;

  const itemsSql = `
    SELECT si.*, 
           m.trade_name, m.generic_name, m.barcode, m.category,
           b.batch_number, b.expiry_date, b.buy_price,
           (si.unit_price - b.buy_price) * si.quantity AS line_gross_profit
    FROM sale_items si
    JOIN medications m ON si.medication_id = m.id
    JOIN batches b ON si.batch_id = b.id
    WHERE si.sale_id = ?;
  `;
  const items = await getAll(db, itemsSql, [saleId]);

  const formattedItems = items.map(i => ({
    ...i,
    formatted_unit_price: formatCurrency(i.unit_price),
    formatted_buy_price: formatCurrency(i.buy_price),
    formatted_total_price: formatCurrency(i.total_price),
    formatted_gross_profit: formatCurrency(i.line_gross_profit)
  }));

  try {
    return {
      ...sale,
      formatted_total: formatCurrency(sale.total_amount),
      formatted_final: formatCurrency(sale.final_amount),
      formatted_discount: formatCurrency(sale.discount),
      formatted_returned: formatCurrency(sale.returned_amount || 0),
      items: formattedItems
    };
  } catch (err) {
    console.error('❌ [Database Error] getSaleDetails failed:', err);
    return null;
  }
}

async function returnSaleInvoice({ saleId, returnType, itemsToReturn = [] }) {
  console.log(`🔄 [Database] Processing sales return for sale ID: ${saleId}, type: ${returnType}`, itemsToReturn);
  const db = await initDatabase();
  await runQuery(db, `BEGIN TRANSACTION;`);

  try {
    const sale = await getOne(db, `SELECT * FROM sales WHERE id = ?;`, [saleId]);
    if (!sale) throw new Error('Invoice not found');

    const saleItems = await getAll(db, `SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);

    let totalReturnedAmount = 0;

    if (returnType === 'FULL') {
      // 1. Full Return: Return ALL items in the sale back to batch inventory
      for (const item of saleItems) {
        if (item.quantity <= 0) continue;
        await runQuery(db, `
          UPDATE batches 
          SET quantity = quantity + ? 
          WHERE id = ?;
        `, [item.quantity, item.batch_id]);
      }

      totalReturnedAmount = sale.final_amount;

      // Update sales table status & amounts
      await runQuery(db, `
        UPDATE sales 
        SET status = 'RETURNED', 
            returned_amount = ?,
            final_amount = 0
        WHERE id = ?;
      `, [sale.final_amount, saleId]);

    } else if (returnType === 'PARTIAL') {
      // 2. Partial Return: Return selected items and quantities
      for (const retItem of itemsToReturn) {
        const qtyToReturn = parseInt(retItem.quantityToReturn || 0, 10);
        if (qtyToReturn <= 0) continue;

        const originalItem = saleItems.find(si => si.id === retItem.saleItemId || si.batch_id === retItem.batchId);
        if (!originalItem) continue;

        const actualQtyToReturn = Math.min(qtyToReturn, originalItem.quantity);
        if (actualQtyToReturn <= 0) continue;

        // Return quantity to batch inventory
        await runQuery(db, `
          UPDATE batches 
          SET quantity = quantity + ? 
          WHERE id = ?;
        `, [actualQtyToReturn, originalItem.batch_id]);

        // Deduct returned quantity from sale_items
        const newSaleItemQty = originalItem.quantity - actualQtyToReturn;
        const newSaleItemTotalPrice = newSaleItemQty * originalItem.unit_price;
        await runQuery(db, `
          UPDATE sale_items 
          SET quantity = ?, total_price = ? 
          WHERE id = ?;
        `, [newSaleItemQty, newSaleItemTotalPrice, originalItem.id]);

        const lineReturnVal = actualQtyToReturn * originalItem.unit_price;
        totalReturnedAmount += lineReturnVal;
      }

      // Recalculate sales totals
      const remainingItems = await getAll(db, `SELECT COALESCE(SUM(total_price), 0) AS new_total FROM sale_items WHERE sale_id = ?;`, [saleId]);
      const newTotal = remainingItems[0]?.new_total || 0;
      const newFinal = Math.max(0, newTotal - (sale.discount || 0));
      const isAllReturned = newFinal <= 0;

      const currentReturnedAmount = (sale.returned_amount || 0) + totalReturnedAmount;

      await runQuery(db, `
        UPDATE sales 
        SET total_amount = ?,
            final_amount = ?,
            returned_amount = ?,
            status = ? 
        WHERE id = ?;
      `, [newTotal, newFinal, currentReturnedAmount, isAllReturned ? 'RETURNED' : 'PARTIALLY_RETURNED', saleId]);
    }

    await runQuery(db, `COMMIT;`);
    console.log(`✅ [Database] Sales return processed successfully for sale ID: ${saleId}`);
    return await getSaleDetails(saleId);
  } catch (err) {
    console.error('❌ [Database Error] Failed to process sales return, rolling back:', err);
    await runQuery(db, `ROLLBACK;`);
    throw err;
  }
}

// ----------------------------------------------------
// LICENSE INFO
// ----------------------------------------------------
async function getLicenseInfo() {
  console.log('🔍 [Database] Fetching license info...');
  const db = await initDatabase();
  let license = await getOne(db, `SELECT * FROM license_info LIMIT 1;`);
  if (!license) {
    const os = require('os');
    const crypto = require('crypto');
    const hardwareHash = crypto.createHash('sha256').update(os.hostname() + os.arch() + os.platform()).digest('hex').substring(0, 24).toUpperCase();
    const licenseKey = `PHARM-${hardwareHash.substring(0, 4)}-${hardwareHash.substring(4, 8)}-${hardwareHash.substring(8, 12)}`;
    const today = new Date().toISOString().split('T')[0];

    const result = await runQuery(db, `
      INSERT INTO license_info (license_key, hardware_hash, activation_date, last_server_check)
      VALUES (?, ?, ?, ?);
    `, [licenseKey, hardwareHash, today, today]);

    license = {
      id: result.id,
      license_key: licenseKey,
      hardware_hash: hardwareHash,
      activation_date: today,
      last_server_check: today
    };
  }
  return license;
}

// ----------------------------------------------------
// SUPPLIERS & DEBTS MANAGEMENT
// ----------------------------------------------------
async function getSuppliers() {
  console.log('🔍 [Database] Fetching suppliers list...');
  const db = await initDatabase();
  const sql = `
    SELECT s.*,
           COALESCE(SUM(CASE WHEN d.type = 'CREDIT_PURCHASE' THEN d.amount WHEN d.type = 'PAYMENT' THEN -d.amount ELSE 0 END), 0) AS total_debt
    FROM suppliers s
    LEFT JOIN supplier_debts d ON s.id = d.supplier_id
    GROUP BY s.id
    ORDER BY s.name ASC;
  `;
  const rows = await getAll(db, sql);
  console.log(`✅ [Database] Fetched ${rows.length} suppliers.`);
  return rows.map(r => ({
    ...r,
    formatted_total_debt: formatCurrency(r.total_debt)
  }));
}

async function addSupplier(supplier) {
  console.log('➕ [Database] Adding new supplier:', supplier.name);
  const db = await initDatabase();
  const sql = `
    INSERT INTO suppliers (name, phone, company_name, notes)
    VALUES (?, ?, ?, ?);
  `;
  const result = await runQuery(db, sql, [
    supplier.name,
    supplier.phone || '',
    supplier.company_name || '',
    supplier.notes || ''
  ]);
  console.log(`✅ [Database] Supplier created with ID: ${result.id}`);
  return { id: result.id, total_debt: 0, formatted_total_debt: formatCurrency(0), ...supplier };
}

async function updateSupplier(id, supplier) {
  console.log(`✏️ [Database] Updating supplier ID: ${id}`);
  const db = await initDatabase();
  const sql = `
    UPDATE suppliers
    SET name = ?, phone = ?, company_name = ?, notes = ?
    WHERE id = ?;
  `;
  await runQuery(db, sql, [
    supplier.name,
    supplier.phone || '',
    supplier.company_name || '',
    supplier.notes || '',
    id
  ]);
  console.log(`✅ [Database] Supplier ID ${id} updated.`);
  return { id, ...supplier };
}

async function deleteSupplier(id) {
  console.log(`🗑️ [Database] Deleting supplier ID: ${id}`);
  const db = await initDatabase();
  await runQuery(db, `DELETE FROM suppliers WHERE id = ?;`, [id]);
  console.log(`✅ [Database] Supplier ID ${id} deleted.`);
  return { success: true, id };
}

async function getSupplierTransactions(supplierId) {
  console.log(`🔍 [Database] Fetching transactions for supplier ID: ${supplierId}`);
  const db = await initDatabase();
  const sql = `
    SELECT d.*, s.name AS supplier_name, s.company_name
    FROM supplier_debts d
    JOIN suppliers s ON d.supplier_id = s.id
    WHERE d.supplier_id = ?
    ORDER BY d.created_at DESC;
  `;
  const rows = await getAll(db, sql, [supplierId]);
  return rows.map(r => ({
    ...r,
    formatted_amount: formatCurrency(r.amount)
  }));
}

async function addSupplierTransaction(transaction) {
  console.log(`➕ [Database] Adding transaction for supplier ID: ${transaction.supplier_id}`);
  const db = await initDatabase();
  const sql = `
    INSERT INTO supplier_debts (supplier_id, type, amount, invoice_number, notes)
    VALUES (?, ?, ?, ?, ?);
  `;
  const result = await runQuery(db, sql, [
    parseInt(transaction.supplier_id, 10),
    transaction.type,
    parseFloat(transaction.amount),
    transaction.invoice_number || '',
    transaction.notes || ''
  ]);
  console.log(`✅ [Database] Transaction added with ID: ${result.id}`);
  return { id: result.id, formatted_amount: formatCurrency(transaction.amount), ...transaction };
}

// ----------------------------------------------------
// FINANCIAL & ACCOUNTS REPORTS SQL QUERIES
// ----------------------------------------------------
async function getUnifiedFinancialReport(params = {}) {
  console.log('📊 [Database] Generating unified financial report with params:', params);
  const db = await initDatabase();
  const { period = 'monthly', startDate, endDate } = params;

  let timeCondition = "sa.timestamp >= DATE('now', 'start of month')";
  let salesTimeCondition = "timestamp >= DATE('now', 'start of month')";
  let queryParams = [];
  let salesQueryParams = [];

  if (period === 'daily') {
    timeCondition = "sa.timestamp >= DATE('now', 'start of day')";
    salesTimeCondition = "timestamp >= DATE('now', 'start of day')";
  } else if (period === 'weekly') {
    timeCondition = "sa.timestamp >= DATE('now', '-7 days')";
    salesTimeCondition = "timestamp >= DATE('now', '-7 days')";
  } else if (period === 'monthly') {
    timeCondition = "sa.timestamp >= DATE('now', 'start of month')";
    salesTimeCondition = "timestamp >= DATE('now', 'start of month')";
  } else if (period === 'yearly') {
    timeCondition = "sa.timestamp >= DATE('now', 'start of year')";
    salesTimeCondition = "timestamp >= DATE('now', 'start of year')";
  } else if (period === 'custom' && startDate && endDate) {
    const sDate = `${startDate} 00:00:00`;
    const eDate = `${endDate} 23:59:59`;
    timeCondition = "sa.timestamp BETWEEN ? AND ?";
    salesTimeCondition = "timestamp BETWEEN ? AND ?";
    queryParams = [sDate, eDate];
    salesQueryParams = [sDate, eDate];
  }

  const salesSql = `
    SELECT 
      COALESCE(SUM(final_amount), 0) AS total_sales,
      COALESCE(SUM(total_amount), 0) AS gross_sales,
      COALESCE(SUM(discount), 0) AS total_discount,
      COUNT(id) AS invoice_count
    FROM sales
    WHERE ${salesTimeCondition};
  `;
  const salesOverview = await getOne(db, salesSql, salesQueryParams);

  const costSql = `
    SELECT COALESCE(SUM(si.quantity * b.buy_price), 0) AS total_cost
    FROM sale_items si
    JOIN sales sa ON si.sale_id = sa.id
    JOIN batches b ON si.batch_id = b.id
    WHERE ${timeCondition};
  `;
  const costOverview = await getOne(db, costSql, queryParams);

  const totalSales = salesOverview ? salesOverview.total_sales : 0;
  const grossSales = salesOverview ? salesOverview.gross_sales : 0;
  const totalDiscount = salesOverview ? salesOverview.total_discount : 0;
  const totalCost = costOverview ? costOverview.total_cost : 0;
  const invoiceCount = salesOverview ? salesOverview.invoice_count : 0;

  const netProfit = totalSales - totalCost;

  const inventorySql = `
    SELECT 
      COALESCE(SUM(quantity * buy_price), 0) AS total_inventory_buy_value,
      COALESCE(SUM(quantity * sell_price), 0) AS total_inventory_sell_value,
      COALESCE(SUM(quantity), 0) AS total_items_count,
      COUNT(DISTINCT medication_id) AS total_medications_count
    FROM batches
    WHERE quantity > 0;
  `;
  const inventoryOverview = await getOne(db, inventorySql);
  const inventoryValue = inventoryOverview ? inventoryOverview.total_inventory_buy_value : 0;
  const inventorySellValue = inventoryOverview ? inventoryOverview.total_inventory_sell_value : 0;

  const salesBreakdownSql = `
    SELECT 
      COALESCE(s.id, 0) AS supplier_id,
      COALESCE(s.name, 'بدون مورد (غير محدد)') AS supplier_name,
      COALESCE(s.company_name, '—') AS company_name,
      COALESCE(SUM(si.total_price), 0) AS supplier_sales_total,
      COALESCE(SUM(si.quantity), 0) AS total_units_sold,
      COALESCE(SUM(si.quantity * b.buy_price), 0) AS supplier_cost_total,
      COALESCE(SUM(si.total_price) - SUM(si.quantity * b.buy_price), 0) AS estimated_profit
    FROM sale_items si
    JOIN sales sa ON si.sale_id = sa.id
    JOIN batches b ON si.batch_id = b.id
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    WHERE ${timeCondition}
    GROUP BY s.id, s.name, s.company_name
    ORDER BY supplier_sales_total DESC;
  `;
  const salesBreakdownRows = await getAll(db, salesBreakdownSql, queryParams);
  const formattedSalesBreakdown = salesBreakdownRows.map(r => ({
    ...r,
    formatted_sales: formatCurrency(r.supplier_sales_total),
    formatted_cost: formatCurrency(r.supplier_cost_total),
    formatted_profit: formatCurrency(r.estimated_profit)
  }));

  const stockBreakdownSql = `
    SELECT 
      COALESCE(s.id, 0) AS supplier_id,
      COALESCE(s.name, 'بدون مورد (غير محدد)') AS supplier_name,
      COALESCE(s.company_name, '—') AS company_name,
      COALESCE(SUM(b.quantity * b.buy_price), 0) AS total_buy_value,
      COALESCE(SUM(b.quantity * b.sell_price), 0) AS total_sell_value,
      COALESCE(SUM(b.quantity * b.sell_price) - SUM(b.quantity * b.buy_price), 0) AS expected_profit,
      COALESCE(SUM(b.quantity), 0) AS current_stock_qty,
      COUNT(DISTINCT b.id) AS batch_count
    FROM batches b
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    WHERE b.quantity > 0
    GROUP BY s.id, s.name, s.company_name
    ORDER BY total_buy_value DESC;
  `;
  const stockBreakdownRows = await getAll(db, stockBreakdownSql);
  const formattedStockBreakdown = stockBreakdownRows.map(r => ({
    ...r,
    formatted_buy_value: formatCurrency(r.total_buy_value),
    formatted_sell_value: formatCurrency(r.total_sell_value),
    formatted_profit: formatCurrency(r.expected_profit)
  }));

  console.log(`✅ [Database] Unified financial report generated. Net profit: ${formatCurrency(netProfit)}`);

  return {
    period,
    total_sales: totalSales,
    gross_sales: grossSales,
    total_discount: totalDiscount,
    total_cost: totalCost,
    net_profit: netProfit,
    current_inventory_value: inventoryValue,
    current_inventory_sell_value: inventorySellValue,
    invoice_count: invoiceCount,
    formatted_total_sales: formatCurrency(totalSales),
    formatted_gross_sales: formatCurrency(grossSales),
    formatted_total_discount: formatCurrency(totalDiscount),
    formatted_total_cost: formatCurrency(totalCost),
    formatted_net_profit: formatCurrency(netProfit),
    formatted_inventory_value: formatCurrency(inventoryValue),
    formatted_inventory_sell_value: formatCurrency(inventorySellValue),
    supplier_sales_breakdown: formattedSalesBreakdown,
    supplier_stock_breakdown: formattedStockBreakdown
  };
}

async function getSalesAnalyticsReport(params = {}) {
  return await getUnifiedFinancialReport(params);
}

async function getPharmacyAssetsReport() {
  return await getUnifiedFinancialReport();
}

async function getStagnantMedications(daysThreshold = 90) {
  console.log(`🔍 [Database] Fetching stagnant medications (threshold: ${daysThreshold} days/months)...`);
  const db = await initDatabase();
  let daysNum = parseInt(daysThreshold || 90, 10);
  if (daysNum <= 12) {
    daysNum = daysNum * 30; // convert months (1, 3, 6, 12) to days
  }

  try {
    const sql = `
      SELECT 
        m.id AS medication_id,
        m.barcode,
        m.trade_name,
        m.generic_name,
        m.category,
        COALESCE(SUM(b.quantity), 0) AS total_stagnant_qty,
        COALESCE(AVG(b.buy_price), 0) AS avg_buy_price,
        COALESCE(SUM(b.quantity * b.buy_price), 0) AS total_stagnant_cost,
        MAX(s.timestamp) AS last_sale_date
      FROM medications m
      JOIN batches b ON m.id = b.medication_id
      LEFT JOIN sale_items si ON m.id = si.medication_id
      LEFT JOIN sales s ON si.sale_id = s.id
      WHERE b.quantity > 0
      GROUP BY m.id, m.barcode, m.trade_name, m.generic_name, m.category
      HAVING (
        MAX(s.timestamp) IS NOT NULL AND datetime(MAX(s.timestamp)) <= datetime('now', '-${daysNum} days')
      ) OR (
        MAX(s.timestamp) IS NULL AND (MIN(b.created_at) IS NULL OR datetime(MIN(b.created_at)) <= datetime('now', '-${daysNum} days'))
      )
      ORDER BY total_stagnant_cost DESC;
    `;

    const stagnantMeds = await getAll(db, sql);

    const resultMeds = [];
    const supplierAggMap = {};

    for (const med of stagnantMeds) {
      const medId = med.medication_id;

      const batchSql = `
        SELECT 
          b.id AS batch_id,
          b.quantity,
          b.buy_price,
          b.batch_number,
          b.expiry_date,
          s.id AS supplier_id,
          COALESCE(s.name, 'مذخر غير محدد') AS supplier_name,
          s.company_name
        FROM batches b
        LEFT JOIN suppliers s ON b.supplier_id = s.id
        WHERE b.medication_id = ? AND b.quantity > 0;
      `;
      const batches = await getAll(db, batchSql, [medId]);

      const piSql = `
        SELECT 
          pii.quantity AS last_purchase_qty,
          pi.invoice_date AS last_purchase_date,
          s.id AS supplier_id,
          COALESCE(s.name, 'مذخر غير محدد') AS supplier_name
        FROM purchase_invoice_items pii
        JOIN purchase_invoices pi ON pii.purchase_invoice_id = pi.id
        LEFT JOIN suppliers s ON pi.supplier_id = s.id
        WHERE (pii.barcode = ? OR pii.trade_name = ?)
        ORDER BY pi.id DESC;
      `;
      const piHistory = await getAll(db, piSql, [med.barcode, med.trade_name]);

      const supplierMap = {};
      for (const b of batches) {
        const suppId = b.supplier_id || 0;
        const suppName = b.supplier_name || 'مذخر غير محدد';

        if (!supplierMap[suppId]) {
          const piMatch = piHistory.find(p => p.supplier_id === suppId || (suppId === 0 && !p.supplier_id));
          supplierMap[suppId] = {
            supplier_id: suppId,
            supplier_name: suppName,
            quantity: 0,
            cost: 0,
            last_purchase_date: piMatch?.last_purchase_date || b.expiry_date || 'غير محدد',
            last_purchase_qty: piMatch?.last_purchase_qty || b.quantity
          };
        }
        supplierMap[suppId].quantity += b.quantity;
        supplierMap[suppId].cost += (b.quantity * b.buy_price);
      }

      const totalMedQty = med.total_stagnant_qty || 1;
      const suppliersBreakdown = Object.values(supplierMap).map(supp => {
        const percentageNum = (supp.quantity / totalMedQty) * 100;
        return {
          ...supp,
          percentage: percentageNum.toFixed(1),
          formatted_cost: formatCurrency(supp.cost)
        };
      });

      for (const supp of suppliersBreakdown) {
        const suppId = supp.supplier_id;
        if (!supplierAggMap[suppId]) {
          supplierAggMap[suppId] = {
            supplier_id: suppId,
            supplier_name: supp.supplier_name,
            stagnant_items_set: new Set(),
            stagnant_total_qty: 0,
            stagnant_total_cost: 0
          };
        }
        supplierAggMap[suppId].stagnant_items_set.add(medId);
        supplierAggMap[suppId].stagnant_total_qty += supp.quantity;
        supplierAggMap[suppId].stagnant_total_cost += supp.cost;
      }

      resultMeds.push({
        ...med,
        unit_buy_price: med.avg_buy_price,
        formatted_unit_price: formatCurrency(med.avg_buy_price),
        formatted_total_cost: formatCurrency(med.total_stagnant_cost),
        suppliers_breakdown: suppliersBreakdown
      });
    }

    const suppliersSummary = Object.values(supplierAggMap).map(s => ({
      supplier_id: s.supplier_id,
      supplier_name: s.supplier_name,
      stagnant_items_count: s.stagnant_items_set.size,
      stagnant_total_qty: s.stagnant_total_qty,
      stagnant_total_cost: s.stagnant_total_cost,
      formatted_total_cost: formatCurrency(s.stagnant_total_cost)
    })).sort((a, b) => b.stagnant_total_cost - a.stagnant_total_cost);

    const totalCost = resultMeds.reduce((acc, m) => acc + m.total_stagnant_cost, 0);

    return {
      stagnant_medications: resultMeds,
      suppliers_summary: suppliersSummary,
      total_stagnant_count: resultMeds.length,
      total_stagnant_value: totalCost,
      formatted_total_stagnant_value: formatCurrency(totalCost)
    };
  } catch (err) {
    console.error('❌ [Database Error] getStagnantMedications failed:', err);
    return {
      stagnant_medications: [],
      suppliers_summary: [],
      total_stagnant_count: 0,
      total_stagnant_value: 0,
      formatted_total_stagnant_value: '0 د.ع'
    };
  }
}


// ----------------------------------------------------
// PURCHASE INVOICES CRUD
// ----------------------------------------------------
async function getPurchaseInvoices() {
  console.log('🔍 [Database] Fetching purchase invoices list...');
  const db = await initDatabase();
  const sql = `
    SELECT pi.*, s.name AS supplier_name, s.company_name AS supplier_company
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    ORDER BY pi.id DESC;
  `;
  const rows = await getAll(db, sql);
  return rows.map(r => ({
    ...r,
    formatted_final_total: formatCurrency(r.final_total_iqd)
  }));
}

async function getUnpaidPurchaseInvoices(filters = {}) {
  try {
    console.log('🔍 [Database] Fetching unpaid credit purchase invoices list with filters:', filters);
    const db = await initDatabase();
    
    let sql = `
      SELECT pi.*, 
             s.name AS supplier_name, 
             s.company_name AS supplier_company, 
             s.phone AS supplier_phone
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON pi.supplier_id = s.id
      WHERE pi.payment_type = 'CREDIT' 
        AND (pi.status IS NULL OR pi.status = 'UNPAID' OR pi.status = 'PARTIAL')
    `;
    const params = [];

    if (filters && typeof filters === 'object') {
      if (filters.supplier_id && filters.supplier_id !== 'ALL') {
        sql += ` AND pi.supplier_id = ?`;
        params.push(filters.supplier_id);
      }
      if (filters.invoice_number && String(filters.invoice_number).trim() !== '') {
        sql += ` AND pi.invoice_number LIKE ?`;
        params.push(`%${String(filters.invoice_number).trim()}%`);
      }
    }

    sql += ` ORDER BY pi.id DESC;`;

    const invoices = await getAll(db, sql, params);

    const resultInvoices = [];
    for (const inv of invoices) {
      const itemsSql = `
        SELECT pii.trade_name, 
               pii.quantity AS original_qty, 
               pii.unit, 
               pii.barcode,
               pii.buy_price,
               COALESCE(b.quantity, 0) AS remaining_qty
        FROM purchase_invoice_items pii
        LEFT JOIN medications m ON pii.barcode = m.barcode
        LEFT JOIN batches b ON m.id = b.medication_id AND b.batch_number = ?
        WHERE pii.purchase_invoice_id = ?;
      `;
      const items = await getAll(db, itemsSql, [inv.invoice_number, inv.id]);

      const unsoldItems = items.filter(it => it.remaining_qty > 0).map(it => {
        const buyPrice = parseFloat(it.buy_price || 0);
        const totalCost = it.remaining_qty * buyPrice;
        return {
          trade_name: it.trade_name,
          remaining_qty: it.remaining_qty,
          original_qty: it.original_qty,
          unit: it.unit || 'باكيت',
          buy_price: buyPrice,
          total_cost: totalCost,
          formatted_total_cost: formatCurrency(totalCost)
        };
      });

      const unsoldTotalCost = unsoldItems.reduce((acc, it) => acc + it.total_cost, 0);

      resultInvoices.push({
        ...inv,
        remaining_amount: inv.final_total_iqd,
        formatted_final_total: formatCurrency(inv.final_total_iqd),
        formatted_remaining_amount: formatCurrency(inv.final_total_iqd),
        items: items,
        unsold_items: unsoldItems,
        unsold_items_count: unsoldItems.length,
        unsold_total_cost: unsoldTotalCost,
        formatted_unsold_total_cost: formatCurrency(unsoldTotalCost)
      });
    }

    return resultInvoices;

  } catch (err) {
    console.error('❌ [Database Error] getUnpaidPurchaseInvoices failed:', err);
    return [];
  }
}


async function payPurchaseInvoices(paymentData) {
  try {
    const { invoice_ids = [], discount = 0, notes = '' } = paymentData;
    if (!invoice_ids || invoice_ids.length === 0) {
      return { success: false, error: 'لم يتم تحديد أي فاتورة للتسديد' };
    }

    console.log(`💳 [Database] Processing payment for ${invoice_ids.length} purchase invoices...`);
    const db = await initDatabase();
    const totalDiscount = parseFloat(discount || 0);

    const placeholders = invoice_ids.map(() => '?').join(',');
    const invsSql = `
      SELECT id, invoice_number, supplier_id, final_total_iqd 
      FROM purchase_invoices 
      WHERE id IN (${placeholders});
    `;
    const invs = await getAll(db, invsSql, invoice_ids);
    if (!invs || invs.length === 0) {
      return { success: false, error: 'لم يتم العثور على الفواتير المحددة' };
    }

    const totalInvoiceSum = invs.reduce((sum, inv) => sum + (inv.final_total_iqd || 0), 0);

    for (const inv of invs) {
      const invoiceRatio = totalInvoiceSum > 0 ? (inv.final_total_iqd / totalInvoiceSum) : (1 / invs.length);
      const invDiscount = Math.round(totalDiscount * invoiceRatio);
      const netPaidAmount = Math.max(0, inv.final_total_iqd - invDiscount);

      await runQuery(db, `
        UPDATE purchase_invoices 
        SET payment_type = 'CASH', status = 'PAID', payment_discount = ?, paid_at = CURRENT_TIMESTAMP 
        WHERE id = ?;
      `, [invDiscount, inv.id]);


      const debtNote = notes 
        ? `${notes} (تسديد فاتورة آجل رقم ${inv.invoice_number})`
        : `تسديد فاتورة شراء آجل رقم ${inv.invoice_number}` + (invDiscount > 0 ? ` [خصم تسديد: ${formatCurrency(invDiscount)}]` : '');

      await runQuery(db, `
        INSERT INTO supplier_debts (supplier_id, type, amount, invoice_number, notes)
        VALUES (?, 'PAYMENT', ?, ?, ?);
      `, [inv.supplier_id, netPaidAmount, inv.invoice_number, debtNote]);
    }

    console.log(`✅ [Database] Successfully paid ${invs.length} invoices.`);
    return { success: true, paid_count: invs.length };
  } catch (err) {
    console.error('❌ [Database Error] payPurchaseInvoices failed:', err);
    return { success: false, error: err.message };
  }
}


async function getPurchaseInvoiceDetails(invoiceId) {
  try {
    console.log(`🔍 [Database] Fetching details for purchase invoice ID/Number: ${invoiceId}`);
    if (!invoiceId) return null;
    const db = await initDatabase();

    const invSql = `
      SELECT pi.*, 
             s.name AS supplier_name, 
             s.company_name AS supplier_company, 
             s.phone AS supplier_phone
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON pi.supplier_id = s.id
      WHERE pi.id = ? OR pi.invoice_number = ?;
    `;
    const invoice = await getOne(db, invSql, [invoiceId, invoiceId]);
    if (!invoice) return null;

    const itemsSql = `
      SELECT pii.*,
             m.id AS medication_id,
             COALESCE(m.trade_name, pii.trade_name) AS trade_name,
             COALESCE(m.generic_name, pii.trade_name) AS generic_name
      FROM purchase_invoice_items pii
      LEFT JOIN medications m ON pii.barcode = m.barcode
      WHERE pii.purchase_invoice_id = ?;
    `;
    const items = await getAll(db, itemsSql, [invoice.id]);

    const formattedItems = items.map(item => {
      const totalAmount = (item.quantity || 0) * (item.buy_price || 0);
      return {
        ...item,
        unit_price: item.buy_price,
        total_price: totalAmount,
        total_amount: totalAmount,
        formatted_buy_price: formatCurrency(item.buy_price),
        formatted_sell_price: formatCurrency(item.sell_price),
        formatted_total_amount: formatCurrency(totalAmount)
      };
    });

    return {
      ...invoice,
      formatted_subtotal: formatCurrency(invoice.subtotal),
      formatted_final_total: formatCurrency(invoice.final_total_iqd),
      items: formattedItems
    };
  } catch (err) {
    console.error(`❌ [Database Error] Error fetching purchase invoice ${invoiceId}:`, err);
    return null;
  }
}


async function addPurchaseInvoice(invoiceData) {
  console.log('➕ [Database] Adding new purchase invoice:', invoiceData.invoice_number);
  const db = await initDatabase();

  const {
    invoice_number,
    supplier_id,
    invoice_date,
    payment_type = 'CASH',
    currency = 'IQD',
    exchange_rate = 1,
    subtotal = 0,
    discount_percent = 0,
    final_total_iqd = 0,
    items = []
  } = invoiceData;

  const suppId = parseInt(supplier_id, 10);
  const exRate = parseFloat(exchange_rate || 1);

  // 1. Insert Purchase Invoice Header
  const invSql = `
    INSERT INTO purchase_invoices 
    (invoice_number, supplier_id, invoice_date, payment_type, currency, exchange_rate, subtotal, discount_percent, final_total_iqd, item_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  const invResult = await runQuery(db, invSql, [
    invoice_number,
    suppId,
    invoice_date,
    payment_type,
    currency,
    exRate,
    parseFloat(subtotal),
    parseFloat(discount_percent),
    parseFloat(final_total_iqd),
    items.length
  ]);

  const purchaseInvoiceId = invResult.id;


  // 2. Loop Items
  for (const item of items) {
    const buyPriceIqd = currency === 'USD' ? parseFloat(item.buy_price || 0) * exRate : parseFloat(item.buy_price || 0);
    const sellPriceIqd = currency === 'USD' ? parseFloat(item.sell_price || 0) * exRate : parseFloat(item.sell_price || 0);
    const qty = parseInt(item.quantity || 1, 10);
    const categoryName = item.category || 'عام';
    const barcode = item.barcode?.trim() || `628${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const unitName = item.unit || 'باكيت';
    const unitsPerPack = parseInt(item.units_per_pack || 1, 10);
    const pieceSellPrice = sellPriceIqd / (unitsPerPack || 1);

    const itemExpiryDate = item.expiry_date || (() => {
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      return expDate.toISOString().split('T')[0];
    })();

    // Insert Item Details
    await runQuery(db, `
      INSERT INTO purchase_invoice_items 
      (purchase_invoice_id, barcode, trade_name, quantity, category, buy_price, sell_price, profit_margin, expiry_date, unit, units_per_pack)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      purchaseInvoiceId,
      barcode,
      item.trade_name,
      qty,
      categoryName,
      buyPriceIqd,
      sellPriceIqd,
      parseFloat(item.profit_margin || 0),
      itemExpiryDate,
      unitName,
      unitsPerPack
    ]);

    // Check or Insert Medication into `medications` table and update master selling price
    let med = await getOne(db, `SELECT id FROM medications WHERE barcode = ? OR trade_name = ?;`, [barcode, item.trade_name]);
    let medId;
    if (med) {
      medId = med.id;
      await runQuery(db, `
        UPDATE medications 
        SET trade_name = ?, category = ?, units_per_pack = ?, price = ?, selling_price = ? 
        WHERE id = ?;
      `, [item.trade_name, categoryName, unitsPerPack, sellPriceIqd, sellPriceIqd, medId]);
    } else {
      const newMed = await runQuery(db, `
        INSERT INTO medications (barcode, trade_name, generic_name, category, min_stock, units_per_pack, price, selling_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `, [barcode, item.trade_name, item.trade_name, categoryName, 10, unitsPerPack, sellPriceIqd, sellPriceIqd]);
      medId = newMed.id;
    }


    // Add Batch to inventory (`batches` table)
    await runQuery(db, `
      INSERT INTO batches (medication_id, supplier_id, batch_number, expiry_date, buy_price, sell_price, quantity, unit, units_per_pack, piece_sell_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      medId,
      suppId,
      invoice_number,
      itemExpiryDate,
      buyPriceIqd,
      sellPriceIqd,
      qty,
      unitName,
      unitsPerPack,
      pieceSellPrice
    ]);
  }

  // 3. If Payment Type is CREDIT ('آجل'), register debt on supplier account
  if (payment_type === 'CREDIT') {
    await runQuery(db, `
      INSERT INTO supplier_debts (supplier_id, type, amount, invoice_number, notes)
      VALUES (?, 'CREDIT_PURCHASE', ?, ?, ?);
    `, [
      suppId,
      parseFloat(final_total_iqd),
      invoice_number,
      `فاتورة شراء آجل رقم ${invoice_number}`
    ]);
  }

  console.log(`✅ [Database] Purchase invoice ${invoice_number} saved with ${items.length} items.`);
  return { id: purchaseInvoiceId, success: true, invoice_number };
}

// Supplier Price Comparison Helper
async function getSupplierPriceHistory(params) {
  try {
    const db = dbInstance || await initDatabase();
    
    let searchBarcode = '';
    let searchName = '';
    let searchMedId = null;

    if (typeof params === 'object' && params !== null) {
      searchBarcode = params.barcode?.trim() || '';
      searchName = params.trade_name?.trim() || '';
      searchMedId = params.medication_id || params.medicationId || null;
    } else if (typeof params === 'string') {
      if (/^\d{5,}$/.test(params.trim())) {
        searchBarcode = params.trim();
      } else if (/^\d+$/.test(params.trim())) {
        searchMedId = parseInt(params.trim(), 10);
      } else {
        searchName = params.trim();
      }
    } else if (typeof params === 'number') {
      searchMedId = params;
    }

    // If medication_id was provided, fetch medication barcode and trade_name
    if (searchMedId && !searchBarcode && !searchName) {
      const med = await getOne(db, `SELECT barcode, trade_name FROM medications WHERE id = ?;`, [searchMedId]);
      if (med) {
        searchBarcode = med.barcode || '';
        searchName = med.trade_name || '';
      }
    }

    if (!searchBarcode && !searchName && !searchMedId) return [];

    // Query 1: purchase_invoice_items JOIN purchase_invoices JOIN suppliers
    const sql = `
      SELECT 
        pii.barcode,
        pii.trade_name,
        pii.buy_price,
        pii.buy_price AS unit_price,
        pii.buy_price AS purchase_price,
        pii.sell_price,
        pii.unit,
        pii.units_per_pack,
        pi.invoice_number,
        pi.invoice_date,
        pi.created_at,
        COALESCE(s.name, s.company_name, 'مورد سابق') AS supplier_name,
        s.company_name
      FROM purchase_invoice_items pii
      JOIN purchase_invoices pi ON pii.purchase_invoice_id = pi.id
      LEFT JOIN suppliers s ON pi.supplier_id = s.id
      WHERE (pii.barcode = ? AND pii.barcode != '') 
         OR (pii.trade_name LIKE ? AND pii.trade_name != '')
      ORDER BY pi.invoice_date DESC, pi.id DESC
      LIMIT 5;
    `;

    const history = await getAll(db, sql, [searchBarcode || '___NONE___', `%${searchName}%` || '___NONE___']);

    if (history && history.length > 0) {
      return history;
    }

    // Fallback Query 2: batches JOIN medications JOIN suppliers
    const fallbackSql = `
      SELECT 
        m.barcode,
        m.trade_name,
        b.buy_price,
        b.buy_price AS unit_price,
        b.buy_price AS purchase_price,
        b.sell_price,
        b.unit,
        b.units_per_pack,
        b.expiry_date AS invoice_date,
        b.batch_number AS invoice_number,
        COALESCE(s.name, s.company_name, 'مورد سابق') AS supplier_name,
        s.company_name
      FROM batches b
      JOIN medications m ON b.medication_id = m.id
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      WHERE (m.barcode = ? AND m.barcode != '') 
         OR (m.trade_name LIKE ? AND m.trade_name != '')
         OR (m.id = ?)
      ORDER BY b.id DESC
      LIMIT 5;
    `;

    const fallbackResults = await getAll(db, fallbackSql, [
      searchBarcode || '___NONE___',
      `%${searchName}%` || '___NONE___',
      searchMedId || -1
    ]);

    return fallbackResults || [];
  } catch (err) {
    console.error('❌ [Database Error] getSupplierPriceHistory failed:', err);
    return [];
  }
}

// Export clean empty setup database with complete schemas for new pharmacy installation
async function exportCleanDatabase(targetPath) {
  if (!targetPath) {
    throw new Error('Target save path is required for exportCleanDatabase');
  }

  // Delete target file if it exists to guarantee 100% clean initialization
  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
    } catch (e) {
      console.warn('Could not remove existing file at target path:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const cleanDb = new sqlite3.Database(targetPath, async (err) => {
      if (err) {
        console.error('❌ [Clean DB Export Error] Opening clean DB file failed:', err);
        return reject(err);
      }

      try {
        await runQuery(cleanDb, `PRAGMA foreign_keys = ON;`);
        await runQuery(cleanDb, `PRAGMA journal_mode = WAL;`);

        // Create clean empty tables
        await createTables(cleanDb);

        cleanDb.close((closeErr) => {
          if (closeErr) {
            console.error('❌ [Clean DB Export Error] Failed closing file:', closeErr);
            return reject(closeErr);
          }
          console.log(`✨ [Clean DB Export Success] Exported clean database setup file to: ${targetPath}`);
          resolve({ success: true, filePath: targetPath });
        });
      } catch (schemaErr) {
        console.error('❌ [Clean DB Export Error] Creating tables failed:', schemaErr);
        cleanDb.close();
        reject(schemaErr);
      }
    });
  });
}

module.exports = {
  initDatabase,
  getMedications,
  getMedicationByBarcode,
  addMedication,
  updateMedication,
  deleteMedication,
  bulkImportMedications,
  getBatches,
  getExpiringBatchesAlert,
  addBatch,
  updateBatch,
  deleteBatch,
  createSale,
  getSales,
  getSaleDetails,
  getLicenseInfo,
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierTransactions,
  addSupplierTransaction,
  getUnifiedFinancialReport,
  getSalesAnalyticsReport,
  getPharmacyAssetsReport,
  getStagnantMedications,
  getPurchaseInvoices,
  getUnpaidPurchaseInvoices,
  payPurchaseInvoices,
  getPurchaseInvoiceDetails,
  addPurchaseInvoice,
  getSupplierPriceHistory,
  exportCleanDatabase,
  getSystemSettings,
  updateSystemSettings,
  returnSaleInvoice,
  loginUser,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  formatCurrency
};

