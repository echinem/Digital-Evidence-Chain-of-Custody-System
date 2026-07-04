require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear existing users
  await User.deleteMany({});

  const users = [
    {
      name: 'System Administrator',
      email: 'admin@decs.gov',
      password: 'admin123',
      role: 'admin',
      status: 'active',
    },
    {
      name: 'Investigator Alpha',
      email: 'alpha@decs.gov',
      password: 'inv123',
      role: 'investigator',
      status: 'active',
    },
    {
      name: 'Investigator Beta',
      email: 'beta@decs.gov',
      password: 'inv456',
      role: 'investigator',
      status: 'active',
    },
  ];

  for (const u of users) {
    await User.create(u);
    console.log(`  ✅ Created: ${u.email} (${u.role})`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:       admin@decs.gov  / admin123');
  console.log('  Investigator: alpha@decs.gov  / inv123');
  console.log('  Investigator: beta@decs.gov   / inv456\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
