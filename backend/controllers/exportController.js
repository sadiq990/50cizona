const ExcelJS = require('exceljs');
const db = require('../database');

const exportController = {
    async excel(req, res) {
        try {
            const workbook = new ExcelJS.Workbook();

            // Sessions sheet
            const sessionsSheet = workbook.addWorksheet('Sessiyalar');
            sessionsSheet.columns = [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Masa', key: 'table_number', width: 10 },
                { header: 'Başlama', key: 'started_at', width: 20 },
                { header: 'Bitmə', key: 'ended_at', width: 20 },
                { header: 'Məbləğ', key: 'total_amount', width: 12 },
                { header: 'Status', key: 'status', width: 12 }
            ];

            const sessions = db.prepare(`
        SELECT s.*, t.number as table_number 
        FROM sessions s 
        JOIN tables t ON t.id = s.table_id 
        ORDER BY s.started_at DESC
        LIMIT 500
      `).all();
            sessions.forEach(s => sessionsSheet.addRow(s));

            // Style header
            sessionsSheet.getRow(1).font = { bold: true };
            sessionsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            sessionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Orders sheet
            const ordersSheet = workbook.addWorksheet('Sifarişlər');
            ordersSheet.columns = [
                { header: 'Sessiya ID', key: 'session_id', width: 12 },
                { header: 'Məhsul', key: 'product_name', width: 25 },
                { header: 'Miqdar', key: 'quantity', width: 10 },
                { header: 'Vahid Qiymət', key: 'unit_price', width: 14 },
                { header: 'Cəm', key: 'line_total', width: 12 },
                { header: 'Tarix', key: 'created_at', width: 20 }
            ];

            const orders = db.prepare(`
        SELECT oi.*, p.name as product_name,
          (oi.quantity * oi.unit_price) as line_total
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        ORDER BY oi.created_at DESC
        LIMIT 1000
      `).all();
            orders.forEach(o => ordersSheet.addRow(o));

            ordersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ordersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

            // Products sheet
            const productsSheet = workbook.addWorksheet('Məhsullar');
            productsSheet.columns = [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Ad', key: 'name', width: 25 },
                { header: 'Qiymət', key: 'price', width: 12 },
                { header: 'Kateqoriya', key: 'category', width: 15 },
                { header: 'Aktiv', key: 'is_active', width: 10 }
            ];

            const products = db.prepare('SELECT * FROM products ORDER BY name').all();
            products.forEach(p => productsSheet.addRow(p));

            productsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            productsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

            // Expenses sheet (all)
            const expensesSheet = workbook.addWorksheet('Xərclər');
            expensesSheet.columns = [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Təsvir', key: 'description', width: 30 },
                { header: 'Kateqoriya', key: 'category', width: 15 },
                { header: 'Məbləğ', key: 'amount', width: 12 },
                { header: 'Tarix', key: 'date', width: 14 },
                { header: 'Əlavə edən', key: 'added_by_name', width: 15 }
            ];

            const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT 1000').all();
            expenses.forEach(e => expensesSheet.addRow(e));

            expensesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            expensesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

            // Daily Expenses sheet (today only)
            const dailyExpSheet = workbook.addWorksheet('Günlük Xərclər');
            dailyExpSheet.columns = [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Təsvir', key: 'description', width: 30 },
                { header: 'Kateqoriya', key: 'category', width: 15 },
                { header: 'Məbləğ (₼)', key: 'amount', width: 14 },
                { header: 'Tarix', key: 'date', width: 14 },
                { header: 'Əlavə edən', key: 'added_by_name', width: 15 }
            ];

            // Header style
            dailyExpSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            dailyExpSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

            const today = new Date().toISOString().split('T')[0];
            const dailyExpenses = db.prepare(
                `SELECT * FROM expenses WHERE date = ? ORDER BY created_at DESC`
            ).all(today);
            dailyExpenses.forEach(e => dailyExpSheet.addRow(e));

            // Summary row
            const dailyTotal = dailyExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
            const summaryRow = dailyExpSheet.addRow({
                id: '',
                description: `CƏMI: ${dailyExpenses.length} xərc`,
                category: '',
                amount: dailyTotal,
                date: today,
                added_by_name: ''
            });
            summaryRow.font = { bold: true };
            summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E1' } };
            summaryRow.getCell('amount').numFmt = '#,##0.00';

            // Format amount column
            dailyExpSheet.getColumn('amount').numFmt = '#,##0.00';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=restoran_hesabat_${new Date().toISOString().split('T')[0]}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = exportController;
