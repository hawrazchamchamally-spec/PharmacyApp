import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  User, 
  Key, 
  Lock, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2, 
  Power,
  Info
} from 'lucide-react';
import { usePharmacyStore } from '../context/PharmacyContext';

export default function UserManagement() {
  const { users, currentUser, addUser, updateUser, deleteUser } = usePharmacyStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier',
    is_active: true
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'cashier',
      is_active: true
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '', // leave empty unless changing
      role: user.role,
      is_active: user.is_active === 1 || user.is_active === true
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      setErrorMessage('يرجى ملء الاسم الكامل واسم المستخدم!');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setErrorMessage('يرجى تحديد كلمة مرور للمستخدم الجديد!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password.trim() || undefined,
          role: formData.role,
          is_active: formData.is_active
        });
      } else {
        await addUser({
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          role: formData.role,
          is_active: formData.is_active
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المستخدم في قاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.username === 'admin') {
      alert('لا يمكن تجميد أو تعطيل حساب مدير النظام الرئيسي!');
      return;
    }

    const newStatus = !(user.is_active === 1 || user.is_active === true);
    const actionText = newStatus ? 'تفعيل' : 'تجميد وتعطيل';

    if (window.confirm(`هل أنت متأكد من رغبتك في ${actionText} حساب المستخدم (${user.name})؟`)) {
      try {
        await updateUser(user.id, {
          name: user.name,
          username: user.username,
          role: user.role,
          is_active: newStatus
        });
      } catch (err) {
        alert('حدث خطأ: ' + err.message);
      }
    }
  };

  const handleDelete = async (user) => {
    if (user.username === 'admin' || user.id === 1) {
      alert('لا يمكن حذف حساب مدير النظام الرئيسي!');
      return;
    }

    if (currentUser && currentUser.id === user.id) {
      alert('لا يمكنك حذف الحساب المسجل به حالياً!');
      return;
    }

    if (window.confirm(`هل أنت متأكد من رغبتك في حذف المستخدم (${user.name}) نهائياً؟`)) {
      try {
        await deleteUser(user.id);
      } catch (err) {
        alert('حدث خطأ أثناء الحذف: ' + err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Roles & Permissions Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Admin Card */}
        <div style={{
          padding: '20px',
          borderRadius: '14px',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>مدير النظام (Administrator)</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>صلاحيات كاملة شاملة (Full Access)</span>
            </div>
          </div>
          <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.7', paddingRight: '18px', margin: 0 }}>
            <li>الوصول لكافة الشاشات (الرئيسية، الأدوية، الوجبات، نقطة البيع، فواتير الشراء، فواتير المبيعات).</li>
            <li>الاطلاع على التقارير المالية، الأرباح، جرد رأس المال، وحسابات الموردين والديون.</li>
            <li>إدارة وضبط إعدادات النظام وتشفير قاعدة البيانات، وإضافة وتعديل المستخدمين.</li>
          </ul>
        </div>

        {/* Cashier Card */}
        <div style={{
          padding: '20px',
          borderRadius: '14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <User size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>كاشير / صيدلي (Cashier)</h4>
              <span style={{ fontSize: '0.75rem', color: '#34d399' }}>صلاحيات بيع وإدخال فواتير محددة</span>
            </div>
          </div>
          <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.7', paddingRight: '18px', margin: 0 }}>
            <li>الوصول إلى نقطة البيع (POS) وإتمام عمليات البيع والإرجاع وطباعة الفواتير.</li>
            <li>البحث في دليل الأدوية والوجبات ومراجعة الأسعار وتواريخ الصلاحية.</li>
            <li>إدخال فواتير الشراء (محجوب تلقائياً عن التقارير المالية والديون وإعدادات النظام).</li>
          </ul>
        </div>

      </div>

      {/* Users List Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-cyan)" />
              قائمة مستخدمي النظام والحسابات المعتمدة
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              إجمالي المستخدمين المسجلين: {users.length} مستخدم
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleOpenAddModal}
          >
            <UserPlus size={18} />
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>الاسم الكامل</th>
                <th>اسم المستخدم (Username)</th>
                <th>الدور والصلاحية</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const isActive = u.is_active === 1 || u.is_active === true;
                const isCurrent = currentUser && currentUser.id === u.id;

                return (
                  <tr key={u.id}>
                    <td className="num">{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>
                      {u.name} {isCurrent && <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>(أنت)</span>}
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {u.username}
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          مدير النظام (Admin)
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          كاشير / صيدلي (Cashier)
                        </span>
                      )}
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge badge-good">نشط ومفعل</span>
                      ) : (
                        <span className="badge badge-critical">معطل / مجمد</span>
                      )}
                    </td>
                    <td className="num" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-IQ') : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        
                        {/* Toggle Active / Inactive */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          onClick={() => handleToggleActive(u)}
                          disabled={u.username === 'admin'}
                          title={isActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
                        >
                          <Power size={14} color={isActive ? '#34d399' : 'var(--accent-rose)'} />
                        </button>

                        {/* Edit User */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          onClick={() => handleOpenEditModal(u)}
                          title="تعديل البيانات أو تغيير كلمة المرور"
                        >
                          <Edit3 size={14} color="var(--accent-cyan)" />
                        </button>

                        {/* Delete User */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          onClick={() => handleDelete(u)}
                          disabled={u.username === 'admin' || isCurrent}
                          title="حذف المستخدم"
                        >
                          <Trash2 size={14} color="var(--accent-rose)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                {editingUser ? <Edit3 size={20} /> : <UserPlus size={20} />}
                {editingUser ? `تعديل بيانات المستخدم: ${editingUser.name}` : 'إضافة مستخدم جديد للنظام'}
              </h3>
              {!isSubmitting && (
                <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsModalOpen(false)}>
                  <X size={18} />
                </button>
              )}
            </div>

            {errorMessage && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#f43f5e" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">الاسم الكامل (Full Name)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: د. أحمد علي أو كاشير الوجبة الصباحية"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم المستخدم لتسجيل الدخول (Username)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: ahmed_pos"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  كلمة المرور (Password) {editingUser && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(اتركه فارغاً للاحتفاظ بكلمة المرور الحالية)</span>}
                </label>
                <input
                  type="password"
                  className="form-control num"
                  placeholder={editingUser ? 'أدخل كلمة مرور جديدة للتغيير...' : 'أدخل كلمة المرور...'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الدور والصلاحية (User Role)</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  disabled={editingUser && editingUser.username === 'admin'}
                >
                  <option value="cashier">كاشير / صيدلي (Cashier - صلاحيات مبيعات وفواتير شراء)</option>
                  <option value="admin">مدير النظام (Administrator - صلاحيات كاملة 100%)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  id="user-is-active-checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  disabled={editingUser && editingUser.username === 'admin'}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                />
                <label htmlFor="user-is-active-checkbox" style={{ fontSize: '0.9rem', cursor: 'pointer', color: '#ffffff', fontWeight: 600 }}>
                  حساب نشط ومفعل (يسمح له بتسجيل الدخول للنظام)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Check size={18} />
                  {isSubmitting ? 'جاري الحفظ...' : (editingUser ? 'تحديث بيانات المستخدم' : 'حفظ المستخدم الجديد')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
