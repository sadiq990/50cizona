// ==========================================
// RESTAURANT APP - Main Controller
// ==========================================

let currentUser = null;
let currentPage = 'tables';
let currentSession = null;
let currentTableId = null;
let revenueChart = null;
let currentExpPeriod = 'daily';
let currentHistPeriod = 'daily';
let templates = [];

// Period labels for expenses - defined at top level to prevent TDZ errors
const EXP_PERIOD_LABELS = { daily: 'Günlük Xərc', weekly: 'Həftəlik Xərc', monthly: 'Aylıq Xərc' };

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await API.get('/api/auth/me');
        currentUser = data.user;
        initApp();
    } catch (err) {
        window.location.href = '/';
    }
});

function initApp() {
    // Set user info in navbar
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Admin' : 'Ofisant';

    // Hide admin-only nav items
    // Hide admin-only nav items for non-admins (except reports and menu)
    // Hide admin-only nav items for non-admins (except reports and menu)
    if (currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            // Keep Reports and Menu visible for waiters
            if (el.dataset.page === 'reports' || el.dataset.page === 'menu') {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // Nav click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) switchPage(page);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await API.post('/api/auth/logout');
        window.location.href = '/';
    });

    // Modal handlers
    document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
    document.getElementById('orderModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('orderModal')) closeOrderModal();
    });

    document.getElementById('closeSessionBtn').addEventListener('click', endSession);

    // Product modal
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
    document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) closeProductModal();
    });
    document.getElementById('productForm').addEventListener('submit', saveProduct);

    // Reports
    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadReport(btn.dataset.period);
        });
    });

    document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);
    document.getElementById('backupDbBtn').addEventListener('click', backupDb);

    // Expense modal handlers
    document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('closeExpenseModal').addEventListener('click', closeExpenseModal);
    document.getElementById('cancelExpenseBtn').addEventListener('click', closeExpenseModal);
    document.getElementById('expenseModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('expenseModal')) closeExpenseModal();
    });
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);

    // Expense period buttons
    document.querySelectorAll('[data-exp-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-exp-period]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentExpPeriod = btn.dataset.expPeriod;
            loadExpenses(currentExpPeriod);
        });
    });

    // History period buttons
    document.querySelectorAll('[data-hist-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-hist-period]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHistPeriod = btn.dataset.histPeriod;
            loadHistory(currentHistPeriod);
        });
    });


    // Template Manager
    document.getElementById('manageTemplatesBtn').addEventListener('click', openTemplateManager);
    document.getElementById('closeTemplateModal').addEventListener('click', closeTemplateManager);
    document.getElementById('templateModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('templateModal')) closeTemplateManager();
    });
    document.getElementById('addTemplateForm').addEventListener('submit', saveTemplate);
    document.getElementById('expenseTemplateSelect').addEventListener('change', handleTemplateSelect);

    // Initial load
    loadTemplates();

    // Load initial page
    switchPage('tables');
}

