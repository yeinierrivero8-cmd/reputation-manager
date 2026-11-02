import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import knex from 'knex';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import Stripe from 'stripe';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import logger, { sanitizeForLog } from './logger.js';
import { initializeMailer, sendAdminNotification, sendClientResponse, isMailerConfigured } from './mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// HTML sanitization function to prevent XSS

function sanitizeHTML(str) {
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return String(str || '').replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

// Utility: Generate verification token
function generateToken() {
  return crypto.randomBytes(64).toString('hex');
}

// Utility: Generate CSRF token
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Utility: Generate API key for widget
function generateAPIKey() {
  return `rm_${crypto.randomBytes(24).toString('hex')}`;
}

// Utility: Get session fingerprint (IP + User Agent)
function getSessionFingerprint(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256').update(`${ip}${ua}`).digest('hex');
}

// Utility: Validate RFC 5322 email
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 254;
}

// Utility: Log action with audit trail
async function logAudit(userId, action, entityType, entityId, changes = null, ipAddress = null) {
  try {
    await db('audit_logs').insert({
      id: nanoid(14),
      userId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress
    });
  } catch (e) {
    logger.error('Audit log error', sanitizeForLog({ error: e.message }));
  }
}

// Utility: Create refresh token
async function createRefreshToken(userId) {
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
  const tokenRecord = {
    id: nanoid(14),
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
  await db('refresh_tokens').insert(tokenRecord);
  return refreshToken;
}

// Utility: Generic login response (prevent enumeration)
function getGenericAuthError() {
  return { message: 'Correo o contraseña incorrectos.' };
}

const PORT = process.env.PORT || 5000;
// If DB_HOST is remote (Railway), assume production environment
const NODE_ENV = process.env.NODE_ENV || (process.env.DB_HOST && process.env.DB_HOST.includes('railway') ? 'production' : 'development');
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize Knex connection to PostgreSQL
const knexfile = (await import('../knexfile.js')).default;
// Debug: log environment variables
console.log('🔍 Environment:', {
  NODE_ENV,
  DB_HOST: process.env.DB_HOST,
  isRailway: process.env.DB_HOST?.includes('railway')
});
// Use production config if DB_HOST is set to Railway, otherwise use NODE_ENV
const dbConfig = process.env.DB_HOST?.includes('railway') ? knexfile.production : knexfile[NODE_ENV];
console.log('🔌 Using database config:', dbConfig?.connection?.host);
const db = knex(dbConfig);

if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    logger.error('JWT_SECRET not configured');
    process.exit(1);
  } else {
    logger.warn('JWT_SECRET not set. Using unsafe default for development only.');
  }
} else if (NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET is too weak (<32 bytes)');
  process.exit(1);
}

// Encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || scryptSync(JWT_SECRET || 'default', 'salt', 32);

