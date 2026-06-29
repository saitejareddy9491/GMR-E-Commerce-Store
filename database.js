const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'store.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper wrapper to run queries with promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize schema
const initDatabase = async () => {
  try {
    // Create Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Products table
    await run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        image_url TEXT NOT NULL,
        stock INTEGER NOT NULL,
        category TEXT NOT NULL
      )
    `);

    // Create Orders table
    await run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        total_price REAL NOT NULL,
        address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create Order Items table
    await run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('Database tables verified/created successfully.');

    // Seed default users if they don't exist
    const adminCheck = await get(`SELECT * FROM users WHERE username = ?`, ['admin']);
    if (!adminCheck) {
      const adminHash = await bcrypt.hash('adminpassword', 10);
      await run(
        `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['admin', 'admin@aethertech.com', adminHash, 'admin']
      );
      console.log('Admin user seeded: admin / adminpassword');
    }

    const userCheck = await get(`SELECT * FROM users WHERE username = ?`, ['user']);
    if (!userCheck) {
      const userHash = await bcrypt.hash('userpassword', 10);
      await run(
        `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['user', 'user@aethertech.com', userHash, 'user']
      );
      console.log('Normal user seeded: user / userpassword');
    }

    // Seed products if they don't exist
    const productCheck = await get(`SELECT COUNT(*) as count FROM products`);
    if (productCheck.count === 0) {
      const seedProducts = [
        {
          name: 'Aether Glass VR',
          description: 'Experience high-fidelity spatial computing with crystal-clear micro-OLED optics and direct neural sync capabilities. Designed for sleek comfort and long immersion sessions.',
          price: 499.99,
          image_url: '/images/aether_glass_vr.png',
          stock: 15,
          category: 'Wearables'
        },
        {
          name: 'Nova Core Desk',
          description: 'A luxury workstation crafted from solid dark oak and tempered glass. Features integrated dual 15W wireless chargers, a dynamic touch-control interface, and active neon accent lighting.',
          price: 1299.99,
          image_url: '/images/nova_core_desk.png',
          stock: 5,
          category: 'Furniture'
        },
        {
          name: 'Quantum Keypad',
          description: 'Unrivaled responsiveness with magnetic Hall Effect switches. Features transparent glass-like keycaps with individually addressable RGB LEDs on a brushed titanium plate.',
          price: 249.99,
          image_url: '/images/quantum_keypad.png',
          stock: 25,
          category: 'Accessories'
        },
        {
          name: 'Vortex Speaker',
          description: 'A floating acoustic marvel. The spherical speaker capsule levitates above its magnetic dock, delivering 360-degree high-fidelity spatial audio and dynamic pulse lighting.',
          price: 399.99,
          image_url: '/images/vortex_speaker.png',
          stock: 8,
          category: 'Audio'
        },
        {
          name: 'Solaris Watch',
          description: 'A matte black ceramic smartwatch displaying floating holographic widgets. Monitors biometrics, sleep, and environmental data with a 10-day battery life.',
          price: 349.99,
          image_url: '/images/solaris_watch.png',
          stock: 20,
          category: 'Wearables'
        }
      ];

      for (const p of seedProducts) {
        await run(
          `INSERT INTO products (name, description, price, image_url, stock, category) VALUES (?, ?, ?, ?, ?, ?)`,
          [p.name, p.description, p.price, p.image_url, p.stock, p.category]
        );
      }
      console.log('Database products seeded successfully.');
    }

  } catch (error) {
    console.error('Error seeding/initializing database:', error);
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initDatabase
};
