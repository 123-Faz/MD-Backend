import mongoose from 'mongoose';
import Admin from '../models/Admin'; // Adjust path as per your Admin model
import { AdminRole } from '../types/model.types';
import config from '../config/config';

interface AdminUserData {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  role: AdminRole;
  status: boolean;
}

const adminUsers: AdminUserData[] = [
  {
    username: 'superadmin',
    email: 'superadmin@company.com',
    password: 'superadmin123', // Will be hashed by the model's pre-save hook
    display_name: 'Super Administrator',
    role: AdminRole.super,
    status: true
  },
  {
    username: 'admin',
    email: 'admin@company.com',
    password: 'admin123',
    display_name: 'System Administrator',
    role: AdminRole.admin,
    status: true
  },
  {
    username: 'manager',
    email: 'manager@company.com',
    password: 'manager123',
    display_name: 'Manager',
    role: AdminRole.admin,
    status: true
  }
];

export class AdminSeeder {
  static async connectDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongo_uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        maxPoolSize: 10,
        socketTimeoutMS: 45000,
        family: 4
      });
      console.log('📦 Database connected successfully');
    }
  }

  static async disconnectDatabase(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('📦 Database disconnected');
    }
  }

  static async seed(): Promise<void> {
    try {
      console.log('🌱 Starting admin seeder...');

      await this.connectDatabase();

      let createdCount = 0;
      let skippedCount = 0;

      for (const adminData of adminUsers) {
        // Check if admin already exists by email or username
        const existingAdmin = await Admin.findOne({
          $or: [
            { email: adminData.email },
            { username: adminData.username }
          ]
        });

        if (existingAdmin) {
          console.log(`⚠️ Admin already exists - Email: ${adminData.email}, Username: ${adminData.username}`);
          skippedCount++;
          continue;
        }

        // Create admin user - password will be hashed by the pre-save hook
        const adminUser = new Admin(adminData);
        await adminUser.save();

        console.log(`✅ Admin user created: ${adminData.email} (${adminData.role})`);
        createdCount++;
      }

      console.log(`🎉 Admin seeding completed! Created: ${createdCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnectDatabase();
    }
  }

  static async clear(): Promise<void> {
    try {
      console.log('🧹 Clearing admin users...');

      await this.connectDatabase();

      const result = await Admin.deleteMany({
        email: {
          $in: adminUsers.map(admin => admin.email)
        }
      });

      console.log(`✅ Removed ${result.deletedCount} admin users`);
    } catch (error) {
      console.error('❌ Clearing failed:', error);
      throw error;
    } finally {
      await this.disconnectDatabase();
    }
  }

  static async refresh(): Promise<void> {
    try {
      console.log('🔄 Refreshing admin users...');

      await this.clear();
      await this.seed();

      console.log('✅ Admin users refreshed successfully!');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      throw error;
    }
  }

  static async list(): Promise<void> {
    try {
      console.log('📋 Listing admin users...');

      await this.connectDatabase();

      const admins = await Admin.find({}, {
        username: 1,
        email: 1,
        role: 1,
        status: 1,
        display_name: 1
      }).sort({ role: 1, username: 1 });

      if (admins.length === 0) {
        console.log('📭 No admin users found');
        return;
      }

      console.log('\n📊 Current Admin Users:');
      console.log('='.repeat(80));
      admins.forEach(admin => {
        console.log(`   📧 username: ${admin.username}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🎯 Role: ${admin.role}`);
        console.log(`   📊 Status: ${admin.status ? 'Active' : 'Inactive'}`);
        console.log('-'.repeat(40));
      });
    } catch (error) {
      console.error('❌ Listing failed:', error);
      throw error;
    } finally {
      await this.disconnectDatabase();
    }
  }
}