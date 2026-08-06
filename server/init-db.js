const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function initDB() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306', 10),
  };

  const dbName = process.env.DB_NAME || 'ip_std6730202530';

  console.log(`Connecting to MySQL server at ${connectionConfig.host}:${connectionConfig.port}...`);
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
  } catch (err) {
    console.error('Error connecting to MySQL server:', err.message);
    process.exit(1);
  }

  try {
    // 1. Create database if it doesn't exist
    console.log(`Creating database ${dbName} if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    // 2. Create users table
    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255)
      )
    `);

    // 3. Create products table
    console.log('Creating products table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        color VARCHAR(100),
        stock INT NOT NULL,
        stock_text VARCHAR(100),
        category VARCHAR(100),
        location_count INT,
        location_text VARCHAR(100),
        badge_status VARCHAR(50) DEFAULT 'Active',
        image_url TEXT
      )
    `);

    // Ensure columns exist if table was previously created without brand/color
    try {
      await connection.query(`ALTER TABLE products ADD COLUMN brand VARCHAR(100)`);
    } catch (e) { /* Column may already exist */ }
    try {
      await connection.query(`ALTER TABLE products ADD COLUMN color VARCHAR(100)`);
    } catch (e) { /* Column may already exist */ }

    // 4. Seed products if empty
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      console.log('Products table is empty. Seeding initial data from products.json...');
      const productsJsonPath = path.join(__dirname, '../products.json');
      if (fs.existsSync(productsJsonPath)) {
        const productsData = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
        for (const product of productsData) {
          await connection.query(
            `INSERT INTO products (name, brand, color, stock, stock_text, category, location_count, location_text, badge_status, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              product.name,
              product.brand || 'Nike',
              product.color || 'Default',
              product.stock,
              product.stock_text,
              product.category,
              product.location_count,
              product.location_text,
              product.badge_status,
              product.image_url
            ]
          );
        }
        console.log('Seeded initial products successfully.');
      } else {
        console.warn('products.json not found, skipping seed data.');
      }
    } else {
      console.log('Products table already has data. Skipping seed.');
    }

    console.log('Database initialization complete!');
  } catch (err) {
    console.error('Error during database initialization:', err.message);
  } finally {
    await connection.end();
  }
}

initDB();
