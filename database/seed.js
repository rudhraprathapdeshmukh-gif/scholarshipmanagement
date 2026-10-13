require('dotenv').config();
const { initializeDatabase, db } = require('./db');

async function runSeed() {
  console.log('--- Initializing ScholarHub Database Seeder ---');
  await initializeDatabase();
  console.log(`Database engine active: ${db.getEngine()}`);
  console.log('ScholarHub database seeded and verified successfully.');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
