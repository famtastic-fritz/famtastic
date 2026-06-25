import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const connection = await mysql.createConnection({
  host: required('MYSQL_HOST'),
  port: Number(process.env.MYSQL_PORT || 3306),
  database: required('MYSQL_DATABASE'),
  user: required('MYSQL_USER'),
  password: required('MYSQL_PASSWORD'),
  timezone: '+00:00',
});

try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS premium_checkout_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paypal_order_id VARCHAR(64) NOT NULL,
      email VARCHAR(255) NOT NULL,
      product_key VARCHAR(120) NOT NULL,
      subtotal_cents INT NOT NULL,
      chart_input_json JSON NOT NULL,
      status ENUM('pending','captured','expired') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_checkout_paypal_order_id (paypal_order_id),
      KEY idx_checkout_email (email),
      KEY idx_checkout_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS premium_purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paypal_order_id VARCHAR(64) NOT NULL,
      email VARCHAR(255) NOT NULL,
      product_key VARCHAR(120) NOT NULL,
      amount_cents INT NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'USD',
      status ENUM('completed','refunded','failed') NOT NULL DEFAULT 'completed',
      capture_payload_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_purchase_paypal_order_id (paypal_order_id),
      KEY idx_purchase_email (email),
      KEY idx_purchase_product (product_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS premium_unlocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      product_key VARCHAR(120) NOT NULL,
      purchase_id INT NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_unlock_email_product (email, product_key),
      KEY idx_unlock_purchase (purchase_id),
      CONSTRAINT fk_premium_unlock_purchase FOREIGN KEY (purchase_id)
        REFERENCES premium_purchases(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('PASS: FAMtastic By the Numbers DB schema is ready.');
} finally {
  await connection.end();
}
