import mysql from 'mysql2/promise';

const required = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});

try {
  const [rows] = await connection.execute(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = ?
        AND table_name IN ('premium_checkout_sessions', 'premium_purchases', 'premium_unlocks')
      ORDER BY table_name`,
    [process.env.MYSQL_DATABASE],
  );

  const found = rows.map(row => row.TABLE_NAME || row.table_name);
  const missing = ['premium_checkout_sessions', 'premium_purchases', 'premium_unlocks'].filter(name => !found.includes(name));

  if (missing.length) {
    throw new Error(`Missing required tables: ${missing.join(', ')}`);
  }

  console.log(JSON.stringify({ ok: true, database: process.env.MYSQL_DATABASE, tables: found }, null, 2));
} finally {
  await connection.end();
}
