const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { app } = require('electron');

// 1. Secret Key configuration
const SECRET_KEY = process.env.LICENSE_SECRET_KEY || 'PHARMACY_SUPER_SECRET_KEY_2026_!@#$%^';
const MASTER_KEY = 'PCPRO-MASTER-ADMIN-2026-ROOT';

// 2. Get Unique Hardware ID using node-machine-id with resilient fallback
function getHardwareId() {
  try {
    const { machineIdSync } = require('node-machine-id');
    const rawId = machineIdSync({ original: true });
    const hash = crypto.createHash('sha256').update(rawId + SECRET_KEY).digest('hex').toUpperCase();
    return `HWID-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
  } catch (err) {
    console.warn('⚠️ [LicenseManager] node-machine-id error, using OS fingerprint fallback:', err.message);
    const osInfo = os.hostname() + '-' + os.platform() + '-' + os.arch() + '-' + (os.cpus()[0]?.model || 'CPU');
    const hash = crypto.createHash('sha256').update(osInfo + SECRET_KEY).digest('hex').toUpperCase();
    return `HWID-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
  }
}

// 3. Generate License Key Token (Payload + HMAC-SHA256 Signature)
function generateLicenseToken(hwId, expiry = 'LIFETIME', clientName = 'Pharmacy Client') {
  const cleanHwId = String(hwId || '').trim().toUpperCase();
  const cleanExpiry = String(expiry || 'LIFETIME').trim().toUpperCase();

  const payload = {
    hwid: cleanHwId,
    expiry: cleanExpiry,
    client: clientName,
    created: new Date().toISOString().split('T')[0],
    app: 'PharmacyCare Pro'
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('hex')
    .toUpperCase();

  return `${payloadBase64}.${signature}`;
}

// 4. Generate Compact Segmented Serial Key for Lifetime or Date
function generateCompactSerialKey(hwId, expiry = 'LIFETIME') {
  const cleanHwId = String(hwId || '').trim().toUpperCase();
  const cleanExpiry = String(expiry || 'LIFETIME').trim().toUpperCase();
  const raw = `${cleanHwId}|${cleanExpiry}`;

  const hmac = crypto.createHmac('sha256', SECRET_KEY)
    .update(raw)
    .digest('hex')
    .toUpperCase();

  return `PCPRO-${hmac.substring(0, 4)}-${hmac.substring(4, 8)}-${hmac.substring(8, 12)}-${hmac.substring(12, 16)}`;
}

// 5. Verify & Validate License Key (Signature, Hardware ID, Expiry Date)
function validateLicenseKey(hwId, inputKey) {
  const cleanKey = String(inputKey || '').trim();
  const cleanHwId = String(hwId || '').trim().toUpperCase();

  if (!cleanKey) {
    return { isValid: false, message: 'يرجى إدخال رمز التفعيل!' };
  }

  // Master Key Override Check
  if (cleanKey.toUpperCase() === MASTER_KEY) {
    return {
      isValid: true,
      expiry: 'LIFETIME',
      isLifetime: true,
      client: 'Master Administrator',
      message: 'تم التحقق بنجاح عبر المفتاح الرئيسي'
    };
  }

  // Case A: Token format (PayloadBase64.Signature)
  if (cleanKey.includes('.')) {
    const parts = cleanKey.split('.');
    if (parts.length !== 2) {
      return { isValid: false, message: 'تنسيق رمز التفعيل غير صالح!' };
    }

    const [payloadBase64, signature] = parts;
    const receivedSigClean = String(signature || '').trim().toUpperCase();

    // Decode Payload
    let payload;
    let decodedJsonStr = '';
    try {
      try {
        decodedJsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
      } catch (e) {
        decodedJsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      }
      payload = JSON.parse(decodedJsonStr);
    } catch (e) {
      try {
        decodedJsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
        payload = JSON.parse(decodedJsonStr);
      } catch (err2) {
        return { isValid: false, message: 'فشل فك تشفير بيانات رمز التفعيل!' };
      }
    }

    // Recalculate HMAC signature using SECRET_KEY on payloadBase64 AND decodedJsonStr
    const calculatedFullSignature = crypto.createHmac('sha256', SECRET_KEY)
      .update(payloadBase64)
      .digest('hex')
      .toUpperCase();

    const calculatedJsonSignature = decodedJsonStr ? crypto.createHmac('sha256', SECRET_KEY)
      .update(decodedJsonStr)
      .digest('hex')
      .toUpperCase() : '';

    // Match signature prefix matching receivedSignature length (e.g. 16 chars or full 64 chars)
    const expectedSignature = calculatedFullSignature.substring(0, receivedSigClean.length);
    const expectedJsonSig = calculatedJsonSignature ? calculatedJsonSignature.substring(0, receivedSigClean.length) : '';

    const isMatch = (expectedSignature === receivedSigClean) || (expectedJsonSig === receivedSigClean);

    if (!isMatch || receivedSigClean.length < 8) {
      console.error(`❌ [LicenseManager] Signature mismatch! Expected: ${expectedSignature}, Received: ${receivedSigClean}`);
      return { isValid: false, message: 'توقيع رمز التفعيل غير صالح أو تم التلاعب به!' };
    }

    // Check Hardware ID match flexibly (supports payload.h, payload.hwid, payload.hardwareId, payload.machineId)
    const keyHwid = String(payload.h || payload.hwid || payload.hardwareId || payload.machineId || '').trim().toUpperCase();
    const currentHwid = String(cleanHwId || getHardwareId()).trim().toUpperCase();

    const cleanKeyHwid = keyHwid.replace(/[^A-Z0-9]/g, '');
    const cleanCurrentHwid = currentHwid.replace(/[^A-Z0-9]/g, '');

    if (keyHwid !== currentHwid && cleanKeyHwid !== cleanCurrentHwid) {
      console.error(`❌ [LicenseManager] HWID Mismatch! Key HWID: "${keyHwid}", Current Machine HWID: "${currentHwid}"`);
      return {
        isValid: false,
        success: false,
        message: `كود الجهاز غير متطابق! الرمز مخصص لجهاز (${keyHwid || 'غير محدد'}) بينما هذا الجهاز (${currentHwid})`
      };
    }

    // Check Expiry Date flexibly (supports payload.e, payload.exp, payload.expiry, payload.expireDate)
    const expiry = String(payload.e || payload.exp || payload.expiry || payload.expireDate || payload.expires_at || 'LIFETIME').trim().toUpperCase();
    if (expiry !== 'LIFETIME') {
      const expiryDate = new Date(expiry);
      if (isNaN(expiryDate.getTime())) {
        return { isValid: false, success: false, message: 'تاريخ انتهاء الصلاحية في الرمز غير صالح!' };
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        return {
          isValid: false,
          success: false,
          isExpired: true,
          message: `انتهت صلاحية رمز التفعيل بتاريخ: ${expiry}`
        };
      }
    }

    return {
      isValid: true,
      success: true,
      expiry,
      isLifetime: expiry === 'LIFETIME',
      client: payload.c || payload.client || payload.clientName || 'Pharmacy Client',
      created: payload.created || null,
      message: 'رمز التفعيل صالح ومطابق للجهاز والصلاحية'
    };
  }

  // Case B: Compact Serial Key format (PCPRO-XXXX-XXXX-XXXX-XXXX)
  const upperKey = cleanKey.toUpperCase();
  const expectedLifetimeKey = generateCompactSerialKey(cleanHwId, 'LIFETIME');

  if (upperKey === expectedLifetimeKey) {
    return {
      isValid: true,
      expiry: 'LIFETIME',
      isLifetime: true,
      client: 'Licensed Pharmacy',
      message: 'رمز التفعيل الدائم مطابق لبصمة الجهاز'
    };
  }

  // Also check if matches legacy secret key format for backwards compatibility
  const legacySecret = 'PHARMACY_CARE_PRO_SECURE_SECRET_2026';
  const legacyHmac = crypto.createHmac('sha256', legacySecret).update(cleanHwId).digest('hex').toUpperCase();
  const legacyKey = `PCPRO-${legacyHmac.substring(0, 4)}-${legacyHmac.substring(4, 8)}-${legacyHmac.substring(8, 12)}-${legacyHmac.substring(12, 16)}`;
  if (upperKey === legacyKey) {
    return {
      isValid: true,
      expiry: 'LIFETIME',
      isLifetime: true,
      client: 'Licensed Pharmacy (Legacy)',
      message: 'رمز التفعيل الدائم مطابق لبصمة الجهاز'
    };
  }

  return {
    isValid: false,
    message: 'رمز التفعيل غير صالح أو غير متطابق مع كود هذا الجهاز!'
  };
}

// 6. Get License File Paths in Electron userData
function getUserDataDir() {
  const userDataDir = app ? app.getPath('userData') : path.join(process.cwd(), 'userData');
  if (!fs.existsSync(userDataDir)) {
    try { fs.mkdirSync(userDataDir, { recursive: true }); } catch (e) {}
  }
  return userDataDir;
}

function getLicenseFilePath() {
  return path.join(getUserDataDir(), 'license.key');
}

// 7. Check License Status on disk & in database
async function checkLicenseStatus(db = null) {
  const hwId = getHardwareId();
  const userDataDir = getUserDataDir();
  const keyPath = path.join(userDataDir, 'license.key');
  const jsonPath = path.join(userDataDir, 'license.json');

  try {
    const filePath = fs.existsSync(keyPath) ? keyPath : fs.existsSync(jsonPath) ? jsonPath : null;
    if (filePath) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (data && data.licenseKey) {
        const val = validateLicenseKey(hwId, data.licenseKey);
        if (val.isValid) {
          return {
            isActivated: true,
            hardwareId: hwId,
            licenseKey: data.licenseKey,
            expiry: val.expiry || 'LIFETIME',
            isLifetime: val.isLifetime,
            client: val.client || data.client || 'Pharmacy Client',
            activatedAt: data.activatedAt || new Date().toISOString()
          };
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [LicenseManager] Reading license file failed:', err.message);
  }

  // Also verify SQLite database license_info table if available
  if (db && typeof db.getOne === 'function') {
    try {
      const database = await db.initDatabase();
      const row = await db.getOne(database, `SELECT * FROM license_info LIMIT 1;`);
      if (row && row.license_key) {
        const val = validateLicenseKey(hwId, row.license_key);
        if (val.isValid) {
          // Restore license files if missing
          const payload = {
            hardwareId: hwId,
            licenseKey: row.license_key,
            expiry: val.expiry || 'LIFETIME',
            isLifetime: val.isLifetime,
            activatedAt: row.activation_date
          };
          try {
            fs.writeFileSync(keyPath, JSON.stringify(payload, null, 2), 'utf8');
            fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
          } catch (e) {}

          return {
            isActivated: true,
            hardwareId: hwId,
            licenseKey: row.license_key,
            expiry: val.expiry || 'LIFETIME',
            isLifetime: val.isLifetime,
            activatedAt: row.activation_date
          };
        }
      }
    } catch (e) {}
  }

  return {
    isActivated: false,
    hardwareId: hwId,
    licenseKey: null,
    expiry: null,
    activatedAt: null
  };
}

// 8. Activate System with License Key
async function activateLicense(inputKey, db = null) {
  const hwId = getHardwareId();
  const cleanKey = String(inputKey || '').trim();

  const validation = validateLicenseKey(hwId, cleanKey);

  if (!validation.isValid) {
    console.error(`❌ [LicenseManager] Activation failed for HWID: ${hwId}. Reason: ${validation.message}`);
    return {
      success: false,
      isActivated: false,
      message: validation.message || 'رمز التفعيل غير صالح أو تم التلاعب به!'
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const payload = {
    hardwareId: hwId,
    licenseKey: cleanKey,
    expiry: validation.expiry || 'LIFETIME',
    isLifetime: validation.isLifetime,
    client: validation.client || 'Pharmacy Client',
    activatedAt: today,
    product: 'PharmacyCare Pro v1.0'
  };

  try {
    const userDataDir = getUserDataDir();
    fs.writeFileSync(path.join(userDataDir, 'license.key'), JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(path.join(userDataDir, 'license.json'), JSON.stringify(payload, null, 2), 'utf8');
    console.log(`✅ [LicenseManager] License files saved successfully.`);
  } catch (err) {
    console.error('❌ [LicenseManager] Failed to write license files:', err);
  }

  // Update Database
  if (db && typeof db.runQuery === 'function') {
    try {
      const database = await db.initDatabase();
      await db.runQuery(database, `DELETE FROM license_info;`);
      await db.runQuery(database, `
        INSERT INTO license_info (license_key, hardware_hash, activation_date, last_server_check)
        VALUES (?, ?, ?, ?);
      `, [cleanKey, hwId, today, today]);
    } catch (err) {
      console.warn('⚠️ [LicenseManager] Database license_info update failed:', err.message);
    }
  }

  console.log(`✨ [LicenseManager] System activated successfully for HWID: ${hwId} (Expiry: ${validation.expiry})`);
  return {
    success: true,
    isActivated: true,
    hardwareId: hwId,
    licenseKey: cleanKey,
    expiry: validation.expiry || 'LIFETIME',
    message: 'تم تفعيل الرخصة بنجاح'
  };
}

module.exports = {
  SECRET_KEY,
  MASTER_KEY,
  getHardwareId,
  generateLicenseToken,
  generateCompactSerialKey,
  validateLicenseKey,
  getLicenseFilePath,
  getUserDataDir,
  checkLicenseStatus,
  activateLicense
};
