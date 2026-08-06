const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3049; // Read from .env (e.g. 3049), fallback to 3049
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// MySQL Connection Pool (Configured as per slide instructions)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'
});

// Startup Database Test (As per slide instructions)
(async function testMySQL() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);
    const alterQueries = [
      "ALTER TABLE products ADD COLUMN brand VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN color VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN image_url TEXT",
      "ALTER TABLE Inventory ADD COLUMN brand VARCHAR(100)",
      "ALTER TABLE Inventory ADD COLUMN color VARCHAR(100)",
      "ALTER TABLE Inventory ADD COLUMN image_url TEXT"
    ];
    for (const q of alterQueries) {
      try { await conn.query(q); } catch (e) { /* column exists */ }
    }
    conn.release();
  } catch (err) {
    console.error('MySQL Connection Warning:', err.message);
  }
})();

// Middleware to authenticate JWT token (For login/register optional feature)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// 1. GET /api/products - Fetch products (As per slide, with robust fallback)
app.get('/api/products', async (req, res) => {
  try {
    // 1. Try to query the products table (ordered by id desc if lastUpdate is missing)
    let rows;
    try {
      [rows] = await pool.query('SELECT * FROM products ORDER BY lastUpdate DESC');
    } catch (err) {
      [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    }

    const imageMap = {
      'Nike Air Max 90': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
      'Nike Air Force 1': 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200',
      'Nike Air Zoom Pegasus 39': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200'
    };

    const colorMap = {
      'Nike Air Max 90': 'Red / White',
      'Nike Air Force 1': 'White / Orange',
      'Nike Air Zoom Pegasus 39': 'Lime Green / Black'
    };

    const getMatchingImage = (name, url) => {
      if (url && typeof url === 'string' && url.trim().length > 0) return url.trim();
      const lower = (name || '').toLowerCase();
      if (lower.includes('force 1') || lower.includes('af1')) return 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200';
      if (lower.includes('pegasus') || lower.includes('zoom')) return 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200';
      return imageMap[name] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';
    };

    const mappedRows = rows.map(row => ({
      ...row,
      image_url: getMatchingImage(row.name, row.image_url),
      brand: row.brand || (row.name && row.name.startsWith('Nike') ? 'Nike' : 'Nike'),
      color: row.color || colorMap[row.name] || 'Standard'
    }));

    res.json(mappedRows);
  } catch (e) {
    console.log('Products table query failed. Attempting fallback to Inventory table:', e.message);

    // 2. Fallback to Inventory table if products table doesn't exist
    try {
      const [rows] = await pool.query('SELECT * FROM Inventory ORDER BY id DESC');

      const imageMap = {
        'Nike Air Max 90': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
        'Nike Air Force 1': 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200',
        'Nike Air Zoom Pegasus 39': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200'
      };

      const colorMap = {
        'Nike Air Max 90': 'Red / White',
        'Nike Air Force 1': 'White / Orange',
        'Nike Air Zoom Pegasus 39': 'Lime Green / Black'
      };

      // Map Inventory columns to the structure expected by the Expo frontend
      const mappedRows = rows.map(row => {
        let locationCount = 0;
        if (row.location) {
          const match = row.location.match(/\d+/);
          if (match) locationCount = parseInt(match[0], 10);
        }

        return {
          id: String(row.id),
          name: row.name,
          stock: row.stock || 0,
          stock_text: row.stock !== undefined ? `${row.stock} in stock` : '0 in stock',
          category: row.category || 'Uncategorized',
          location_count: locationCount,
          location_text: row.location || '0 stores',
          badge_status: row.status || 'Active',
          image_url: row.image_url || imageMap[row.name] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
          brand: row.brand || 'Nike',
          color: row.color || colorMap[row.name] || 'Standard',
          sizes: row.sizes || ''
        };
      });

      res.json(mappedRows);
    } catch (fallbackErr) {
      console.error('Inventory query also failed:', fallbackErr.message);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
});

// Also expose /products (compatibility endpoint for older client versions)
app.get('/products', async (req, res) => {
  req.url = '/api/products';
  app.handle(req, res);
});

// 2. POST /api/products - Add a product (supports both products and Inventory tables)
app.post('/api/products', async (req, res) => {
  const { name, stock, stock_text, category, location_count, location_text, location, status, badge_status, brand, color, image_url } = req.body;

  if (!name || stock === undefined) {
    return res.status(400).json({ message: 'Product name and stock are required' });
  }

  const stockNum = parseInt(stock, 10) || 0;
  const sText = stock_text || `${stockNum} in stock`;
  const bBrand = brand || 'Nike';
  const cColor = color || 'Standard';
  const cCategory = category || 'Shoes';
  const lText = location_text || location || '3 stores';
  const lCount = location_count || parseInt((lText.match(/\d+/) || ['3'])[0], 10);
  const bStatus = badge_status || status || 'Active';
  const imgUrl = image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';

  try {
    // Try to insert into products table first
    const [result] = await pool.query(
      `INSERT INTO products (name, brand, color, stock, stock_text, category, location_count, location_text, badge_status, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, bBrand, cColor, stockNum, sText, cCategory, lCount, lText, bStatus, imgUrl]
    );
    res.status(201).json({
      message: 'Product created successfully',
      productId: result.insertId,
      product: {
        id: String(result.insertId),
        name,
        brand: bBrand,
        color: cColor,
        stock: stockNum,
        stock_text: sText,
        category: cCategory,
        location_count: lCount,
        location_text: lText,
        badge_status: bStatus,
        image_url: imgUrl
      }
    });
  } catch (err) {
    console.log('Inserting into products table failed. Attempting Inventory table insertion:', err.message);

    try {
      try {
        await pool.query(`ALTER TABLE Inventory ADD COLUMN image_url TEXT`);
      } catch (e) { /* column may exist */ }

      const [result] = await pool.query(
        `INSERT INTO Inventory (name, stock, category, location, status, brand, color, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, stockNum, cCategory, lText, bStatus, bBrand, cColor, imgUrl]
      );
      res.status(201).json({
        message: 'Product created successfully',
        productId: result.insertId,
        product: {
          id: String(result.insertId),
          name,
          brand: bBrand,
          color: cColor,
          stock: stockNum,
          stock_text: sText,
          category: cCategory,
          location_count: lCount,
          location_text: lText,
          badge_status: bStatus,
          image_url: imgUrl
        }
      });
    } catch (fallbackErr) {
      console.error('Inventory insertion failed:', fallbackErr.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Also expose POST /products for compatibility
app.post('/products', async (req, res) => {
  req.url = '/api/products';
  app.handle(req, res);
});

// 2.5 PUT /api/products/:id - Update product details in database
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, stock, stock_text, category, location_count, location_text, location, status, badge_status, brand, color, image_url } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const stockNum = stock !== undefined ? parseInt(stock, 10) : 0;
  const sText = stock_text || `${stockNum} in stock`;
  const bBrand = brand || 'Nike';
  const cColor = color || 'Standard';
  const cCategory = category || 'Shoes';
  const lText = location_text || location || '3 stores';
  const lCount = location_count || parseInt((lText.match(/\d+/) || ['3'])[0], 10);
  const bStatus = badge_status || status || 'Active';
  const imgUrl = image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';

  try {
    // 1. Try to update products table
    await pool.query(
      `UPDATE products 
       SET name = ?, brand = ?, color = ?, stock = ?, stock_text = ?, category = ?, location_count = ?, location_text = ?, badge_status = ?, image_url = ?
       WHERE id = ?`,
      [name, bBrand, cColor, stockNum, sText, cCategory, lCount, lText, bStatus, imgUrl, id]
    );

    res.json({
      message: 'Product updated successfully',
      product: { id, name, brand: bBrand, color: cColor, stock: stockNum, stock_text: sText, category: cCategory, location_count: lCount, location_text: lText, badge_status: bStatus, image_url: imgUrl }
    });
  } catch (err) {
    console.log('Updating products table failed. Attempting Inventory table update:', err.message);

    try {
      try {
        await pool.query(`ALTER TABLE Inventory ADD COLUMN image_url TEXT`);
      } catch (e) { /* column may exist */ }

      await pool.query(
        `UPDATE Inventory 
         SET name = ?, stock = ?, category = ?, location = ?, status = ?, brand = ?, color = ?, image_url = ?
         WHERE id = ?`,
        [name, stockNum, cCategory, lText, bStatus, bBrand, cColor, imgUrl, id]
      );
      res.json({
        message: 'Product updated successfully',
        product: { id, name, brand: bBrand, color: cColor, stock: stockNum, stock_text: sText, category: cCategory, location_count: lCount, location_text: lText, badge_status: bStatus, image_url: imgUrl }
      });
    } catch (fallbackErr) {
      console.error('Inventory update failed:', fallbackErr.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

app.put('/products/:id', async (req, res) => {
  req.url = `/api/products/${req.params.id}`;
  app.handle(req, res);
});

// 3. POST /api/register - Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.query(
      'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
      [username, hashedPassword, name || username]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 4. POST /api/login - Login user
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, name: user.name }
    });
  } catch (err) {
    console.error('Error logging in user:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 5. GET /api/profile - Get current user profile (JWT Protected)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, name FROM users WHERE id = ?', [req.user.userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Root API Endpoint (As per slide instructions)
app.get("/api", (req, res) => {
  res.send("API is running");
});

// Default root redirect
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Listen block (As per slide instructions)
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