// ---------- PAGE NAVIGATION ----------
function switchPage(page) {
    currentPage = page;

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`).classList.add('active');

    // Load page data
    if (page === 'tables') loadTables();
    if (page === 'menu') loadProducts();
    if (page === 'reports') { loadStats(); loadReport('daily'); }
    if (page === 'expenses') { loadExpenses(currentExpPeriod); }
    if (page === 'history') { loadHistory(currentHistPeriod); }
    if (page === 'archive') { loadArchiveMonths(); }
}

// =============================================
// TABLES PAGE
// =============================================
async function loadTables() {
    try {
        const tables = await API.get('/api/tables');
        const grid = document.getElementById('tablesGrid');
        grid.innerHTML = tables.map(t => {
            const isOccupied = t.status === 'occupied';
            const amount = t.current_amount || 0;
            return `
        <div class="table-card ${isOccupied ? 'occupied' : ''}" onclick="openTable(${t.id}, ${t.number}, ${t.active_session_id || 'null'})">
          <div class="table-card-number">Masa ${t.number}</div>
          <div class="table-card-amount">${amount.toFixed(2)} ₼</div>
          <span class="table-card-status ${isOccupied ? 'status-occupied' : 'status-available'}">
            <span class="dot ${isOccupied ? 'dot-occupied' : 'dot-available'}"></span>
            ${isOccupied ? 'Aktiv' : 'Boş'}
          </span>
        </div>
      `;
        }).join('');
    } catch (err) {
        showToast('Masalar yüklənmədi: ' + err.message, 'error');
    }
}

async function openTable(tableId, tableNumber, sessionId) {
    currentTableId = tableId;
    document.getElementById('modalTitle').textContent = `Masa #${tableNumber} - Sifariş`;

    if (!sessionId) {
        // Start new session
        try {
            const session = await API.post('/api/sessions/start', { tableId });
            currentSession = session.id;
        } catch (err) {
            showToast('Sessiya başladılmadı: ' + err.message, 'error');
            return;
        }
    } else {
        currentSession = sessionId;
    }

    await loadOrderItems();
    await loadMenuForModal();
    document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
    currentSession = null;
    currentTableId = null;
    loadTables();
}

async function loadOrderItems() {
    if (!currentSession) return;
    try {
        const items = await API.get(`/api/orders/${currentSession}`);
        const list = document.getElementById('orderList');

        if (items.length === 0) {
            list.innerHTML = '<div class="empty-state">Hələ sifariş yoxdur</div>';
            document.getElementById('orderTotal').textContent = '0.00 ₼';
            return;
        }

        let total = 0;
        list.innerHTML = items.map(item => {
            total += item.line_total;
            return `
        <div class="order-item">
          <span class="order-item-name">${item.product_name}</span>
          <div class="order-item-qty">
            <button onclick="changeQty(${item.product_id}, -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="changeQty(${item.product_id}, 1)">+</button>
          </div>
          <span class="order-item-price">${item.line_total.toFixed(2)} ₼</span>
        </div>
      `;
        }).join('');

        document.getElementById('orderTotal').textContent = `${total.toFixed(2)} ₼`;
    } catch (err) {
        showToast('Sifarişlər yüklənmədi', 'error');
    }
}

async function loadMenuForModal() {
    try {
        const products = await API.get('/api/products/active');
        const categories = [...new Set(products.map(p => p.category))];

        // Render category buttons
        const catContainer = document.getElementById('menuCategories');
        catContainer.innerHTML = `<button class="category-btn active" onclick="filterCategory('all', this)">Hamısı</button>` +
            categories.map(c => `<button class="category-btn" onclick="filterCategory('${c}', this)">${capitalize(c)}</button>`).join('');

        // Render products
        renderMenuProducts(products);
    } catch (err) {
        showToast('Menu yüklənmədi', 'error');
    }
}

function renderMenuProducts(products) {
    const container = document.getElementById('menuProducts');
    container.innerHTML = products.map(p => `
    <div class="product-card" data-category="${p.category}">
      <div class="product-card-name">${p.name}</div>
      <div class="product-card-price">${p.price.toFixed(2)} ₼</div>
      <button class="product-card-add" onclick="addToOrder(${p.id})">+ Əlavə et</button>
    </div>
  `).join('');
}

function filterCategory(category, btn) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cards = document.querySelectorAll('#menuProducts .product-card');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

async function addToOrder(productId) {
    if (!currentSession) return;
    try {
        await API.post('/api/orders/add', { sessionId: currentSession, productId, quantity: 1 });
        await loadOrderItems();
        showToast('Məhsul əlavə edildi', 'success');
    } catch (err) {
        showToast('Əlavə edilmədi: ' + err.message, 'error');
    }
}

