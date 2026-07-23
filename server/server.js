const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3049;
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

app.use(cors());
app.use(express.json());

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

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

// 1. GET /products - Get all products from database (Inventory table)
app.get('/products', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Inventory ORDER BY id DESC');
    
    // Map remote database schema fields to the structure expected by the Expo frontend
    const mappedRows = rows.map(row => {
      // Parse location count (e.g. "5 stores" -> 5)
      let locationCount = 0;
      if (row.location) {
        const match = row.location.match(/\d+/);
        if (match) locationCount = parseInt(match[0], 10);
      }

      // Map image URLs matching the seed data
      const imageMap = {
        'Nike Air Max 90': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
        'Nike Air Force 1': 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200',
        'Nike Air Zoom Pegasus 39': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200'
      };

      return {
        id: String(row.id),
        name: row.name,
        stock: row.stock || 0,
        stock_text: row.stock !== undefined ? `${row.stock} in stock` : '0 in stock',
        category: row.category || 'Uncategorized',
        location_count: locationCount,
        location_text: row.location || '0 stores',
        badge_status: row.status || 'Active',
        image_url: imageMap[row.name] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
        brand: row.brand || '',
        sizes: row.sizes || ''
      };
    });

    res.json(mappedRows);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 2. POST /products - Add a new product to database (Inventory table)
app.post('/products', async (req, res) => {
  const { name, stock, category, location, status, brand, sizes } = req.body;

  if (!name || stock === undefined) {
    return res.status(400).json({ message: 'Product name and stock are required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO Inventory (name, stock, category, location, status, brand, sizes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        parseInt(stock, 10),
        category || 'Uncategorized',
        location || '0 stores',
        status || 'Active',
        brand || '',
        sizes || ''
      ]
    );

    res.status(201).json({
      message: 'Product created successfully',
      productId: result.insertId
    });
  } catch (err) {
    console.error('Error creating product:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. POST /register - Register a new user
app.post('/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const [result] = await db.query(
      'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
      [username, hashedPassword, name || username]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 4. POST /login - Login user and generate access token
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Find user in database
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT access token (valid for 1 day)
    const token = jwt.sign(
      { userId: user.id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Error logging in user:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 5. GET /profile - Get current user profile (JWT Protected)
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, name FROM users WHERE id = ?', [req.user.userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Default root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Express backend server running successfully'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
