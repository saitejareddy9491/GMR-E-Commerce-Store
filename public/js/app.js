const App = (() => {
  // Global Toast Notification Helper
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--success);"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--error);"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    } else {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning);"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    // Auto-remove toast after 3.5s
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Update navbar state based on login credentials
  const updateNavbar = () => {
    const userBadge = document.getElementById('user-badge');
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminNav = document.getElementById('admin-nav');

    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      if (user) {
        userBadge.textContent = `${user.username} (${user.role})`;
        userBadge.style.display = 'inline';
        
        if (user.role === 'admin' && adminNav) {
          adminNav.style.display = 'inline-block';
        }
      }
      authBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
    } else {
      userBadge.style.display = 'none';
      authBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
      if (adminNav) adminNav.style.display = 'none';
    }
  };

  // Update shopping cart badge count
  const updateCartBadge = () => {
    const badge = document.getElementById('cart-badge-count');
    if (badge) {
      const count = Cart.getCount();
      badge.textContent = count;
      if (count > 0) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    }
  };

  // Setup Product Card cursor glow hover effects
  const attachCardGlowHover = () => {
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
      });
    });
  };

  // Store variables
  let allProducts = [];
  let currentCategory = 'all';
  let searchQuery = '';

  // Render product cards on index page
  const renderProductCatalog = () => {
    const grid = document.getElementById('product-grid');
    if (!grid) return; // Not on home page

    // Filter products
    const filtered = allProducts.filter(p => {
      const matchesCategory = currentCategory === 'all' || p.category === currentCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem 0;">
          No technology items found matching search terms.
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(p => {
      const isOutOfStock = p.stock <= 0;
      const card = document.createElement('div');
      card.className = 'product-card';
      
      card.innerHTML = `
        <div class="product-image-wrapper">
          <span class="product-category">${p.category}</span>
          <img src="${p.image_url}" alt="${p.name}">
        </div>
        <div class="product-info">
          <h3>${p.name}</h3>
          <p class="product-desc">${p.description}</p>
          <div class="product-footer">
            <div>
              <div class="product-price">$${p.price.toFixed(2)}</div>
              <div class="product-stock">
                <span class="stock-indicator ${isOutOfStock ? 'stock-out' : ''}"></span>
                ${isOutOfStock ? 'Sold Out' : `Stock: ${p.stock}`}
              </div>
            </div>
            
            <div style="display:flex; gap:0.5rem;">
              <a href="/product.html?id=${p.id}" class="btn btn-secondary" style="padding:0.5rem;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
              <button class="btn btn-primary add-to-cart-btn" data-id="${p.id}" style="padding:0.5rem;" ${isOutOfStock ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach cart actions
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        const product = allProducts.find(p => p.id === id);
        if (product) {
          Cart.addItem(product.id, product.name, product.price, product.image_url, product.category, 1, product.stock);
          showToast(`Synthesized ${product.name} into cart!`, 'success');
        }
      });
    });

    // Bind card glows
    attachCardGlowHover();
  };

  // Setup catalog events (search, filter)
  const setupCatalogEvents = () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProductCatalog();
      });
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        renderProductCatalog();
      });
    });
  };

  // Init method
  const init = async () => {
    updateNavbar();
    updateCartBadge();

    // Bind logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
      });
    }

    // Load store products if on catalog index page
    const grid = document.getElementById('product-grid');
    if (grid) {
      try {
        allProducts = await Api.getProducts();
        setupCatalogEvents();
        renderProductCatalog();
      } catch (err) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; color: var(--error); padding: 4rem 0; font-weight: 600;">
            Failed to connect to Aether core servers. Please check that server.js is running.
          </div>
        `;
      }
    }
  };

  return {
    init,
    showToast,
    updateCartBadge
  };
})();

// Self-initialize on DOM load
document.addEventListener('DOMContentLoaded', App.init);