async function changeQty(productId, delta) {
    if (!currentSession) return;
    try {
        if (delta < 0) {
            // Check if qty is 1, if so remove
            const items = await API.get(`/api/orders/${currentSession}`);
            const item = items.find(i => i.product_id === productId);
            if (item && item.quantity <= 1) {
                await API.post('/api/orders/remove', { sessionId: currentSession, productId });
            } else {
                await API.post('/api/orders/add', { sessionId: currentSession, productId, quantity: -1 });
            }
        } else {
            await API.post('/api/orders/add', { sessionId: currentSession, productId, quantity: 1 });
        }
        await loadOrderItems();
    } catch (err) {
        showToast('Dəyişiklik alınmadı', 'error');
    }
}

async function endSession() {
    if (!currentSession) return;
    if (!confirm('Hesabı bağlamaq istədiyinizə əminsiniz?')) return;
    try {
        await API.post('/api/sessions/end', { sessionId: currentSession });
        showToast('Hesab uğurla bağlandı', 'success');
        closeOrderModal();
    } catch (err) {
        showToast('Hesab bağlanmadı: ' + err.message, 'error');
    }
}

// =============================================
// MENU MANAGEMENT PAGE
// =============================================
async function loadProducts() {
    try {
        const products = await API.get('/api/products');
        const tbody = document.getElementById('productsBody');
        tbody.innerHTML = products.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${capitalize(p.category)}</td>
        <td><strong>${p.price.toFixed(2)} ₼</strong></td>
        <td>
          <span class="status-badge ${p.is_active ? 'status-active' : 'status-inactive'}">
            ${p.is_active ? '● Aktiv' : '○ Deaktiv'}
          </span>
        </td>
        <td class="admin-buttons" ${currentUser.role !== 'admin' ? 'style="display:none"' : ''}>
          <div class="table-actions">
            <button class="btn btn-sm" onclick="editProduct(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${p.category}')">✏️ Edit</button>
            <button class="btn btn-sm" onclick="toggleProduct(${p.id})">${p.is_active ? '🚫' : '✅'}</button>
          </div>
        </td>
      </tr>
    `).join('');
    } catch (err) {
        showToast('Məhsullar yüklənmədi', 'error');
    }
}

function openProductModal(id, name, price, category) {
    document.getElementById('productId').value = id || '';
    document.getElementById('productName').value = name || '';
    document.getElementById('productPrice').value = price || '';
    document.getElementById('productCategory').value = category || 'general';
    document.getElementById('productModalTitle').textContent = id ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul';
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.getElementById('productForm').reset();
}

function editProduct(id, name, price, category) {
    openProductModal(id, name, price, category);
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value;

    try {
        if (id) {
            await API.put(`/api/products/${id}`, { name, price, category });
            showToast('Məhsul yeniləndi', 'success');
        } else {
            await API.post('/api/products', { name, price, category });
            showToast('Yeni məhsul əlavə edildi', 'success');
        }
        closeProductModal();
        loadProducts();
    } catch (err) {
        showToast('Xəta: ' + err.message, 'error');
    }
}

async function toggleProduct(id) {
    try {
        await API.patch(`/api/products/${id}/deactivate`);
        loadProducts();
        showToast('Məhsul statusu dəyişdirildi', 'success');
    } catch (err) {
        showToast('Xəta: ' + err.message, 'error');
    }
}

// =============================================
// REPORTS & DASHBOARD PAGE
// =============================================
async function loadStats() {
    try {
        const stats = await API.get('/api/sessions/stats');
        document.getElementById('totalRevenue').textContent = `${stats.totalRevenue.toFixed(2)} ₼`;
        document.getElementById('dailyOrders').textContent = stats.dailyOrders;
        document.getElementById('bestTable').textContent = stats.bestTable.number !== '-' ?
            `Masa ${stats.bestTable.number} (${stats.bestTable.total_revenue.toFixed(2)} ₼)` : '—';
        document.getElementById('avgDuration').textContent = `${stats.avgDuration} dəq`;

        // Expense stats from sessions stats (daily)
        const dailyExp = stats.dailyExpenses != null ? stats.dailyExpenses : 0;
        const netRev = stats.netRevenue != null ? stats.netRevenue : (stats.totalRevenue - dailyExp);
        document.getElementById('dailyExpenses').textContent = `${parseFloat(dailyExp).toFixed(2)} ₼`;
        document.getElementById('netRevenue').textContent = `${parseFloat(netRev).toFixed(2)} ₼`;

        // Top products
        const topContainer = document.getElementById('topProducts');
        if (stats.topProducts.length === 0) {
            topContainer.innerHTML = '<div class="empty-state">Hələ məlumat yoxdur</div>';
        } else {
            topContainer.innerHTML = stats.topProducts.map((p, i) => `
        <div class="top-product-item">
          <div class="top-product-rank">${i + 1}</div>
          <span class="top-product-name">${p.name}</span>
          <span class="top-product-qty">${p.total_qty} ədəd</span>
          <span class="top-product-revenue">${p.total_revenue.toFixed(2)} ₼</span>
        </div>
      `).join('');
        }
    } catch (err) {
        showToast('Statistika yüklənmədi', 'error');
    }
}

async function loadReport(period) {
    try {
        const data = await API.get(`/api/reports/${period}`);
        renderChart(data, period);
    } catch (err) {
        showToast('Hesabat yüklənmədi', 'error');
    }
}

function renderChart(data, period) {
    const ctx = document.getElementById('revenueChart');
    if (revenueChart) revenueChart.destroy();

    let labels, values;

    if (period === 'daily') {
        labels = (data.hourly || []).map(h => `${h.hour}:00`);
        values = (data.hourly || []).map(h => h.revenue);
    } else {
        const daily = data.daily || [];
        labels = daily.map(d => d.date);
        values = daily.map(d => d.total_revenue);
    }

    if (labels.length === 0) {
        labels = ['Məlumat yoxdur'];
        values = [0];
    }

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Gəlir (₼)',
                data: values,
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { font: { family: 'Inter' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Inter' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function exportExcel() {
    try {
        const res = await fetch('/api/export/excel', { credentials: 'include' });
        if (!res.ok) throw new Error('Export uğursuz');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restoran_hesabat_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Excel faylı yükləndi', 'success');
    } catch (err) {
        showToast('Export uğursuz: ' + err.message, 'error');
    }
}

async function backupDb() {
    try {
        showToast('Backup hazırlanır...', 'info');
        const res = await fetch('/api/backup/export', {
            method: 'GET',
            credentials: 'include'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Backup uğursuz');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `backup-restaurant-${today}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ Backup faylı yükləndi!', 'success');
    } catch (err) {
        showToast('Backup uğursuz: ' + err.message, 'error');
    }
}

