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

// Startup Database Test & Table 'user' Seeding (As per user requirement)
(async function testMySQL() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);

    // Create table 'user' if not exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        name VARCHAR(100)
      )
    `);

    // Create table 'users' for compatibility
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        name VARCHAR(100)
      )
    `);

    // Ensure role column exists
    try { await conn.query("ALTER TABLE user ADD COLUMN role VARCHAR(50) DEFAULT 'user'"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'"); } catch (e) {}

    const alterQueries = [
      "ALTER TABLE products ADD COLUMN brand VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN color VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN image_url TEXT",
      "ALTER TABLE products ADD COLUMN price DECIMAL(10,2)",
      "ALTER TABLE products ADD COLUMN sizes VARCHAR(100)",
      "ALTER TABLE Inventory ADD COLUMN brand VARCHAR(100)",
      "ALTER TABLE Inventory ADD COLUMN color VARCHAR(100)",
      "ALTER TABLE Inventory ADD COLUMN image_url TEXT",
      "ALTER TABLE Inventory ADD COLUMN price DECIMAL(10,2)",
      "ALTER TABLE Inventory ADD COLUMN sizes VARCHAR(100)"
    ];
    for (const q of alterQueries) {
      try { await conn.query(q); } catch (e) { /* column exists */ }
    }

    // Seed default admin and user accounts if not present
    const saltRounds = 10;
    const adminPassHash = await bcrypt.hash('admin123', saltRounds);
    const userPassHash = await bcrypt.hash('user123', saltRounds);

    // Seed Admin account in 'user' table
    try {
      const [adminCheck] = await conn.query("SELECT id FROM user WHERE username = 'admin'");
      if (adminCheck.length === 0) {
        await conn.query(
          "INSERT INTO user (username, password, role, name) VALUES ('admin', ?, 'admin', 'Administrator')",
          [adminPassHash]
        );
        console.log('Seeded default admin account into user table (username: admin, password: admin123)');
      }
    } catch (e) {}

    // Seed Normal User account in 'user' table
    try {
      const [userCheck] = await conn.query("SELECT id FROM user WHERE username = 'user'");
      if (userCheck.length === 0) {
        await conn.query(
          "INSERT INTO user (username, password, role, name) VALUES ('user', ?, 'user', 'Normal User')",
          [userPassHash]
        );
        console.log('Seeded default normal user account into user table (username: user, password: user123)');
      }
    } catch (e) {}

    // Also seed in 'users' table for compatibility
    try {
      const [adminUsersCheck] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
      if (adminUsersCheck.length === 0) {
        await conn.query("INSERT INTO users (username, password, role, name) VALUES ('admin', ?, 'admin', 'Administrator')", [adminPassHash]);
      }
      const [normalUsersCheck] = await conn.query("SELECT id FROM users WHERE username = 'user'");
      if (normalUsersCheck.length === 0) {
        await conn.query("INSERT INTO users (username, password, role, name) VALUES ('user', ?, 'user', 'Normal User')", [userPassHash]);
      }
    } catch (e) {}

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
// 1. GET /api/products - Fetch products with search, pagination & contract response (Slide 9 API Contracts & Testing)
app.get('/api/products', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const parsedPage = Number.parseInt(String(req.query.page || '1'), 10);
    const parsedLimit = Number.parseInt(String(req.query.limit || '50'), 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 50;
    const offset = (page - 1) * limit;

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

    const priceMap = {
      'Nike Air Max 90': 4500,
      'Nike Air Force 1': 3800,
      'Nike Air Zoom Pegasus 39': 4200
    };

    const getMatchingImage = (name, url) => {
      if (url && typeof url === 'string' && url.trim().length > 0) return url.trim();
      const lower = (name || '').toLowerCase();
      if (lower.includes('force 1') || lower.includes('af1')) return 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200';
      if (lower.includes('pegasus') || lower.includes('zoom')) return 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200';
      return imageMap[name] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';
    };

    // 1. Try to query the products table
    try {
      const searchableCols = ['name', 'category', 'brand', 'color', 'stock_text', 'location_text'];
      let whereClause = '';
      let searchParams = [];

      if (query) {
        whereClause = ' WHERE (' + searchableCols.map(col => `COALESCE(\`${col}\`, '') LIKE ?`).join(' OR ') + ')';
        searchParams = searchableCols.map(() => `%${query}%`);
      }

      let selectQuery = `SELECT * FROM products${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
      let countQuery = `SELECT COUNT(*) AS total FROM products${whereClause}`;

      const [rows] = await pool.query(selectQuery, [...searchParams, limit, offset]);
      const [countRows] = await pool.query(countQuery, searchParams);
      const total = countRows[0]?.total || 0;

      const mappedRows = rows.map(row => ({
        ...row,
        id: String(row.id),
        price: (row.price !== null && row.price !== undefined) ? Number(row.price) : (row.Price !== null && row.Price !== undefined) ? Number(row.Price) : (priceMap[row.name] || 3500),
        sizes: row.sizes || row.Sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12',
        image_url: getMatchingImage(row.name, row.image_url),
        brand: row.brand || (row.name && row.name.startsWith('Nike') ? 'Nike' : 'Nike'),
        color: row.color || colorMap[row.name] || 'Standard',
        stock_text: row.stock_text || `${row.stock !== undefined ? row.stock : 0} in stock`,
        location_text: row.location_text || '0 stores',
        badge_status: row.badge_status || 'Active'
      }));

      return res.json({ items: mappedRows, total: Number(total), page, limit });
    } catch (err) {
      console.log('Products table query failed. Attempting fallback to Inventory table:', err.message);

      // 2. Fallback to Inventory table if products table query fails
      try {
        const invCols = ['name', 'category', 'brand', 'color', 'location'];
        let invWhere = '';
        let invParams = [];

        if (query) {
          invWhere = ' WHERE (' + invCols.map(col => `COALESCE(\`${col}\`, '') LIKE ?`).join(' OR ') + ')';
          invParams = invCols.map(() => `%${query}%`);
        }

        let selectQuery = `SELECT * FROM Inventory${invWhere} ORDER BY id DESC LIMIT ? OFFSET ?`;
        let countQuery = `SELECT COUNT(*) AS total FROM Inventory${invWhere}`;

        const [rows] = await pool.query(selectQuery, [...invParams, limit, offset]);
        const [countRows] = await pool.query(countQuery, invParams);
        const total = countRows[0]?.total || 0;

        const mappedRows = rows.map(row => {
          let locationCount = 0;
          if (row.location) {
            const match = row.location.match(/\d+/);
            if (match) locationCount = parseInt(match[0], 10);
          }

          return {
            id: String(row.id),
            name: row.name,
            price: (row.price !== null && row.price !== undefined) ? Number(row.price) : (row.Price !== null && row.Price !== undefined) ? Number(row.Price) : (priceMap[row.name] || 3500),
            sizes: row.sizes || row.Sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12',
            stock: row.stock || 0,
            stock_text: row.stock !== undefined ? `${row.stock} in stock` : '0 in stock',
            category: row.category || 'Uncategorized',
            location_count: locationCount,
            location_text: row.location || '0 stores',
            badge_status: row.status || 'Active',
            image_url: getMatchingImage(row.name, row.image_url),
            brand: row.brand || 'Nike',
            color: row.color || colorMap[row.name] || 'Standard'
          };
        });

        return res.json({ items: mappedRows, total: Number(total), page, limit });
      } catch (fallbackErr) {
        console.error('Inventory query also failed:', fallbackErr.message);
        res.status(500).json({ error: 'Failed to fetch products: ' + (fallbackErr.message || 'Unknown error') });
      }
    }
  } catch (e) {
    console.error('Products API Error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch products: ' + (e.message || 'Unknown error') });
  }
});

