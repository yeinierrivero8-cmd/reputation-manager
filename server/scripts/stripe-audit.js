#!/usr/bin/env node

/**
 * Stripe Audit Script
 *
 * Verifica:
 * 1. Conexión a Stripe
 * 2. Claves válidas
 * 3. Productos existentes
 * 4. Precios existentes
 * 5. Evita duplicados
 */

import 'dotenv/config';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

console.log('\n📊 STRIPE AUDIT - ReputationManager\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Validación de claves
if (!STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY no está configurada en .env');
  console.error('   Instrucciones: STRIPE-SETUP-GUIA.md\n');
  process.exit(1);
}

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error('❌ ERROR: STRIPE_PUBLISHABLE_KEY no está configurada en .env');
  console.error('   Instrucciones: STRIPE-SETUP-GUIA.md\n');
  process.exit(1);
}

// Verificar que sean claves TEST
if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY no es una clave de TEST');
  console.error('   Debes usar sk_test_*, no sk_live_*\n');
  process.exit(1);
}

if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_')) {
  console.error('❌ ERROR: STRIPE_PUBLISHABLE_KEY no es una clave de TEST');
  console.error('   Debes usar pk_test_*, no pk_live_*\n');
  process.exit(1);
}

console.log('✓ Claves de TEST detectadas');
console.log(`  Secret: ${STRIPE_SECRET_KEY.substring(0, 20)}...`);
console.log(`  Public: ${STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...\n`);

// Inicializar Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10'
});

async function auditStripe() {
  try {
    console.log('🔍 Conectando a Stripe...');

    // Verificar conexión
    const account = await stripe.accounts.retrieve();
    console.log(`✓ Conectado exitosamente`);
    console.log(`✓ Cuenta: ${account.email || 'sin email registrado'}`);
    console.log(`✓ Modo: ${account.settings?.dashboard?.display_name || 'ReputationManager'}\n`);

    // Auditar productos
    console.log('📦 AUDITORÍA DE PRODUCTOS\n');

    const products = await stripe.products.list({
      limit: 100,
      active: true
    });

    if (products.data.length === 0) {
      console.log('  ℹ️  No hay productos activos en tu cuenta');
      console.log('  ➡️  Los 3 planes serán creados nuevos\n');
    } else {
      console.log(`  Encontrados ${products.data.length} producto(s) activo(s):\n`);

      products.data.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name}`);
        console.log(`     ID: ${product.id}`);
        console.log(`     Descripción: ${product.description || 'sin descripción'}`);
        console.log(`     Creado: ${new Date(product.created * 1000).toLocaleDateString()}\n`);
      });

      // Buscar productos de ReputationManager
      const rmProducts = products.data.filter(p =>
        p.name.toLowerCase().includes('reputation') ||
        p.name.toLowerCase().includes('starter') ||
        p.name.toLowerCase().includes('professional') ||
        p.name.toLowerCase().includes('business')
      );

      if (rmProducts.length > 0) {
        console.log(`  ⚠️  ADVERTENCIA: Se encontraron ${rmProducts.length} producto(s) que podrían ser duplicados:`);
        rmProducts.forEach(p => {
          console.log(`     - ${p.name} (${p.id})`);
        });
        console.log('\n  ⚠️  ACCIÓN: Revisa estos productos antes de crear nuevos\n');
      }
    }

    // Auditar precios
    console.log('💰 AUDITORÍA DE PRECIOS\n');

    const prices = await stripe.prices.list({
      limit: 100,
      active: true
    });

    if (prices.data.length === 0) {
      console.log('  ℹ️  No hay precios activos en tu cuenta');
      console.log('  ➡️  Los 6 precios serán creados nuevos\n');
    } else {
      console.log(`  Encontrados ${prices.data.length} precio(s) activo(s):\n`);

      // Agrupar por producto
      const pricesByProduct = {};
      prices.data.forEach(price => {
        const productId = price.product;
        if (!pricesByProduct[productId]) {
          pricesByProduct[productId] = [];
        }
        pricesByProduct[productId].push(price);
      });

      Object.entries(pricesByProduct).forEach(([productId, productPrices]) => {
        console.log(`  Producto: ${productId}`);
        productPrices.forEach(price => {
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'custom';
          const interval = price.recurring?.interval || 'one-time';
          console.log(`    - $${amount} ${price.currency.toUpperCase()} (${interval})`);
        });
        console.log();
      });
    }

    // Resumen de configuración necesaria
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📋 RESUMEN DE PLANES A CREAR\n');

    const plansConfig = [
      {
        name: 'Starter',
        monthly: 1900,
        yearly: 18240,
        businesses: 1
      },
      {
        name: 'Professional',
        monthly: 3900,
        yearly: 37440,
        businesses: 3
      },
      {
        name: 'Business',
        monthly: 7900,
        yearly: 75840,
        businesses: 10
      }
    ];

    plansConfig.forEach((plan, idx) => {
      console.log(`${idx + 1}. ${plan.name}`);
      console.log(`   • Mensual: $${(plan.monthly / 100).toFixed(2)} USD`);
      console.log(`   • Anual: $${(plan.yearly / 100).toFixed(2)} USD (20% descuento)`);
      console.log(`   • Negocio máximo: ${plan.businesses}`);
      console.log();
    });

    // Próximos pasos
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅ SIGUIENTE PASO\n');
    console.log('Si todo se ve correcto arriba, ejecuta:\n');
    console.log('   node server/scripts/stripe-init-products.js\n');
    console.log('Esto creará automáticamente los 3 productos con sus 6 precios.\n');

  } catch (error) {
    console.error('\n❌ ERROR DE CONEXIÓN A STRIPE\n');

    if (error.code === 'invalid_api_key') {
      console.error('La clave de Stripe es inválida o está vencida.');
      console.error('Acción: Regenera las claves en Stripe Dashboard > Developers > API Keys\n');
    } else if (error.type === 'StripeAuthenticationError') {
      console.error('Error de autenticación con Stripe.');
      console.error('Verifica que:');
      console.error('  1. Las claves estén correctamente copiadas en .env');
      console.error('  2. Estés usando claves de TEST (sk_test_, pk_test_)');
      console.error('  3. No haya espacios extras al inicio o final\n');
    } else {
      console.error(`Tipo: ${error.type || error.code}`);
      console.error(`Mensaje: ${error.message}\n`);
    }

    process.exit(1);
  }
}

auditStripe();