document.getElementById('dbFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`DİQQƊT! "${file.name}" faylı ilə məlumatlar bərpa edilecək.\nCari məlumatlar silinecək (avtomatik snapshot alınacaq).\nDavam edilsin?`)) {
        e.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('backupFile', file);

    try {
        showToast('Məlumatlar bərpa edilir...', 'info');
        const res = await fetch('/api/backup/restore', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            // Don't set Content-Type header, let browser set boundary
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Restore failed');
        }

        const data = await res.json();
        alert(`Uğurlu! ${data.message}\nSəhifə yenilenicək.`);
        window.location.reload();
    } catch (err) {
        console.error(err);
        showToast('Bərpa xətası: ' + err.message, 'error');
        alert('Xəta baş verdi: ' + err.message);
    } finally {
        e.target.value = '';
    }
});

// =============================================
// EXPENSES PAGE
// =============================================
// EXP_PERIOD_LABELS is defined at the top of this file

async function loadExpenses(period = 'daily') {
    try {
        const data = await API.get(`/api/expenses/${period}`);
        // Backend returns { expenses, summary, byCategory }
        const expenses = data.expenses || [];
        const summary = data.summary || { total: 0 };
        const byCategory = data.byCategory || [];

        // Update summary cards
        document.getElementById('expPeriodLabel').textContent = EXP_PERIOD_LABELS[period] || 'Xərc';
        document.getElementById('expTotalAmount').textContent = `${parseFloat(summary.total).toFixed(2)} ₼`;

        // Top category
        const topCat = byCategory[0];
        document.getElementById('expTopCategory').textContent = topCat
            ? `${capitalize(topCat.category)} (${parseFloat(topCat.total).toFixed(2)} ₼)` : '—';

        // Render table
        const tbody = document.getElementById('expensesBody');
        if (expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="padding:2rem;text-align:center">Hələ xərc yoxdur</td></tr>`;
            return;
        }
        const isAdmin = currentUser && currentUser.role === 'admin';
        tbody.innerHTML = expenses.map(e => `
            <tr>
                <td>${new Date(e.date).toLocaleDateString('az-AZ')}</td>
                <td><span class="status-badge status-active">${capitalize(e.category)}</span></td>
                <td>${escapeHtml(e.description || e.desc || '')}</td>
                <td><strong>${parseFloat(e.amount).toFixed(2)} ₼</strong></td>
                <td class="admin-only" ${isAdmin ? '' : 'style="display:none"'}>
                    <div class="table-actions">
                        <button class="btn btn-sm" onclick="editExpense(${e.id}, '${escapeHtml(e.description || e.desc || '')}', '${e.category}', ${e.amount}, '${e.date ? e.date.split('T')[0] : ''}')">✏️ Redaktə</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})">🗑</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Xərclər yüklənmədi: ' + err.message, 'error');
    }
}

