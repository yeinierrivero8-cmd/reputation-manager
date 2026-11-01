#!/usr/bin/env node

/**
 * Stripe Initialize Products Script
 *
 * Crea los 3 productos y 6 precios:
 * - ReputationManager Starter ($19/mes, $182.40/año)
 * - ReputationManager Professional ($39/mes, $374.40/año)
 * - ReputationManager Business ($79/mes, $758.40/año)
 *
 * IMPORTANTE:
 * - Solo crea en modo TEST
 * - Verifica duplicados antes de crear
 * - No modifica productos existentes
 */

import 'dotenv/config';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('❌ ERROR: Configura STRIPE_SECRET_KEY correctamente en .env');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10'
});

const PLANS = [
  {
    id: 'starter',
    name: 'ReputationManager Starter',
    description: 'Perfect para pequeños negocios. 1 negocio, funciones básicas.',
    businessLimit: 1,
    prices: {
      monthly: { amount: 1900, interval: 'month', intervalCount: 1 },
      yearly: { amount: 18240, interval: 'year', intervalCount: 1 }
    }
  },
  {
    id: 'professional',
    name: 'ReputationManager Professional',
    description: 'Para negocios en crecimiento. 3 negocios, funciones avanzadas.',
    businessLimit: 3,
    prices: {
      monthly: { amount: 3900, interval: 'month', intervalCount: 1 },
      yearly: { amount: 37440, interval: 'year', intervalCount: 1 }
    }
  },
  {
    id: 'business',
    name: 'ReputationManager Business',
    description: 'Solución empresarial. 10 negocios, estadísticas, soporte prioritario.',
    businessLimit: 10,
    prices: {
      monthly: { amount: 7900, interval: 'month', intervalCount: 1 },
      yearly: { amount: 75840, interval: 'year', intervalCount: 1 }
    }
  }
];

console.log('\n🚀 CREANDO PRODUCTOS DE STRIPE\n');
console.log('═══════════════════════════════════════════════════════════════\n');

const result = {
  timestamp: new Date().toISOString(),
  environment: 'test',
  products: [],
  warnings: []
};

async function initProducts() {
  try {
    for (const plan of PLANS) {
      console.log(`📦 Creando: ${plan.name}\n`);

      // Verificar si existe producto duplicado
      const existingProducts = await stripe.products.list({
        limit: 100,
        active: true
      });

      const duplicate = existingProducts.data.find(p =>
        p.name === plan.name
      );

      if (duplicate) {
        console.log(`  ⚠️  DUPLICADO ENCONTRADO: ${duplicate.name}`);
        console.log(`     ID: ${duplicate.id}`);
        console.log(`     ➡️  Usando producto existente...\n`);

        result.warnings.push(`Producto existente: ${plan.name} (${duplicate.id})`);
        result.products.push({
          id: duplicate.id,
          name: plan.name,
          businessLimit: plan.businessLimit,
          status: 'existing'
        });
        continue;
      }

      // Crear producto nuevo
      const product = await stripe.products.create({
        id: `plan_${plan.id}`,
        name: plan.name,
        description: plan.description,
        type: 'service',
        metadata: {
          business_limit: plan.businessLimit.toString(),
          plan_type: plan.id
        }
      });

      console.log(`  ✓ Producto creado: ${product.id}`);

      // Crear precios
      const prices = {};

      // Precio mensual
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.monthly.amount,
        currency: 'usd',
        recurring: {
          interval: plan.prices.monthly.interval,
          interval_count: plan.prices.monthly.intervalCount
        },
        metadata: {
          billing_period: 'monthly'
        }
      });

      prices.monthly = monthlyPrice.id;
      console.log(`  ✓ Precio mensual: $${(plan.prices.monthly.amount / 100).toFixed(2)} USD`);

      // Precio anual
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.yearly.amount,
        currency: 'usd',
        recurring: {
          interval: plan.prices.yearly.interval,
          interval_count: plan.prices.yearly.intervalCount
        },
        metadata: {
          billing_period: 'yearly'
        }
      });

      prices.yearly = yearlyPrice.id;
      console.log(`  ✓ Precio anual: $${(plan.prices.yearly.amount / 100).toFixed(2)} USD\n`);

      result.products.push({
        id: product.id,
        name: plan.name,
        businessLimit: plan.businessLimit,
        prices: prices,
        status: 'created'
      });
    }

    // Guardar configuración
    const configPath = path.join(__dirname, '../stripe-products-config.json');
    fs.writeFileSync(configPath, JSON.stringify(result, null, 2));

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅ PRODUCTOS CREADOS EXITOSAMENTE\n');

    result.products.forEach((product, idx) => {
      const status = product.status === 'created' ? '✓ NUEVO' : '⚠ EXISTENTE';
      console.log(`${idx + 1}. ${status} - ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Límite: ${product.businessLimit} negocio(s)`);

      if (product.prices) {
        console.log(`   Precios:`);
        console.log(`     - Mensual: ${product.prices.monthly}`);
        console.log(`     - Anual: ${product.prices.yearly}`);
      }
      console.log();
    });

    if (result.warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:\n');
      result.warnings.forEach(w => {
        console.log(`   - ${w}`);
      });
      console.log();
    }

    console.log('📄 Configuración guardada en: stripe-products-config.json\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎯 PRÓXIMOS PASOS\n');
    console.log('1. Verifica los productos en Stripe Dashboard');
    console.log('   > Products > en modo TEST\n');
    console.log('2. Confirma que ves:');
    console.log('   - ReputationManager Starter (2 precios)');
    console.log('   - ReputationManager Professional (2 precios)');
    console.log('   - ReputationManager Business (2 precios)\n');
    console.log('3. Luego continuaremos con FASE 2 (Migraciones BD)\n');

  } catch (error) {
    console.error('\n❌ ERROR CREANDO PRODUCTOS\n');
    console.error(`Tipo: ${error.type || error.code}`);
    console.error(`Mensaje: ${error.message}\n`);

    if (error.code === 'resource_already_exists') {
      console.error('Acción: El ID de producto ya existe.');
      console.error('Puedes:');
      console.error('  1. Usar IDs diferentes (cambiar plan_starter a plan_starter_v2)');
      console.error('  2. O borrar el producto en Stripe Dashboard primero\n');
    }

    process.exit(1);
  }
}

initProducts();