function encryptSecret(secret) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted}`;
}

function decryptSecret(encryptedSecret) {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedSecret.split('.');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return null; }
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Billing plan definitions (must match Stripe products)
const BILLING_PLANS = {
  starter: {
    id: 'plan_starter',
    name: 'Starter',
    businessLimit: 1,
    prices: {
      monthly: { amount: 1900, priceId: 'price_1UROzbFqqTLELbGJPTgO531d' },
      yearly: { amount: 18240, priceId: 'price_1UROzbFqqTLELbGJnWAUYxr1' }
    }
  },
  professional: {
    id: 'plan_professional',
    name: 'Professional',
    businessLimit: 3,
    prices: {
      monthly: { amount: 3900, priceId: 'price_1UROzbFqqTLELbGJePC9K9AW' },
      yearly: { amount: 37440, priceId: 'price_1UROzbFqqTLELbGJfTZVkycJ' }
    }
  },
  business: {
    id: 'plan_business',
    name: 'Business',
    businessLimit: 10,
    prices: {
      monthly: { amount: 7900, priceId: 'price_1UROzcFqqTLELbGJdFh7sexd' },
      yearly: { amount: 75840, priceId: 'price_1UROzcFqqTLELbGJlhwT04Fh' }
    }
  }
};

const app = express();

// CORS con validación explícita de orígenes
const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS rejection', { origin, allowed: allowedOrigins });
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
};
app.use(cors(corsOptions));

// Security headers con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains' + (NODE_ENV === 'production' ? '; preload' : ''));
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'ReputationManager API', status: 'online' });
});

// CSRF Protection middleware (disabled for now - TODO: implement on frontend)
// const csrfTokens = new Map();
// app.use((req, res, next) => {
//   if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
//     const token = req.headers['x-csrf-token'] || req.body.csrfToken;
//     const sessionToken = req.cookies?.csrf_token;
//
//     if (!token || !sessionToken || token !== sessionToken) {
//       if (!req.path.startsWith('/api/public') && !req.path.startsWith('/api/webhooks')) {
//         return res.status(403).json({ message: 'CSRF token inválido.' });
//       }
//     }
//   }
//   next();
// });

// Endpoint para obtener CSRF token (GET)
app.get('/api/csrf-token', (req, res) => {
  const token = generateCSRFToken();
  res.cookie('csrf_token', token, {
    httpOnly: false,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });
  res.json({ token });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOGIN || '5'),
  message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: false
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_SIGNUP || '3'),
  message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: false
});

const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_REVIEWS || '3'),
  message: 'Demasiadas reseñas. Espera antes de enviar otra.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: false
});

const publicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PUBLIC || '100'),
  message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: false
});

// Initialize Nodemailer
initializeMailer();

// Helper functions for database operations
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });

async function getUserBusiness(userId, businessId) {
  return await db('businesses')
    .where({ id: businessId, userId })
    .first();
}

async function getBusinessStats(businessId) {
  const reviews = await db('reviews').where('businessId', businessId);
  const averageRating = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
    : 0;
  return { averageRating, totalReviews: reviews.length };
}
function auth(req, res, next) {
  // Try to get token from httpOnly cookie first (secure), then fallback to Authorization header
  const token = req.cookies?.rm_auth || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Inicia sesión para continuar.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: 'Tu sesión expiró. Inicia sesión de nuevo.' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
}

async function checkBusinessLimit(req, res, next) {
  try {
    const subscription = await db('subscriptions').where('userId', req.user.id).first();
    // FASE 5 FIX: Only use active subscriptions; canceled/past_due revert to starter limit
    const businessLimit = (subscription?.status === 'active')
      ? subscription.businessLimit
      : BILLING_PLANS.starter.businessLimit;

    const businessCount = await db('businesses').where('userId', req.user.id).count('* as count').first();

    if (businessCount.count >= businessLimit) {
      return res.status(403).json({
        message: `Has alcanzado el límite de ${businessLimit} negocio(s) para tu plan.`,
        currentPlan: subscription?.plan || 'starter',
        businessLimit,
        currentCount: businessCount.count
      });
    }

    next();
  } catch (e) {
    logger.error('Business limit check error', { error: e.message });
    res.status(500).json({ message: 'Error al verificar límite de negocios.' });
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ ok: true, name: 'ReputationManager API', db: 'connected' });
  } catch (e) {
    logger.error('Health check: Database connection failed', { error: e.message });
    res.status(503).json({ ok: false, name: 'ReputationManager API', db: 'disconnected' });
  }
});
app.get('/api/test', (req, res) => {
  res.json({ test: 'ok' });
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) return res.status(400).json({ message: 'Escribe tu nombre completo.' });
    if (!validateEmail(email)) return res.status(400).json({ message: 'Escribe un correo válido.' });
    if (password.length < 8) return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });

    const existing = await db('users').where('email', email).first();
    if (existing) return res.status(409).json({ message: 'Ya existe una cuenta con ese correo. Inicia sesión.' });

    const user = {
      id: nanoid(14),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: new Date().toISOString()
    };

    try {
      await db('users').insert(user);
    } catch (e) {
      console.error('❌ Insert user failed:', e.message);
      throw e;
    }

    let verificationToken;
    try {
      verificationToken = generateToken();
      await db('email_verifications').insert({
        id: nanoid(14),
        userId: user.id,
        email: user.email,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('❌ Email verification insert failed:', e.message);
      throw e;
    }

    try {
      const progressRecord = {
        id: nanoid(14),
        userId: user.id,
        step_1_configure_business: false,
        step_2_get_link: false,
        step_3_authentic_reviews: false,
        step_4_widget_install: false,
        step_5_verify_functionality: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db('onboarding_progress').insert(progressRecord).catch(() => {});
    } catch (e) {
      console.error('❌ Onboarding progress insert failed:', e.message);
    }

    try {
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/verify-email?token=${verificationToken}`;
      await mailer.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: '📧 Verifica tu correo - ReputationManager',
        html: `
          <h2>Bienvenido a ReputationManager</h2>
          <p>Verifica tu correo haciendo clic en el siguiente enlace:</p>
          <a href="${verifyUrl}">${verifyUrl}</a>
          <p style="font-size: 12px; color: #666;">Este enlace expira en 24 horas.</p>
        `
      });
    } catch (emailError) {
      console.error('❌ Email send failed:', emailError.message);
      logger.warn('Failed to send verification email', { error: emailError.message });
    }

    let token;
    try {
      token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('rm_auth', token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    } catch (e) {
      console.error('❌ Auth token creation failed:', e.message);
      throw e;
    }

    try {
      const refreshToken = await createRefreshToken(user.id);
      res.cookie('rm_refresh', refreshToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    } catch (e) {
      console.error('❌ Refresh token creation failed:', e.message);
      throw e;
    }

    res.status(201).json({ user: safeUser(user), message: 'Verifica tu correo para activar tu cuenta.' });
  } catch (e) {
    console.error('❌ Signup error:', e.message);
    console.error(e);
    logger.error('Signup error', { error: e.message, stack: e.stack });
    res.status(500).json({ message: 'No se pudo crear la cuenta. Inténtalo de nuevo.' });
  }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const code = String(req.body.code || ''); // Optional 2FA code

    const user = await db('users').where('email', email).first();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // Generic error to prevent user enumeration
      return res.status(401).json(getGenericAuthError());
    }

    const totpSecret = await db('totp_secrets').where('userId', user.id).first();
    if (totpSecret && !code) {
      return res.status(403).json({ message: 'Se requiere código de autenticación.', requires2FA: true });
    }

    if (totpSecret && code) {
      const verified = speakeasy.totp.verify({
        secret: decryptSecret(totpSecret.secret),
        encoding: 'base32',
        token: code,
        window: 2
      });
      if (!verified) {
        return res.status(401).json({ message: 'Código de autenticación inválido.' });
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('rm_auth', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const refreshToken = await createRefreshToken(user.id);
    res.cookie('rm_refresh', refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ user: safeUser(user) });
  } catch (e) {
    logger.error('Login error', { error: e.message, stack: e.stack });
    res.status(500).json({ message: 'No se pudo iniciar sesión.', debug: e.message });
  }
});

// DEBUG endpoints
app.get('/api/debug/config', (req, res) => {
  res.json({
    NODE_ENV,
    DB_HOST: process.env.DB_HOST,
    isRailway: process.env.DB_HOST?.includes('railway'),
    dbConfigHost: dbConfig?.connection?.host,
    dbConfigPort: dbConfig?.connection?.port
  });
});

app.get('/api/debug/user/:email', async (req, res) => {
  try {
    const user = await db('users').where('email', req.params.email).first();
    res.json({ exists: !!user, user: user ? { id: user.id, email: user.email, role: user.role, hasPasswordHash: !!user.passwordHash } : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await db('users').where('id', req.user.id).first();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({ user: safeUser(user) });
  } catch (e) {
    logger.error('Get user error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener usuario.' });
  }
});

app.patch('/api/auth/update-profile', auth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2) return res.status(400).json({ message: 'El nombre debe tener al menos 2 caracteres.' });
    if (name.length > 100) return res.status(400).json({ message: 'El nombre no puede superar 100 caracteres.' });

    await db('users').where('id', req.user.id).update({ name });
    const user = await db('users').where('id', req.user.id).first();
    res.json({ user: safeUser(user) });
  } catch (e) {
    logger.error('Update profile error', { error: e.message });
    res.status(500).json({ message: 'Error al actualizar perfil.' });
  }
});