function openExpenseModal(id, desc, category, amount, date) {
    document.getElementById('expenseId').value = id || '';
    document.getElementById('expenseDesc').value = desc || '';
    document.getElementById('expenseCategorySelect').value = category || 'ərzaq';
    document.getElementById('expenseAmount').value = amount || '';
    document.getElementById('expenseDate').value = date || new Date().toISOString().split('T')[0];
    document.getElementById('expenseModalTitle').textContent = id ? 'Xərci Redaktə Et' : 'Yeni Xərc';

    renderTemplateOptions();
    document.getElementById('expenseModal').classList.add('active');
}

function closeExpenseModal() {
    document.getElementById('expenseModal').classList.remove('active');
    document.getElementById('expenseForm').reset();
}

function editExpense(id, desc, category, amount, date) {
    openExpenseModal(id, desc, category, amount, date);
}

async function saveExpense(e) {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const description = document.getElementById('expenseDesc').value.trim();
    const category = document.getElementById('expenseCategorySelect').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;

    try {
        if (id) {
            await API.put(`/api/expenses/${id}`, { description, category, amount, date });
            showToast('Xərc yeniləndi', 'success');
        } else {
            await API.post('/api/expenses/add', { description, category, amount, date });
            showToast('Yeni xərc əlavə edildi', 'success');
        }
        closeExpenseModal();
        loadExpenses(currentExpPeriod);
    } catch (err) {
        showToast('Xəta: ' + err.message, 'error');
    }
}

async function deleteExpense(id) {
    if (!confirm('Bu xərci silmək istədiyinizə əminsiniz?')) return;
    try {
        await API.request(`/api/expenses/${id}`, { method: 'DELETE' });
        showToast('Xərc silindi', 'success');
        loadExpenses(currentExpPeriod);
    } catch (err) {
        showToast('Silmə uğursuz: ' + err.message, 'error');
    }
}

// =============================================
// EXPENSE TEMPLATES
// =============================================
async function loadTemplates() {
    try {
        templates = await API.get('/api/templates');
    } catch (err) {
        console.error('Templates load failed', err);
    }
}

function openTemplateManager() {
    renderTemplateManager();
    document.getElementById('templateModal').classList.add('active');
}

function closeTemplateManager() {
    document.getElementById('templateModal').classList.remove('active');
    document.getElementById('addTemplateForm').reset();
}

