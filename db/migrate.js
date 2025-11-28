require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  multipleStatements: true
};

async function migrate() {
  console.log('🔄 Starting database migration...\n');
  
  let connection;
  
  try {
    // Conectar a MySQL (sin especificar database)
    console.log('📡 Connecting to MySQL...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL\n');

    // Leer y ejecutar schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log('📄 Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔨 Creating database and tables...');
    await connection.query(schemaSql);
    console.log('✅ Schema created successfully\n');

    console.log('✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Ejecutar migración
migrate();