import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle, 
  FileText, 
  X, 
  Scan, 
  Download, 
  Zap,
  Tag,
  ChevronDown,
  ChevronLeft,
  Grid,
  Sliders,
  Check,
  Eye,
  Repeat,
  DollarSign
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { formatCurrency, api } from '../services/api';

export default function POS({ medications, batches, onCompleteSale }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);
  const [openCategories, setOpenCategories] = useState({});

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [isEditShortcutsModalOpen, setIsEditShortcutsModalOpen] = useState(false);

  // Patient Health Conditions State & AI Safety Check
  const [patientConditions, setPatientConditions] = useState([]);
  const [aiSafetyResult, setAiSafetyResult] = useState(null);
  const [isAiChecking, setIsAiChecking] = useState(false);

  const availableHealthConditions = [
    { key: 'ضغط', label: '🩸 ضغط دم' },
    { key: 'سكر', label: '🍬 سكري' },
    { key: 'حمل', label: '🤰 حمل' },
    { key: 'كلى', label: '🫘 أمراض كلى' },
    { key: 'ربو', label: '🫁 ربو/حساسية' }
  ];

  const togglePatientCondition = (conditionKey) => {
    setPatientConditions(prev => 
      prev.includes(conditionKey) 
        ? prev.filter(c => c !== conditionKey) 
        : [...prev, conditionKey]
    );
  };

  // Auto-Check Medical AI Safety when cart or patient conditions change
  useEffect(() => {
    if (!cart.length) {
      setAiSafetyResult(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setIsAiChecking(true);
        const result = await api.checkMedicalSafety(cart, patientConditions);
        if (isMounted) {
          setAiSafetyResult(result);
        }
      } catch (err) {
        console.error('Medical AI Auto-Check Error:', err);
      } finally {
        if (isMounted) setIsAiChecking(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cart, patientConditions]);

  // Cart Item Cost Visibility State
  const [showCostMap, setShowCostMap] = useState({});

  const toggleShowCost = (batch_id) => {
    setShowCostMap(prev => ({
      ...prev,
      [batch_id]: !prev[batch_id]
    }));
  };

  const toggleUnitSwitcher = (batch_id) => {
    setCart(cart.map(item => {
      if (item.batch_id === batch_id) {
        if (item.units_per_pack <= 1) return item;

        const newUnitSold = item.unit_sold === 'شريط' || item.unit_sold === 'قطعة' ? 'باكيت' : 'شريط';
        const newPrice = newUnitSold === 'شريط' ? item.piece_sell_price : item.pack_sell_price;
        
        return {
          ...item,
          unit_sold: newUnitSold,
          sell_price: newPrice
        };
      }
      return item;
    }));
  };

  // All categories present in system
  const allSystemCategories = Array.from(
    new Set([
      'مسكنات وآلام',
      'مضادات حيوية',
      'ضد التهابات ومسكن',
      'أدوية الجهاز الهضمي',
      'أدوية الضغط والقلب',
      'مكملات غذائية وفيتامينات',
      ...medications.map(m => m.category),
      ...batches.map(b => b.category)
    ].filter(Boolean))
  );

  // Initial shortcuts from localStorage or default top 8
  const defaultInitialShortcuts = allSystemCategories.slice(0, 8);
  const [shortcutCategories, setShortcutCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_pos_category_shortcuts');
      return saved ? JSON.parse(saved) : defaultInitialShortcuts;
    } catch (e) {
      return defaultInitialShortcuts;
    }
  });

  const [tempShortcuts, setTempShortcuts] = useState([]);

  const openEditShortcutsModal = () => {
    setTempShortcuts([...shortcutCategories]);
    setIsEditShortcutsModalOpen(true);
  };

  const saveShortcutsArrangement = () => {
    setShortcutCategories(tempShortcuts);
    try {
      localStorage.setItem('pharmacy_pos_category_shortcuts', JSON.stringify(tempShortcuts));
    } catch (e) {
      console.error('Failed to save category shortcuts to localStorage:', e);
    }
    setIsEditShortcutsModalOpen(false);
  };

  const toggleCategory = (categoryName) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const searchInputRef = useRef(null);
  const discountInputRef = useRef(null);
  const receiptRef = useRef(null);

  // Auto-focus search / barcode scanner input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Search batches that are available and not expired
  const searchResults = batches.filter(b => {
    if (b.quantity <= 0) return false;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (b.trade_name && b.trade_name.toLowerCase().includes(term)) ||
      (b.generic_name && b.generic_name.toLowerCase().includes(term)) ||
      (b.barcode && b.barcode.includes(term)) ||
      (b.batch_number && b.batch_number.toLowerCase().includes(term))
    );
  });

  // Filter search results by selectedCategoryFilter
  const categoryFilteredBatches = searchResults.filter(b => {
    if (selectedCategoryFilter === 'ALL') return true;
    return (b.category || 'أدوية عامة') === selectedCategoryFilter;
  });

  // Group search results by Category
  const groupedResults = categoryFilteredBatches.reduce((groups, batch) => {
    const cat = batch.category || 'أدوية عامة';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(batch);
    return groups;
  }, {});

  const addToCart = (batch) => {
    const existingIndex = cart.findIndex(item => item.batch_id === batch.id);

    const unitsPerPack = parseInt(batch.units_per_pack || 1, 10);
    const packSellPrice = parseFloat(batch.sell_price || 0);
    const pieceSellPrice = parseFloat(batch.piece_sell_price || (unitsPerPack > 1 ? Math.round(packSellPrice / unitsPerPack) : packSellPrice));

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity < batch.quantity) {
        updatedCart[existingIndex].quantity += 1;
        setCart(updatedCart);
        showToast(`تم زيادة كمية (${batch.trade_name}) إلى ${updatedCart[existingIndex].quantity}`);
      } else {
        alert('وصلت للحد الأقصى للكمية المتاحة بهذه الوجبة!');
      }
    } else {
      setCart([
        ...cart,
        {
          batch_id: batch.id,
          medication_id: batch.medication_id,
          trade_name: batch.trade_name,
          generic_name: batch.generic_name,
          batch_number: batch.batch_number,
          sell_price: packSellPrice,
          pack_sell_price: packSellPrice,
          piece_sell_price: pieceSellPrice,
          buy_price: parseFloat(batch.buy_price || 0),
          units_per_pack: unitsPerPack,
          unit_sold: 'باكيت',
          max_quantity: batch.quantity,
          quantity: 1
        }
      ]);
      showToast(`تمت إضافة (${batch.trade_name}) إلى السلة`);
    }
  };

  const toggleCartItemUnit = (batch_id, newUnit) => {
    setCart(cart.map(item => {
      if (item.batch_id === batch_id) {
        const unit_sold = newUnit;
        const effectivePrice = unit_sold === 'شريط' || unit_sold === 'قطعة' ? item.piece_sell_price : item.pack_sell_price;
        return {
          ...item,
          unit_sold,
          sell_price: effectivePrice
        };
      }
      return item;
    }));
  };

  // Quick Barcode Scanner Handler (fires on Enter key in barcode field)
  const handleBarcodeKeyPress = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchTerm.trim();
      if (!code) return;

      // 1. Try exact barcode match in loaded batches
      const matchedBatch = batches.find(b => b.barcode === code && b.quantity > 0);
      if (matchedBatch) {
        addToCart(matchedBatch);
        setSearchTerm('');
        return;
      }

      // 2. Or query database by barcode via IPC
      try {
        const dbResult = await api.getMedicationByBarcode(code);
        if (dbResult && dbResult.batch_id) {
          addToCart({
            id: dbResult.batch_id,
            medication_id: dbResult.id,
            trade_name: dbResult.trade_name,
            generic_name: dbResult.generic_name,
            batch_number: dbResult.batch_number,
            sell_price: dbResult.sell_price,
            quantity: dbResult.batch_quantity
          });
          setSearchTerm('');
          return;
        }
      } catch (err) {
        console.error('Barcode lookup error:', err);
      }

      // If single search result matches, add it
      if (searchResults.length === 1) {
        addToCart(searchResults[0]);
        setSearchTerm('');
      } else {
        showToast('لم يتم العثور على دواء بهذا الباركود!');
      }
    }
  };

  const updateQuantity = (batch_id, delta) => {
    setCart(cart.map(item => {
      if (item.batch_id === batch_id) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.max_quantity) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (batch_id) => {
    setCart(cart.filter(item => item.batch_id !== batch_id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    showToast('تم تفريغ السلة');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
  const numericDiscount = parseFloat(discount || 0);
  const finalTotal = Math.max(0, subtotal - numericDiscount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const saleResult = await onCompleteSale({
        items: cart,
        discount: numericDiscount
      });

      setLastInvoice({
        ...saleResult,
        items: [...cart],
        date: new Date().toLocaleString('ar-IQ')
      });

      setCart([]);
      setDiscount(0);
      setIsReceiptModalOpen(true);
    } catch (err) {
      console.error('Checkout error:', err);
      alert('حدث خطأ أثناء إجراء عملية البيع!');
    }
  };

  // Fast Keyboard Shortcuts (F2 Checkout, F4 Discount, Alt+C Clear, Esc Close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) handleCheckout();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (discountInputRef.current) discountInputRef.current.focus();
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        clearCart();
      } else if (e.key === 'Escape') {
        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, discount, isReceiptModalOpen]);

  // Export receipt invoice as JPEG file
  const handleExportJpeg = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExportingJpeg(true);
      const dataUrl = await toJpeg(receiptRef.current, { quality: 0.95, cacheBust: true });
      const link = document.createElement('a');
      link.download = `Invoice_${lastInvoice?.invoice_number || 'Receipt'}.jpeg`;
      link.href = dataUrl;
      link.click();
      showToast('تم تحميل الفاتورة كصورة JPEG بنجاح!');
    } catch (err) {
      console.error('Failed to export JPEG:', err);
      alert('حدث خطأ أثناء تصدير صورة JPEG');
    } finally {
      setIsExportingJpeg(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', height: 'calc(100vh - 130px)', position: 'relative' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            zIndex: 1000,
            boxShadow: '0 10px 25px rgba(6, 182, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Zap size={18} /> {toastMessage}
        </div>
      )}

      {/* Product Selection Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        
        {/* Quick Barcode Scanner & Search Bar (Top Filter Bar) */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div className="pos-top-bar">
            <div className="pos-search-wrapper">
              <Search size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />
              <input
                ref={searchInputRef}
                type="text"
                className="pos-search-input num"
                placeholder="إمسح الباركود مباشرة هنا أو إبحث باسم المادة (اضغط Enter للاضافة)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleBarcodeKeyPress}
              />
            </div>
            <button 
              className="pos-barcode-status-btn" 
              onClick={() => searchInputRef.current && searchInputRef.current.focus()}
              title="انقر لتركيز القارئ"
            >
              <Scan size={20} color="#f59e0b" /> قارئ الباركود جاهز
            </button>
          </div>

          {/* Fast Keyboard Shortcuts Guide */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>اختصارات لوحة المفاتيح السريعة:</span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}><kbd className="num" style={{ color: '#f59e0b' }}>F2</kbd> إتمام الفاتورة</span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}><kbd className="num" style={{ color: '#f59e0b' }}>F4</kbd> الخصم</span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}><kbd className="num" style={{ color: '#f59e0b' }}>Alt+C</kbd> مسح السلة</span>
          </div>
        </div>

        {/* Category Tabs Bar (Pill Buttons) */}
        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div className="pos-category-pills-bar">
            {/* Active / Inactive Pill 1: جميع المواد (ALL) */}
            <div
              className={`pos-category-pill ${selectedCategoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategoryFilter('ALL')}
            >
              <span>جميع المواد</span>
              <span className="num" style={{ fontSize: '0.75rem', opacity: 0.9 }}>({searchResults.length})</span>
            </div>

            {/* All Category Pill Buttons */}
            {allSystemCategories.map((catName) => {
              const catCount = batches.filter(b => b.quantity > 0 && b.category === catName).length;
              const isActive = selectedCategoryFilter === catName;

              return (
                <div
                  key={catName}
                  className={`pos-category-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryFilter(isActive ? 'ALL' : catName)}
                >
                  <span>{catName}</span>
                  <span className="num" style={{ fontSize: '0.75rem', opacity: isActive ? 1 : 0.7 }}>
                    ({catCount})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Products Grid Card Layout (4 Columns Grid) */}
        <div className="glass-card" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Grid size={18} color="#f59e0b" />
              <span>شبكة أدوية ومواد نقطة البيع {selectedCategoryFilter !== 'ALL' && `[${selectedCategoryFilter}]`}</span>
            </h3>
            <span className="badge badge-good num" style={{ fontSize: '0.82rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              {categoryFilteredBatches.length} مواد متاحة
            </span>
          </div>

          {categoryFilteredBatches.length > 0 ? (
            <div className="pos-products-grid">
              {categoryFilteredBatches.map((b) => {
                const isLowStock = b.quantity <= 5;
                const unitsPerPack = parseInt(b.units_per_pack || 1, 10);

                return (
                  <div
                    key={b.id}
                    onClick={() => addToCart(b)}
                    className="pos-product-card"
                  >
                    {/* Top Part: Category Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="pos-card-category-badge">
                        {b.category || 'عام'}
                      </span>
                      {b.units_per_pack > 1 && (
                        <span className="num" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ×{b.units_per_pack} تجزئة
                        </span>
                      )}
                    </div>

                    {/* Middle Part: Trade Name & Generic Name */}
                    <div>
                      <h4 className="pos-card-title">{b.trade_name}</h4>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.generic_name || b.barcode}
                      </p>
                    </div>

                    {/* Bottom Part (Footer): Price on Right, Available Stock on Left */}
                    <div className="pos-card-footer">
                      {/* Price on Right */}
                      <div>
                        <div className="pos-card-price num">
                          {formatCurrency(b.sell_price)} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>د.ع</span>
                        </div>
                        {unitsPerPack > 1 && (
                          <span className="num" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
                            القطعة: {formatCurrency(Math.round(b.sell_price / unitsPerPack))}
                          </span>
                        )}
                      </div>

                      {/* Stock on Left */}
                      <span className={`pos-card-stock num ${isLowStock ? 'stock-low' : 'stock-available'}`}>
                        المتوفر: {b.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>لا توجد أدوية أو مواد متوفرة تطابق البحث</div>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>تأكد من وجود كميات متوفرة بالمخزن أو قم بإلغاء الفلتر الحالي</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart & Billing Section */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart size={22} color="var(--accent-cyan)" />
              سلة المبيعات الفورية
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-good num">{cart.length} أصناف</span>
              {cart.length > 0 && (
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--accent-rose)' }} onClick={clearCart}>
                  تفريغ السلة
                </button>
              )}
            </div>
          </div>

          {/* Patient Health Condition Selector (AI Medical Safety Filter Bar) */}
          <div style={{ marginBottom: '16px', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              الحالة الصحية للمريض (الفحص الطبي الذكي تلقائياً):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {availableHealthConditions.map(cond => {
                const isSelected = patientConditions.includes(cond.key);
                return (
                  <div
                    key={cond.key}
                    onClick={() => togglePatientCondition(cond.key)}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cond.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Items List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
            {cart.map((item) => {
              const isCostVisible = !!showCostMap[item.batch_id];
              const canSwitchUnit = (item.units_per_pack > 1);
              const isRetail = (item.unit_sold === 'شريط' || item.unit_sold === 'قطعة') && item.units_per_pack > 1;
              const effectiveUnitCost = isRetail ? (item.buy_price / item.units_per_pack) : item.buy_price;
              const currentUnitLabel = item.unit_sold || 'باكيت';

              return (
                <div
                  key={item.batch_id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Row 1: Item Name, Unit Price & Cost Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <h5 style={{ fontWeight: 800, fontSize: '0.94rem', color: '#ffffff' }}>{item.trade_name}</h5>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span className="num" style={{ fontSize: '0.84rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          {formatCurrency(item.sell_price)} / {currentUnitLabel}
                        </span>

                        {/* Cost Badge (when cost button is toggled ON) */}
                        {isCostVisible && (
                          <span className="badge badge-alert num" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            تكلفة {currentUnitLabel}: {formatCurrency(effectiveUnitCost)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Quantity controls, Line Total & Bottom Action Buttons [Cost] [Switcher] [Delete] */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px', gap: '8px' }}>
                    
                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', height: '24px' }}
                        onClick={() => updateQuantity(item.batch_id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="num" style={{ fontWeight: 800, minWidth: '22px', textAlign: 'center', fontSize: '0.9rem' }}>
                        {item.quantity}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', height: '24px' }}
                        onClick={() => updateQuantity(item.batch_id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Right Group: Line Total & Icon Buttons [Cost] [Switcher] [Delete] */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="num" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        {formatCurrency(item.sell_price * item.quantity)}
                      </span>

                      {/* Action Buttons Group (Icon Only) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        
                        {/* 1. Cost Button (زر التكلفة - أيقونة فقط) */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCostVisible ? '#fbbf24' : 'var(--text-muted)',
                            borderColor: isCostVisible ? 'rgba(245, 158, 11, 0.5)' : 'var(--border-color)',
                            background: isCostVisible ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)'
                          }}
                          onClick={() => toggleShowCost(item.batch_id)}
                          title={
                            isCostVisible 
                              ? `إخفاء سعر التكلفة (تكلفة ${currentUnitLabel}: ${formatCurrency(effectiveUnitCost)})` 
                              : `عرض سعر التكلفة (تكلفة ${currentUnitLabel}: ${formatCurrency(effectiveUnitCost)})`
                          }
                        >
                          <Eye size={15} />
                        </button>

                        {/* 2. Package / Strip Switcher (زر تحويل الباكيت/الشريط - أيقونة فقط) */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: canSwitchUnit ? 'var(--accent-cyan)' : 'var(--text-dim)',
                            borderColor: canSwitchUnit ? 'rgba(6, 182, 212, 0.4)' : 'var(--border-color)',
                            background: canSwitchUnit ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            opacity: canSwitchUnit ? 1 : 0.35,
                            cursor: canSwitchUnit ? 'pointer' : 'not-allowed'
                          }}
                          onClick={() => canSwitchUnit && toggleUnitSwitcher(item.batch_id)}
                          disabled={!canSwitchUnit}
                          title={
                            canSwitchUnit 
                              ? `الوحدة الحالية: (${currentUnitLabel}) - اضغط للتحويل إلى (${item.unit_sold === 'شريط' ? 'باكيت' : 'شريط'})` 
                              : 'هذه المادة لا تحتوي على أشرطة فرعية (باكيت فقط)'
                          }
                        >
                          <Repeat size={15} />
                        </button>

                        {/* 3. Delete Button (زر الحذف) */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-rose)',
                            borderColor: 'rgba(244, 63, 94, 0.3)',
                            background: 'rgba(244, 63, 94, 0.1)'
                          }}
                          onClick={() => removeFromCart(item.batch_id)}
                          title="حذف المادة من السلة"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}



            {cart.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                السلة فارغة. اختر الدواء أو امسح الباركود للبيع المباشر.
              </div>
            )}
          </div>

          {/* Smart Medical AI Checker Alert Banner */}
          {cart.length > 0 && aiSafetyResult && (
            <div 
              style={{ 
                padding: '14px 16px', 
                marginTop: '12px', 
                borderRadius: '12px',
                background: aiSafetyResult.hasRisk ? (
                  aiSafetyResult.riskLevel === 'حرج' 
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.9))'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.9))'
                ) : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.9))',
                border: aiSafetyResult.hasRisk ? (
                  aiSafetyResult.riskLevel === 'حرج'
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(245, 158, 11, 0.5)'
                ) : '1px solid rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {aiSafetyResult.hasRisk ? (aiSafetyResult.riskLevel === 'حرج' ? '🚨' : '⚠️') : '🛡️'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: aiSafetyResult.hasRisk ? (aiSafetyResult.riskLevel === 'حرج' ? '#f87171' : '#fbbf24') : '#34d399' }}>
                    مساعد الذكاء الاصطناعي الطبي {isAiChecking ? '(جاري الفحص...)' : ''}
                  </span>
                </div>
                <span 
                  className="badge num" 
                  style={{ 
                    fontSize: '0.75rem',
                    background: aiSafetyResult.hasRisk ? (aiSafetyResult.riskLevel === 'حرج' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)') : 'rgba(16, 185, 129, 0.3)',
                    color: aiSafetyResult.hasRisk ? (aiSafetyResult.riskLevel === 'حرج' ? '#f87171' : '#fbbf24') : '#34d399'
                  }}
                >
                  الخطورة: {aiSafetyResult.riskLevel || 'آمن'}
                </span>
              </div>

              {aiSafetyResult.hasRisk ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  <div style={{ color: '#ffffff', lineHeight: 1.4 }}>
                    <strong>📝 التحليل الطبي:</strong> {aiSafetyResult.analysis}
                  </div>
                  {aiSafetyResult.suggestion && (
                    <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, background: 'rgba(6, 182, 212, 0.1)', padding: '6px 10px', borderRadius: '6px', marginTop: '2px' }}>
                      <strong>💡 المقترح البديل للصيدلي:</strong> {aiSafetyResult.suggestion}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ✅ الفحص الطبي: جميع المواد بالسلة آمنة وموافقة للحالة الصحية المحددة للمريض.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Total Summary Footer */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <span>المجموع الفرعي:</span>
            <span className="num" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(subtotal)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>الخصم (د.ع) [F4]:</span>
            <input
              ref={discountInputRef}
              type="number"
              className="form-control num"
              style={{ width: '120px', textAlign: 'center', padding: '6px' }}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              step="250"
            />
          </div>

          {/* Dynamic Final Invoice Amount formatted strictly in 'د.ع' without parentheses */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>المبلغ الإجمالي المستحق:</span>
            <span className="num" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {formatCurrency(finalTotal)}
            </span>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', height: '52px', fontSize: '1.05rem' }}
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <CheckCircle size={20} /> إتمام وتأكيد الفاتورة [F2]
          </button>
        </div>
      </div>

      {/* Invoice Receipt Modal & Export JPEG Feature */}
      {isReceiptModalOpen && lastInvoice && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsReceiptModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText color="var(--accent-emerald)" size={20} />
                فاتورة مبيعات صيدلية رقم {lastInvoice.invoice_number}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsReceiptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Printable & Exportable Container */}
            <div 
              ref={receiptRef}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px', 
                background: '#07090e', 
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '24px', 
                borderRadius: '14px', 
                fontFamily: 'monospace',
                color: '#ffffff'
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #444', paddingBottom: '12px' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4' }}>صيدلية الرواد النموذجية</h4>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '2px' }}>تاريخ الفاتورة: {lastInvoice.date}</p>
                <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>نظام مشفر بأمان SQLCipher</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px dashed #444', paddingBottom: '12px' }}>
                {lastInvoice.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span>{it.trade_name} (×{it.quantity})</span>
                    <span className="num" style={{ fontWeight: 700 }}>{formatCurrency(it.sell_price * it.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#aaa' }}>
                <span>المبلغ قبل الخصم:</span>
                <span className="num">{formatCurrency(lastInvoice.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#aaa' }}>
                <span>الخصم الممنوح:</span>
                <span className="num">{formatCurrency(lastInvoice.discount)}</span>
              </div>

              {/* Invoice Total formatted strictly in 'د.ع' without parentheses */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#10b981', paddingTop: '8px', borderTop: '1px dashed #444' }}>
                <span>الصافي المدفوع:</span>
                <span className="num">{formatCurrency(lastInvoice.final_amount)}</span>
              </div>
            </div>

            {/* Action Buttons: Print & JPEG Export */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>
                إغلاق [Esc]
              </button>

              <button className="btn btn-secondary" style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }} onClick={handleExportJpeg} disabled={isExportingJpeg}>
                <Download size={16} /> {isExportingJpeg ? 'جاري التصدير...' : 'تصدير كصورة JPEG'}
              </button>

              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                <Printer size={18} /> طباعة الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Shortcuts Modal */}
      {isEditShortcutsModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsEditShortcutsModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders color="var(--accent-cyan)" size={20} />
                تعديل وتحديد الأصناف السريعة (شاشات اللمس)
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsEditShortcutsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              اختر حتى 8 أصناف ليتم تثبيتها كأزرار سريعة في شاشة الكاشير (المحدد حالياً: <span className="num" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{tempShortcuts.length}</span>/8):
            </p>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
              {allSystemCategories.map((cat) => {
                const isSelected = tempShortcuts.includes(cat);
                const catCount = batches.filter(b => b.quantity > 0 && b.category === cat).length;

                return (
                  <div
                    key={cat}
                    onClick={() => {
                      if (isSelected) {
                        setTempShortcuts(tempShortcuts.filter(c => c !== cat));
                      } else {
                        if (tempShortcuts.length >= 8) {
                          alert('يمكنك اختيار 8 أصناف كحد أقصى للأزرار السريعة!');
                          return;
                        }
                        setTempShortcuts([...tempShortcuts, cat]);
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : '#ffffff' }}>{cat}</span>
                      <span className="num" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '8px' }}>({catCount} علاج)</span>
                    </div>

                    <span className={`badge ${isSelected ? 'badge-good' : ''}`}>
                      {isSelected ? 'محدد للاختصار' : 'إضافة'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditShortcutsModalOpen(false)}>
                إلغاء
              </button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={saveShortcutsArrangement}>
                <Check size={16} /> حفظ الترتيب في النظام
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