function renderTemplateManager() {
    const list = document.getElementById('templatesList');
    if (templates.length === 0) {
        list.innerHTML = '<div class="empty-state">Şablon yoxdur</div>';
        return;
    }

    list.className = 'template-grid';
    list.innerHTML = templates.map(t => `
        <div style="display:flex;flex-direction:column;gap:.25rem">
            <button class="template-btn" onclick="applyTemplateFromManager(${t.id})">
                <span class="t-name">${escapeHtml(t.name)}</span>
                <span class="t-amount">${t.price} ₼</span>
                <span class="t-cat">${capitalize(t.category)}</span>
            </button>
            <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="deleteTemplate(${t.id})">🗑 Sil</button>
        </div>
    `).join('');
}

function applyTemplateFromManager(id) {
    const t = templates.find(t => t.id === id);
    if (!t) return;
    document.getElementById('expenseDesc').value = t.name;
    document.getElementById('expenseCategorySelect').value = t.category;
    document.getElementById('expenseAmount').value = t.price;
    closeTemplateManager();
    showToast(`"${t.name}" şablonu tətbiq edildi`, 'success');
}

async function saveTemplate(e) {
    e.preventDefault();
    const name = document.getElementById('newTemplateName').value.trim();
    const category = document.getElementById('newTemplateCategory').value;
    const price = parseFloat(document.getElementById('newTemplatePrice').value);

    try {
        await API.post('/api/templates/add', { name, category, price });
        await loadTemplates();
        renderTemplateManager();
        document.getElementById('addTemplateForm').reset();
        showToast('Şablon əlavə edildi', 'success');
    } catch (err) {
        showToast('Xəta: ' + err.message, 'error');
    }
}

async function deleteTemplate(id) {
    if (!confirm('Bu şablonu silmək istədiyinizə əminsiniz?')) return;
    try {
        await API.request(`/api/templates/${id}`, { method: 'DELETE' });
        await loadTemplates();
        renderTemplateManager();
        showToast('Şablon silindi', 'success');
    } catch (err) {
        showToast('Silmə uğursuz: ' + err.message, 'error');
    }
}

function renderTemplateOptions() {
    const select = document.getElementById('expenseTemplateSelect');
    select.innerHTML = '<option value="">-- Şablon seçin --</option>' +
        templates.map(t => `<option value="${t.id}">${escapeHtml(t.name)} (${t.price} ₼)</option>`).join('');
}

function handleTemplateSelect(e) {
    const templateId = parseInt(e.target.value);
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (template) {
        document.getElementById('expenseDesc').value = template.name;
        document.getElementById('expenseCategorySelect').value = template.category;
        document.getElementById('expenseAmount').value = template.price;
    }
}

// =============================================
// HISTORY / REVENUE LOG PAGE
// =============================================
async function loadHistory(period = 'daily') {
    try {
        const data = await API.get(`/api/history?period=${period}`);
        const { sessions, summary } = data;

        document.getElementById('histCount').textContent = summary.count;
        document.getElementById('histRevenue').textContent = `${summary.totalRevenue.toFixed(2)} ₼`;
        document.getElementById('histAvg').textContent = `${summary.avgBill.toFixed(2)} ₼`;

        renderHistoryTable(sessions);
    } catch (err) {
        showToast('Tarix yüklənmədi: ' + err.message, 'error');
    }
}

