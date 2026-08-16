const { 
  initDatabase, 
  addMedication, 
  addBatch, 
  addSupplier, 
  addSupplierTransaction, 
  createSale 
} = require('./database');

async function seedData() {
  console.log('🌱 Checking SQLite database seed status...');
  const db = await initDatabase();

  // Check if tables already have data
  const medsCountRow = await new Promise((resolve) => 
    db.get('SELECT COUNT(*) as count FROM medications;', (err, row) => resolve(row || { count: 0 }))
  );
  
  const suppliersCountRow = await new Promise((resolve) => 
    db.get('SELECT COUNT(*) as count FROM suppliers;', (err, row) => resolve(row || { count: 0 }))
  );

  const salesCountRow = await new Promise((resolve) => 
    db.get('SELECT COUNT(*) as count FROM sales;', (err, row) => resolve(row || { count: 0 }))
  );

  if (medsCountRow.count > 0 && suppliersCountRow.count > 0 && salesCountRow.count > 0) {
    console.log('✨ Database already contains data. Skipping seed.');
    return;
  }

  console.log('📦 Database is empty or partially seeded. Populating real seed data...');

  // 1. Seed Real Suppliers
  let sup1, sup2;
  if (suppliersCountRow.count === 0) {
    sup1 = await addSupplier({
      name: 'مذخر الأدوية الرئيسي',
      company_name: 'مذخر الأدوية الرئيسي',
      phone: '07700000000',
      notes: 'المورد الافتراضي الرئيسي للنظام'
    });

    sup2 = await addSupplier({
      name: 'شركة أدوية بغداد العامة',
      company_name: 'شركة أدوية بغداد',
      phone: '07701112233',
      notes: 'مورد للمضادات والمسكنات والشرابات'
    });
    console.log('✅ Seeded real suppliers: مذخر الأدوية الرئيسي, شركة أدوية بغداد.');
  } else {
    const sups = await new Promise(r => db.all('SELECT * FROM suppliers LIMIT 2;', (e, rows) => r(rows || [])));
    sup1 = sups[0];
    sup2 = sups[1] || sups[0];
  }

  // 2. Seed Real Medications & Batches
  let med1, med2;
  if (medsCountRow.count === 0) {
    med1 = await addMedication({
      barcode: '6281001002001',
      trade_name: 'أوفلامول 500 ملغم',
      generic_name: 'Paracetamol',
      category: 'مسكنات وآلام',
      min_stock: 20
    });

    med2 = await addMedication({
      barcode: '6281001002002',
      trade_name: 'أموكسيل 500 ملغم',
      generic_name: 'Amoxicillin',
      category: 'مضادات حيوية',
      min_stock: 15
    });

    // Generate dates: 6 months from today (triggers 9-month alert) and 12 months from today (safe)
    const d6 = new Date();
    d6.setMonth(d6.getMonth() + 6);
    const expiry6Months = d6.toISOString().split('T')[0];

    const d12 = new Date();
    d12.setMonth(d12.getMonth() + 12);
    const expiry12Months = d12.toISOString().split('T')[0];

    const batch1 = await addBatch({
      medication_id: med1.id,
      supplier_id: sup1.id,
      batch_number: 'B2026-6M-ALERT',
      expiry_date: expiry6Months,
      buy_price: 1500,
      sell_price: 2500,
      quantity: 100
    });

    const batch2 = await addBatch({
      medication_id: med2.id,
      supplier_id: sup2.id,
      batch_number: 'AMX-2027-12M',
      expiry_date: expiry12Months,
      buy_price: 3500,
      sell_price: 5000,
      quantity: 50
    });

    console.log('✅ Seeded 2 real medications & batches (6 months alert + 12 months safe).');
  }

  // 3. Seed Real Sale Invoice
  if (salesCountRow.count === 0) {
    const batches = await new Promise(r => db.all('SELECT * FROM batches LIMIT 2;', (e, rows) => r(rows || [])));
    if (batches.length > 0) {
      await createSale({
        discount: 500,
        pharmacist_name: 'د. أحمد علي (صيدلي مسؤول)',
        items: [
          { medication_id: batches[0].medication_id, batch_id: batches[0].id, quantity: 2, sell_price: batches[0].sell_price },
          { medication_id: batches[1]?.medication_id || batches[0].medication_id, batch_id: batches[1]?.id || batches[0].id, quantity: 1, sell_price: batches[1]?.sell_price || 5000 }
        ]
      });
      console.log('✅ Seeded 1 real sale invoice into sales & sale_items tables.');
    }
  }

  // 4. Seed Supplier Transactions
  const debtCount = await new Promise((resolve) => 
    db.get('SELECT COUNT(*) as count FROM supplier_debts;', (err, row) => resolve(row || { count: 0 }))
  );
  if (debtCount.count === 0 && sup1) {
    await addSupplierTransaction({
      supplier_id: sup1.id,
      type: 'CREDIT_PURCHASE',
      amount: 500000,
      invoice_number: 'REC-2026-001',
      notes: 'استلام وجبة أدوية بدين من شركة أدوية بغداد'
    });
  }

  console.log('✨ Seed complete! Database fully populated with initial real data.');
}

module.exports = { seedData };
