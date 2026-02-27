/**
 * Menu Migration Script
 * Run this ONCE to replace the old menu with the new menu.
 * Usage: node migrate_menu.js
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'restaurant.db');

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

const newProducts = [
    // İçki
    ['Alpen Gold', 4.00, 'içki'],
    ['Bildircin', 4.00, 'içki'],
    ['Boğaz', 2.00, 'içki'],
    ['Cola 1L', 3.00, 'içki'],
    ['Cola 0.5L', 2.00, 'içki'],
    ['Fanta 1L', 3.00, 'içki'],
    ['Piyve Stara Praga', 1.50, 'içki'],
    ['Red Bull', 5.00, 'içki'],
    ['Yaquar', 2.50, 'içki'],
    ['Xurma', 2.50, 'içki'],
    ['Meyvə Assorti', 5.00, 'içki'],
    ['Bizon Böyük', 2.00, 'içki'],
    ['Bizon Balaca', 1.50, 'içki'],
    // Çay / Qəhvə
    ['Çay Sadə', 2.00, 'çay-qəhvə'],
    ['Kofe', 1.00, 'çay-qəhvə'],
    // Qida
    ['Cipsi Orta Leys', 3.00, 'qida'],
    ['Mürəbbə', 5.00, 'qida'],
    ['Noxud Sadə', 1.50, 'qida'],
    ['Pendir Sacaq', 2.00, 'qida'],
    ['Pomidor Yumurta', 4.00, 'qida'],
    ['Sosiska Yumurta', 4.00, 'qida'],
    ['Rulet', 5.00, 'qida'],
    ['Snickers Böyük', 4.00, 'qida'],
    ['Suxari', 2.00, 'qida'],
    ['Tüm', 2.00, 'qida'],
    // Set / Nabor
    ['Nabor Balaca', 3.50, 'set'],
    ['Nabor Böyük', 7.00, 'set'],
    ['Nabor Ləpə', 4.00, 'set'],
    ['Set 1', 17.90, 'set'],
    ['Set 2', 14.90, 'set'],
    ['Set 3', 21.90, 'set'],
    // Qəlyan
    ['Pətənək', 3.50, 'qəlyan'],
    ['Qəlyan Saxsı', 10.00, 'qəlyan'],
    // Əlavə
    ['Limon (Əlavə)', 1.00, 'digər'],
];

const migrate = db.transaction(() => {
    // Deactivate all old products
    db.prepare('UPDATE products SET is_active = 0').run();
    console.log('✅ Old products deactivated');

    const insert = db.prepare('INSERT INTO products (name, price, category, is_active) VALUES (?, ?, ?, 1)');
    for (const [name, price, category] of newProducts) {
        insert.run(name, price, category);
    }
    console.log(`✅ ${newProducts.length} new products inserted`);
});

migrate();
console.log('🎉 Menu migration complete!');
db.close();