function renderHistoryTable(sessions) {
    const tbody = document.getElementById('historyBody');

    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:2rem;text-align:center">Bu dövr üçün məlumat yoxdur</td></tr>`;
        return;
    }

    tbody.innerHTML = sessions.map(s => {
        const openTime = s.started_at ? new Date(s.started_at).toLocaleString('az-AZ') : '—';
        const closeTime = s.ended_at ? new Date(s.ended_at).toLocaleString('az-AZ') : '—';
        const duration = s.duration_min != null ? `${Math.round(s.duration_min)} dəq` : '—';
        const waiter = s.waiter || '—';
        const amount = parseFloat(s.total_amount || 0).toFixed(2);

        const itemsHtml = (s.items && s.items.length > 0)
            ? s.items.map(it => `
                <tr style="background:var(--gray-50)">
                    <td></td>
                    <td colspan="4" style="padding-left:2rem;font-size:0.85rem;color:var(--gray-600)">
                        — ${escapeHtml(it.product_name)}
                    </td>
                    <td style="font-size:0.85rem;color:var(--gray-600)">${it.quantity} ədəd</td>
                    <td style="font-size:0.85rem;color:var(--gray-600)">${it.line_total.toFixed(2)} ₼</td>
                </tr>`).join('')
            : `<tr style="background:var(--gray-50)"><td></td><td colspan="6" style="padding-left:2rem;font-size:0.85rem;color:var(--gray-400)">Sifariş yoxdur</td></tr>`;

        return `
            <tr class="history-row" onclick="toggleHistoryRow(this)" style="cursor:pointer">
                <td><span class="expand-icon">▶</span></td>
                <td><strong>Masa ${s.table_number}</strong></td>
                <td>${escapeHtml(waiter)}</td>
                <td style="font-size:0.8rem">${openTime}</td>
                <td style="font-size:0.8rem">${closeTime}</td>
                <td>${duration}</td>
                <td><strong>${amount} ₼</strong></td>
            </tr>
            <tr class="history-detail" style="display:none">
                <td colspan="7" style="padding:0">
                    <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
                </td>
            </tr>`;
    }).join('');
}

function toggleHistoryRow(row) {
    const detailRow = row.nextElementSibling;
    const icon = row.querySelector('.expand-icon');
    if (detailRow && detailRow.classList.contains('history-detail')) {
        const isVisible = detailRow.style.display !== 'none';
        detailRow.style.display = isVisible ? 'none' : 'table-row';
        icon.textContent = isVisible ? '▶' : '▼';
    }
}

// =============================================
// ARCHIVE PAGE
// =============================================
async function loadArchiveMonths() {
    try {
        const data = await API.get('/api/archive/months');
        const select = document.getElementById('archiveMonthSelect');
        const months = data.months || [];

        select.innerHTML = '<option value="">-- Ay seçin --</option>' +
            months.map(m => {
                const [y, mo] = m.split('-');
                const label = new Date(y, parseInt(mo) - 1).toLocaleString('az-AZ', { month: 'long', year: 'numeric' });
                return `<option value="${m}">${label}</option>`;
            }).join('');

        // Auto-load current month if available
        const curMonth = new Date().toISOString().slice(0, 7);
        if (months.includes(curMonth)) {
            select.value = curMonth;
            loadArchive(curMonth);
        } else if (months.length > 0) {
            select.value = months[0];
            loadArchive(months[0]);
        }
    } catch (err) {
        showToast('Arxiv ayları yüklənmədi: ' + err.message, 'error');
    }
}

