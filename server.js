const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase, run, get, all } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'aether_secret_key_998877';

// Initialize the database on startup
initDatabase();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// Admin Auth Middleware
const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
  });
};

// --- AUTHENTICATION ENDPOINTS ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  try {
    // Check if user exists
    const userExists = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (userExists) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, 'user']
    );

    const user = { id: result.id, username, email, role: 'user' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: userPayload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching user.' });
  }
});

// --- PRODUCT ENDPOINTS ---

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await all('SELECT * FROM products');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching products.' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching product details.' });
  }
});

// --- ORDER ENDPOINTS ---

// Place an order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { address, items } = req.body;

  if (!address || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order data. Please provide address and items.' });
  }

  try {
    let total_price = 0;
    const validatedItems = [];

    // Verify stock and calculate price
    for (const item of items) {
      const product = await get('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.productId} not found.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product "${product.name}". Available stock: ${product.stock}`
        });
      }

      total_price += product.price * item.quantity;
      validatedItems.push({
        product_id: product.id,
        quantity: item.quantity,
        price: product.price,
        currentStock: product.stock
      });
    }

    // Insert order (status default: 'Pending')
    const orderResult = await run(
      'INSERT INTO orders (user_id, status, total_price, address) VALUES (?, ?, ?, ?)',
      [req.user.id, 'Pending', total_price, address]
    );
    const orderId = orderResult.id;

    // Insert order items and update stock
    for (const item of validatedItems) {
      // Create order item
      await run(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Decrement stock
      const newStock = item.currentStock - item.quantity;
      await run('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      totalPrice: total_price
    });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Server error processing checkout.' });
  }
});

// Get user orders (for history)
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Fetch items for each order
    for (const order of orders) {
      order.items = await all(
        `SELECT oi.*, p.name, p.image_url 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching order history.' });
  }
});

// --- ADMIN ENDPOINTS ---

// Get all orders (Admin only)
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await all(`
      SELECT o.*, u.username, u.email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);

    // Fetch items for each order
    for (const order of orders) {
      order.items = await all(`
        SELECT oi.*, p.name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
      `, [order.id]);
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching admin orders.' });
  }
});

// Update order status (Admin only)
app.post('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Please provide status.' });
  }

  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Order status updated successfully.', orderId: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating order status.' });
  }
});

// Catch-all route to serve the homepage for other routes
app.get('*', (req, res, next) => {
  // If requesting API, proceed to API router (let it 404 naturally if unregistered)
  if (req.url.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Aether Tech Server is running on http://localhost:${PORT}`);
});
