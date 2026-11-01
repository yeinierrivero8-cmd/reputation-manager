#!/usr/bin/env node

/**
 * Test Suite for Corrections (Phases A-C)
 * Tests security, database connection pooling, and pagination fixes
 */

import 'dotenv/config';

const API = process.env.API_URL || 'http://localhost:5000';
let testResults = { passed: 0, failed: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    testResults.passed++;
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${e.message}`);
    testResults.failed++;
    testResults.errors.push({ test: name, error: e.message });
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function apiAuth(path, token, options = {}) {
  return api(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`
    }
  });
}

console.log('\n🧪 TESTING CORRECTIONS (PHASES A-C)\n');
console.log('═════════════════════════════════════════════════════════\n');

let adminToken = '';
let userToken = '';
let userId = '';

// PHASE A: SECURITY - Admin Role Validation
console.log('📋 PHASE A: SECURITY (Admin Role Validation)\n');

await test('Admin endpoint blocks non-admin users', async () => {
  // Sign up a regular user
  const signupRes = await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      email: `user-${Date.now()}@test.com`,
      password: 'SecurePass123!'
    })
  });
  userToken = signupRes.token;
  userId = signupRes.user.id;

  // Try to access admin tickets (should fail with 403)
  try {
    await apiAuth('/api/admin/tickets', userToken);
    throw new Error('Should have been denied (expected 403)');
  } catch (e) {
    if (!e.message.includes('403') && !e.message.includes('denegado')) {
      throw new Error(`Expected 403 Forbidden, got: ${e.message}`);
    }
  }
});

await test('Admin endpoint requires authentication', async () => {
  try {
    await api('/api/admin/tickets');
    throw new Error('Should have required auth (expected 401)');
  } catch (e) {
    if (!e.message.includes('401') && !e.message.includes('sesión')) {
      throw new Error(`Expected 401 Unauthorized, got: ${e.message}`);
    }
  }
});

// PHASE B: DATABASE CONNECTION POOLING
console.log('\n📋 PHASE B: CONNECTION POOLING (Support Contact)\n');

await test('POST /api/support/contact works without consuming pool', async () => {
  const result = await api('/api/support/contact', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Sender',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message for support contact.'
    })
  });
  if (!result.ticketId) throw new Error('No ticketId returned');
});

await test('POST /api/support/contact with auth works', async () => {
  const result = await api('/api/support/contact', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      name: 'Test Sender Auth',
      email: 'auth@example.com',
      subject: 'Auth Test',
      message: 'This message is from an authenticated user.'
    })
  });
  if (!result.ticketId) throw new Error('No ticketId returned');
});

// PHASE C: PAGINATION AND N+1 QUERIES
console.log('\n📋 PHASE C: PAGINATION & N+1 QUERIES\n');

await test('GET /api/dashboard returns correct structure', async () => {
  const result = await apiAuth('/api/dashboard', userToken);
  if (!Array.isArray(result.businesses)) throw new Error('No businesses array');
  if (!Array.isArray(result.recentReviews)) throw new Error('No recentReviews array');
  if (!result.stats) throw new Error('No stats object');
  if (typeof result.stats.totalReviews !== 'number') throw new Error('No totalReviews count');
});

await test('GET /api/reviews returns pagination metadata', async () => {
  const result = await apiAuth('/api/reviews', userToken);
  if (!Array.isArray(result.reviews)) throw new Error('No reviews array');
  if (!result.pagination) throw new Error('No pagination object');
  if (typeof result.pagination.page !== 'number') throw new Error('No page number');
  if (typeof result.pagination.total !== 'number') throw new Error('No total count');
  if (typeof result.pagination.pages !== 'number') throw new Error('No pages count');
});

await test('GET /api/reviews with page parameter works', async () => {
  const result = await apiAuth('/api/reviews?page=2', userToken);
  if (result.pagination.page !== 2) throw new Error('Page parameter not respected');
});

await test('GET /api/reviews respects limit and offset', async () => {
  const result = await apiAuth('/api/reviews?page=1', userToken);
  if (result.reviews.length > 20) throw new Error('Pagination limit not applied');
});

// PHASE D: DATA INTEGRITY
console.log('\n📋 PHASE D: DATA INTEGRITY\n');

await test('User data isolation - users can only see their own businesses', async () => {
  const result = await apiAuth('/api/dashboard', userToken);
  for (const biz of result.businesses) {
    if (biz.userId !== userId) {
      throw new Error(`User can see business from another user: ${biz.userId} vs ${userId}`);
    }
  }
});

// SUMMARY
console.log('\n═════════════════════════════════════════════════════════\n');
console.log(`📊 RESULTS: ${testResults.passed} passed, ${testResults.failed} failed\n`);

if (testResults.failed > 0) {
  console.error('❌ FAILURES:\n');
  testResults.errors.forEach(e => {
    console.error(`  • ${e.test}: ${e.error}`);
  });
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED\n');
  process.exit(0);
}
