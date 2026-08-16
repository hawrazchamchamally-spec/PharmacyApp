const https = require('https');
const http = require('http');
const { getHardwareFingerprint, verifyLicenseKeyAgainstHardware, generateLicenseKeyForHardware } = require('./hardwareId');
const { getLicenseInfo, initDatabase } = require('./database');

const REMOTE_LICENSE_ENDPOINT = 'https://api.pharmacycare.app/v1/license/verify';
const MAX_OFFLINE_GRACE_DAYS = 14;

/**
 * Performs online ping to remote licensing server API endpoint with timeout fallback
 */
function pingLicensingServer(licenseKey, hardwareHash) {
  return new Promise((resolve) => {
    // If endpoint is mock/unreachable, simulate fast fallback
    const postData = JSON.stringify({
      licenseKey,
      hardwareHash,
      clientVersion: '1.0.0',
      timestamp: new Date().toISOString()
    });

    const url = new URL(REMOTE_LICENSE_ENDPOINT);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000 // 3 seconds timeout
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(body);
            resolve({ success: parsed.valid === true, message: parsed.message || 'Remote activation verified' });
          } catch {
            resolve({ success: false, reason: 'Invalid server response format' });
          }
        } else {
          resolve({ success: false, reason: `Server returned HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (err) => {
      // Offline mode
      resolve({ success: false, isOffline: true, reason: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, isOffline: true, reason: 'Server connection timeout' });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main License Check Engine
 * Evaluates Hardware Fingerprint, Local Key Signature, Remote Server Ping & 14-Day Grace Period
 */
async function runLicenseVerification(userProvidedKey = null) {
  const hw = getHardwareFingerprint();
  const db = await initDatabase();
  let dbLicense = await getLicenseInfo();

  const targetKey = userProvidedKey || dbLicense.license_key;

  // 1. Verify cryptographic HMAC signature against this machine's Hardware ID
  const isSignatureValid = verifyLicenseKeyAgainstHardware(targetKey, hw.rawHash);

  // If provided key is invalid signature, reject
  if (!isSignatureValid) {
    // Generate valid demo key for initial setup if default
    const validDemoKey = generateLicenseKeyForHardware(hw.rawHash);
    
    // Auto-initialize valid demo key for hardware if first run
    if (!dbLicense.license_key || dbLicense.license_key === 'PHARM-A7F9-88BC-91E2') {
      await updateDbLicenseKey(db, validDemoKey, hw.rawHash);
      dbLicense = await getLicenseInfo();
    } else {
      return {
        status: 'INVALID_LICENSE_KEY',
        isValid: false,
        hardwareId: hw.hardwareId,
        hardwareHash: hw.rawHash,
        message: 'مفتاح الترخيص غير متطابق مع بصمة هذا الجهاز!'
      };
    }
  }

  const activeKey = dbLicense.license_key || generateLicenseKeyForHardware(hw.rawHash);

  // 2. Calculate Offline Grace Period (Max 14 days)
  const lastCheckDate = new Date(dbLicense.last_server_check || new Date());
  const now = new Date();
  const diffTime = Math.abs(now - lastCheckDate);
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const remainingGraceDays = Math.max(0, MAX_OFFLINE_GRACE_DAYS - daysElapsed);

  // 3. Ping Remote Licensing Server
  const remoteResult = await pingLicensingServer(activeKey, hw.rawHash);

  if (remoteResult.success) {
    // Remote verification successful -> Update last_server_check to today
    const todayStr = new Date().toISOString().split('T')[0];
    await updateDbServerCheckDate(db, todayStr);

    return {
      status: 'ACTIVATED_ONLINE',
      isValid: true,
      mode: 'ONLINE',
      hardwareId: hw.hardwareId,
      hardwareHash: hw.rawHash,
      licenseKey: activeKey,
      activationDate: dbLicense.activation_date,
      lastServerCheck: todayStr,
      remainingGraceDays: 14,
      message: 'الترخيص نشط ومتصل برمز السيرفر بنجاح'
    };
  }

  // If Remote Ping failed / Offline Mode:
  if (daysElapsed <= MAX_OFFLINE_GRACE_DAYS) {
    return {
      status: 'ACTIVATED_OFFLINE_GRACE',
      isValid: true,
      mode: 'OFFLINE_GRACE',
      hardwareId: hw.hardwareId,
      hardwareHash: hw.rawHash,
      licenseKey: activeKey,
      activationDate: dbLicense.activation_date,
      lastServerCheck: dbLicense.last_server_check,
      daysElapsedOffline: daysElapsed,
      remainingGraceDays: remainingGraceDays,
      message: `الترخيص مفعل في الوضع الأوفلاين (المتبقي من مهلة 14 يوم: ${remainingGraceDays} يوم)`
    };
  }

  // Grace Period Expired (> 14 days without internet ping)
  return {
    status: 'EXPIRED_OFFLINE_GRACE',
    isValid: false,
    mode: 'LOCK',
    hardwareId: hw.hardwareId,
    hardwareHash: hw.rawHash,
    licenseKey: activeKey,
    activationDate: dbLicense.activation_date,
    lastServerCheck: dbLicense.last_server_check,
    daysElapsedOffline: daysElapsed,
    remainingGraceDays: 0,
    message: 'انتهت مهلة 14 يوم أوفلاين. يرجى الاتصال بالإنترنت لتأكيد ترخيص البرنامج.'
  };
}

async function updateDbLicenseKey(db, licenseKey, hardwareHash) {
  const today = new Date().toISOString().split('T')[0];
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE license_info
      SET license_key = ?, hardware_hash = ?, last_server_check = ?
      WHERE id = (SELECT id FROM license_info LIMIT 1);
    `, [licenseKey, hardwareHash, today], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

async function updateDbServerCheckDate(db, todayStr) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE license_info
      SET last_server_check = ?
      WHERE id = (SELECT id FROM license_info LIMIT 1);
    `, [todayStr], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

module.exports = {
  runLicenseVerification,
  pingLicensingServer,
  getHardwareFingerprint,
  verifyLicenseKeyAgainstHardware,
  generateLicenseKeyForHardware
};
