const os = require('os');
const crypto = require('crypto');

/**
 * Generates a unique, deterministic hardware fingerprint for the machine
 * based on CPU info, platform arch, network MAC addresses, and hostname.
 */
function getHardwareFingerprint() {
  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'GenericCPU';
  const cpuArch = os.arch();
  const platform = os.platform();
  const hostname = os.hostname();

  // Collect MAC addresses of non-internal network interfaces
  const networkInterfaces = os.networkInterfaces();
  const macAddresses = [];
  
  for (const interfaceName of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macAddresses.push(iface.mac.toLowerCase());
        }
      }
    }
  }

  macAddresses.sort();
  const primaryMac = macAddresses.length > 0 ? macAddresses.join('-') : '00:11:22:33:44:55';

  const rawFingerprint = `${platform}|${cpuArch}|${cpuModel}|${hostname}|${primaryMac}`;
  
  const hash = crypto.createHash('sha256').update(rawFingerprint).digest('hex').toUpperCase();

  // Format into 4-block Hardware ID: HW-A1B2-C3D4-E5F6-7890
  const formattedId = `HW-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;

  return {
    rawHash: hash,
    hardwareId: formattedId,
    platform,
    cpuModel,
    macAddress: macAddresses[0] || 'N/A'
  };
}

/**
 * Generates a valid cryptographic activation key for a given Hardware Fingerprint
 */
function generateLicenseKeyForHardware(hardwareHash, secretKey = 'PharmacyCareMasterSecret2026!') {
  const hmac = crypto.createHmac('sha256', secretKey).update(hardwareHash).digest('hex').toUpperCase();
  return `PHARM-${hmac.substring(0, 4)}-${hmac.substring(4, 8)}-${hmac.substring(8, 12)}-${hmac.substring(12, 16)}`;
}

/**
 * Cryptographically verifies if a license key matches the hardware fingerprint
 */
function verifyLicenseKeyAgainstHardware(licenseKey, hardwareHash, secretKey = 'PharmacyCareMasterSecret2026!') {
  if (!licenseKey || typeof licenseKey !== 'string') return false;
  const expectedKey = generateLicenseKeyForHardware(hardwareHash, secretKey);
  return licenseKey.trim().toUpperCase() === expectedKey;
}

module.exports = {
  getHardwareFingerprint,
  generateLicenseKeyForHardware,
  verifyLicenseKeyAgainstHardware
};
