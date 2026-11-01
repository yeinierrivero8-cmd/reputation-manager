#!/usr/bin/env node
import 'dotenv/config';
import knex from 'knex';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import knexfile from './knexfile.js';

const NODE_ENV = process.env.NODE_ENV || 'production';
const db = knex(knexfile[NODE_ENV]);

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...\n');

    // 1. Check if 'role' column exists, if not add it
    const hasRoleColumn = await db.schema.hasColumn('users', 'role');
    if (!hasRoleColumn) {
      console.log('➕ Adding role column to users table...');
      await db.schema.table('users', (table) => {
        table.string('role').defaultTo('user').notNullable();
      });
      console.log('✅ Role column added\n');
    } else {
      console.log('✅ Role column already exists\n');
    }

    // 2. Check if admin already exists
    const existingAdmin = await db('users').where('email', 'yeinierrivero8@gmail.com').first();
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with ID:', existingAdmin.id);
      if (existingAdmin.role !== 'admin') {
        await db('users').where('id', existingAdmin.id).update({ role: 'admin' });
        console.log('✅ Updated role to admin\n');
      }
      await db.destroy();
      return;
    }

    // 3. Hash password
    const password = 'Yeinier1989';
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create admin user
    const userId = nanoid(14);
    await db('users').insert({
      id: userId,
      name: 'Yeinier Rivero',
      email: 'yeinierrivero8@gmail.com',
      passwordHash,
      role: 'admin',
      createdAt: new Date()
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Details:');
    console.log('   Email: yeinierrivero8@gmail.com');
    console.log('   Password: Yeinier1989');
    console.log('   Role: admin');
    console.log('   User ID:', userId);
    console.log('\n🎉 You can now login at www.yrsystem.com');

    await db.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check DATABASE credentials in .env.production');
    console.error('2. Ensure PostgreSQL connection is working');
    console.error('3. Run migrations first: npm run migrate:prod');
    await db.destroy();
    process.exit(1);
  }
}

createAdmin();
