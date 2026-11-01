import 'dotenv/config';

console.log('CONFIGURACIÓN ACTUAL DEL BACKEND:\n');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_PORT:', process.env.DB_PORT);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(no set)');
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  DB_SSL:', process.env.DB_SSL);

console.log('\nCORRECTA CONEXIÓN A PostgreSQL:');
console.log(`  postgresql://${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