// Also expose /products (compatibility endpoint for older client versions)
app.get('/products', async (req, res) => {
  req.url = '/api/products';
  app.handle(req, res);
});

// 2. POST /api/products - Add a product (supports price & sizes)
app.post('/api/products', async (req, res) => {
  const { name, stock, stock_text, category, location_count, location_text, location, status, badge_status, brand, color, price, sizes, image_url } = req.body;

  if (!name || stock === undefined) {
    return res.status(400).json({ message: 'Product name and stock are required' });
  }

  const stockNum = parseInt(stock, 10) || 0;
  const sText = stock_text || `${stockNum} in stock`;
  const bBrand = brand || 'Nike';
  const cColor = color || 'Standard';
  const cCategory = category || 'Shoes';
  const pPrice = price !== undefined && price !== '' ? parseFloat(price) : 3500;
  const sSizes = sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12';
  const lText = location_text || location || '3 stores';
  const lCount = location_count || parseInt((lText.match(/\d+/) || ['3'])[0], 10);
  const bStatus = badge_status || status || 'Active';
  const imgUrl = image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';

  try {
    try { await pool.query(`ALTER TABLE products ADD COLUMN price DECIMAL(10,2)`); } catch (e) {}
    try { await pool.query(`ALTER TABLE products ADD COLUMN sizes VARCHAR(255)`); } catch (e) {}

    // Try to insert into products table first
    const [result] = await pool.query(
      `INSERT INTO products (name, brand, color, price, sizes, stock, stock_text, category, location_count, location_text, badge_status, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, bBrand, cColor, pPrice, sSizes, stockNum, sText, cCategory, lCount, lText, bStatus, imgUrl]
    );
    res.status(201).json({
      message: 'Product created successfully',
      productId: result.insertId,
      product: {
        id: String(result.insertId),
        name,
        brand: bBrand,
        color: cColor,
        price: pPrice,
        sizes: sSizes,
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
      try { await pool.query(`ALTER TABLE Inventory ADD COLUMN price DECIMAL(10,2)`); } catch (e) {}
      try { await pool.query(`ALTER TABLE Inventory ADD COLUMN sizes VARCHAR(255)`); } catch (e) {}

      const [result] = await pool.query(
        `INSERT INTO Inventory (name, stock, category, location, status, brand, color, price, sizes, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, stockNum, cCategory, lText, bStatus, bBrand, cColor, pPrice, sSizes, imgUrl]
      );
      res.status(201).json({
        message: 'Product created successfully',
        productId: result.insertId,
        product: {
          id: String(result.insertId),
          name,
          brand: bBrand,
          color: cColor,
          price: pPrice,
          sizes: sSizes,
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

// 2.5 PUT /api/products/:id - Update product details in database (supports price & sizes)
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, stock, stock_text, category, location_count, location_text, location, status, badge_status, brand, color, price, sizes, image_url } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const stockNum = stock !== undefined ? parseInt(stock, 10) : 0;
  const sText = stock_text || `${stockNum} in stock`;
  const bBrand = brand || 'Nike';
  const cColor = color || 'Standard';
  const cCategory = category || 'Shoes';
  const pPrice = price !== undefined && price !== '' ? parseFloat(price) : 3500;
  const sSizes = sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12';
  const lText = location_text || location || '3 stores';
  const lCount = location_count || parseInt((lText.match(/\d+/) || ['3'])[0], 10);
  const bStatus = badge_status || status || 'Active';
  const imgUrl = image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';

  try {
    try { await pool.query(`ALTER TABLE products ADD COLUMN price DECIMAL(10,2)`); } catch (e) {}
    try { await pool.query(`ALTER TABLE products ADD COLUMN sizes VARCHAR(255)`); } catch (e) {}

    // 1. Try to update products table
    await pool.query(
      `UPDATE products 
       SET name = ?, brand = ?, color = ?, price = ?, sizes = ?, stock = ?, stock_text = ?, category = ?, location_count = ?, location_text = ?, badge_status = ?, image_url = ?
       WHERE id = ?`,
      [name, bBrand, cColor, pPrice, sSizes, stockNum, sText, cCategory, lCount, lText, bStatus, imgUrl, id]
    );

    res.json({
      message: 'Product updated successfully',
      product: { id, name, brand: bBrand, color: cColor, price: pPrice, sizes: sSizes, stock: stockNum, stock_text: sText, category: cCategory, location_count: lCount, location_text: lText, badge_status: bStatus, image_url: imgUrl }
    });
  } catch (err) {
    console.log('Updating products table failed. Attempting Inventory table update:', err.message);

    try {
      try { await pool.query(`ALTER TABLE Inventory ADD COLUMN price DECIMAL(10,2)`); } catch (e) {}
      try { await pool.query(`ALTER TABLE Inventory ADD COLUMN sizes VARCHAR(255)`); } catch (e) {}

      await pool.query(
        `UPDATE Inventory 
         SET name = ?, stock = ?, category = ?, location = ?, status = ?, brand = ?, color = ?, price = ?, sizes = ?, image_url = ?
         WHERE id = ?`,
        [name, stockNum, cCategory, lText, bStatus, bBrand, cColor, pPrice, sSizes, imgUrl, id]
      );
      res.json({
        message: 'Product updated successfully',
        product: { id, name, brand: bBrand, color: cColor, price: pPrice, sizes: sSizes, stock: stockNum, stock_text: sText, category: cCategory, location_count: lCount, location_text: lText, badge_status: bStatus, image_url: imgUrl }
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

// 2.6 DELETE /api/products/:id - Delete product from database
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    let result;
    try {
      [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    } catch (dbErr) {
      console.log('Error deleting from products table:', dbErr.message);
    }

    if (result && result.affectedRows > 0) {
      return res.json({ success: true, message: 'Product deleted successfully' });
    }

    // Fallback to Inventory table
    try {
      const [invResult] = await pool.query('DELETE FROM Inventory WHERE id = ?', [id]);
      if (invResult.affectedRows > 0) {
        return res.json({ success: true, message: 'Product deleted successfully' });
      }
      return res.status(404).json({ error: 'Product not found' });
    } catch (invErr) {
      if (result && result.affectedRows > 0) {
        return res.json({ success: true, message: 'Product deleted successfully' });
      }
      return res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    console.error('Delete Product Error:', err.message || err);
    res.status(500).json({ error: 'Failed to delete product: ' + (err.message || 'Unknown error') });
  }
});

// Expose DELETE /products/:id for compatibility
app.delete('/products/:id', async (req, res) => {
  req.url = `/api/products/${req.params.id}`;
  app.handle(req, res);
});

// 3. POST /api/register - Register a new user
// 3. POST /api/register - Register a new user/admin in table 'user'
app.post('/api/register', async (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const userRole = role === 'admin' ? 'admin' : 'user';

  try {
    let existingUsers = [];
    try { [existingUsers] = await pool.query('SELECT id FROM user WHERE username = ?', [username]); } catch (err) {}
    if (existingUsers.length === 0) {
      try { [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]); } catch (err) {}
    }

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let result;
    try {
      [result] = await pool.query(
        'INSERT INTO user (username, password, role, name) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, userRole, name || username]
      );
    } catch (err) {
      [result] = await pool.query(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, userRole, name || username]
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId,
      user: { id: result.insertId, username, role: userRole, name: name || username }
    });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 4. POST /api/login - Login user or admin (queries table 'user')
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    let users = [];
    try {
      [users] = await pool.query('SELECT * FROM user WHERE username = ?', [username]);
    } catch (err) {}

    if (users.length === 0) {
      try {
        [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      } catch (err) {}
    }

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const userRole = user.role || (user.username === 'admin' ? 'admin' : 'user');

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: userRole, name: user.name || user.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: userRole, name: user.name || user.username }
    });
  } catch (err) {
    console.error('Error logging in user:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Expose /login and /register compatibility routes
app.post('/login', async (req, res) => {
  req.url = '/api/login';
  app.handle(req, res);
});

app.post('/register', async (req, res) => {
  req.url = '/api/register';
  app.handle(req, res);
});

// 5. GET /api/profile - Get current user profile (JWT Protected)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    let users = [];
    try { [users] = await pool.query('SELECT id, username, role, name FROM user WHERE id = ?', [req.user.userId]); } catch (err) {}
    if (users.length === 0) {
      try { [users] = await pool.query('SELECT id, username, role, name FROM users WHERE id = ?', [req.user.userId]); } catch (err) {}
    }

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
