import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const PharmacyContext = createContext(null);

export function PharmacyProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [users, setUsers] = useState([]);
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [medications, setMedications] = useState([]);
  const [batches, setBatches] = useState([]);
  const [expiringAlerts, setExpiringAlerts] = useState([]);
  const [sales, setSales] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [systemSettings, setSystemSettings] = useState({ near_expiry_months: 9, return_window_days: 90 });
  const [loading, setLoading] = useState(true);

  // Memory Cache Status Reference
  const isFetchedRef = useRef(false);

  // ----------------------------------------------------
  // CORE CACHING & FETCHING ENGINE
  // ----------------------------------------------------
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    // 1. Cache Hit: If data is already in memory and no force refresh requested, skip IPC calls!
    if (isFetchedRef.current && !forceRefresh) {
      console.log('⚡ [Cache Hit] Serving pharmacy data directly from Renderer memory store (0 IPC calls).');
      return;
    }

    try {
      console.log('🔄 [Cache Miss / Refetch] Querying live database via IPC bridge...');
      if (!isFetchedRef.current) setLoading(true);

      const [medsData, batchesData, alertsData, salesData, suppliersData, licData, purInvoicesData, settingsData, usersData, licStatus] = await Promise.all([
        api.getMedications(),
        api.getBatches(),
        api.getExpiringBatchesAlert(),
        api.getSales(),
        api.getSuppliers(),
        api.getLicenseInfo(),
        api.getPurchaseInvoices().catch(() => []),
        api.getSystemSettings().catch(() => ({ near_expiry_months: 9, return_window_days: 90 })),
        api.getUsers().catch(() => []),
        api.getLicenseStatus().catch(() => ({ isActivated: true }))
      ]);

      setMedications(medsData || []);
      setBatches(batchesData || []);
      setExpiringAlerts(alertsData || []);
      setSales(salesData || []);
      setSuppliers(suppliersData || []);
      setLicenseInfo(licData || null);
      setPurchaseInvoices(purInvoicesData || []);
      setSystemSettings(settingsData || { near_expiry_months: 9, return_window_days: 90 });
      setUsers(usersData || []);
      setLicenseStatus(licStatus || { isActivated: true });

      isFetchedRef.current = true;
      console.log('✅ [Cache Updated] Memory store populated successfully with fresh data.');
    } catch (err) {
      console.error('❌ [Cache Error] Failed to load pharmacy data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual Force Refetch Method
  const refetch = useCallback(() => {
    return fetchAllData(true);
  }, [fetchAllData]);

  // Initial load on application mount
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // ----------------------------------------------------
  // MUTATION HANDLERS (AUTOMATIC CACHE INVALIDATION)
  // ----------------------------------------------------
  const addMedication = async (formData) => {
    const result = await api.addMedication(formData);
    await fetchAllData(true); // Invalidate cache & refetch fresh data
    return result;
  };

  const updateMedication = async (id, formData) => {
    const result = await api.updateMedication(id, formData);
    await fetchAllData(true);
    return result;
  };

  const deleteMedication = async (id) => {
    const result = await api.deleteMedication(id);
    await fetchAllData(true);
    return result;
  };

  const bulkImportMedications = async (list) => {
    const result = await api.bulkImportMedications(list);
    await fetchAllData(true);
    return result;
  };

  const addBatch = async (formData) => {
    const result = await api.addBatch(formData);
    await fetchAllData(true);
    return result;
  };

  const updateBatch = async (id, formData) => {
    const result = await api.updateBatch(id, formData);
    await fetchAllData(true);
    return result;
  };

  const deleteBatch = async (id) => {
    const result = await api.deleteBatch(id);
    await fetchAllData(true);
    return result;
  };

  const createSale = async (saleData) => {
    const result = await api.createSale(saleData);
    await fetchAllData(true);
    return result;
  };

  const addSupplier = async (formData) => {
    const result = await api.addSupplier(formData);
    await fetchAllData(true);
    return result;
  };

  const updateSupplier = async (id, formData) => {
    const result = await api.updateSupplier(id, formData);
    await fetchAllData(true);
    return result;
  };

  const deleteSupplier = async (id) => {
    const result = await api.deleteSupplier(id);
    await fetchAllData(true);
    return result;
  };

  const addPurchaseInvoice = async (invoiceData) => {
    const result = await api.addPurchaseInvoice(invoiceData);
    await fetchAllData(true);
    return result;
  };

  const updateSystemSettings = async (settings) => {
    const result = await api.updateSystemSettings(settings);
    await fetchAllData(true);
    return result;
  };

  const returnSaleInvoice = async (returnData) => {
    const result = await api.returnSaleInvoice(returnData);
    await fetchAllData(true);
    return result;
  };

  // User Authentication & Management Actions
  const login = async (username, password) => {
    const result = await api.loginUser(username, password);
    if (result && result.success && result.user) {
      setCurrentUser(result.user);
      localStorage.setItem('pharmacy_current_user', JSON.stringify(result.user));
      await fetchAllData(true);
      return result;
    }
    return result || { success: false, message: 'فشل تسجيل الدخول' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pharmacy_current_user');
  };

  const addUser = async (userData) => {
    const result = await api.addUser(userData);
    await fetchAllData(true);
    return result;
  };

  const updateUser = async (id, userData) => {
    const result = await api.updateUser(id, userData);
    if (currentUser && currentUser.id === id) {
      const updatedUser = { ...currentUser, ...userData };
      setCurrentUser(updatedUser);
      localStorage.setItem('pharmacy_current_user', JSON.stringify(updatedUser));
    }
    await fetchAllData(true);
    return result;
  };

  const deleteUser = async (id) => {
    const result = await api.deleteUser(id);
    await fetchAllData(true);
    return result;
  };

  const checkLicense = async () => {
    const status = await api.getLicenseStatus();
    setLicenseStatus(status);
    await fetchAllData(true);
    return status;
  };

  const value = {
    currentUser,
    users,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    licenseStatus,
    checkLicense,
    medications,
    batches,
    expiringAlerts,
    sales,
    suppliers,
    purchaseInvoices,
    licenseInfo,
    systemSettings,
    loading,
    refetch,
    addMedication,
    updateMedication,
    deleteMedication,
    bulkImportMedications,
    addBatch,
    updateBatch,
    deleteBatch,
    createSale,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addPurchaseInvoice,
    updateSystemSettings,
    returnSaleInvoice
  };

  return (
    <PharmacyContext.Provider value={value}>
      {children}
    </PharmacyContext.Provider>
  );
}

// Custom Hook to consume the Caching Layer Store anywhere in components
export function usePharmacyStore() {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacyStore must be used within a PharmacyProvider');
  }
  return context;
}