app.get('/api/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/auth/google/callback`;

  if (!clientId) {
    return res.send(`<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>OAuth no configurado</title><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }.container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }h1 { color: #333; margin: 0 0 16px 0; font-size: 24px; }p { color: #666; margin: 0 0 24px 0; line-height: 1.6; }.alert { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-bottom: 24px; color: #856404; font-size: 14px; }button { background: #0066cc; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; }button:hover { background: #0052a3; }</style></head><body><div class="container"><h1>⚙️ Configuración pendiente</h1><p>OAuth con Google aún no está configurado en el servidor.</p><div class="alert">El administrador debe configurar las credenciales de Google Cloud en las variables de entorno.</div><button onclick="window.history.back()">Volver atrás</button></div></body></html>`);
  }

  const scope = encodeURIComponent('openid profile email');
  const state = generateToken();
  res.cookie('oauth_state', state, { maxAge: 600000, httpOnly: true });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
  res.redirect(authUrl);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies.oauth_state;

  if (state !== storedState) {
    return res.redirect('/auth?error=invalid_state');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/auth?error=not_configured');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.FRONTEND_URL || 'http://localhost:5175'}/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    const userInfo = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    }).then(r => r.json());

    let user = await db('users').where('email', userInfo.email).first();
    if (!user) {
      user = {
        id: nanoid(14),
        name: userInfo.name,
        email: userInfo.email,
        passwordHash: '',
        googleId: userInfo.sub,
        createdAt: new Date().toISOString()
      };
      await db('users').insert(user);
    } else if (!user.googleId) {
      await db('users').where('id', user.id).update({ googleId: userInfo.sub });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('rm_auth', token, { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect(`/?token=${token}`);
  } catch (e) {
    logger.error('Google OAuth error', { error: e.message });
    res.redirect('/auth?error=oauth_failed');
  }
});

app.get('/api/auth/apple', (req, res) => {
  res.send(`<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Próximamente</title><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }.container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }h1 { color: #333; margin: 0 0 16px 0; font-size: 24px; }p { color: #666; margin: 0 0 24px 0; line-height: 1.6; }.info { background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 12px; margin-bottom: 24px; color: #1565c0; font-size: 14px; }button { background: #0066cc; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; }button:hover { background: #0052a3; }</style></head><body><div class="container"><h1>🍎 Próximamente</h1><p>La autenticación con Apple estará disponible en futuras versiones.</p><div class="info">Por ahora, puedes usar la autenticación tradicional o Google OAuth.</div><button onclick="window.history.back()">Volver atrás</button></div></body></html>`);
});
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const businesses = await db('businesses')
      .where('userId', req.user.id)
      .orderBy('createdAt', 'desc');

    const businessIds = businesses.map(b => b.id);

    const reviews = businessIds.length > 0
      ? await db('reviews')
          .whereIn('businessId', businessIds)
          .orderBy('createdAt', 'desc')
      : [];

    const businessMap = new Map(businesses.map(b => [b.id, b]));

    const businessesWithStats = businesses.map(b => {
      const bizReviews = reviews.filter(r => r.businessId === b.id);
      const averageRating = bizReviews.length
        ? Math.round(bizReviews.reduce((s, r) => s + r.rating, 0) / bizReviews.length * 10) / 10
        : 0;
      return { ...b, averageRating, totalReviews: bizReviews.length };
    });

    const recentReviews = reviews
      .slice(0, 8)
      .map(r => ({
        ...r,
        businessName: businessMap.get(r.businessId)?.name || 'Negocio'
      }));

    const totalReviews = reviews.length;
    const averageRating = reviews.length
      ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
      : 0;
    const fiveStars = reviews.filter(r => r.rating === 5).length;

    res.json({
      businesses: businessesWithStats,
      recentReviews,
      stats: {
        businesses: businesses.length,
        totalReviews,
        averageRating,
        fiveStars
      }
    });
  } catch (e) {
    logger.error('Dashboard error', { error: e.message });
    res.status(500).json({ message: 'Error al cargar dashboard.' });
  }
});
app.post('/api/businesses', auth, checkBusinessLimit, async (req, res) => {
  try {
    const name = sanitizeHTML(String(req.body.name || '').trim());
    const type = sanitizeHTML(String(req.body.type || 'Otro').trim());
    const description = sanitizeHTML(String(req.body.description || '').trim());

    if (name.length < 2) return res.status(400).json({ message: 'El nombre del negocio debe tener al menos 2 caracteres.' });

    const business = {
      id: nanoid(14),
      userId: req.user.id,
      name: name.slice(0, 100),
      type: type.slice(0, 50),
      description: description.slice(0, 1000),
      shareLink: nanoid(10),
      createdAt: new Date().toISOString()
    };

    await db('businesses').insert(business);
    await logAudit(req.user.id, 'created', 'business', business.id, { name: business.name, type: business.type }, req.ip);

    res.status(201).json({ business: { ...business, averageRating: 0, totalReviews: 0 } });
  } catch (e) {
    logger.error('Create business error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'No se pudo crear el negocio.' });
  }
});
app.put('/api/businesses/:id', auth, async (req, res) => {
  try {
    const b = await getUserBusiness(req.user.id, req.params.id);
    if (!b) return res.status(404).json({ message: 'Negocio no encontrado.' });

    const updates = {};
    const changes = {};

    if (req.body.name) {
      const newName = sanitizeHTML(String(req.body.name).trim()).slice(0, 100);
      if (newName !== b.name) {
        updates.name = newName;
        changes.name = { old: b.name, new: newName };
      }
    }
    if (req.body.type) {
      const newType = sanitizeHTML(String(req.body.type).trim()).slice(0, 50);
      if (newType !== b.type) {
        updates.type = newType;
        changes.type = { old: b.type, new: newType };
      }
    }
    if (typeof req.body.description === 'string') {
      const newDesc = sanitizeHTML(req.body.description.trim()).slice(0, 1000);
      if (newDesc !== b.description) {
        updates.description = newDesc;
        changes.description = { old: b.description, new: newDesc };
      }
    }

    if (Object.keys(updates).length > 0) {
      await db('businesses').where('id', req.params.id).update(updates);
      await logAudit(req.user.id, 'updated', 'business', req.params.id, changes, req.ip);
    }

    const updated = await getUserBusiness(req.user.id, req.params.id);
    res.json({ business: updated });
  } catch (e) {
    logger.error('Update business error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'No se pudo actualizar el negocio.' });
  }
});
app.delete('/api/businesses/:id', auth, async (req, res) => {
  try {
    const b = await getUserBusiness(req.user.id, req.params.id);
    if (!b) return res.status(404).json({ message: 'Negocio no encontrado.' });

    // Delete business (reviews cascade delete automatically via FK)
    await db('businesses').where('id', req.params.id).del();
    await logAudit(req.user.id, 'deleted', 'business', req.params.id, { name: b.name }, req.ip);

    res.json({ ok: true });
  } catch (e) {
    logger.error('Delete business error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'No se pudo eliminar el negocio.' });
  }
});
app.get('/api/reviews', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const rating = req.query.rating ? parseInt(req.query.rating) : null;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const businesses = await db('businesses').where('userId', req.user.id);
    const businessIds = businesses.map(b => b.id);
    const businessMap = new Map(businesses.map(b => [b.id, b]));

    let countQuery = db('reviews');
    let dataQuery = db('reviews');

    if (businessIds.length > 0) {
      countQuery = countQuery.whereIn('businessId', businessIds);
      dataQuery = dataQuery.whereIn('businessId', businessIds);
    } else {
      countQuery = countQuery.whereIn('businessId', [null]);
      dataQuery = dataQuery.whereIn('businessId', [null]);
    }

    // Apply filters
    if (rating && rating >= 1 && rating <= 5) {
      countQuery = countQuery.where('rating', rating);
      dataQuery = dataQuery.where('rating', rating);
    }
    if (startDate && !isNaN(startDate)) {
      countQuery = countQuery.where('createdAt', '>=', startDate.toISOString());
      dataQuery = dataQuery.where('createdAt', '>=', startDate.toISOString());
    }
    if (endDate && !isNaN(endDate)) {
      countQuery = countQuery.where('createdAt', '<=', endDate.toISOString());
      dataQuery = dataQuery.where('createdAt', '<=', endDate.toISOString());
    }

    const [reviews, countResult] = await Promise.all([
      dataQuery.orderBy('createdAt', 'desc').limit(limit).offset(offset),
      countQuery.count('* as total').first()
    ]);

    const total = countResult?.total || 0;

    const reviewsWithNames = reviews.map(r => ({
      ...r,
      businessName: businessMap.get(r.businessId)?.name || 'Negocio'
    }));

    res.json({
      reviews: reviewsWithNames,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    logger.error('Get reviews error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error al obtener reseñas.' });
  }
});
app.get('/api/public/business/:shareLink', publicLimiter, async (req, res) => {
  try {
    const b = await db('businesses').where('shareLink', req.params.shareLink).first();
    if (!b) return res.status(404).json({ message: 'No encontramos este negocio. Pide al establecimiento un enlace actualizado.' });

    const reviews = await db('reviews')
      .where('businessId', b.id)
      .orderBy('createdAt', 'desc');

    const averageRating = reviews.length
      ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
      : 0;

    res.json({
      business: {
        name: b.name,
        type: b.type,
        description: b.description,
        shareLink: b.shareLink,
        averageRating,
        totalReviews: reviews.length
      },
      reviews: reviews.slice(0, 5).map(r => ({
        author: r.author,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt
      }))
    });
  } catch (e) {
    logger.error('Get public business error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener negocio.' });
  }
});
app.post('/api/public/business/:shareLink/reviews', reviewLimiter, async (req, res) => {
  try {
    // Require API key authentication
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ message: 'API key requerida.' });

    const keyRecord = await db('api_keys').where('key', apiKey).where('active', true).first();
    if (!keyRecord) return res.status(401).json({ message: 'API key inválida.' });

    // Verify business belongs to the API key owner
    const b = await db('businesses').where('shareLink', req.params.shareLink).where('userId', keyRecord.userId).first();
    if (!b) return res.status(404).json({ message: 'Este enlace de reseñas no es válido.' });

    const author = String(req.body.author || '').trim();
    const text = String(req.body.text || '').trim();
    const rating = Number(req.body.rating);

    if (author.length < 2 || author.length > 100) return res.status(400).json({ message: 'Nombre debe tener 2-100 caracteres.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Selecciona una calificación de 1 a 5 estrellas.' });
    if (text.length < 5 || text.length > 1500) return res.status(400).json({ message: 'La reseña debe tener 5-1500 caracteres.' });

    const review = {
      id: nanoid(14),
      businessId: b.id,
      author: author.slice(0, 100),
      rating,
      text,
      platform: 'ReputationManager',
      createdAt: new Date().toISOString()
    };

    await db('reviews').insert(review);
    await db('api_keys').where('id', keyRecord.id).update({ lastUsed: new Date() });
    await logAudit(keyRecord.userId, 'created', 'review', review.id, { rating, author }, req.ip);

    res.status(201).json({ message: '¡Gracias por compartir tu experiencia!', review });
  } catch (e) {
    logger.error('Create review error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'No se pudo crear la reseña.' });
  }
});
app.post('/api/support/contact', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        // Token invalid or expired, allow anonymous ticket submission
      }
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    if (name.length < 2 || email.length < 5 || subject.length < 5 || message.length < 10) {
      return res.status(400).json({ message: 'Los campos no cumplen los requisitos mínimos.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Correo electrónico inválido.' });
    }

    const ticketId = nanoid(12);
    const id = nanoid();

    await db('support_tickets').insert({
      id,
      ticket_id: ticketId,
      user_id: userId,
      name,
      email,
      subject,
      message,
      status: 'new',
      email_sent: false,
      created_at: new Date()
    });

    logger.info('Support ticket created', { ticketId, userId, email: email.split('@')[0], subject });

    const ticketData = {
      ticket_id: ticketId,
      name,
      email,
      subject,
      message,
      created_at: new Date()
    };

    const adminNotificationSent = await sendAdminNotification(ticketData);

    res.status(201).json({
      ticketId,
      message: 'Tu solicitud ha sido registrada exitosamente.',
      emailNotification: adminNotificationSent ? 'sent' : 'not_configured'
    });
  } catch (e) {
    logger.error('Support contact error', { error: e.message });
    res.status(500).json({ message: 'Error al procesar tu solicitud.' });
  }
});

