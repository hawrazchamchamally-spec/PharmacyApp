import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Pill, 
  Filter, 
  X, 
  Check, 
  Download, 
  QrCode, 
  FileText,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  FileUp,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../services/api';

export default function Medications({ medications, onAdd, onUpdate, onDelete, onBulkImport }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [selectedCardMed, setSelectedCardMed] = useState(null);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);

  // Excel Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview' | 'processing' | 'result'
  const [importData, setImportData] = useState({ fileName: '', items: [], totalCount: 0 });
  const [importResult, setImportResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const cardRef = useRef(null);

  const [formData, setFormData] = useState({
    barcode: '',
    trade_name: '',
    generic_name: '',
    category: 'مسكنات وآلام',
    min_stock: 10
  });

  const uniqueCategories = Array.from(
    new Set([
      'مسكنات وآلام',
      'مضادات حيوية',
      'ضد التهابات ومسكن',
      'أدوية الجهاز الهضمي',
      'أدوية الضغط والقلب',
      'مكملات غذائية وفيتامينات',
      ...medications.map(m => m.category)
    ].filter(Boolean))
  );

  const categories = ['ALL', ...uniqueCategories];

  const filteredMeds = medications.filter(med => {
    const matchesSearch = 
      med.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.barcode.includes(searchTerm);
    
    const matchesCat = selectedCategory === 'ALL' || med.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenModal = (med = null) => {
    if (med) {
      setEditingMed(med);
      setFormData({
        barcode: med.barcode,
        trade_name: med.trade_name,
        generic_name: med.generic_name,
        category: med.category,
        min_stock: med.min_stock || 10
      });
    } else {
      setEditingMed(null);
      setFormData({
        barcode: `628${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        trade_name: '',
        generic_name: '',
        category: 'مسكنات وآلام',
        min_stock: 10
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.trade_name.trim() || !formData.generic_name.trim() || !formData.barcode.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم التجاري، الاسم العلمي، والباركود)!');
      return;
    }

    try {
      if (editingMed) {
        await onUpdate(editingMed.id, formData);
        alert('تم تحديث بيانات الدواء بنجاح في قاعدة البيانات!');
      } else {
        await onAdd(formData);
        alert('تمت إضافة الدواء الجديد وحفظه في قاعدة البيانات بنجاح!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save medication:', err);
      alert('حدث خطأ أثناء حفظ الدواء في قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  // ----------------------------------------------------
  // EXCEL IMPORT & TEMPLATE EXPORT LOGIC
  // ----------------------------------------------------
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'اسم المادة': 'أوفلامول 500 ملغم',
        'الاسم العلمي': 'Paracetamol 500mg',
        'الباركود': '628100234501',
        'سعر الشراء': 3500,
        'سعر البيع': 5000,
        'التصنيف': 'مسكنات وآلام',
        'الوحدة/التجزئة': 'باكيت'
      },
      {
        'اسم المادة': 'أمبيسيلين 250 ملغم كبسول',
        'الاسم العلمي': 'Ampicillin 250mg',
        'الباركود': '628100234502',
        'سعر الشراء': 4000,
        'سعر البيع': 6000,
        'التصنيف': 'مضادات حيوية',
        'الوحدة/التجزئة': 'باكيت'
      },
      {
        'اسم المادة': 'أوميبرازول 20 ملغم',
        'الاسم العلمي': 'Omeprazole 20mg',
        'الباركود': '628100234503',
        'سعر الشراء': 2500,
        'سعر البيع': 4500,
        'التصنيف': 'أدوية الجهاز الهضمي',
        'الوحدة/التجزئة': 'باكيت'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 28 }, // اسم المادة
      { wch: 24 }, // الاسم العلمي
      { wch: 18 }, // الباركود
      { wch: 14 }, // سعر الشراء
      { wch: 14 }, // سعر البيع
      { wch: 22 }, // التصنيف
      { wch: 16 }  // الوحدة/التجزئة
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دليل_الأدوية');
    XLSX.writeFile(wb, 'نموذج_استيراد_الأدوية_PharmacyCare.xlsx');
  };

  const processFile = async (file) => {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!data || data.length === 0) {
        alert('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة!');
        return;
      }

      const parsedItems = data.map((row, idx) => {
        const tradeName = row['اسم المادة'] || row['اسم الدواء'] || row['الاسم التجاري'] || row['trade_name'] || row['Trade Name'] || row['Name'] || '';
        const genericName = row['الاسم العلمي'] || row['generic_name'] || row['Generic Name'] || tradeName;
        const barcode = String(row['الباركود'] || row['باركود'] || row['الباركود الدولي'] || row['barcode'] || row['Barcode'] || row['Code'] || '').trim();
        const buyPrice = parseFloat(row['سعر الشراء'] || row['شراء'] || row['buy_price'] || row['Buy Price'] || row['Cost'] || 0) || 0;
        const sellPrice = parseFloat(row['سعر البيع'] || row['بيع'] || row['sell_price'] || row['Sell Price'] || row['Price'] || 0) || 0;
        const category = row['التصنيف'] || row['التصنيف الدوائي'] || row['category'] || row['Category'] || 'عام';
        const unit = row['الوحدة/التجزئة'] || row['الوحدة'] || row['unit'] || row['Unit'] || 'باكيت';

        return {
          id: idx + 1,
          trade_name: String(tradeName).trim(),
          generic_name: String(genericName).trim(),
          barcode: barcode,
          buy_price: buyPrice,
          sell_price: sellPrice,
          category: String(category).trim(),
          unit: String(unit).trim(),
          units_per_pack: 1,
          min_stock: 10
        };
      }).filter(it => it.trade_name.length > 0);

      if (parsedItems.length === 0) {
        alert('لم يتم العثور على أدوية صالحة في الملف. يرجى التأكد من احتواء الملف على عمود [اسم المادة]!');
        return;
      }

      setImportData({
        fileName: file.name,
        items: parsedItems,
        totalCount: parsedItems.length
      });
      setImportStep('preview');
    } catch (err) {
      console.error('Failed to read Excel file:', err);
      alert('حدث خطأ أثناء قراءة ملف الإكسيل: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleExecuteImport = async () => {
    if (!importData.items || importData.items.length === 0) return;

    setIsProcessing(true);
    setImportStep('processing');
    setProgress(25);

    try {
      setProgress(60);
      const result = await onBulkImport(importData.items);
      setProgress(100);

      setImportResult(result);
      setImportStep('result');
    } catch (err) {
      console.error('Bulk import execution failed:', err);
      alert('حدث خطأ أثناء استيراد وحفظ الأدوية: ' + (err.message || 'خطأ غير معروف'));
      setImportStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportStep('upload');
    setImportData({ fileName: '', items: [], totalCount: 0 });
    setImportResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export Medication Identification Card directly as JPEG file (.jpeg)
  const handleExportCardJpeg = async () => {
    if (!cardRef.current) return;
    try {
      setIsExportingJpeg(true);
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.95, cacheBust: true });
      const link = document.createElement('a');
      link.download = `Medication_Card_${selectedCardMed?.barcode || 'ID'}.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export JPEG card:', err);
      alert('حدث خطأ أثناء تصدير بطاقة الدواء كصورة JPEG');
    } finally {
      setIsExportingJpeg(false);
    }
  };

  return (
    <div>
      {/* Top Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="ابحث بالاسم التجاري، العلمي، أو الباركد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '42px', width: '100%' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ cursor: 'pointer', paddingRight: '14px' }}
            >
              <option value="ALL">جميع التصنيفات</option>
              {categories.filter(c => c !== 'ALL').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Import Excel & Add Medication */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#34d399',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.1)',
              fontWeight: 700
            }}
            onClick={() => {
              setImportStep('upload');
              setImportData({ fileName: '', items: [], totalCount: 0 });
              setImportResult(null);
              setProgress(0);
              setIsImportModalOpen(true);
            }}
            title="استيراد قائمة الأدوية من ملف Excel (.xlsx, .xls)"
          >
            <FileSpreadsheet size={18} color="#34d399" />
            <span>استيراد من Excel</span>
          </button>

          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> إضـافة دواء جـديد
          </button>
        </div>
      </div>

      {/* Medications Table Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>البار كود (Barcode)</th>
                <th>الاسم التجاري</th>
                <th>الاسم العلمي</th>
                <th>التصنيف الدوائي</th>
                <th>الحد الأدنى</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeds.map((med, index) => (
                <tr key={med.id}>
                  <td className="num">{index + 1}</td>
                  <td className="num" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{med.barcode}</td>
                  <td style={{ fontWeight: 700 }}>{med.trade_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{med.generic_name}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)' }}>
                      {med.category}
                    </span>
                  </td>
                  <td className="num">{med.min_stock}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px' }} title="تصدير بطاقة التعريف كصورة JPEG" onClick={() => setSelectedCardMed(med)}>
                        <QrCode size={15} color="var(--accent-emerald)" />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px' }} title="تعديل" onClick={() => handleOpenModal(med)}>
                        <Edit3 size={15} color="var(--accent-cyan)" />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px' }} title="حذف" onClick={() => onDelete(med.id)}>
                        <Trash2 size={15} color="var(--accent-rose)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMeds.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    لا توجد أدوية مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Pill color="var(--accent-cyan)" size={22} />
                {editingMed ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد إلى الدليل'}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">البار كود (Barcode)</label>
                <input
                  type="text"
                  className="form-control num"
                  required
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الاسم التجاري (Trade Name)</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: أوفلامول 500 ملغم"
                  value={formData.trade_name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الاسم العلمي (Generic Name)</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: Paracetamol"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">التصنيف الدوائي</label>
                  <input
                    type="text"
                    list="medications-category-list"
                    className="form-control"
                    required
                    placeholder="اختر تصنيف سابق أو اكتب تصنيف جديد..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  <datalist id="medications-category-list">
                    {uniqueCategories.map((cat, idx) => (
                      <option key={idx} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">حد الأدنى للتنبيه بالمخزون</label>
                  <input
                    type="number"
                    className="form-control num"
                    required
                    min="1"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} /> {editingMed ? 'تحديث البيانات' : 'حفظ الدواء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medication Identification Card & JPEG Image Export Modal */}
      {selectedCardMed && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCardMed(null); }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode color="var(--accent-cyan)" size={20} />
                بطاقة تعريف ومواصفات المستحضر
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedCardMed(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Target Card Container to render as JPEG image file */}
            <div 
              ref={cardRef}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #090d16, #162032)',
                border: '2px solid rgba(6, 182, 212, 0.4)',
                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.7)',
                color: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>بطاقة المستحضر الرسمية</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>{selectedCardMed.trade_name}</h3>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                  <Pill size={24} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>الاسم العلمي:</span>
                  <span style={{ fontWeight: 700 }}>{selectedCardMed.generic_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>البار كود:</span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedCardMed.barcode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>التصنيف:</span>
                  <span>{selectedCardMed.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>إجمالي المخزون الحالي:</span>
                  <span className="num" style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{selectedCardMed.total_stock || 0} قطعة</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedCardMed(null)}>
                إغلاق
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.5 }} 
                onClick={handleExportCardJpeg}
                disabled={isExportingJpeg}
              >
                <Download size={18} /> {isExportingJpeg ? 'جاري التصدير...' : 'تصدير كصورة JPEG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EXCEL IMPORT MODAL (نافذة استيراد الأدوية من إكسيل) */}
      {/* ==================================================== */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) handleCloseImportModal(); }}>
          <div className="modal-content" style={{ maxWidth: importStep === 'preview' ? '820px' : '580px', width: '95%', transition: 'all 0.3s ease' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet color="#34d399" size={22} />
                استيراد الأدوية من ملف Excel (.xlsx / .xls)
              </h3>
              {!isProcessing && (
                <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={handleCloseImportModal}>
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Step 1: Upload File & Template Download */}
            {importStep === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Template Download Banner */}
                <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h5 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', marginBottom: '2px' }}>هل تحتاج نموذج ملف جاهز؟</h5>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>حمل ملف Excel مهيأ مسبقاً بالأعمدة المطلوبة لملء بياناتك بسهولة</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                    onClick={handleDownloadTemplate}
                  >
                    <Download size={15} /> تحميل نموذج Excel (.xlsx)
                  </button>
                </div>

                {/* Drag & Drop Upload Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '36px 20px',
                    borderRadius: '14px',
                    border: `2px dashed ${isDragging ? '#34d399' : 'rgba(255, 255, 255, 0.2)'}`,
                    background: isDragging ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    gap: '12px'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                    <UploadCloud size={28} />
                  </div>
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'block' }}>
                      اسحب وأفلت ملف الإكسيل هنا
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      أو اضغط لتصفح واختيار الملف من جهازك (يدعم .xlsx, .xls, .csv)
                    </span>
                  </div>
                </div>

                {/* Supported Columns Guide */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '4px' }}>الأعمدة المدعومة تلقائياً في الملف:</span>
                  <span>[اسم المادة]، [الاسم العلمي]، [الباركود]، [سعر الشراء]، [سعر البيع]، [التصنيف]، [الوحدة/التجزئة]</span>
                </div>
              </div>
            )}

            {/* Step 2: Preview Parsed Medications */}
            {importStep === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet size={18} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>الملف: {importData.fileName}</span>
                  </div>
                  <span className="badge badge-good num" style={{ fontSize: '0.85rem' }}>
                    {importData.totalCount} دواء جاهز للاستيراد
                  </span>
                </div>

                {/* Table Preview */}
                <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '35px' }}>#</th>
                        <th>اسم المادة</th>
                        <th>الاسم العلمي</th>
                        <th>الباركود</th>
                        <th>سعر الشراء</th>
                        <th>سعر البيع</th>
                        <th>التصنيف</th>
                        <th>الوحدة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.items.slice(0, 15).map((it, idx) => (
                        <tr key={idx}>
                          <td className="num">{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#ffffff' }}>{it.trade_name}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{it.generic_name || '-'}</td>
                          <td className="num" style={{ color: 'var(--accent-cyan)' }}>{it.barcode || 'توليد تلقائي'}</td>
                          <td className="num">{it.buy_price ? formatCurrency(it.buy_price) : '-'}</td>
                          <td className="num" style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{it.sell_price ? formatCurrency(it.sell_price) : '-'}</td>
                          <td><span className="badge" style={{ fontSize: '0.72rem' }}>{it.category || 'عام'}</span></td>
                          <td style={{ fontSize: '0.8rem' }}>{it.unit || 'باكيت'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importData.totalCount > 15 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    يتم عرض أول 15 مادة من أصل {importData.totalCount} مادة في الملف...
                  </span>
                )}

                {/* Confirm Import Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setImportStep('upload');
                      setImportData({ fileName: '', items: [], totalCount: 0 });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    اختيار ملف آخر
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    style={{ flex: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}
                    onClick={handleExecuteImport}
                  >
                    <CheckCircle size={18} /> تأكيد واستيراد ({importData.totalCount}) دواء إلى قاعدة البيانات
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing Loader */}
            {importStep === 'processing' && (
              <div style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <Clock className="spin" size={40} color="#34d399" />
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>جاري استيراد وحفظ الأدوية...</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>يتم حفظ البيانات وتحديث الفهارس في قاعدة بيانات SQLCipher المشفرة</p>
                </div>
                
                <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #06b6d4, #10b981)', transition: 'width 0.4s ease' }}></div>
                </div>
              </div>
            )}

            {/* Step 4: Result Summary */}
            {importStep === 'result' && importResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: '12px' }}>
                    <CheckCircle size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>تمت عملية الاستيراد بنجاح!</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>تمت معالجة وتحديث دليل الأدوية والمخزون في قاعدة البيانات</p>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>إجمالي المعالجة</span>
                    <span className="num" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{importResult.total}</span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', marginBottom: '4px' }}>أدوية جديدة أُضيفت</span>
                    <span className="num" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{importResult.inserted}</span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>أدوية سابقة حُدثت</span>
                    <span className="num" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{importResult.updated}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '0.95rem' }}
                    onClick={handleCloseImportModal}
                  >
                    إتمام وإغلاق النافذة
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
