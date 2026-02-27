const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'restaurant.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'waiter',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      capacity INTEGER DEFAULT 4
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT DEFAULT 'general',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      waiter_id INTEGER,
      FOREIGN KEY (table_id) REFERENCES tables(id),
      FOREIGN KEY (waiter_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Digər',
      amount REAL NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
      added_by INTEGER,
      added_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (added_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed templates if empty
  const templateCount = db.prepare('SELECT count(*) as count FROM expense_templates').get().count;
  if (templateCount === 0) {
    const insertTemplate = db.prepare('INSERT INTO expense_templates (name, category, price) VALUES (?, ?, ?)');
    insertTemplate.run('Çay', 'Ərzaq', 5.00);
    insertTemplate.run('Şokolad', 'Ərzaq', 3.50);
    insertTemplate.run('Qab yuyan maye', 'Təmizlik', 2.50);
    console.log('✅ Expense templates seeded');
  }

  // Seed default users if not exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const waiterHash = bcrypt.hashSync('1234', 10);

    const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    insertUser.run('admin', adminHash, 'admin');
    insertUser.run('ofisant', waiterHash, 'waiter');
    console.log('✅ Default users created: admin/admin123, ofisant/1234');
  }

  // Seed 12 tables if not exist
  const tableCount = db.prepare('SELECT COUNT(*) as count FROM tables').get();
  if (tableCount.count === 0) {
    const insertTable = db.prepare('INSERT INTO tables (number, capacity) VALUES (?, ?)');
    for (let i = 1; i <= 12; i++) {
      insertTable.run(i, 4);
    }
    console.log('✅ 12 tables created');
  }

  // Seed default products if not exist
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) {
    const insertProduct = db.prepare('INSERT INTO products (name, price, category) VALUES (?, ?, ?)');
    const products = [
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
      // Nabor (Set)
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
    for (const [name, price, category] of products) {
      insertProduct.run(name, price, category);
    }
    console.log('✅ Default products created');
  }

  console.log('✅ Database initialized successfully');
}

initializeDatabase();

module.exports = db;
