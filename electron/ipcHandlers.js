const { ipcMain } = require('electron');
const db = require('./database');

// Safe IPC wrapper helper with explicit terminal logging & error tracking
function handleIpc(channel, description, handlerFn) {
  try {
    ipcMain.removeHandler(channel);
  } catch (e) {
    // Ignore error if handler wasn't previously registered
  }

  ipcMain.handle(channel, async (event, ...args) => {
    try {
      console.log(`📡 [IPC Request] Channel: "${channel}" | Description: ${description}`, args.length > 0 ? args : '');
      const result = await handlerFn(event, ...args);
      console.log(`✅ [IPC Success] Channel: "${channel}" | Result:`, Array.isArray(result) ? `Array (${result.length} items)` : (typeof result === 'object' ? 'Object' : result));
      return result;
    } catch (err) {
      console.error(`❌ [IPC Error] Channel: "${channel}" | Failed execution:`, err);
      throw err;
    }
  });
}

function registerIpcHandlers() {
  console.log('🔄 [IPC] Registering all Main Process IPC handlers...');

  // ----------------------------------------------------
  // MEDICATIONS HANDLERS
  // ----------------------------------------------------
  handleIpc('medications:get', 'جلب قائمة كافة الأدوية', async () => db.getMedications());
  handleIpc('get-medications', 'جلب قائمة كافة الأدوية (بديل)', async () => db.getMedications());

  handleIpc('medications:getByBarcode', 'البحث عن دواء بواسطة الباركوم', async (_, barcode) => db.getMedicationByBarcode(barcode));
  handleIpc('get-medication-by-barcode', 'البحث عن دواء بواسطة الباركوم (بديل)', async (_, barcode) => db.getMedicationByBarcode(barcode));

  handleIpc('medications:add', 'إضافة دواء جديد', async (_, medData) => db.addMedication(medData));
  handleIpc('add-medication', 'إضافة دواء جديد (بديل)', async (_, medData) => db.addMedication(medData));

  handleIpc('medications:update', 'تحديث بيانات دواء', async (_, { id, data }) => db.updateMedication(id, data));
  handleIpc('update-medication', 'تحديث بيانات دواء (بديل)', async (_, { id, data }) => db.updateMedication(id, data));

  handleIpc('medications:delete', 'حذف دواء', async (_, id) => db.deleteMedication(id));
  handleIpc('delete-medication', 'حذف دواء (بديل)', async (_, id) => db.deleteMedication(id));

  handleIpc('medications:bulkImport', 'استيراد جماعي للأدوية من إكسيل', async (_, list) => db.bulkImportMedications(list));
  handleIpc('bulk-import-medications', 'استيراد جماعي للأدوية من إكسيل (بديل)', async (_, list) => db.bulkImportMedications(list));

  // ----------------------------------------------------
  // BATCHES HANDLERS
  // ----------------------------------------------------
  handleIpc('batches:get', 'جلب وجبات الأدوية', async () => db.getBatches());
  handleIpc('get-batches', 'جلب وجبات الأدوية (بديل)', async () => db.getBatches());

  handleIpc('batches:getExpiringAlert', 'جلب أدوية تنتهي صلاحيتها خلال 9 أشهر', async () => db.getExpiringBatchesAlert());
  handleIpc('get-expiring-batches', 'جلب أدوية تنتهي صلاحيتها خلال 9 أشهر (بديل)', async () => db.getExpiringBatchesAlert());

  handleIpc('batches:add', 'إضافة وجبة أدوية جديدة', async (_, batchData) => db.addBatch(batchData));
  handleIpc('add-batch', 'إضافة وجبة أدوية جديدة (بديل)', async (_, batchData) => db.addBatch(batchData));

  handleIpc('batches:update', 'تحديث وجبة أدوية', async (_, { id, data }) => db.updateBatch(id, data));
  handleIpc('update-batch', 'تحديث وجبة أدوية (بديل)', async (_, { id, data }) => db.updateBatch(id, data));

  handleIpc('batches:delete', 'حذف وجبة أدوية', async (_, id) => db.deleteBatch(id));
  handleIpc('delete-batch', 'حذف وجبة أدوية (بديل)', async (_, id) => db.deleteBatch(id));

  // ----------------------------------------------------
  // SALES HANDLERS
  // ----------------------------------------------------
  handleIpc('sales:create', 'إنشاء فاتورة مبيعات جديدة', async (_, saleData) => db.createSale(saleData));
  handleIpc('create-sale', 'إنشاء فاتورة مبيعات جديدة (بديل)', async (_, saleData) => db.createSale(saleData));

  handleIpc('sales:get', 'جلب سجل المبيعات', async () => db.getSales());
  handleIpc('get-sales', 'جلب سجل المبيعات (بديل)', async () => db.getSales());

  handleIpc('sales:getDetails', 'جلب تفاصيل فاتورة مبيعات', async (_, saleId) => db.getSaleDetails(saleId));
  handleIpc('get-sale-details', 'جلب تفاصيل فاتورة مبيعات (بديل)', async (_, saleId) => db.getSaleDetails(saleId));

  handleIpc('sales:returnInvoice', 'إرجاع مبيعات فاتورة (كلي أو جزئي)', async (_, returnData) => db.returnSaleInvoice(returnData));
  handleIpc('return-sale-invoice', 'إرجاع مبيعات فاتورة (بديل)', async (_, returnData) => db.returnSaleInvoice(returnData));

  // ----------------------------------------------------
  // LICENSE HANDLERS
  // ----------------------------------------------------
  const licenseManager = require('./services/licenseManager');

  handleIpc('license:getStatus', 'فحص حالة تفعيل رخصة التطبيق', async () => {
    return await licenseManager.checkLicenseStatus(db);
  });
  handleIpc('get-license-status', 'فحص حالة تفعيل رخصة التطبيق (بديل)', async () => {
    return await licenseManager.checkLicenseStatus(db);
  });

  handleIpc('license:getHardwareId', 'جلب المعرف الفريد للجهاز', async () => {
    const hwId = licenseManager.getHardwareId();
    return {
      hardwareId: hwId,
      hardware_hash: hwId,
      machineId: hwId
    };
  });
  handleIpc('get-hardware-id', 'جلب المعرف الفريد للجهاز (بديل)', async () => {
    const hwId = licenseManager.getHardwareId();
    return {
      hardwareId: hwId,
      hardware_hash: hwId,
      machineId: hwId
    };
  });

  handleIpc('license:activateKey', 'تفعيل مفتاح ترخيص جديد', async (_, key) => {
    const cleanKey = typeof key === 'object' && key !== null ? (key.key || key.licenseKey || key.serialKey) : key;
    return await licenseManager.activateLicense(cleanKey, db);
  });
  handleIpc('activate-license-key', 'تفعيل مفتاح ترخيص جديد (بديل)', async (_, key) => {
    const cleanKey = typeof key === 'object' && key !== null ? (key.key || key.licenseKey || key.serialKey) : key;
    return await licenseManager.activateLicense(cleanKey, db);
  });

  handleIpc('license:get', 'جلب معلومات ترخيص النظام', async () => {
    return await licenseManager.checkLicenseStatus(db);
  });
  handleIpc('get-license-info', 'جلب معلومات ترخيص النظام (بديل)', async () => {
    return await licenseManager.checkLicenseStatus(db);
  });

  // ----------------------------------------------------
  // SUPPLIERS & DEBTS HANDLERS
  // ----------------------------------------------------
  handleIpc('suppliers:get', 'جلب قائمة الموردين والديون', async () => db.getSuppliers());
  handleIpc('get-suppliers', 'جلب قائمة الموردين والديون (بديل)', async () => db.getSuppliers());

  handleIpc('suppliers:add', 'إضافة مورد جديد', async (_, supplierData) => db.addSupplier(supplierData));
  handleIpc('add-supplier', 'إضافة مورد جديد (بديل)', async (_, supplierData) => db.addSupplier(supplierData));

  handleIpc('suppliers:update', 'تحديث بيانات مورد', async (_, { id, data }) => db.updateSupplier(id, data));
  handleIpc('update-supplier', 'تحديث بيانات مورد (بديل)', async (_, { id, data }) => db.updateSupplier(id, data));

  handleIpc('suppliers:delete', 'حذف مورد', async (_, id) => db.deleteSupplier(id));
  handleIpc('delete-supplier', 'حذف مورد (بديل)', async (_, id) => db.deleteSupplier(id));

  handleIpc('suppliers:getTransactions', 'جلب حركة ديون مورد', async (_, supplierId) => db.getSupplierTransactions(supplierId));
  handleIpc('get-supplier-transactions', 'جلب حركة ديون مورد (بديل)', async (_, supplierId) => db.getSupplierTransactions(supplierId));

  handleIpc('suppliers:addTransaction', 'إضافة دفعة أو دين لمورد', async (_, transactionData) => db.addSupplierTransaction(transactionData));
  handleIpc('add-supplier-transaction', 'إضافة دفعة أو دين لمورد (بديل)', async (_, transactionData) => db.addSupplierTransaction(transactionData));

  handleIpc('suppliers:getPriceHistory', 'جلب سجل أسعار الشراء السابقة للمادة', async (_, params) => db.getSupplierPriceHistory(params));
  handleIpc('get-supplier-price-history', 'جلب سجل أسعار الشراء السابقة للمادة (بديل)', async (_, params) => db.getSupplierPriceHistory(params));

  // ----------------------------------------------------
  // PURCHASE INVOICES HANDLERS
  // ----------------------------------------------------
  handleIpc('purchaseInvoices:get', 'جلب سجل فواتير الشراء', async () => db.getPurchaseInvoices());
  handleIpc('get-purchase-invoices', 'جلب سجل فواتير الشراء (بديل)', async () => db.getPurchaseInvoices());

  handleIpc('purchaseInvoices:getById', 'جلب تفاصيل فاتورة الشراء وعناصرها بواسطة ID أو رقم الفاتورة', async (_, id) => {
    try {
      if (!id) return null;
      return await db.getPurchaseInvoiceDetails(id);
    } catch (err) {
      console.error(`❌ [IPC Error] purchaseInvoices:getById failed for ID: ${id}:`, err);
      return null;
    }
  });
  handleIpc('purchaseInvoices:getDetails', 'جلب تفاصيل فاتورة الشراء (بديل)', async (_, id) => {
    try {
      if (!id) return null;
      return await db.getPurchaseInvoiceDetails(id);
    } catch (err) {
      console.error(`❌ [IPC Error] purchaseInvoices:getDetails failed for ID: ${id}:`, err);
      return null;
    }
  });
  handleIpc('get-purchase-invoice-details', 'جلب تفاصيل فاتورة الشراء (بديل 2)', async (_, id) => {
    try {
      if (!id) return null;
      return await db.getPurchaseInvoiceDetails(id);
    } catch (err) {
      console.error(`❌ [IPC Error] get-purchase-invoice-details failed for ID: ${id}:`, err);
      return null;
    }
  });


  handleIpc('purchaseInvoices:add', 'إضافة فاتورة شراء جديدة', async (_, invoiceData) => db.addPurchaseInvoice(invoiceData));
  handleIpc('add-purchase-invoice', 'إضافة فاتورة شراء جديدة (بديل)', async (_, invoiceData) => db.addPurchaseInvoice(invoiceData));

  handleIpc('suppliers:getUnpaidInvoices', 'جلب كشف الفواتير الآجلة غير المسددة للموردين', async (_, filters) => {
    try {
      return await db.getUnpaidPurchaseInvoices(filters);
    } catch (err) {
      console.error('❌ [IPC Error] suppliers:getUnpaidInvoices failed:', err);
      return [];
    }
  });

  handleIpc('get-unpaid-purchase-invoices', 'جلب كشف الفواتير الآجلة غير المسددة (بديل)', async (_, filters) => {
    try {
      return await db.getUnpaidPurchaseInvoices(filters);
    } catch (err) {
      console.error('❌ [IPC Error] get-unpaid-purchase-invoices failed:', err);
      return [];
    }
  });


  handleIpc('suppliers:payInvoices', 'تسديد الفواتير الآجلة للموردين مع الخصم', async (_, paymentData) => db.payPurchaseInvoices(paymentData));
  handleIpc('pay-purchase-invoices', 'تسديد الفواتير الآجلة (بديل)', async (_, paymentData) => db.payPurchaseInvoices(paymentData));



  // ----------------------------------------------------
  // FINANCIAL REPORTS HANDLERS
  // ----------------------------------------------------
  handleIpc('reports:getUnifiedFinancialReport', 'توليد التقرير المالي الموحد', async (_, params) => db.getUnifiedFinancialReport(params));
  handleIpc('get-unified-financial-report', 'توليد التقرير المالي الموحد (بديل)', async (_, params) => db.getUnifiedFinancialReport(params));

  handleIpc('reports:getSalesAnalytics', 'تحليلات المبيعات والأرباح', async (_, params) => db.getSalesAnalyticsReport(params));
  handleIpc('reports:getPharmacyAssets', 'جلب قيمة جرد وأصول الصيدلية', async () => db.getPharmacyAssetsReport());

  handleIpc('stagnantMedications:get', 'جلب كشف الأدوية الراكدة وملخص المذاخر', async (_, daysThreshold) => db.getStagnantMedications(daysThreshold));
  handleIpc('accounts:getStagnantMedications', 'جلب كشف الأدوية الراكدة وملخص المذاخر (بديل 1)', async (_, daysThreshold) => db.getStagnantMedications(daysThreshold));
  handleIpc('get-stagnant-medications', 'جلب كشف الأدوية الراكدة (بديل 2)', async (_, daysThreshold) => db.getStagnantMedications(daysThreshold));


  // ----------------------------------------------------
  // CLEAN DATABASE SETUP EXPORT HANDLERS
  // ----------------------------------------------------
  handleIpc('database:exportClean', 'تصدير نسخة جديدة فارغة للتركيب', async () => {
    const { dialog } = require('electron');
    const { filePath } = await dialog.showSaveDialog({
      title: 'حفظ ملف نسخة جديدة فارغة للتركيب (Clean Setup Database)',
      defaultPath: 'PharmacyCare_Clean_Setup.db',
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!filePath) {
      return { cancelled: true };
    }

    return await db.exportCleanDatabase(filePath);
  });

  handleIpc('export-clean-database', 'تصدير نسخة جديدة فارغة للتركيب (بديل)', async () => {
    const { dialog } = require('electron');
    const { filePath } = await dialog.showSaveDialog({
      title: 'حفظ ملف نسخة جديدة فارغة للتركيب (Clean Setup Database)',
      defaultPath: 'PharmacyCare_Clean_Setup.db',
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!filePath) {
      return { cancelled: true };
    }

    return await db.exportCleanDatabase(filePath);
  });

  // ----------------------------------------------------
  // SYSTEM SETTINGS HANDLERS
  // ----------------------------------------------------
  handleIpc('systemSettings:get', 'جلب إعدادات النظام العامة', async () => db.getSystemSettings());
  handleIpc('get-system-settings', 'جلب إعدادات النظام العامة (بديل)', async () => db.getSystemSettings());

  handleIpc('systemSettings:update', 'تحديث إعدادات النظام العامة', async (_, settings) => db.updateSystemSettings(settings));
  handleIpc('update-system-settings', 'تحديث إعدادات النظام العامة (بديل)', async (_, settings) => db.updateSystemSettings(settings));

  // ----------------------------------------------------
  // USERS & AUTHENTICATION HANDLERS
  // ----------------------------------------------------
  const handleUserLogin = async (_, arg1, arg2) => {
    let username, password;
    if (typeof arg1 === 'object' && arg1 !== null) {
      username = arg1.username;
      password = arg1.password;
    } else {
      username = arg1;
      password = arg2;
    }
    return await db.loginUser(username, password);
  };

  handleIpc('users:login', 'تسجيل دخول المستخدم', handleUserLogin);
  handleIpc('login-user', 'تسجيل دخول المستخدم (بديل)', handleUserLogin);

  handleIpc('users:get', 'جلب قائمة المستخدمين', async () => db.getUsers());
  handleIpc('get-users', 'جلب قائمة المستخدمين (بديل)', async () => db.getUsers());

  handleIpc('users:add', 'إضافة مستخدم جديد', async (_, userData) => db.addUser(userData));
  handleIpc('add-user', 'إضافة مستخدم جديد (بديل)', async (_, userData) => db.addUser(userData));

  handleIpc('users:update', 'تحديث بيانات مستخدم', async (_, arg1, arg2) => {
    let id, data;
    if (typeof arg1 === 'object' && arg1 !== null && arg1.id !== undefined) {
      id = arg1.id;
      data = arg1.data || arg1;
    } else {
      id = arg1;
      data = arg2;
    }
    return await db.updateUser(id, data);
  });
  handleIpc('update-user', 'تحديث بيانات مستخدم (بديل)', async (_, arg1, arg2) => {
    let id, data;
    if (typeof arg1 === 'object' && arg1 !== null && arg1.id !== undefined) {
      id = arg1.id;
      data = arg1.data || arg1;
    } else {
      id = arg1;
      data = arg2;
    }
    return await db.updateUser(id, data);
  });

  handleIpc('users:delete', 'حذف مستخدم', async (_, id) => db.deleteUser(id));
  handleIpc('delete-user', 'حذف مستخدم (بديل)', async (_, id) => db.deleteUser(id));

  // ----------------------------------------------------
  // MEDICAL AI SAFETY CHECK HANDLER
  // ----------------------------------------------------
  handleIpc('ai:checkSafety', 'فحص السلامة والتداخلات الدوائية بالذكاء الاصطناعي', async (_, payload) => {
    const { checkMedicalSafety } = require('./services/medicalAi');
    return await checkMedicalSafety(payload || {});
  });

  console.log('✅ [IPC] All Main Process IPC handlers registered successfully.');
}

module.exports = { registerIpcHandlers };