// Onboarding / User Guide endpoints
app.get('/api/onboarding/progress', auth, async (req, res) => {
  try {
    let progress = await db('onboarding_progress').where('userId', req.user.id).first();

    if (!progress) {
      progress = {
        id: nanoid(14),
        userId: req.user.id,
        step_1_configure_business: false,
        step_2_get_link: false,
        step_3_authentic_reviews: false,
        step_4_widget_install: false,
        step_5_verify_functionality: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db('onboarding_progress').insert(progress);
    }

    const completedSteps = [
      progress.step_1_configure_business,
      progress.step_2_get_link,
      progress.step_3_authentic_reviews,
      progress.step_4_widget_install,
      progress.step_5_verify_functionality
    ].filter(Boolean).length;

    res.json({
      progress: {
        step1: progress.step_1_configure_business,
        step2: progress.step_2_get_link,
        step3: progress.step_3_authentic_reviews,
        step4: progress.step_4_widget_install,
        step5: progress.step_5_verify_functionality
      },
      completedSteps,
      totalSteps: 5
    });
  } catch (e) {
    logger.error('Get onboarding progress error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener progreso.' });
  }
});

app.patch('/api/onboarding/progress/:step', auth, async (req, res) => {
  try {
    const step = req.params.step;
    const value = Boolean(req.body.completed);

    const validSteps = ['step1', 'step2', 'step3', 'step4', 'step5'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({ message: 'Paso inválido.' });
    }

    const stepMap = {
      step1: 'step_1_configure_business',
      step2: 'step_2_get_link',
      step3: 'step_3_authentic_reviews',
      step4: 'step_4_widget_install',
      step5: 'step_5_verify_functionality'
    };

    const dbStep = stepMap[step];

    let progress = await db('onboarding_progress').where('userId', req.user.id).first();
    if (!progress) {
      progress = {
        id: nanoid(14),
        userId: req.user.id,
        step_1_configure_business: false,
        step_2_get_link: false,
        step_3_authentic_reviews: false,
        step_4_widget_install: false,
        step_5_verify_functionality: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db('onboarding_progress').insert(progress);
    }

    await db('onboarding_progress')
      .where('userId', req.user.id)
      .update({
        [dbStep]: value,
        updatedAt: new Date().toISOString()
      });

    const updated = await db('onboarding_progress').where('userId', req.user.id).first();

    const completedSteps = [
      updated.step_1_configure_business,
      updated.step_2_get_link,
      updated.step_3_authentic_reviews,
      updated.step_4_widget_install,
      updated.step_5_verify_functionality
    ].filter(Boolean).length;

    res.json({
      progress: {
        step1: updated.step_1_configure_business,
        step2: updated.step_2_get_link,
        step3: updated.step_3_authentic_reviews,
        step4: updated.step_4_widget_install,
        step5: updated.step_5_verify_functionality
      },
      completedSteps,
      totalSteps: 5
    });
  } catch (e) {
    logger.error('Update onboarding progress error', { error: e.message });
    res.status(500).json({ message: 'Error al actualizar progreso.' });
  }
});

// ============================================================================
// ADMIN SUPPORT TICKETS ENDPOINTS (FASE 2A)
// ============================================================================

app.get('/api/admin/tickets', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get tickets with pagination
    const tickets = await db('support_tickets')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count
    const { count } = await db('support_tickets').count('* as count').first();

    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (e) {
    logger.error('Get admin tickets error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener tickets.' });
  }
});

