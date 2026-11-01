import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Building2, Check, ChevronDown, ChevronRight, CircleHelp, Code, Copy, ExternalLink, Eye, EyeOff, LayoutDashboard, Link2, Lock, LogOut, Mail, Menu, MessageSquareText, Plus, Search, Settings, ShieldCheck, Sparkles, Star, Store, TrendingUp, Trash2, Users, X, Zap } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '/api';
const getToken = () => localStorage.getItem('rm_token');
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la operación.');
  return data;
}
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
const fmtDate = (date) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: undefined }).format(new Date(date));
async function robustCopyToClipboard(text) {
  console.log('[COPY DEBUG] Starting robustCopyToClipboard');
  console.log('[COPY DEBUG] Text length:', text?.length);
  console.log('[COPY DEBUG] Text preview:', text?.substring(0, 50));

  // Method 1: Try Clipboard API with VERIFICATION
  if (navigator.clipboard && window.isSecureContext) {
    console.log('[COPY DEBUG] Attempting Clipboard API...');
    try {
      await navigator.clipboard.writeText(text);
      console.log('[COPY DEBUG] Clipboard API returned success');

      // VERIFY that clipboard actually contains our text
      try {
        const clipboardData = await navigator.clipboard.readText();
        if (clipboardData === text) {
          console.log('[COPY DEBUG] ✓ VERIFIED: Clipboard API worked! Content matches.');
          return true;
        } else {
          console.log('[COPY DEBUG] ✗ Clipboard API reported success but content mismatch. Falling back.');
        }
      } catch (readErr) {
        console.log('[COPY DEBUG] Cannot verify clipboard (read failed, may be permission issue). Falling back.');
      }
    } catch (writeErr) {
      console.log('[COPY DEBUG] Clipboard API writeText failed:', writeErr.message);
    }
  } else {
    console.log('[COPY DEBUG] Clipboard API not available');
  }

  // Method 2: Fallback to textarea + execCommand
  console.log('[COPY DEBUG] Using fallback textarea + execCommand method');
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    console.log('[COPY DEBUG] Textarea created and appended to DOM');

    textarea.focus();
    textarea.select();
    console.log('[COPY DEBUG] Textarea focused and selected');

    const success = document.execCommand('copy');
    console.log('[COPY DEBUG] execCommand("copy") returned:', success);

    document.body.removeChild(textarea);

    if (success) {
      console.log('[COPY DEBUG] ✓ Textarea method SUCCESS');
      return true;
    }
  } catch (err) {
    console.error('[COPY DEBUG] Textarea method failed:', err.message);
  }

  // Method 3: Last resort - select text manually so user can Ctrl+C
  console.log('[COPY DEBUG] Attempting manual text selection as last resort');
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.zIndex = '999999';
    textarea.style.opacity = '0.3';
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    console.log('[COPY DEBUG] ⚠️  Text is selected. User should press Ctrl+C manually.');
    showToast('Texto seleccionado. Presiona Ctrl+C para copiar.', 'success');

    setTimeout(() => {
      try {
        document.body.removeChild(textarea);
      } catch(e) {}
    }, 5000);

    return 'manual';
  } catch (err) {
    console.error('[COPY DEBUG] Even manual selection failed:', err.message);
    return false;
  }
}

function Brand({ light = false }) { return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Star size={21} strokeWidth={2.8}/></span><span>Reputation<span className="brand-strong">Manager</span></span></div>; }
function Stars({ value, size = 'normal' }) { return <span className={`stars stars-${size}`} aria-label={`${value} de 5 estrellas`}>{stars(value)}</span>; }
function Toast({ message, type = 'success', onClose }) { useEffect(() => { if (!message) return; const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [message]); if (!message) return null; return <div className={`toast toast-${type}`}>{type === 'success' ? <Check size={17}/> : <X size={17}/>}<span>{message}</span><button onClick={onClose}><X size={15}/></button></div>; }

function AuthPage({ mode: initialMode = 'login', onAuth }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api(mode === 'signup' ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      localStorage.setItem('rm_token', data.token);
      onAuth(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell-image">
      <div className="auth-image-bg"></div>
      
      <div className="auth-overlay-form">
        {mode === 'login' ? (
          <form onSubmit={submit}>
            {error && <div className="auth-error-box">{error}</div>}
            
            <div className="auth-field">
              <label>Correo electrónico</label>
              <input type="email" placeholder="tu@negocio.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required />
            </div>

            <div className="auth-field">
              <label>Contraseña</label>
              <div className="auth-pwd-wrapper">
                <input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-pwd-toggle">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-row">
              <label><input type="checkbox" /> Recordarme</label>
              <a href="#" className="auth-link">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Entrando...' : 'Entrar'} <ArrowRight size={16} />
            </button>

            <div className="auth-divider">o continúa con</div>

            <div className="auth-oauth">
              <button type="button" disabled>Continuar con Google</button>
              <button type="button" disabled>Continuar con Apple</button>
            </div>

            <div className="auth-signup-text">
              ¿Todavía no tienes cuenta? 
              <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="auth-link-btn">
                Crear cuenta gratis
              </button>
            </div>

            <p className="auth-footer">Nunca compartiremos tus datos con otros negocios.</p>
          </form>
        ) : (
          <form onSubmit={submit}>
            {error && <div className="auth-error-box">{error}</div>}
            
            <div className="auth-field">
              <label>Tu nombre o negocio</label>
              <input type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} required />
            </div>

            <div className="auth-field">
              <label>Correo electrónico</label>
              <input type="email" placeholder="tu@negocio.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required />
            </div>

            <div className="auth-field">
              <label>Contraseña (mínimo 8 caracteres)</label>
              <div className="auth-pwd-wrapper">
                <input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} required minLength="8" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-pwd-toggle">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Creando...' : 'Crear cuenta'} <ArrowRight size={16} />
            </button>

            <div className="auth-signup-text">
              ¿Ya tienes cuenta? 
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className="auth-link-btn">
                Inicia sesión
              </button>
            </div>

            <p className="auth-footer">Nunca compartiremos tus datos con otros negocios.</p>
          </form>
        )}
      </div>
    </main>
  );
}