async function loadArchive(month) {
    if (!month) return;
    try {
        const d = await API.get(`/api/archive/${month}`);
        const s = d.summary;

        // Summary cards
        document.getElementById('archRevenue').textContent = `${(s.total_revenue || 0).toFixed(2)} ₼`;
        document.getElementById('archExpenses').textContent = `${(s.total_expenses || 0).toFixed(2)} ₼`;
        const profitEl = document.getElementById('archProfit');
        profitEl.textContent = `${(s.net_profit || 0).toFixed(2)} ₼`;
        profitEl.style.color = s.net_profit >= 0 ? 'var(--success)' : 'var(--danger)';
        document.getElementById('archSessions').textContent = s.session_count || 0;
        document.getElementById('archAvg').textContent = `${(s.avg_bill || 0).toFixed(2)} ₼`;

        // Expense by category
        const expCat = document.getElementById('archExpCatBody');
        expCat.innerHTML = d.expByCategory.length
            ? d.expByCategory.map(c => `
                <tr>
                    <td>${escapeHtml(c.category)}</td>
                    <td>${c.cnt}</td>
                    <td><strong>${c.total.toFixed(2)} ₼</strong></td>
                </tr>`).join('')
            : '<tr><td colspan="3" style="text-align:center;color:var(--gray-400)">Məlumat yoxdur</td></tr>';

        // Expense detail list (date only)
        const expDetail = document.getElementById('archExpDetailBody');
        if (expDetail) {
            const expenses = d.expenses || [];
            expDetail.innerHTML = expenses.length
                ? expenses.map(e => `
                    <tr>
                        <td>${e.date ? e.date.split('T')[0] : (e.date || '—')}</td>
                        <td>${escapeHtml(e.category || '—')}</td>
                        <td>${escapeHtml(e.description || '—')}</td>
                        <td style="color:var(--danger);font-weight:600">${parseFloat(e.amount || 0).toFixed(2)} ₼</td>
                    </tr>`).join('')
                : '<tr><td colspan="4" style="text-align:center;color:var(--gray-400)">Xərc yoxdur</td></tr>';
        }

        // Daily breakdown
        const daily = document.getElementById('archDailyBody');
        daily.innerHTML = d.dailyBreakdown.length
            ? d.dailyBreakdown.map(day => {
                const net = (day.revenue || 0) - (day.expenses || 0);
                return `<tr>
                    <td>${day.day}</td>
                    <td>${day.sessions}</td>
                    <td>${(day.revenue || 0).toFixed(2)} ₼</td>
                    <td style="color:var(--danger)">${(day.expenses || 0).toFixed(2)} ₼</td>
                    <td style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:600">${net.toFixed(2)} ₼</td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="5" style="text-align:center;color:var(--gray-400)">Məlumat yoxdur</td></tr>';

        // Sessions (reuse history row renderer)
        const archBody = document.getElementById('archSessionsBody');
        if (!d.sessions || d.sessions.length === 0) {
            archBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray-400)">Sessiya yoxdur</td></tr>';
        } else {
            archBody.innerHTML = d.sessions.map(s => {
                const openTime = s.started_at ? new Date(s.started_at).toLocaleString('az-AZ') : '—';
                const closeTime = s.ended_at ? new Date(s.ended_at).toLocaleString('az-AZ') : '—';
                const duration = s.duration_min != null ? `${Math.round(s.duration_min)} dəq` : '—';
                const itemsHtml = (s.items && s.items.length > 0)
                    ? s.items.map(it => `
                        <tr style="background:var(--gray-50)">
                            <td></td>
                            <td colspan="4" style="padding-left:2rem;font-size:.85rem;color:var(--gray-600)">— ${escapeHtml(it.product_name)}</td>
                            <td style="font-size:.85rem;color:var(--gray-600)">${it.quantity} ədəd</td>
                            <td style="font-size:.85rem;color:var(--gray-600)">${it.line_total.toFixed(2)} ₼</td>
                        </tr>`).join('')
                    : `<tr style="background:var(--gray-50)"><td></td><td colspan="6" style="padding-left:2rem;font-size:.85rem;color:var(--gray-400)">Sifariş yoxdur</td></tr>`;
                return `
                    <tr class="history-row" onclick="toggleHistoryRow(this)" style="cursor:pointer">
                        <td><span class="expand-icon">▶</span></td>
                        <td><strong>Masa ${s.table_number}</strong></td>
                        <td>${escapeHtml(s.waiter || '—')}</td>
                        <td style="font-size:.8rem">${openTime}</td>
                        <td style="font-size:.8rem">${closeTime}</td>
                        <td>${duration}</td>
                        <td><strong>${parseFloat(s.total_amount || 0).toFixed(2)} ₼</strong></td>
                    </tr>
                    <tr class="history-detail" style="display:none">
                        <td colspan="7" style="padding:0">
                            <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
                        </td>
                    </tr>`;
            }).join('');
        }
    } catch (err) {
        showToast('Arxiv yüklənmədi: ' + err.message, 'error');
    }
}

// ---------- UTILITIES ----------

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    if (theme === 'dark') {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

// Apply saved theme on load
(function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    // Icon gets updated when DOM is ready (initApp calls updateThemeIcon)
    document.addEventListener('DOMContentLoaded', () => updateThemeIcon(saved));
})();
