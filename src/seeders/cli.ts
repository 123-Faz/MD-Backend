import { AdminSeeder } from './adminSeeder';

const command = process.argv[2];

async function run() {
  try {
    switch (command) {
      case 'seed:admin':
        await AdminSeeder.seed();
        break;
      case 'clear:admin':
        await AdminSeeder.clear();
        break;
      case 'refresh:admin':
        await AdminSeeder.refresh();
        break;
      case 'list:admin':
        await AdminSeeder.list();
        break;
      default:
        console.log(`
🚀 Admin Seeder CLI

Usage:
  npm run seed:admin    - Seed default admin users
  npm run clear:admin   - Remove seeded admin users
  npm run refresh:admin - Clear and reseed admin users
  npm run list:admin    - List all admin users

Default Admin Users:
  👤 superadmin (superadmin@company.com) - Super Admin
  👤 admin (admin@company.com) - Admin
  👤 manager (manager@company.com) - Admin

Environment: Make sure your MongoDB connection is properly configured in config files.
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 CLI execution failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
  process.exit(1);
});

run();