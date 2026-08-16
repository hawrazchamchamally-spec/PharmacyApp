const { contextBridge, ipcRenderer } = require('electron');

const apiBridge = {
  // Medications API
  getMedications: () => ipcRenderer.invoke('medications:get'),
  'get-medications': () => ipcRenderer.invoke('get-medications'),
  
  getMedicationByBarcode: (barcode) => ipcRenderer.invoke('medications:getByBarcode', barcode),
  'get-medication-by-barcode': (barcode) => ipcRenderer.invoke('get-medication-by-barcode', barcode),
  
  addMedication: (data) => ipcRenderer.invoke('medications:add', data),
  'add-medication': (data) => ipcRenderer.invoke('add-medication', data),
  
  updateMedication: (id, data) => ipcRenderer.invoke('medications:update', { id, data }),
  'update-medication': (id, data) => ipcRenderer.invoke('update-medication', { id, data }),
  
  deleteMedication: (id) => ipcRenderer.invoke('medications:delete', id),
  'delete-medication': (id) => ipcRenderer.invoke('delete-medication', id),

  bulkImportMedications: (list) => ipcRenderer.invoke('medications:bulkImport', list),
  'bulk-import-medications': (list) => ipcRenderer.invoke('bulk-import-medications', list),

  // Batches API
  getBatches: () => ipcRenderer.invoke('batches:get'),
  'get-batches': () => ipcRenderer.invoke('get-batches'),
  
  getExpiringBatchesAlert: () => ipcRenderer.invoke('batches:getExpiringAlert'),
  'get-expiring-batches': () => ipcRenderer.invoke('get-expiring-batches'),
  
  addBatch: (data) => ipcRenderer.invoke('batches:add', data),
  'add-batch': (data) => ipcRenderer.invoke('add-batch', data),
  
  updateBatch: (id, data) => ipcRenderer.invoke('batches:update', { id, data }),
  'update-batch': (id, data) => ipcRenderer.invoke('update-batch', { id, data }),
  
  deleteBatch: (id) => ipcRenderer.invoke('batches:delete', id),
  'delete-batch': (id) => ipcRenderer.invoke('delete-batch', id),

  // Sales API
  createSale: (saleData) => ipcRenderer.invoke('sales:create', saleData),
  'create-sale': (saleData) => ipcRenderer.invoke('create-sale', saleData),
  
  getSales: () => ipcRenderer.invoke('sales:get'),
  'get-sales': () => ipcRenderer.invoke('get-sales'),
  
  getSaleDetails: (saleId) => ipcRenderer.invoke('sales:getDetails', saleId),
  'get-sale-details': (saleId) => ipcRenderer.invoke('get-sale-details', saleId),

  returnSaleInvoice: (returnData) => ipcRenderer.invoke('sales:returnInvoice', returnData),
  'return-sale-invoice': (returnData) => ipcRenderer.invoke('return-sale-invoice', returnData),

  // License API
  getLicenseStatus: () => ipcRenderer.invoke('license:getStatus'),
  'get-license-status': () => ipcRenderer.invoke('get-license-status'),
  getLicenseInfo: () => ipcRenderer.invoke('license:get'),
  'get-license-info': () => ipcRenderer.invoke('get-license-info'),
  activateLicenseKey: (key) => ipcRenderer.invoke('license:activateKey', key),
  'activate-license-key': (key) => ipcRenderer.invoke('activate-license-key', key),
  getHardwareId: () => ipcRenderer.invoke('license:getHardwareId'),
  'get-hardware-id': () => ipcRenderer.invoke('get-hardware-id'),

  // Suppliers API
  getSuppliers: () => ipcRenderer.invoke('suppliers:get'),
  'get-suppliers': () => ipcRenderer.invoke('get-suppliers'),
  
  addSupplier: (data) => ipcRenderer.invoke('suppliers:add', data),
  'add-supplier': (data) => ipcRenderer.invoke('add-supplier', data),
  
  updateSupplier: (id, data) => ipcRenderer.invoke('suppliers:update', { id, data }),
  'update-supplier': (id, data) => ipcRenderer.invoke('update-supplier', { id, data }),
  
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', id),
  'delete-supplier': (id) => ipcRenderer.invoke('delete-supplier', id),
  
  getSupplierTransactions: (supplierId) => ipcRenderer.invoke('suppliers:getTransactions', supplierId),
  'get-supplier-transactions': (supplierId) => ipcRenderer.invoke('get-supplier-transactions', supplierId),
  
  addSupplierTransaction: (data) => ipcRenderer.invoke('suppliers:addTransaction', data),
  'add-supplier-transaction': (data) => ipcRenderer.invoke('add-supplier-transaction', data),
  
  getSupplierPriceHistory: (params) => ipcRenderer.invoke('suppliers:getPriceHistory', params),
  'get-supplier-price-history': (params) => ipcRenderer.invoke('get-supplier-price-history', params),

  // Purchase Invoices API
  getPurchaseInvoices: () => ipcRenderer.invoke('purchaseInvoices:get'),
  'get-purchase-invoices': () => ipcRenderer.invoke('get-purchase-invoices'),

  getPurchaseInvoiceDetails: (id) => ipcRenderer.invoke('purchaseInvoices:getById', id),
  'get-purchase-invoice-details': (id) => ipcRenderer.invoke('get-purchase-invoice-details', id),

  addPurchaseInvoice: (data) => ipcRenderer.invoke('purchaseInvoices:add', data),
  'add-purchase-invoice': (data) => ipcRenderer.invoke('add-purchase-invoice', data),
  getUnpaidPurchaseInvoices: (filters) => ipcRenderer.invoke('suppliers:getUnpaidInvoices', filters),
  'get-unpaid-purchase-invoices': (filters) => ipcRenderer.invoke('get-unpaid-purchase-invoices', filters),
  payPurchaseInvoices: (data) => ipcRenderer.invoke('suppliers:payInvoices', data),


  // Reports & Stagnant API
  getUnifiedFinancialReport: (params) => ipcRenderer.invoke('reports:getUnifiedFinancialReport', params),
  'get-unified-financial-report': (params) => ipcRenderer.invoke('get-unified-financial-report', params),
  getSalesAnalyticsReport: (params) => ipcRenderer.invoke('reports:getSalesAnalytics', params),
  getPharmacyAssetsReport: () => ipcRenderer.invoke('reports:getPharmacyAssets'),
  getStagnantMedications: (daysThreshold) => ipcRenderer.invoke('stagnantMedications:get', daysThreshold),
  'stagnantMedications:get': (daysThreshold) => ipcRenderer.invoke('stagnantMedications:get', daysThreshold),
  'accounts:getStagnantMedications': (daysThreshold) => ipcRenderer.invoke('accounts:getStagnantMedications', daysThreshold),
  'get-stagnant-medications': (daysThreshold) => ipcRenderer.invoke('get-stagnant-medications', daysThreshold),


  // Clean Setup Database Export API
  exportCleanDatabase: () => ipcRenderer.invoke('database:exportClean'),
  'export-clean-database': () => ipcRenderer.invoke('export-clean-database'),

  // System Settings API
  getSystemSettings: () => ipcRenderer.invoke('systemSettings:get'),
  'get-system-settings': () => ipcRenderer.invoke('get-system-settings'),
  updateSystemSettings: (settings) => ipcRenderer.invoke('systemSettings:update', settings),
  'update-system-settings': (settings) => ipcRenderer.invoke('update-system-settings', settings),

  // Medical AI API
  checkMedicalSafety: (payload) => ipcRenderer.invoke('ai:checkSafety', payload),
  'ai:checkSafety': (payload) => ipcRenderer.invoke('ai:checkSafety', payload),

  // Users & Authentication API
  loginUser: (username, password) => ipcRenderer.invoke('users:login', { username, password }),
  'login-user': (username, password) => ipcRenderer.invoke('login-user', { username, password }),
  getUsers: () => ipcRenderer.invoke('users:get'),
  'get-users': () => ipcRenderer.invoke('get-users'),
  addUser: (data) => ipcRenderer.invoke('users:add', data),
  'add-user': (data) => ipcRenderer.invoke('add-user', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', { id, data }),
  'update-user': (id, data) => ipcRenderer.invoke('update-user', { id, data }),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  'delete-user': (id) => ipcRenderer.invoke('delete-user', id)
};

// Expose API under both 'api' and 'electron' for compatibility
contextBridge.exposeInMainWorld('api', apiBridge);
contextBridge.exposeInMainWorld('electron', apiBridge);