app.get('/api/admin/tickets/:ticketId', auth, adminOnly, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Get ticket
    const ticket = await db('support_tickets').where('ticket_id', ticketId).first();
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado.' });
    }

    // Get responses
    const responses = await db('support_responses')
      .where('ticket_id', ticketId)
      .orderBy('created_at', 'asc')
      .select('*');

    res.json({
      ticket,
      responses
    });
  } catch (e) {
    logger.error('Get admin ticket detail error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener detalles del ticket.' });
  }
});

app.post('/api/admin/tickets/:ticketId/response', auth, adminOnly, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { response_text } = req.body;

    // Validate input
    if (!response_text || response_text.trim().length === 0) {
      return res.status(400).json({ message: 'El mensaje de respuesta es obligatorio.' });
    }

    if (response_text.trim().length < 10) {
      return res.status(400).json({ message: 'La respuesta debe tener al menos 10 caracteres.' });
    }

    // Verify ticket exists
    const ticket = await db('support_tickets').where('ticket_id', ticketId).first();
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado.' });
    }

    const responseId = nanoid();

    // Save response in support_responses
    await db('support_responses').insert({
      id: responseId,
      ticket_id: ticketId,
      admin_id: req.user.id,
      response_text: response_text.trim(),
      email_sent: false,
      created_at: new Date()
    });

    // Update ticket status to responded
    await db('support_tickets').where('ticket_id', ticketId).update({
      response_status: 'responded',
      replied_at: new Date()
    });

    logger.info('Support response created', { ticketId, adminId: req.user.id });

    // Send client response email
    const response = { response_text };
    const clientEmailSent = await sendClientResponse(ticket, response, ticket.email);

    res.status(201).json({
      id: responseId,
      message: 'Respuesta guardada exitosamente.',
      emailSent: clientEmailSent
    });
  } catch (e) {
    logger.error('Create support response error', { error: e.message });
    res.status(500).json({ message: 'Error al guardar la respuesta.' });
  }
});

