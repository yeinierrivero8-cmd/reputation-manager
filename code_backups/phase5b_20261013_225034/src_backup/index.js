import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import knex from 'knex';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';

// Initialize Knex connection to PostgreSQL
const knexfile = (await import('../knexfile.js')).default;
const db = knex(knexfile.development);

if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET not configured. Set it in .env and restart.');
    process.exit(1);
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET not set. Using unsafe default for development only.');
  }
}

const app = express();

const corsOptions = {
  origin: CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOGIN || '5'),
  message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV !== 'production'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_SIGNUP || '3'),
  message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV !== 'production'
});

const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_REVIEWS || '3'),
  message: 'Demasiadas reseñas. Espera antes de enviar otra.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV !== 'production'
});

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
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Inicia sesión para continuar.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: 'Tu sesión expiró. Inicia sesión de nuevo.' }); }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'ReputationManager API' }));
app.post('/api/auth/signup', signupLimiter, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) return res.status(400).json({ message: 'Escribe tu nombre completo.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Escribe un correo válido.' });
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

    await db('users').insert(user);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: safeUser(user) });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ message: 'No se pudo crear la cuenta. Inténtalo de nuevo.' });
  }
});
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await db('users').where('email', email).first();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safeUser(user) });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'No se pudo iniciar sesión.' });
  }
});
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await db('users').where('id', req.user.id).first();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({ user: safeUser(user) });
  } catch (e) {
    console.error('Get user error:', e);
    res.status(500).json({ message: 'Error al obtener usuario.' });
  }
});
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const businesses = await db('businesses')
      .where('userId', req.user.id)
      .orderBy('createdAt', 'desc');

    const businessIds = businesses.map(b => b.id);
    const reviews = await db('reviews')
      .whereIn('businessId', businessIds.length > 0 ? businessIds : [null])
      .orderBy('createdAt', 'desc');

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
        businessName: businesses.find(b => b.id === r.businessId)?.name || 'Negocio'
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
    console.error('Dashboard error:', e);
    res.status(500).json({ message: 'Error al cargar dashboard.' });
  }
});
app.post('/api/businesses', auth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const type = String(req.body.type || 'Otro').trim();
    const description = String(req.body.description || '').trim();

    if (name.length < 2) return res.status(400).json({ message: 'El nombre del negocio debe tener al menos 2 caracteres.' });

    const business = {
      id: nanoid(14),
      userId: req.user.id,
      name: name.slice(0, 100),
      type: type.slice(0, 50),
      description: description.slice(0, 300),
      shareLink: nanoid(10),
      createdAt: new Date().toISOString()
    };

    await db('businesses').insert(business);
    res.status(201).json({ business: { ...business, averageRating: 0, totalReviews: 0 } });
  } catch (e) {
    console.error('Create business error:', e);
    res.status(500).json({ message: 'No se pudo crear el negocio.' });
  }
});
app.put('/api/businesses/:id', auth, async (req, res) => {
  try {
    const b = await getUserBusiness(req.user.id, req.params.id);
    if (!b) return res.status(404).json({ message: 'Negocio no encontrado.' });

    const updates = {};
    if (req.body.name) updates.name = String(req.body.name).trim().slice(0, 100);
    if (req.body.type) updates.type = String(req.body.type).trim().slice(0, 50);
    if (typeof req.body.description === 'string') updates.description = req.body.description.slice(0, 300);

    if (Object.keys(updates).length > 0) {
      await db('businesses').where('id', req.params.id).update(updates);
    }

    const updated = await getUserBusiness(req.user.id, req.params.id);
    res.json({ business: updated });
  } catch (e) {
    console.error('Update business error:', e);
    res.status(500).json({ message: 'No se pudo actualizar el negocio.' });
  }
});
app.delete('/api/businesses/:id', auth, async (req, res) => {
  try {
    const b = await getUserBusiness(req.user.id, req.params.id);
    if (!b) return res.status(404).json({ message: 'Negocio no encontrado.' });

    // Delete business (reviews cascade delete automatically via FK)
    await db('businesses').where('id', req.params.id).del();
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete business error:', e);
    res.status(500).json({ message: 'No se pudo eliminar el negocio.' });
  }
});
app.get('/api/reviews', auth, async (req, res) => {
  try {
    const businesses = await db('businesses').where('userId', req.user.id);
    const businessIds = businesses.map(b => b.id);

    const reviews = await db('reviews')
      .whereIn('businessId', businessIds.length > 0 ? businessIds : [null])
      .orderBy('createdAt', 'desc');

    const reviewsWithNames = reviews.map(r => ({
      ...r,
      businessName: businesses.find(b => b.id === r.businessId)?.name || 'Negocio'
    }));

    res.json({ reviews: reviewsWithNames });
  } catch (e) {
    console.error('Get reviews error:', e);
    res.status(500).json({ message: 'Error al obtener reseñas.' });
  }
});
app.get('/api/public/business/:shareLink', async (req, res) => {
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
    console.error('Get public business error:', e);
    res.status(500).json({ message: 'Error al obtener negocio.' });
  }
});
app.post('/api/public/business/:shareLink/reviews', reviewLimiter, async (req, res) => {
  try {
    const author = String(req.body.author || '').trim();
    const text = String(req.body.text || '').trim();
    const rating = Number(req.body.rating);

    if (author.length < 2) return res.status(400).json({ message: 'Escribe tu nombre.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Selecciona una calificación de 1 a 5 estrellas.' });
    if (text.length < 5) return res.status(400).json({ message: 'Cuéntanos un poco más sobre tu experiencia (mínimo 5 caracteres).' });
    if (text.length > 1500) return res.status(400).json({ message: 'La reseña no puede superar los 1.500 caracteres.' });

    const b = await db('businesses').where('shareLink', req.params.shareLink).first();
    if (!b) return res.status(404).json({ message: 'Este enlace de reseñas no es válido.' });

    const review = {
      id: nanoid(14),
      businessId: b.id,
      author: author.slice(0, 80),
      rating,
      text,
      platform: 'ReputationManager',
      createdAt: new Date().toISOString()
    };

    await db('reviews').insert(review);
    res.status(201).json({ message: '¡Gracias por compartir tu experiencia!', review });
  } catch (e) {
    console.error('Create review error:', e);
    res.status(500).json({ message: 'No se pudo crear la reseña.' });
  }
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ message: 'Ocurrió un error inesperado.' }); });
app.listen(PORT, () => {
  console.log(`🚀 ReputationManager API en http://localhost:${PORT}`);
  console.log(`📋 Environment: ${NODE_ENV}`);
  console.log(`💾 Storage: PostgreSQL (${process.env.DB_HOST}:${process.env.DB_PORT})`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET ? '✅ Configured' : '❌ WARNING: Using unsafe default'}`);
  console.log(`🛡️  Rate limiting: ${NODE_ENV === 'production' ? '✅ Enabled' : '⏸️ Disabled in development'}`);
});
