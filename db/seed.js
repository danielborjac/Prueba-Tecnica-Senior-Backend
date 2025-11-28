require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  database: process.env.DB_NAME || 'appdb',
  multipleStatements: true
};

async function seed() {
  console.log('🌱 Starting database seeding...\n');
  
  let connection;
  
  try {
    // Conectar a la base de datos
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database\n');

    // Verificar si ya hay datos
    console.log('🔍 Checking existing data...');
    const [customers] = await connection.query('SELECT COUNT(*) as count FROM customers');
    const [products] = await connection.query('SELECT COUNT(*) as count FROM products');
    
    if (customers[0].count > 0 || products[0].count > 0) {
      console.log('⚠️  Database already has data:');
      console.log(`   - Customers: ${customers[0].count}`);
      console.log(`   - Products: ${products[0].count}`);
      
      // Preguntar si quiere continuar (solo en modo interactivo)
      if (process.stdin.isTTY) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise((resolve) => {
          readline.question('\n❓ Do you want to continue and add more data? (y/N): ', resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('\n🚫 Seeding cancelled');
          return;
        }
      }
    }

    // Leer y ejecutar seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    console.log('\n📄 Reading seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('🌱 Inserting seed data...');
    await connection.query(seedSql);
    
    // Mostrar resumen
    console.log('\n✅ Seed data inserted successfully!\n');
    
    const [newCustomers] = await connection.query('SELECT COUNT(*) as count FROM customers');
    const [newProducts] = await connection.query('SELECT COUNT(*) as count FROM products');
    
    console.log('📊 Current database state:');
    console.log(`   - Customers: ${newCustomers[0].count}`);
    console.log(`   - Products: ${newProducts[0].count}`);
    
    console.log('\n✨ Seeding completed successfully!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('❌ Duplicate entry error - some data already exists');
      console.error('💡 Tip: This is normal if you run seed multiple times');
    } else {
      console.error('❌ Seeding failed:', error.message);
      console.error('\nFull error:', error);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Ejecutar seeding
seed();