app.patch('/api/admin/tickets/:ticketId/status', auth, adminOnly, async (req, res) => {
  try {
    // FASE 5 FIX: Use adminOnly middleware instead of inline validation

    const { ticketId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'responded', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Estado inválido. Válidos: ${validStatuses.join(', ')}` });
    }

    // Verify ticket exists
    const ticket = await db('support_tickets').where('ticket_id', ticketId).first();
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado.' });
    }

    // Update status
    await db('support_tickets').where('ticket_id', ticketId).update({
      response_status: status
    });

    logger.info('Support ticket status updated', { ticketId, status, adminId: req.user.id });

    res.json({
      message: 'Estado actualizado exitosamente.',
      ticket_id: ticketId,
      new_status: status
    });
  } catch (e) {
    logger.error('Update support ticket status error', { error: e.message });
    res.status(500).json({ message: 'Error al actualizar el estado.' });
  }
});

// ============================================================================
// BILLING ENDPOINTS (FASE 3)
// ============================================================================

app.get('/api/billing/plans', async (req, res) => {
  try {
    const plans = Object.entries(BILLING_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      businessLimit: plan.businessLimit,
      pricing: {
        monthly: {
          amount: plan.prices.monthly.amount,
          currency: 'usd'
        },
        yearly: {
          amount: plan.prices.yearly.amount,
          currency: 'usd'
        }
      }
    }));

    res.json({ plans });
  } catch (e) {
    logger.error('Get plans error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener planes.' });
  }
});

app.post('/api/billing/checkout', auth, async (req, res) => {
  try {
    const { plan, billingPeriod } = req.body;

    if (!plan || !['starter', 'professional', 'business'].includes(plan)) {
      return res.status(400).json({ message: 'Plan inválido.' });
    }
    if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
      return res.status(400).json({ message: 'Período de facturación inválido.' });
    }

    const planConfig = BILLING_PLANS[plan];
    const priceId = planConfig.prices[billingPeriod].priceId;

    let customer = await db('users').where('id', req.user.id).select('stripeCustomerId').first();

    let stripeCustomerId = customer?.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.id }
      });
      stripeCustomerId = stripeCustomer.id;
      await db('users').where('id', req.user.id).update({ stripeCustomerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:5175'}/billing?success=true`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:5175'}/billing?cancel=true`,
      metadata: {
        userId: req.user.id,
        plan,
        billingPeriod
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (e) {
    logger.error('Checkout error', { error: e.message });
    res.status(500).json({ message: 'Error al crear sesión de checkout.' });
  }
});

app.get('/api/billing/subscription', auth, async (req, res) => {
  try {
    const subscription = await db('subscriptions').where('userId', req.user.id).first();

    if (!subscription) {
      return res.json({
        subscribed: false,
        plan: 'starter',
        businessLimit: 1
      });
    }

    res.json({
      subscribed: subscription.status === 'active',
      plan: subscription.plan,
      status: subscription.status,
      billingPeriod: subscription.billingPeriod,
      businessLimit: subscription.businessLimit,
      amount: subscription.amount,
      currency: subscription.currency,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      canceledAt: subscription.canceledAt,
      stripeSubscriptionId: subscription.stripeSubscriptionId
    });
  } catch (e) {
    logger.error('Get subscription error', { error: e.message });
    res.status(500).json({ message: 'Error al obtener suscripción.' });
  }
});

app.post('/api/billing/cancel-subscription', auth, async (req, res) => {
  try {
    const subscription = await db('subscriptions').where('userId', req.user.id).first();

    if (!subscription) {
      return res.status(404).json({ message: 'No tienes una suscripción activa.' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ message: 'Suscripción no vinculada a Stripe.' });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // FASE 5 FIX: Reset businessLimit to 1 (Starter) when canceling
    await db('subscriptions').where('userId', req.user.id).update({
      status: 'canceled',
      canceledAt: new Date(),
      businessLimit: BILLING_PLANS.starter.businessLimit
    });

    await db('subscription_history').insert({
      id: nanoid(),
      userId: req.user.id,
      subscriptionId: subscription.id,
      eventType: 'canceled',
      details: JSON.stringify({ canceledAt: new Date() }),
      createdAt: new Date()
    });

    res.json({
      message: 'Suscripción cancelada. Se seguirá facturando hasta el final del período.',
      status: 'canceled'
    });
  } catch (e) {
    logger.error('Cancel subscription error', { error: e.message });
    res.status(500).json({ message: 'Error al cancelar suscripción.' });
  }
});

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // FASE 5 FIX: Deduplication - check if webhook was already processed
    const existingEvent = await db('webhook_events')
      .where('stripeEventId', event.id)
      .first();

    if (existingEvent) {
      logger.info('Webhook duplicate detected (idempotent)', {
        stripeEventId: event.id,
        eventType: event.type,
        originalProcessedAt: existingEvent.processedAt
      });

      // Record the retry attempt
      await db('webhook_events')
        .where('stripeEventId', event.id)
        .update({
          details: JSON.stringify({
            ...JSON.parse(existingEvent.details || '{}'),
            retryReceived: new Date()
          })
        });

      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const stripeSubscription = event.data.object;
      const userId = stripeSubscription.metadata?.userId;

      // FASE 5 FIX: Proper error handling - return 400 instead of silent success
      if (!userId) {
        logger.error('Webhook error: No userId in metadata', { subscriptionId: stripeSubscription.id });

        await db('webhook_events').insert({
          id: nanoid(),
          stripeEventId: event.id,
          eventType: event.type,
          status: 'failed',
          userId: null,
          details: JSON.stringify({ error: 'Missing userId in metadata' }),
          errorMessage: 'No userId found in subscription metadata',
          processedAt: new Date(),
          createdAt: new Date()
        });

        return res.status(400).json({ error: 'Missing userId in metadata' });
      }

      const user = await db('users').where('id', userId).first();
      if (!user) {
        logger.error('Webhook error: User not found', { userId, stripeSubscriptionId: stripeSubscription.id });

        await db('webhook_events').insert({
          id: nanoid(),
          stripeEventId: event.id,
          eventType: event.type,
          status: 'failed',
          userId,
          details: JSON.stringify({ userId }),
          errorMessage: `User not found: ${userId}`,
          processedAt: new Date(),
          createdAt: new Date()
        });

        return res.status(400).json({ error: 'User not found' });
      }

      const planKey = Object.keys(BILLING_PLANS).find(key =>
        stripeSubscription.items.data[0].price.id === BILLING_PLANS[key].prices.monthly.priceId ||
        stripeSubscription.items.data[0].price.id === BILLING_PLANS[key].prices.yearly.priceId
      );

      // FASE 5 FIX: Return error for unknown price instead of silent success
      if (!planKey) {
        logger.error('Webhook error: Unknown price ID', {
          priceId: stripeSubscription.items.data[0].price.id,
          userId,
          stripeSubscriptionId: stripeSubscription.id
        });

        await db('webhook_events').insert({
          id: nanoid(),
          stripeEventId: event.id,
          eventType: event.type,
          status: 'failed',
          userId,
          details: JSON.stringify({ priceId: stripeSubscription.items.data[0].price.id }),
          errorMessage: `Unknown price ID: ${stripeSubscription.items.data[0].price.id}`,
          processedAt: new Date(),
          createdAt: new Date()
        });

        return res.status(400).json({ error: 'Unknown price ID' });
      }

      const planConfig = BILLING_PLANS[planKey];

      // SECURITY FIX: Validate that the amount matches the plan price
      const stripePrice = stripeSubscription.items.data[0].price;
      const isMonthly = stripePrice.id === planConfig.prices.monthly.priceId;
      const expectedAmount = isMonthly ? planConfig.prices.monthly.amount : planConfig.prices.yearly.amount;
      const actualAmount = stripePrice.unit_amount || 0;

      if (actualAmount !== expectedAmount) {
        logger.error('Webhook error: Price amount mismatch (potential fraud)', {
          planKey,
          expectedAmount,
          actualAmount,
          priceId: stripePrice.id,
          userId,
          stripeSubscriptionId: stripeSubscription.id
        });

        await db('webhook_events').insert({
          id: nanoid(),
          stripeEventId: event.id,
          eventType: event.type,
          status: 'failed',
          userId,
          details: JSON.stringify({ expectedAmount, actualAmount, priceId: stripePrice.id }),
          errorMessage: `Price amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
          processedAt: new Date(),
          createdAt: new Date()
        });

        return res.status(400).json({ error: 'Price amount mismatch' });
      }
      const existingSubscription = await db('subscriptions').where('userId', userId).first();

      // FASE 5 FIX: Validate downgrades to check for exceeding businesses
      if (existingSubscription) {
        const previousLimit = existingSubscription.businessLimit;
        const newLimit = planConfig.businessLimit;

        if (newLimit < previousLimit) {
          // Downgrade detected
          const businessCount = await db('businesses')
            .where('userId', userId)
            .count('* as count')
            .first();

          if (businessCount.count > newLimit) {
            logger.warn('Webhook: Downgrade with exceeding businesses', {
              userId,
              previousLimit,
              newLimit,
              currentBusinesses: businessCount.count,
              stripeSubscriptionId: stripeSubscription.id
            });

            // Record warning in subscription_history
            await db('subscription_history').insert({
              id: nanoid(),
              userId,
              subscriptionId: existingSubscription.id,
              eventType: 'plan_changed',
              previousPlan: existingSubscription.plan,
              newPlan: planKey,
              details: JSON.stringify({
                downgradeWarning: true,
                businessesOverLimit: businessCount.count - newLimit,
                currentBusinesses: businessCount.count,
                newLimit
              }),
              stripeEventId: event.id,
              createdAt: new Date()
            });
          }
        }
      }

      if (existingSubscription) {
        await db('subscriptions').where('userId', userId).update({
          plan: planKey,
          status: stripeSubscription.status,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0].price.id,
          businessLimit: planConfig.businessLimit,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          updatedAt: new Date()
        });

        await db('subscription_history').insert({
          id: nanoid(),
          userId,
          subscriptionId: existingSubscription.id,
          eventType: event.type === 'customer.subscription.created' ? 'created' : 'updated',
          newPlan: planKey,
          details: JSON.stringify({ stripeEvent: event.type }),
          stripeEventId: event.id,
          createdAt: new Date()
        });
      } else {
        const subscriptionId = nanoid();
        await db('subscriptions').insert({
          id: subscriptionId,
          userId,
          plan: planKey,
          status: stripeSubscription.status,
          billingPeriod: stripeSubscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          stripeCustomerId: stripeSubscription.customer,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0].price.id,
          businessLimit: planConfig.businessLimit,
          amount: (stripeSubscription.items.data[0].price.unit_amount || 0) / 100,
          currency: stripeSubscription.currency || 'usd',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await db('subscription_history').insert({
          id: nanoid(),
          userId,
          subscriptionId,
          eventType: 'created',
          newPlan: planKey,
          details: JSON.stringify({ stripeEvent: event.type }),
          stripeEventId: event.id,
          createdAt: new Date()
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const stripeSubscription = event.data.object;
      const userId = stripeSubscription.metadata?.userId;

      if (userId) {
        const subscription = await db('subscriptions').where('userId', userId).first();
        if (subscription) {
          await db('subscriptions').where('userId', userId).update({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date()
          });

          await db('subscription_history').insert({
            id: nanoid(),
            userId,
            subscriptionId: subscription.id,
            eventType: 'canceled',
            details: JSON.stringify({ stripeEvent: event.type }),
            stripeEventId: event.id,
            createdAt: new Date()
          });
        }
      }
    }

    // FASE 5 FIX: Record successful webhook processing
    let userId = null;
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      userId = event.data.object?.metadata?.userId;
    }

    await db('webhook_events').insert({
      id: nanoid(),
      stripeEventId: event.id,
      eventType: event.type,
      status: 'processed',
      userId: userId || null,
      details: JSON.stringify({ processed: true }),
      processedAt: new Date(),
      createdAt: new Date()
    });

    res.json({ received: true });
  } catch (e) {
    logger.error('Webhook error', { error: e.message, stripeEventId: e.message.includes('stripeEventId') ? null : 'unknown' });

    // Try to record failed webhook event
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      );

      await db('webhook_events').insert({
        id: nanoid(),
        stripeEventId: event.id,
        eventType: event.type,
        status: 'failed',
        userId: null,
        details: JSON.stringify({ error: e.message }),
        errorMessage: e.message,
        processedAt: new Date(),
        createdAt: new Date()
      });
    } catch (_err) {
      // Could not record event, just log
      logger.error('Failed to record webhook error in DB', { error: e.message });
    }

    res.status(400).json({ message: 'Webhook error' });
  }
});

// API Key Management (Widget Authentication)
app.post('/api/api-keys', auth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().substring(0, 100);
    if (!name) return res.status(400).json({ message: 'Nombre requerido.' });

    const apiKey = generateAPIKey();
    await db('api_keys').insert({
      id: nanoid(14),
      userId: req.user.id,
      key: apiKey,
      name
    });

    res.status(201).json({ apiKey, message: 'API key creada. Guárdala en un lugar seguro.' });
  } catch (e) {
    logger.error('API key creation error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error creando API key.' });
  }
});

app.get('/api/api-keys', auth, async (req, res) => {
  try {
    const keys = await db('api_keys').where('userId', req.user.id).select('id', 'name', 'active', 'lastUsed', 'createdAt');
    res.json({ keys });
  } catch (e) {
    logger.error('API keys fetch error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error obteniendo API keys.' });
  }
});

app.delete('/api/api-keys/:id', auth, async (req, res) => {
  try {
    const key = await db('api_keys').where('id', req.params.id).where('userId', req.user.id).first();
    if (!key) return res.status(404).json({ message: 'API key no encontrada.' });

    await db('api_keys').where('id', req.params.id).del();
    await logAudit(req.user.id, 'deleted', 'api_key', req.params.id, { name: key.name }, req.ip);

    res.json({ message: 'API key eliminada.' });
  } catch (e) {
    logger.error('API key deletion error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error eliminando API key.' });
  }
});

// ==================== NEW ENDPOINTS ====================

// Email verification
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!token) return res.status(400).json({ message: 'Token inválido.' });

    const verification = await db('email_verifications').where('token', token).first();
    if (!verification) return res.status(400).json({ message: 'Token expirado o inválido.' });
    if (verification.verified) return res.status(400).json({ message: 'Email ya verificado.' });
    if (new Date() > new Date(verification.expiresAt)) return res.status(400).json({ message: 'Token expirado.' });

    await db('email_verifications').where('id', verification.id).update({ verified: true });
    await db('users').where('id', verification.userId).update({ emailVerified: true });

    res.json({ message: 'Email verificado. ¡Bienvenido!' });
  } catch (e) {
    logger.error('Email verification error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error verificando email.' });
  }
});

// Request password reset
app.post('/api/auth/request-password-reset', loginLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!validateEmail(email)) return res.status(400).json({ message: 'Correo inválido.' });

    const user = await db('users').where('email', email).first();
    // Generic response to prevent user enumeration
    if (!user) return res.json({ message: 'Si el correo existe, recibirás un email con instrucciones.' });

    const resetToken = generateToken();
    await db('password_reset_tokens').insert({
      id: nanoid(14),
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/reset-password?token=${resetToken}`;
    await sendClientResponse(email, 'Recuperar contraseña', `Haz clic aquí para recuperar tu contraseña:\n${resetUrl}\n\nEste enlace expira en 1 hora.`);

    res.json({ message: 'Si el correo existe, recibirás un email con instrucciones.' });
  } catch (e) {
    logger.error('Password reset request error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error procesando solicitud.' });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const newPassword = String(req.body.password || '');

    if (!token) return res.status(400).json({ message: 'Token inválido.' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });

    const resetToken = await db('password_reset_tokens').where('token', token).first();
    if (!resetToken || resetToken.used) return res.status(400).json({ message: 'Token inválido o expirado.' });
    if (new Date() > new Date(resetToken.expiresAt)) return res.status(400).json({ message: 'Token expirado.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db('users').where('id', resetToken.userId).update({ passwordHash });
    await db('password_reset_tokens').where('id', resetToken.id).update({ used: true });

    await logAudit(resetToken.userId, 'updated', 'user', resetToken.userId, { action: 'password_reset' });

    res.json({ message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });
  } catch (e) {
    logger.error('Password reset error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error recuperando contraseña.' });
  }
});

// Setup 2FA
app.post('/api/auth/setup-2fa', auth, async (req, res) => {
  try {
    const user = await db('users').where('id', req.user.id).first();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

    let totp = await db('totp_secrets').where('userId', req.user.id).first();

    if (totp && totp.enabled) {
      return res.status(400).json({ message: '2FA ya está habilitado.' });
    }

    const secret = speakeasy.generateSecret({
      name: `ReputationManager (${user.email})`,
      issuer: 'ReputationManager',
      length: 32
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Backup codes
    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));

    if (totp) {
      await db('totp_secrets').where('userId', req.user.id).update({
        secret: secret.base32,
        backupCodes: JSON.stringify(backupCodes)
      });
    } else {
      await db('totp_secrets').insert({
        id: nanoid(14),
        userId: req.user.id,
        secret: secret.base32,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false
      });
    }

    res.json({ qrCode, backupCodes, secret: secret.base32 });
  } catch (e) {
    logger.error('2FA setup error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error configurando 2FA.' });
  }
});

// Verify 2FA
app.post('/api/auth/verify-2fa', auth, async (req, res) => {
  try {
    const code = String(req.body.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Código requerido.' });

    const totp = await db('totp_secrets').where('userId', req.user.id).first();
    if (!totp) return res.status(400).json({ message: '2FA no configurado.' });

    const verified = speakeasy.totp.verify({
      secret: totp.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) return res.status(400).json({ message: 'Código inválido.' });

    await db('totp_secrets').where('userId', req.user.id).update({
      enabled: true,
      enabledAt: new Date()
    });

    await logAudit(req.user.id, 'updated', 'user', req.user.id, { action: '2fa_enabled' }, req.ip);

    res.json({ message: '2FA habilitado correctamente.' });
  } catch (e) {
    logger.error('2FA verification error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error verificando 2FA.' });
  }
});

// Refresh token
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.cookies?.rm_refresh;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token requerido.' });

    const tokenRecord = await db('refresh_tokens').where('token', refreshToken).first();
    if (!tokenRecord) return res.status(401).json({ message: 'Token inválido.' });
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      await db('refresh_tokens').where('id', tokenRecord.id).del();
      return res.status(401).json({ message: 'Token expirado.' });
    }

    const user = await db('users').where('id', tokenRecord.userId).first();
    const newToken = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('rm_auth', newToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Token renovado.' });
  } catch (e) {
    logger.error('Token refresh error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error renovando token.' });
  }
});

// Logout
app.post('/api/auth/logout', auth, async (req, res) => {
  try {
    const refreshToken = req.cookies?.rm_refresh;
    if (refreshToken) {
      await db('refresh_tokens').where('token', refreshToken).del();
    }

    res.clearCookie('rm_auth');
    res.clearCookie('rm_refresh');
    res.json({ message: 'Sesión cerrada.' });
  } catch (e) {
    logger.error('Logout error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error cerrando sesión.' });
  }
});

