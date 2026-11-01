/**
 * ReputationManager Widget - Embebible Reviews Widget
 * Uso: <script src="https://tu-app.com/widget.js"></script>
 *       <div id="rm-widget" data-share-link="abc123" data-mode="compact" data-reviews="5"></div>
 */

(function() {
  'use strict';

  const API_BASE = window.RM_API_BASE || 'http://localhost:5005/api';
  const WIDGET_VERSION = '1.0.0';

  class ReputationManagerWidget {
    constructor(container, options = {}) {
      this.container = container;
      this.shareLink = options.shareLink || container.dataset.shareLink;
      this.mode = options.mode || container.dataset.mode || 'compact';
      this.maxReviews = parseInt(options.maxReviews || container.dataset.reviews || '5');
      this.apiBase = options.apiBase || API_BASE;
      this.data = null;
      this.loading = true;
      this.error = null;

      if (!this.shareLink) {
        this.error = 'ShareLink no configurado';
        return;
      }

      this.init();
    }

    async init() {
      this.render('loading');
      try {
        const response = await fetch(`${this.apiBase}/public/business/${encodeURIComponent(this.shareLink)}`);
        if (!response.ok) throw new Error('No se encontró el negocio');
        this.data = await response.json();
        this.loading = false;
        this.render(this.mode);
      } catch (err) {
        this.error = err.message;
        this.loading = false;
        this.render('error');
      }
    }

    stars(rating) {
      return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    }

    formatDate(dateStr) {
      return new Intl.DateTimeFormat('es', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateStr));
    }

    getBaseUrl() {
      const url = new URL(this.apiBase);
      return `${url.protocol}//${url.host}`;
    }

    render(state) {
      const html = this[`render${state.charAt(0).toUpperCase()}${state.slice(1)}`]?.call(this) || '';
      this.container.innerHTML = html;
    }

    renderLoading() {
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center; color: #666;">
          <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e0e0e0; border-top: 3px solid #0066cc; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p>Cargando reseñas...</p>
          <style>
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </div>
      `;
    }

    renderError() {
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center; color: #d32f2f; border: 1px solid #ffcdd2; border-radius: 4px; background: #ffebee;">
          <strong>❌ Error</strong>
          <p style="margin: 8px 0 0 0; font-size: 14px;">${this.error}</p>
        </div>
      `;
    }

    renderCompact() {
      if (!this.data) return this.renderError();
      const { business, reviews } = this.data;
      const baseUrl = this.getBaseUrl();
      const ratingPercent = Math.round((business.averageRating / 5) * 100);

      return `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 24px;
          max-width: 100%;
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a1a; font-weight: 600;">
                ${this.escapeHtml(business.name)}
              </h3>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 32px; font-weight: bold; color: #0066cc;">
                  ${business.averageRating ? business.averageRating.toFixed(1) : '—'}
                </div>
                <div>
                  <div style="color: #f5b544; font-size: 16px; letter-spacing: 2px;">
                    ${this.stars(business.averageRating)}
                  </div>
                  <div style="font-size: 13px; color: #666; margin-top: 4px;">
                    ${business.totalReviews} ${business.totalReviews === 1 ? 'reseña' : 'reseñas'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <a href="${baseUrl}/review/${business.shareLink}"
               target="_blank"
               rel="noopener noreferrer"
               style="
                 flex: 1;
                 display: inline-block;
                 padding: 10px 16px;
                 background: #0066cc;
                 color: white;
                 text-decoration: none;
                 border-radius: 4px;
                 font-size: 14px;
                 text-align: center;
                 font-weight: 500;
                 border: none;
                 cursor: pointer;
                 transition: background 0.2s;
               "
               onmouseover="this.style.background='#0052a3'"
               onmouseout="this.style.background='#0066cc'">
              Dejar reseña
            </a>
            <a href="${baseUrl}/review/${business.shareLink}"
               target="_blank"
               rel="noopener noreferrer"
               style="
                 flex: 1;
                 display: inline-block;
                 padding: 10px 16px;
                 background: white;
                 color: #0066cc;
                 text-decoration: none;
                 border: 1px solid #0066cc;
                 border-radius: 4px;
                 font-size: 14px;
                 text-align: center;
                 font-weight: 500;
                 cursor: pointer;
                 transition: all 0.2s;
               "
               onmouseover="this.style.background='#f0f7ff'"
               onmouseout="this.style.background='white'">
              Ver todas
            </a>
          </div>

          <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #999;">
            Powered by <strong>ReputationManager</strong>
          </div>
        </div>
      `;
    }

    renderFull() {
      if (!this.data) return this.renderError();
      const { business, reviews } = this.data;
      const baseUrl = this.getBaseUrl();
      const displayReviews = reviews.slice(0, this.maxReviews);

      return `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 24px;
          max-width: 100%;
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        ">
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a1a; font-weight: 600;">
              ${this.escapeHtml(business.name)}
            </h3>
            <div style="display: flex; align-items: center; gap: 16px;">
              <div>
                <div style="font-size: 28px; font-weight: bold; color: #0066cc;">
                  ${business.averageRating ? business.averageRating.toFixed(1) : '—'}
                </div>
              </div>
              <div>
                <div style="color: #f5b544; font-size: 16px; letter-spacing: 2px;">
                  ${this.stars(business.averageRating)}
                </div>
                <div style="font-size: 13px; color: #666; margin-top: 4px;">
                  ${business.totalReviews} ${business.totalReviews === 1 ? 'reseña' : 'reseñas'}
                </div>
              </div>
            </div>
          </div>

          ${displayReviews.length > 0 ? `
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-bottom: 20px;">
              ${displayReviews.map(review => `
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <strong style="color: #1a1a1a; font-size: 14px;">
                      ${this.escapeHtml(review.author)}
                    </strong>
                    <div style="color: #f5b544; font-size: 13px;">
                      ${this.stars(review.rating)}
                    </div>
                  </div>
                  <p style="margin: 8px 0; font-size: 13px; color: #666; line-height: 1.5;">
                    ${this.escapeHtml(review.text)}
                  </p>
                  <div style="font-size: 12px; color: #999;">
                    ${this.formatDate(review.createdAt)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 40px 20px; color: #999;">
              <p style="margin: 0;">Aún no hay reseñas.</p>
              <p style="margin: 8px 0 0 0; font-size: 13px;">¡Sé el primero en dejar una!</p>
            </div>
          `}

          <div style="display: flex; gap: 10px;">
            <a href="${baseUrl}/review/${business.shareLink}"
               target="_blank"
               rel="noopener noreferrer"
               style="
                 flex: 1;
                 display: inline-block;
                 padding: 12px 16px;
                 background: #0066cc;
                 color: white;
                 text-decoration: none;
                 border-radius: 4px;
                 font-size: 14px;
                 text-align: center;
                 font-weight: 500;
                 border: none;
                 cursor: pointer;
                 transition: background 0.2s;
               "
               onmouseover="this.style.background='#0052a3'"
               onmouseout="this.style.background='#0066cc'">
              Dejar reseña
            </a>
            <a href="${baseUrl}/review/${business.shareLink}"
               target="_blank"
               rel="noopener noreferrer"
               style="
                 flex: 1;
                 display: inline-block;
                 padding: 12px 16px;
                 background: white;
                 color: #0066cc;
                 text-decoration: none;
                 border: 1px solid #0066cc;
                 border-radius: 4px;
                 font-size: 14px;
                 text-align: center;
                 font-weight: 500;
                 cursor: pointer;
                 transition: all 0.2s;
               "
               onmouseover="this.style.background='#f0f7ff'"
               onmouseout="this.style.background='white'">
              Ver todas
            </a>
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #999;">
            Powered by <strong>ReputationManager</strong>
          </div>
        </div>
      `;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Auto-initialize on DOMContentLoaded
  function initWidgets() {
    document.querySelectorAll('[id^="rm-widget"]').forEach(container => {
      new ReputationManagerWidget(container);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }

  // Expose globally for manual initialization
  window.ReputationManagerWidget = ReputationManagerWidget;
})();
