import 'dotenv/config';
import bcrypt from 'bcryptjs';
import knex from 'knex';
import knexfile from './knexfile.js';

const NODE_ENV = process.env.NODE_ENV || 'production';
const db = knex(knexfile[NODE_ENV]);

async function verify() {
  try {
    const user = await db('users').where('email', 'yeinierrivero8@gmail.com').first();

    if (!user) {
      console.log('❌ User not found');
      await db.destroy();
      return;
    }

    console.log('✅ User found:', user.id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);

    const password = 'Yeinier1989';
    const match = await bcrypt.compare(password, user.passwordHash);

    console.log('\nPassword check:');
    console.log('   Password:', password);
    console.log('   Match:', match ? '✅' : '❌');

    if (!match) {
      console.log('\n🔧 Fixing password hash...');
      const newHash = await bcrypt.hash(password, 10);
      await db('users').where('id', user.id).update({ passwordHash: newHash });
      console.log('✅ Password updated');
    }

    await db.destroy();
  } catch (e) {
    console.error('Error:', e.message);
    await db.destroy();
  }
}

verify();