function App() {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true); const [dashboard, setDashboard] = useState({ businesses: [], recentReviews: [], stats: { businesses: 0, totalReviews: 0, averageRating: 0, fiveStars: 0 } });
  const [page, setPage] = useState('dashboard'); const [modal, setModal] = useState(false); const [toast, setToast] = useState({ message: '', type: 'success' }); const [query, setQuery] = useState(''); const [mobileNav, setMobileNav] = useState(false); const [guideProgress, setGuideProgress] = useState({ step1: false, step2: false, step3: false, step4: false, step5: false, completedSteps: 0 });
  const reviewMatch = window.location.pathname.match(/^\/review\/([^/]+)/);
  const showToast = (message, type='success') => setToast({ message, type });
  async function refresh() { const data = await api('/dashboard'); setDashboard(data); }
  async function loadGuideProgress() { try { const data = await api('/onboarding/progress'); setGuideProgress(data.progress ? { ...data.progress, completedSteps: data.completedSteps } : { step1: false, step2: false, step3: false, step4: false, step5: false, completedSteps: 0 }); } catch (e) { logger.error('Error loading guide progress:', e); } }
  useEffect(() => { (async () => { if (reviewMatch) { setLoading(false); return; } if (!getToken()) { setLoading(false); return; } try { const data = await api('/auth/me'); setUser(data.user); const dash = await api('/dashboard'); setDashboard(dash); await loadGuideProgress(); } catch { localStorage.removeItem('rm_token'); } finally { setLoading(false); } })(); }, []);
  useEffect(() => { const handleVisibilityChange = () => { if (!document.hidden && user) refresh(); }; const handleFocus = () => { if (user) refresh(); }; document.addEventListener('visibilitychange', handleVisibilityChange); window.addEventListener('focus', handleFocus); return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); window.removeEventListener('focus', handleFocus); }; }, [user]);
  if (reviewMatch) return <PublicReview shareLink={decodeURIComponent(reviewMatch[1])}/>;
  if (loading) return <div className="loading-screen"><span className="loader"/><p>Cargando ReputationManager…</p></div>;
  if (!user) return <AuthPage mode={window.location.pathname === '/signup' ? 'signup' : 'login'} onAuth={async u => { setUser(u); window.history.replaceState({}, '', '/'); try { await refresh(); } catch(e) { showToast(e.message, 'error'); } }}/>
  const logout = () => { localStorage.removeItem('rm_token'); setUser(null); window.history.replaceState({}, '', '/'); };
  const nav = [{ id:'dashboard', label:'Resumen', icon:LayoutDashboard }, { id:'guide', label:'Guía de inicio', icon:Sparkles }, { id:'businesses', label:'Mis negocios', icon:Store }, { id:'reviews', label:'Reseñas recibidas', icon:MessageSquareText }, { id:'widget', label:'Widget para web', icon:Code }, { id:'settings', label:'Configuración', icon:Settings }, { id:'support', label:'Contactar soporte', icon:CircleHelp }];
  const visibleBusinesses = dashboard.businesses.filter(b => b.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="app-shell"><aside className={`sidebar ${mobileNav?'sidebar-open':''}`}><div className="sidebar-top"><Brand/><button className="icon-btn mobile-close" onClick={()=>setMobileNav(false)}><X size={19}/></button></div><div className="workspace-label">ESPACIO DE TRABAJO</div><nav className="side-nav">{nav.map(item=><button key={item.id} className={`nav-item ${page===item.id?'nav-active':''}`} onClick={()=>{setPage(item.id);setMobileNav(false)}}><item.icon size={19}/><span>{item.label}</span>{item.id==='reviews' && dashboard.stats.totalReviews>0 && <span className="nav-count">{dashboard.stats.totalReviews}</span>}</button>)}</nav><div className="sidebar-divider"/><button className="nav-item" onClick={()=>{setPage('settings');setMobileNav(false)}}><Settings size={19}/><span>Configuración</span></button><div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={19}/></span><strong>¿Necesitas ayuda?</strong><p>Estamos aquí para ayudarte a empezar.</p><button onClick={()=>{setPage('support');setMobileNav(false)}}>Contactar soporte <ArrowRight size={14}/></button></div><div className="profile-row"><div className="avatar avatar-blue">{user.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div><div className="profile-meta"><strong>{user.name}</strong><span>{user.email}</span></div><button className="icon-btn" title="Cerrar sesión" onClick={logout}><LogOut size={17}/></button></div></div></aside>
  {mobileNav && <button className="mobile-overlay" onClick={()=>setMobileNav(false)} aria-label="Cerrar menú"/>}
  <main className="main-area"><header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={21}/></button><div className="breadcrumb"><span>Espacio de trabajo</span><ChevronRight size={14}/><strong>{nav.find(n=>n.id===page)?.label || 'Resumen'}</strong></div><div className="topbar-right"><div className="search-box"><Search size={17}/><input placeholder="Buscar un negocio…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="top-avatar">{user.name.slice(0,1).toUpperCase()}</div></div></header>
    {page==='dashboard' && <DashboardView user={user} dashboard={dashboard} setPage={setPage} onCreate={()=>setModal(true)} onRefresh={refresh} showToast={showToast} guideProgress={guideProgress}/>}
    {page==='guide' && <GuideView businesses={dashboard.businesses} guideProgress={guideProgress} setGuideProgress={setGuideProgress} showToast={showToast}/>}
    {page==='businesses' && <BusinessesView businesses={visibleBusinesses} onCreate={()=>setModal(true)} onCopy={async b=>{console.log('[CLICK DEBUG] BusinessesView copy called');const ok=await copyLink(b.shareLink);console.log('[CLICK DEBUG] BusinessesView copy result:', ok);if(ok)showToast('Enlace copiado. ¡Compártelo con tus clientes!');else showToast('No se pudo copiar automáticamente. Presiona Ctrl+C','error');}} onDelete={async b=>{if(!confirm(`¿Eliminar ${b.name} y sus reseñas? Esta acción no se puede deshacer.`))return;try{await api(`/businesses/${b.id}`,{method:'DELETE'});await refresh();showToast('Negocio eliminado.')}catch(e){showToast(e.message,'error')}}}/>}
    {page==='reviews' && <ReviewsView reviews={dashboard.recentReviews} allCount={dashboard.stats.totalReviews} onRefresh={async()=>{try{const d=await api('/reviews');setDashboard(p=>({...p,recentReviews:d.reviews,stats:{...p.stats,totalReviews:d.reviews.length}}));}catch(e){showToast(e.message,'error')}}}/>}
    {page==='widget' && <WidgetView businesses={dashboard.businesses} showToast={showToast}/>}
    {page==='settings' && <SettingsView user={user} onUpdate={async()=>{const data=await api('/auth/me');const newUser={...user,...data.user};setUser(newUser);showToast('Perfil actualizado.');}} showToast={showToast}/>}
    {page==='support' && <SupportView showToast={showToast}/>}
  </main>{modal && <BusinessModal onClose={()=>setModal(false)} onCreate={async form=>{const result=await api('/businesses',{method:'POST',body:JSON.stringify(form)});await refresh();setModal(false);setPage('businesses');showToast(`${result.business.name} ya está creado.`)}}/>}<Toast message={toast.message} type={toast.type} onClose={()=>setToast({message:'',type:'success'})}/></div>;
}

function PageHeading({ eyebrow, title, description, action }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function DashboardView({ user, dashboard, setPage, onCreate, showToast, guideProgress }) {
  const stats = dashboard.stats; const chart = useMemo(()=>{const all=dashboard.recentReviews;return [0,1,2,3,4,5,6].map((_,i)=>({label:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i],value: all.filter(r=>new Date(r.createdAt).getDay()===((i+1)%7)).length}))},[dashboard.recentReviews]);
  const max=Math.max(3,...chart.map(c=>c.value)); const points=chart.map((c,i)=>`${20+i*53},${104-(c.value/max)*72}`).join(' ');
  return <div className="content-wrap"><PageHeading eyebrow="VISTA GENERAL" title={`Hola, ${user.name.split(' ')[0]}`} description="Aquí tienes el estado de la reputación de tus negocios." action={<button className="btn btn-primary" onClick={onCreate}><Plus size={18}/> Nuevo negocio</button>}/><div className="welcome-strip" style={{background:'#f0f4ff',borderColor:'#0066cc'}}><div className="welcome-icon"><Sparkles size={20} color="#0066cc"/></div><div><strong>Guía de inicio — {guideProgress.completedSteps || 0} de 5 pasos completados</strong><p>Aprende cómo obtener reseñas auténticas e instalar el widget en tu web.</p></div><button className="welcome-action" onClick={()=>setPage('guide')}>Abrir guía <ArrowRight size={16}/></button></div>
    <div className="welcome-strip"><div className="welcome-icon"><Sparkles size={20}/></div><div><strong>Tu reputación empieza con una buena experiencia.</strong><p>Crea tu primer negocio y comparte un enlace para recibir opiniones reales de tus clientes.</p></div><button className="welcome-action" onClick={onCreate}>Crear negocio <ArrowRight size={16}/></button></div>
    <section className="stat-grid"><StatCard label="Calificación media" value={stats.averageRating ? stats.averageRating.toFixed(1) : '—'} sub={stats.totalReviews ? 'Promedio de tus reseñas' : 'Aún no tienes reseñas'} icon={Star} tone="amber" extra={stats.totalReviews>0&&<Stars value={Math.round(stats.averageRating)} size="small"/>}/><StatCard label="Reseñas recibidas" value={stats.totalReviews} sub="Opiniones de tus clientes" icon={MessageSquareText} tone="blue"/><StatCard label="Mis negocios" value={stats.businesses} sub="Negocios registrados" icon={Building2} tone="violet"/><StatCard label="Reseñas de 5 estrellas" value={stats.fiveStars} sub="Experiencias excelentes" icon={Zap} tone="green"/></section>
    <section className="dashboard-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Actividad de reseñas</h2><p>Resumen de los últimos comentarios</p></div><span className="panel-badge"><Activity size={14}/> En actividad</span></div>{stats.totalReviews===0?<EmptyMini icon={BarChart3} title="Tu actividad aparecerá aquí" text="Cuando tus clientes dejen reseñas, podrás seguir la actividad desde este panel."/>:<div className="chart-wrap"><div className="chart-y"><span>5</span><span>4</span><span>3</span><span>2</span><span>0</span></div><svg viewBox="0 0 360 130" preserveAspectRatio="none" className="chart-svg"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3164f4" stopOpacity=".2"/><stop offset="100%" stopColor="#3164f4" stopOpacity="0"/></linearGradient></defs>{[20,42,64,86,108].map(y=><line key={y} x1="10" x2="350" y1={y} y2={y} stroke="#e9eef7" strokeDasharray="4 4"/>)}<polygon points={`10,108 ${points.split(' ').map(p=>{const [x,y]=p.split(',');return `${10+Number(x)*.94},${Number(y)}`}).join(' ')} 340,108`} fill="url(#chartFill)"/><polyline points={points.split(' ').map(p=>{const [x,y]=p.split(',');return `${10+Number(x)*.94},${Number(y)}`}).join(' ')} fill="none" stroke="#3164f4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{chart.map((c,i)=><circle key={c.label} cx={10+i*49.8} cy={104-(c.value/max)*72} r="3.5" fill="#fff" stroke="#3164f4" strokeWidth="2"/>)}</svg><div className="chart-x">{chart.map(c=><span key={c.label}>{c.label}</span>)}</div></div>}</div>
    <div className="panel rating-panel"><div className="panel-heading"><div><h2>Distribución de estrellas</h2><p>Calificaciones de clientes</p></div></div>{stats.totalReviews===0?<EmptyMini icon={Star} title="Sin calificaciones todavía" text="Las estrellas aparecerán cuando recibas opiniones."/>:<div className="rating-bars">{[5,4,3,2,1].map(n=>{const count=dashboard.recentReviews.filter(r=>r.rating===n).length;const pct=Math.max(0,Math.round(count/Math.max(stats.totalReviews,1)*100));return <div className="rating-row" key={n}><span>{n} <Star size={13} fill="#f5b544" stroke="#f5b544"/></span><div className="rating-track"><i style={{width:`${pct}%`}}/></div><b>{pct}%</b></div>})}</div>}<div className="rating-foot"><span>Promedio general</span><strong>{stats.averageRating ? `${stats.averageRating.toFixed(1)} / 5` : '—'}</strong></div></div></section>
    <section className="bottom-grid"><div className="panel recent-panel"><div className="panel-heading"><div><h2>Reseñas recientes</h2><p>Lo último que han compartido tus clientes</p></div><button className="text-button" onClick={()=>setPage('reviews')}>Ver todas <ArrowRight size={15}/></button></div>{dashboard.recentReviews.length===0?<EmptyMini icon={MessageSquareText} title="Todavía no hay reseñas" text="Comparte el enlace de tu negocio para recibir tu primera opinión." action={<button className="btn btn-secondary btn-small" onClick={()=>setPage('businesses')}>Ver mis negocios</button>}/>:<div className="review-list">{dashboard.recentReviews.slice(0,4).map(r=><ReviewRow key={r.id} review={r}/>)}</div>}</div>
    <div className="panel business-panel"><div className="panel-heading"><div><h2>Mis negocios</h2><p>Enlaces listos para compartir</p></div><button className="icon-btn icon-btn-soft" onClick={()=>setPage('businesses')}><ArrowRight size={17}/></button></div>{dashboard.businesses.length===0?<EmptyMini icon={Store} title="Añade tu primer negocio" text="Crea una página de reseñas personalizada para tu establecimiento." action={<button className="btn btn-primary btn-small" onClick={onCreate}><Plus size={15}/> Crear negocio</button>}/>:<div className="business-mini-list">{dashboard.businesses.slice(0,3).map(b=><BusinessMini key={b.id} business={b} showToast={showToast}/>)}</div>}</div></section>
    <div className="footer-note"><ShieldCheck size={15}/> Solo se muestran los datos de tu cuenta. Las integraciones externas se añaden por separado.</div>
  </div>;
}
function StatCard({label,value,sub,icon:Icon,tone,extra}) {return <div className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value-row"><strong>{value}</strong>{extra}</div><div className="stat-sub">{sub}</div></div>}
function EmptyMini({icon:Icon,title,text,action}) {return <div className="empty-mini"><span className="empty-icon"><Icon size={20}/></span><strong>{title}</strong><p>{text}</p>{action}</div>}
function ReviewRow({review}) {return <div className="review-row"><div className="avatar avatar-soft">{review.author?.slice(0,1).toUpperCase()||'C'}</div><div className="review-content"><div className="review-title-row"><strong>{review.author}</strong><span className="review-date">{fmtDate(review.createdAt)}</span></div><Stars value={review.rating} size="small"/><p>{review.text}</p><span className="review-business"><Store size={12}/>{review.businessName}</span></div></div>}
function BusinessMini({business,showToast}) {return <div className="business-mini"><span className="business-mini-icon"><Store size={17}/></span><div className="business-mini-info"><strong>{business.name}</strong><span>{business.totalReviews} reseñas · {business.averageRating?business.averageRating.toFixed(1)+' ★':'Sin calificación'}</span></div><button className="icon-btn" title="Copiar enlace" onClick={async()=>{console.log('[CLICK DEBUG] BusinessMini copy button clicked');const ok=await copyLink(business.shareLink);console.log('[CLICK DEBUG] BusinessMini copy result:', ok);if(ok)showToast('Enlace copiado.');else showToast('Presiona Ctrl+C después de hacer clic','error');}}><Copy size={16}/></button></div>}
function BusinessesView({businesses,onCreate,onCopy,onDelete}) {return <div className="content-wrap"><PageHeading eyebrow="GESTIÓN DE NEGOCIOS" title="Mis negocios" description="Administra tus establecimientos y comparte su enlace de reseñas." action={<button className="btn btn-primary" onClick={onCreate}><Plus size={18}/> Nuevo negocio</button>}/>{businesses.length===0?<div className="panel empty-large"><span className="empty-large-icon"><Store size={26}/></span><h2>Empieza por añadir un negocio</h2><p>Podrás compartir un enlace único para que tus clientes dejen sus opiniones y calificaciones.</p><button className="btn btn-primary" onClick={onCreate}><Plus size={17}/> Crear mi primer negocio</button></div>:<div className="business-cards">{businesses.map(b=><article className="panel business-card" key={b.id}><div className="business-card-top"><span className="business-card-icon"><Store size={21}/></span><button className="icon-btn" title="Eliminar negocio" onClick={()=>onDelete(b)}><Trash2 size={16}/></button></div><span className="business-type">{b.type||'Negocio'}</span><h2>{b.name}</h2><p>{b.description||'Invita a tus clientes a compartir su experiencia.'}</p><div className="business-metrics"><div><strong>{b.averageRating?b.averageRating.toFixed(1):'—'} <span>★</span></strong><small>Calificación media</small></div><div><strong>{b.totalReviews}</strong><small>Reseñas recibidas</small></div></div><div className="share-url"><Link2 size={15}/><span>{window.location.origin}/review/{b.shareLink}</span><button onClick={()=>onCopy(b)} title="Copiar enlace"><Copy size={15}/></button></div><div className="business-card-actions"><button className="btn btn-primary btn-small" onClick={()=>onCopy(b)}><Copy size={15}/> Copiar enlace</button><a className="btn btn-secondary btn-small" href={`/review/${b.shareLink}`} target="_blank" rel="noreferrer">Vista pública <ExternalLink size={14}/></a></div></article>)}</div>}</div>}
function ReviewsView({reviews,allCount}) {return <div className="content-wrap"><PageHeading eyebrow="VOZ DE TUS CLIENTES" title="Reseñas recibidas" description="Lee los comentarios que los clientes han dejado en tus páginas públicas."/><div className="panel reviews-panel"><div className="reviews-toolbar"><div><strong>{allCount} {allCount===1?'reseña':'reseñas'}</strong><span> en total</span></div><span className="panel-badge">Más recientes</span></div>{reviews.length===0?<EmptyMini icon={MessageSquareText} title="Aún no has recibido reseñas" text="Cuando tus clientes completen el formulario de tu enlace público, aparecerán aquí."/>:<div className="review-list review-list-full">{reviews.map(r=><ReviewRow key={r.id} review={r}/>)}</div>}</div></div>}
function WidgetView({businesses,showToast}) {const [selectedBusiness,setSelectedBusiness]=useState(businesses[0]?.id||'');const [mode,setMode]=useState('compact');const [maxReviews,setMaxReviews]=useState(5);const business=businesses.find(b=>b.id===selectedBusiness);const widgetCode=business?`<script src="${window.location.origin}/widget.js"><\/script>\n<div id="rm-widget" data-share-link="${business.shareLink}" data-mode="${mode}" data-reviews="${maxReviews}"><\/div>`:null;const copyCode=async()=>{if(!widgetCode)return;const ok=await robustCopyToClipboard(widgetCode);if(ok!==false)showToast('¡Código copiado correctamente!');else showToast('No se pudo copiar el código. Selecciona el texto y pulsa Ctrl+C','error');};return <div className="content-wrap"><PageHeading eyebrow="INTEGRACIÓN" title="Widget para mi web" description="Inserta las reseñas de tu negocio en tu página web."/><div className="panel" style={{marginBottom:'20px'}}><div className="panel-heading"><div><h2>Configuración del widget</h2><p>Elige un negocio y personaliza la presentación</p></div></div><div style={{padding:'20px'}}><div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Negocio</label><select value={selectedBusiness} onChange={e=>setSelectedBusiness(e.target.value)} style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px'}}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Presentación</label><div style={{display:'flex',gap:'10px'}}><label style={{flex:1,padding:'10px',border:'1px solid #ddd',borderRadius:'4px',cursor:'pointer',background:mode==='compact'?'#e3f2fd':'white',color:mode==='compact'?'#0066cc':'#666'}}><input type="radio" value="compact" checked={mode==='compact'} onChange={e=>setMode(e.target.value)} style={{marginRight:'8px'}}/>Compacta</label><label style={{flex:1,padding:'10px',border:'1px solid #ddd',borderRadius:'4px',cursor:'pointer',background:mode==='full'?'#e3f2fd':'white',color:mode==='full'?'#0066cc':'#666'}}><input type="radio" value="full" checked={mode==='full'} onChange={e=>setMode(e.target.value)} style={{marginRight:'8px'}}/>Completa</label></div></div><div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Reseñas a mostrar: {maxReviews}</label><input type="range" min="1" max="10" value={maxReviews} onChange={e=>setMaxReviews(parseInt(e.target.value))} style={{width:'100%'}}/></div></div></div><div className="panel" style={{marginBottom:'20px'}}><div className="panel-heading"><h2>Vista previa</h2></div><div style={{padding:'20px',background:'#f9f9f9',borderRadius:'4px'}}>{business?<>Negocio: <strong>{business.name}</strong><br/>Calificación: <strong>{business.averageRating?.toFixed(1)||'—'}</strong><br/>Reseñas: <strong>{business.totalReviews}</strong><br/>Modo: <strong>{mode==='compact'?'Compacta':'Completa'}</strong></>:<span style={{color:'#999'}}>Selecciona un negocio</span>}</div></div><div className="panel"><div className="panel-heading"><h2>Código de inserción</h2><p>Copia este código en tu página HTML</p></div><div style={{padding:'20px'}}>{widgetCode?<><div style={{background:'#f5f5f5',border:'1px solid #ddd',borderRadius:'4px',padding:'12px',fontFamily:'monospace',fontSize:'12px',overflow:'auto',marginBottom:'12px'}}>{widgetCode}</div><button className="btn btn-primary" onClick={copyCode}><Copy size={16}/> Copiar código</button></>:<span style={{color:'#999'}}>Selecciona un negocio para generar el código</span>}</div><div style={{marginTop:'20px',background:'#e3f2fd',border:'1px solid #0066cc',borderRadius:'4px',padding:'12px'}}><strong style={{color:'#0066cc'}}>ℹ️ Instrucciones:</strong><ol style={{marginTop:'8px',paddingLeft:'20px',color:'#0066cc',fontSize:'13px'}}><li>Copia el código anterior</li><li>Pega en tu página HTML dentro del &lt;body&gt;</li><li>El widget se cargará automáticamente</li></ol></div></div></div>}
function BusinessModal({onClose,onCreate}) {const [name,setName]=useState('');const [type,setType]=useState('Restaurante');const [description,setDescription]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onCreate({name,type,description})}catch(e){setError(e.message)}finally{setBusy(false)}}return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal-card"><div className="modal-heading"><div><span className="auth-kicker">NUEVO ESPACIO</span><h2>Añadir negocio</h2><p>Crea una página para que tus clientes compartan su experiencia.</p></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{error&&<div className="form-error">{error}</div>}<form className="form-stack" onSubmit={submit}><label>Nombre del negocio<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Café Central" required minLength={2} maxLength={100} autoFocus/></label><label>Tipo de negocio<select value={type} onChange={e=>setType(e.target.value)}>{['Restaurante','Salón de belleza','Consultorio médico','Tienda','Servicios profesionales','Hotel','Gimnasio','Taller mecánico','Otro'].map(x=><option key={x}>{x}</option>)}</select></label><label>Descripción <span className="optional">(opcional)</span><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Cuéntales a tus clientes qué hace especial a tu negocio." rows="3" maxLength={300}/></label><div className="modal-tip"><Link2 size={17}/><span>Generaremos un enlace único que podrás compartir por WhatsApp, correo o mensaje.</span></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy?'Creando…':'Crear negocio'}<ArrowRight size={16}/></button></div></form></section></div>}
function PublicReview({shareLink}) {const [data,setData]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [author,setAuthor]=useState('');const [rating,setRating]=useState(5);const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [success,setSuccess]=useState(false);useEffect(()=>{api(`/public/business/${encodeURIComponent(shareLink)}`).then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[shareLink]);async function submit(e){e.preventDefault();setBusy(true);setError('');try{await api(`/public/business/${encodeURIComponent(shareLink)}/reviews`,{method:'POST',body:JSON.stringify({author,rating,text})});setSuccess(true);setData(await api(`/public/business/${encodeURIComponent(shareLink)}`))}catch(e){setError(e.message)}finally{setBusy(false)}}if(loading)return <div className="public-loading"><span className="loader"/>Cargando página de reseñas…</div>;if(!data)return <div className="public-review-shell"><div className="public-card"><Brand/><div className="public-error"><CircleHelp size={28}/><h1>No encontramos este negocio</h1><p>{error}</p></div></div></div>;return <div className="public-review-shell"><div className="public-review-brand"><Brand/></div><main className="public-card"><div className="public-business-icon"><Store size={26}/></div><span className="auth-kicker">TU OPINIÓN IMPORTA</span><h1>{data.business.name}</h1><p className="public-description">{data.business.description||'Cuéntanos cómo fue tu experiencia. Tu opinión ayuda a este negocio a seguir mejorando.'}</p><div className="public-rating-summary">{data.business.averageRating>0?<><strong>{data.business.averageRating.toFixed(1)}</strong><div><Stars value={Math.round(data.business.averageRating)}/><span>{data.business.totalReviews} {data.business.totalReviews===1?'reseña':'reseñas'}</span></div></>:<><strong>—</strong><div><span>Sé la primera persona en dejar una reseña.</span></div></>}</div>{success?<div className="success-review"><span><Check size={24}/></span><h2>¡Gracias por tu reseña!</h2><p>Tu opinión se ha guardado correctamente. Gracias por tomarte el tiempo de compartir tu experiencia.</p><button className="btn btn-secondary" onClick={()=>{setSuccess(false);setAuthor('');setText('');setRating(5)}}>Dejar otra reseña</button></div>:<form className="public-form" onSubmit={submit}><h2>¿Cómo fue tu experiencia?</h2><label className="rating-picker-label">Selecciona una calificación</label><div className="rating-picker" role="radiogroup" aria-label="Calificación de 1 a 5">{[1,2,3,4,5].map(n=><button key={n} type="button" className={n<=rating?'rating-selected':''} onClick={()=>setRating(n)} aria-label={`${n} estrellas`} aria-pressed={rating===n}>★</button>)}</div><div className="rating-caption">{['','Muy mala','Mala','Regular','Buena','¡Excelente!'][rating]}</div><label>Tu nombre<input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="¿Cómo te llamas?" required minLength={2} maxLength={80}/></label><label>Cuéntanos más<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="¿Qué te gustó? ¿Qué podríamos mejorar?" rows="4" required minLength={5} maxLength={1500}/><span className="char-count">{text.length}/1500</span></label>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary btn-full" disabled={busy}>{busy?'Enviando reseña…':'Enviar mi reseña'}<ArrowRight size={16}/></button><p className="privacy-note"><ShieldCheck size={14}/> Tu opinión se comparte con el negocio para ayudarle a mejorar.</p></form>}</main><footer className="public-footer">Página de reseñas gestionada con <Brand/></footer></div>}
async function copyLink(shareLink){
  console.log('[COPY DEBUG] copyLink called with shareLink:', shareLink);
  const link=`${window.location.origin}/review/${shareLink}`;
  console.log('[COPY DEBUG] Full link to copy:', link);
  const result = await robustCopyToClipboard(link);
  console.log('[COPY DEBUG] copyLink result:', result);
  return result !== false;
}

function GuideView({businesses,guideProgress,setGuideProgress,showToast}) {const [currentStep,setCurrentStep]=useState(1);const [updating,setUpdating]=useState(false);const steps=[{num:1,title:'Configurar mi negocio',description:'Crea tu primer negocio en ReputationManager',completed:guideProgress.step1,action:'Crear negocio',details:'Necesitas registrar al menos un negocio para poder recibir reseñas y compartir tu enlace público.'},{num:2,title:'Obtener mi enlace público',description:'Copia y comparte tu enlace para recibir reseñas',completed:guideProgress.step2,action:'Ver enlace',details:'Cada negocio tiene un enlace único que puedes compartir por WhatsApp, correo o redes sociales.'},{num:3,title:'Conseguir reseñas auténticas',description:'Aprende a solicitar reseñas a tus clientes reales',completed:guideProgress.step3,action:'Leer consejos',details:'Comparte tu enlace directamente con clientes que hayan tenido una buena experiencia. Las reseñas auténticas son más valiosas.'},{num:4,title:'Instalar el widget',description:'Muestra tus reseñas en tu página web',completed:guideProgress.step4,action:'Copiar código',details:'El widget se integra en WordPress, Wix, Shopify o cualquier página HTML personalizada.'},{num:5,title:'Verificar funcionamiento',description:'Comprueba que todo está conectado correctamente',completed:guideProgress.step5,action:'Verificar',details:'Asegúrate de que tu negocio, enlace y widget funcionan correctamente.'}];const updateProgress=async(stepNum,completed)=>{setUpdating(true);try{const res=await api(`/onboarding/progress/step${stepNum}`,{method:'PATCH',body:JSON.stringify({completed})});if(res.progress){const newProgress={...res.progress,completedSteps:res.completedSteps};setGuideProgress(newProgress);showToast(`Paso ${stepNum} ${completed?'marcado como completado':'desmarcado'}`);}else{showToast('No se pudo actualizar el progreso','error');}}catch(e){console.error('Update progress error:',e);showToast('Error: '+e.message,'error');}finally{setUpdating(false);}};const currentStepData=steps[currentStep-1];const selectedBusiness=businesses[0];return <div className="content-wrap"><PageHeading eyebrow="GUÍA DE INICIO" title="Empieza con Reputation Manager" description={`Progreso: ${guideProgress.completedSteps || 0} de 5 pasos`}/><div className="guide-container" style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'20px',marginBottom:'30px'}}><div className="guide-steps" style={{display:'flex',flexDirection:'column',gap:'10px'}}>{steps.map(step=><button key={step.num} onClick={()=>setCurrentStep(step.num)} className={`guide-step-btn ${currentStep===step.num?'guide-step-active':''} ${step.completed?'guide-step-completed':''}`} style={{padding:'12px',border:'1px solid #ddd',borderRadius:'4px',textAlign:'left',background:currentStep===step.num?'#e3f2fd':step.completed?'#e8f5e9':'white',cursor:'pointer',borderColor:currentStep===step.num?'#0066cc':step.completed?'#4caf50':'#ddd'}}><div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{minWidth:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:step.completed?'#4caf50':currentStep===step.num?'#0066cc':'#e0e0e0',color:'white',fontSize:'12px',fontWeight:'bold'}}>{step.completed?'✓':step.num}</span><div><strong>{step.title}</strong><p style={{margin:'4px 0 0 0',fontSize:'12px',color:step.completed?'#666':'#999'}}>{step.description}</p></div></div></button>)}</div><div className="guide-content" style={{background:'white',border:'1px solid #e0e0e0',borderRadius:'8px',padding:'24px'}}><h2 style={{marginTop:0}}>{currentStepData.title}</h2><p style={{color:'#666',lineHeight:'1.6',marginBottom:'20px'}}>{currentStepData.details}</p><div style={{background:'#f9f9f9',border:'1px solid #e0e0e0',borderRadius:'4px',padding:'16px',marginBottom:'20px'}}>{currentStep===1&&<><strong>Paso 1: Crear tu negocio</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#666'}}>Ve a "Mis negocios" y haz clic en "+ Nuevo negocio". Completa los datos de tu establecimiento.</p><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#666'}}>Esto te permitirá tener tu propia página de reseñas.</p></>}{currentStep===2&&<><strong>Paso 2: Copiar tu enlace</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#666'}}>En "Mis negocios" verás tu enlace único. Cópialo y pruébalo en una ventana privada para ver cómo lo verán tus clientes.</p>{selectedBusiness&&<div style={{marginTop:'12px',padding:'12px',background:'#fff',borderRadius:'4px',border:'1px solid #0066cc'}}><code style={{fontSize:'12px'}}>{window.location.origin}/review/{selectedBusiness.shareLink}</code></div>}  </>}{currentStep===3&&<><strong>Paso 3: Solicitar reseñas</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#666'}}>Ejemplos de cómo pedir reseñas:</p><ul style={{margin:'12px 0',paddingLeft:'20px',fontSize:'14px',color:'#666'}}><li><strong>WhatsApp:</strong> "Nos encantaría tu opinión sobre nuestra experiencia. Aquí está mi enlace de reseñas: [enlace]"</li><li><strong>Email:</strong> Incluye tu enlace en la firma de tus emails de seguimiento</li><li><strong>En persona:</strong> Pide a clientes satisfechos que dejen una reseña</li></ul></>}{currentStep===4&&<><strong>Paso 4: Instalar el widget</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#666'}}>Ve a "Widget para web" para obtener el código. Luego:</p><ul style={{margin:'12px 0',paddingLeft:'20px',fontSize:'14px',color:'#666'}}><li><strong>WordPress:</strong> Pega en un bloque HTML personalizado</li><li><strong>Wix:</strong> Usa "Embed HTML" en tu página</li><li><strong>Shopify:</strong> Añade como bloque personalizado</li><li><strong>HTML:</strong> Inserta directamente en tu código</li></ul></>}{currentStep===5&&<><strong>Paso 5: Verificar</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#666'}}>Comprueba tu configuración:</p><ul style={{margin:'12px 0',paddingLeft:'20px',fontSize:'14px',color:'#666'}}><li>✓ Tu negocio está en "Mis negocios"</li><li>✓ Tu enlace funciona al abrirlo</li><li>✓ Puedes dejar una reseña de prueba</li><li>✓ El widget aparece en tu web (si lo instalaste)</li></ul></>}</div><div style={{display:'flex',gap:'10px',alignItems:'center'}}><button onClick={()=>updateProgress(currentStep,!currentStepData.completed)} disabled={updating} className={`btn ${currentStepData.completed?'btn-secondary':'btn-primary'}`} style={{flex:1}}>{updating?'Procesando...':currentStepData.completed?'Marcar como pendiente':'Marcar como completado'}</button><div style={{padding:'8px 12px',background:'#f0f0f0',borderRadius:'4px',fontSize:'14px',color:'#666'}}>{currentStep}/{steps.length}</div></div></div></div><div style={{marginTop:'30px',padding:'16px',background:'#e3f2fd',borderRadius:'4px',borderLeft:'4px solid #0066cc'}}><strong style={{color:'#0066cc'}}>💡 Consejo:</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#0066cc'}}>Completa todos los pasos para maximizar tus reseñas. El progreso se guarda automáticamente.</p></div></div>;}
function SettingsView({user,onUpdate,showToast}){const [name,setName]=useState(user.name);const [busy,setBusy]=useState(false);const [error,setError]=useState('');async function submit(e){e.preventDefault();setBusy(true);setError('');if(name.trim().length<2){setError('El nombre debe tener al menos 2 caracteres.');setBusy(false);return;}try{await api('/auth/update-profile',{method:'PATCH',body:JSON.stringify({name:name.trim()})});setName(name.trim());showToast('¡Perfil actualizado exitosamente!');await onUpdate();}catch(e){setError(e.message);}finally{setBusy(false);}}return <div className="content-wrap"><PageHeading eyebrow="TU CUENTA" title="Configuración de perfil" description="Administra la información de tu cuenta."/><div className="panel" style={{maxWidth:'600px'}}><div className="panel-heading"><h2>Información personal</h2><p>Actualiza tus datos</p></div><form onSubmit={submit} style={{padding:'20px'}}><label style={{display:'block',marginBottom:'16px'}}><span style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Nombre completo</span><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',fontFamily:'inherit'}} required minLength={2} maxLength={100}/></label><label style={{display:'block',marginBottom:'16px'}}><span style={{display:'block',marginBottom:'8px',fontWeight:'600',color:'#999'}}>Correo electrónico</span><input type="email" value={user.email} disabled style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',fontFamily:'inherit',background:'#f9f9f9',color:'#666'}}/><span style={{display:'block',marginTop:'4px',fontSize:'12px',color:'#999'}}>No se puede cambiar en este momento</span></label>{error&&<div style={{background:'#ffebee',border:'1px solid #ef5350',color:'#c62828',padding:'12px',borderRadius:'4px',marginBottom:'16px'}}>{error}</div>}<div style={{display:'flex',gap:'10px'}}><button type="submit" className="btn btn-primary" disabled={busy}>{busy?'Guardando…':'Guardar cambios'}</button><button type="button" className="btn btn-secondary" onClick={()=>setName(user.name)}>Cancelar</button></div></form></div><div className="panel" style={{maxWidth:'600px',marginTop:'20px'}}><div className="panel-heading"><h2>Seguridad</h2><p>Protege tu cuenta</p></div><div style={{padding:'20px'}}><div style={{marginBottom:'16px',padding:'12px',background:'#e3f2fd',borderRadius:'4px'}}><strong style={{color:'#0066cc'}}>Password Reset</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#0066cc'}}>La función de cambio de contraseña estará disponible próximamente.</p></div><div style={{marginBottom:'16px',padding:'12px',background:'#f3e5f5',borderRadius:'4px'}}><strong style={{color:'#7b1fa2'}}>Dos factores</strong><p style={{margin:'8px 0 0 0',fontSize:'14px',color:'#7b1fa2'}}>Autenticación de dos factores disponible en futuras versiones.</p></div></div></div></div>;}
function SupportView({showToast}){const [name,setName]=useState('');const [email,setEmail]=useState('');const [subject,setSubject]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState(false);const [ticketId,setTicketId]=useState('');const [emailStatus,setEmailStatus]=useState('');async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess(false);if(!name.trim()||!email.trim()||!subject.trim()||!message.trim()){setError('Todos los campos son obligatorios.');setBusy(false);return;}if(!/^\S+@\S+\.\S+$/.test(email)){setError('Ingresa un correo electrónico válido.');setBusy(false);return;}if(message.trim().length<10){setError('El mensaje debe tener al menos 10 caracteres.');setBusy(false);return;}try{const response=await api('/support/contact',{method:'POST',body:JSON.stringify({name:name.trim(),email:email.trim(),subject:subject.trim(),message:message.trim()})});setSuccess(true);setTicketId(response.ticketId);setEmailStatus(response.emailNotification);setName('');setEmail('');setSubject('');setMessage('');showToast('✓ Tu solicitud ha sido registrada exitosamente.');}catch(e){setError(e.message);}finally{setBusy(false);}}return <div className="content-wrap"><PageHeading eyebrow="SOPORTE" title="Contáctanos" description="¿Tienes preguntas o sugerencias? Estamos aquí para ayudarte."/><div className="panel" style={{maxWidth:'700px'}}><div className="panel-heading"><h2>Formulario de contacto</h2><p>Completa el siguiente formulario y nos pondremos en contacto</p></div>{success?<div style={{padding:'20px'}}><div style={{background:'#e8f5e9',border:'1px solid #4caf50',borderRadius:'4px',padding:'16px',color:'#2e7d32',marginBottom:'16px'}}><strong>✓ ¡Solicitud registrada!</strong><p style={{margin:'8px 0 0 0',fontSize:'14px'}}>Tu solicitud ha sido guardada en nuestro sistema.</p></div><div style={{background:'#fff3cd',border:'1px solid #ffc107',borderRadius:'4px',padding:'12px',marginBottom:'16px',color:'#856404'}}><strong>Número de seguimiento:</strong><div style={{fontSize:'18px',fontWeight:'bold',fontFamily:'monospace',marginTop:'8px',color:'#000'}}>{ticketId}</div><p style={{margin:'8px 0 0 0',fontSize:'12px'}}>Guarda este número para referencia futura.</p></div>{emailStatus==='not_configured'?<div style={{background:'#e3f2fd',border:'1px solid #2196f3',borderRadius:'4px',padding:'12px',color:'#0d47a1',marginBottom:'16px'}}><strong>ℹ️ Estado del envío de correo</strong><p style={{margin:'8px 0 0 0',fontSize:'13px'}}>El sistema de correos aún no está configurado. Tu solicitud ha sido guardada y será procesada cuando el administrador configure el correo.</p></div>:<div style={{background:'#e8f5e9',border:'1px solid #4caf50',borderRadius:'4px',padding:'12px',color:'#2e7d32',marginBottom:'16px'}}><strong>✓ Confirmación enviada</strong><p style={{margin:'8px 0 0 0',fontSize:'13px'}}>Te hemos enviado una confirmación al correo que proporcionaste.</p></div>}<button className="btn btn-secondary" onClick={()=>{setSuccess(false);setTicketId('');setEmailStatus('')}} style={{marginTop:'12px'}}>Enviar otra solicitud</button></div>:<form onSubmit={submit} style={{padding:'20px'}}><label style={{display:'block',marginBottom:'16px'}}><span style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Tu nombre</span><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Juan García" style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',fontFamily:'inherit'}} required minLength={2} maxLength={100}/></label><label style={{display:'block',marginBottom:'16px'}}><span style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Tu correo</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',fontFamily:'inherit'}} required/></label><label style={{display:'block',marginBottom:'16px'}}><span style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Asunto</span><input type="text" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="¿En qué podemos ayudarte?" style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',fontFamily:'inherit'}} required minLength={5} maxLength={100}/></label><label style={{display:'block',marginBottom:'16px'}}><span style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Mensaje</span><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Cuéntanos qué necesitas..." style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',fontFamily:'inherit',minHeight:'120px'}} required minLength={10} maxLength={2000}/><span style={{display:'block',marginTop:'4px',fontSize:'12px',color:'#999'}}>{message.length}/2000</span></label>{error&&<div style={{background:'#ffebee',border:'1px solid #ef5350',color:'#c62828',padding:'12px',borderRadius:'4px',marginBottom:'16px'}}>{error}</div>}<button type="submit" className="btn btn-primary" disabled={busy}>{busy?'Enviando…':'Enviar mensaje'}</button></form>}</div><div className="panel" style={{maxWidth:'700px',marginTop:'20px'}}><div className="panel-heading"><h2>Otros canales</h2></div><div style={{padding:'20px',fontSize:'14px'}}><p><strong>Horario:</strong> Disponibles de lunes a viernes, 9:00 - 18:00</p><p style={{marginTop:'12px'}}><strong>Tiempo de respuesta:</strong> Generalmente respondemos en 24 horas</p></div></div></div>;}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