// Global search
app.get('/api/search', publicLimiter, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().substring(0, 100);
    if (q.length < 2) return res.json({ businesses: [], reviews: [] });

    const searchTerm = `%${q}%`;

    const businesses = await db('businesses')
      .where('public', true)
      .andWhere((builder) => {
        builder
          .where('name', 'ilike', searchTerm)
          .orWhere('description', 'ilike', searchTerm)
          .orWhere('type', 'ilike', searchTerm);
      })
      .limit(10)
      .select(['id', 'name', 'type', 'description']);

    const reviews = await db('reviews')
      .join('businesses', 'reviews.businessId', 'businesses.id')
      .where('businesses.public', true)
      .andWhere('reviews.text', 'ilike', searchTerm)
      .limit(10)
      .select(['reviews.id', 'reviews.rating', 'reviews.text', 'reviews.businessId', 'businesses.name as businessName']);

    res.json({ businesses, reviews });
  } catch (e) {
    logger.error('Search error', sanitizeForLog({ error: e.message }));
    res.status(500).json({ message: 'Error buscando.' });
  }
});

app.use((err, _req, res, _next) => { logger.error('Unhandled error', { error: err.message, stack: err.stack }); res.status(500).json({ message: 'Ocurrió un error inesperado.' }); });
app.listen(PORT, () => {
  logger.info(`ReputationManager API started on http://localhost:${PORT}`, {
    environment: NODE_ENV,
    storage: `PostgreSQL (${process.env.DB_HOST}:${process.env.DB_PORT})`,
    rateLimitingEnabled: NODE_ENV === 'production'
  });
});
