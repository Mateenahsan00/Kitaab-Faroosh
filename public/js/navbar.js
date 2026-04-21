/**
 * Kitaab Faroosh — Universal Navbar Module
 */
(() => {

  // Version Tracking
  console.log("Kitaab Faroosh Navbar Module Loaded - v1.0.2");

  async function fetchSession() {
    try { const r = await fetch('/session'); return r.json(); } catch { return { loggedIn: false }; }
  }

  function currentPathname() {
    return location.pathname.replace(/\/+$/, '');
  }

  function markActive(nav) {
    const p = currentPathname();
    const map = {
      '/home.html': 'home',
      '/college.html': 'college',
      '/school.html': 'school',
      '/university.html': 'university',
      '/faq.html': 'faq',
      '/contact-us.html': 'contact',
    };
    const key = map[p] || '';
    if (key) {
      nav.querySelectorAll('.nav-link').forEach(a => {
        const name = a.getAttribute('data-nav');
        if (name === key) a.classList.add('active');
      });
    }
  }

  // ─── Toast notification ───
  // Lightweight toast utility for ephemeral messages (e.g., new chat notifications).

  function showToast(message, emoji = '🔔', duration = 5000, onClick = null) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      background:#fff;
      border:1px solid var(--border-light);
      border-left:4px solid var(--secondary);
      border-radius:4px;
      padding:16px;
      box-shadow:var(--shadow-lg);
      font-family:inherit;
      font-size:14px;
      font-weight:600;
      color:var(--primary);
      max-width:320px;
      pointer-events:all;
      display:flex;
      align-items:flex-start;
      gap:12px;
      animation:toastIn 0.3s ease;
    `;
    toast.innerHTML = `<span style="font-size:20px">${emoji}</span><span>${message}</span>`;

    // inject animation keyframes if not present
    if (!document.getElementById('toastStyles')) {
      const s = document.createElement('style');
      s.id = 'toastStyles';
      s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateY(10px)}}';
      document.head.appendChild(s);
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);

    if(onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', () => { onClick(); toast.remove(); });
    } else {
      toast.addEventListener('click', () => toast.remove());
    }
  }


  window.showToast = showToast;

 
  function setChatBadge(count) {
    const badges = document.querySelectorAll('#chatUnreadBadge, .global-chat-badge');
    badges.forEach(b => {
      b.textContent = count > 99 ? '99+' : count;
      b.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  window.updateGlobalChatBadge = async () => {
    try {
      const r = await fetch('/api/messages/unread-count');
      const d = await r.json();
      if (d.success) setChatBadge(d.count || 0);
    } catch {}
  };

  function connectSocket(userId) {
    // Load the Socket.IO client from the server
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
      const socket = window.io(); // eslint-disable-line no-undef
      socket.emit('register', userId);

      socket.on('receive_message', (data) => {
        const preview = data.message_text
          ? (data.message_text.length > 60 ? data.message_text.slice(0, 60) + '…' : data.message_text)
          : 'You have a new message';
        showToast(`New message: "${preview}"`, '💬', 5000, () => {
          window.location.href = `/my-chats.html?chatId=${data.conversation_id}`;
        });

        // Increment chat badge
        if (_chatBadgeEl) {
          const current = parseInt(_chatBadgeEl.textContent) || 0;
          setChatBadge(current + 1);
        }

        // Also inject into notification list
        const list = document.querySelector('#notifMount .notif-list');
        if (list) {
          const li = document.createElement('li');
          li.className = 'notif-item unread';
          li.style.cssText = 'padding:8px;border-bottom:1px solid var(--input-border);background:#fffdf0;cursor:pointer;';
          li.onclick = () => { window.location.href = `/my-chats.html?chatId=${data.conversation_id}`; };
          li.innerHTML = `<div style="font-weight:600">💬 New message: "${preview}"</div><div style="font-size:12px;color:var(--text-muted)">Just now</div>`;
          list.insertBefore(li, list.firstChild);
          // Update bell badge
          const badge = document.getElementById('notifBadge');
          if (badge) { badge.textContent = parseInt(badge.textContent||0)+1; badge.style.display='inline-flex'; }
        }
      });

      // Someone favorited the user's item
      socket.on('new_favorite', (data) => {
        const msg = `<strong>${data.from_name}</strong> liked your listing "<strong>${data.item_title}</strong>"`;
        showToast(msg, '❤️');

        const list = document.querySelector('#notifMount .notif-list');
        if (list) {
          const li = document.createElement('li');
          li.className = 'notif-item unread';
          li.style.cssText = 'padding:8px;border-bottom:1px solid var(--input-border);background:#fff0f0;';
          li.innerHTML = `<div style="font-weight:600">❤️ ${msg}</div><div style="font-size:12px;color:var(--text-muted)">Just now</div>`;
          list.insertBefore(li, list.firstChild);
          const badge = document.getElementById('notifBadge');
          if (badge) { badge.textContent = parseInt(badge.textContent||0)+1; badge.style.display='inline-flex'; }
        }
      });

      // New order received (for seller)
      socket.on('new_order', (data) => {
        showToast(data.message, '📦', 7000, () => {
          window.location.href = '/my-ads.html?tab=orders';
        });
        updateNotifUI(data.message, 'item_sold', '/my-ads.html?tab=orders');
      });

      // Order status updated (for buyer)
      socket.on('order_update', (data) => {
        showToast(data.message, '📦', 7000, () => {
          window.location.href = '/my-orders.html';
        });
        updateNotifUI(data.message, 'order_update', '/my-orders.html');
      });
    };
    document.head.appendChild(script);
  }

  function updateNotifUI(message, type, url) {
    const list = document.querySelector('#notifMount .notif-list');
    if (list) {
      const li = document.createElement('li');
      li.className = 'notif-item unread';
      li.style.cssText = 'padding:8px;border-bottom:1px solid var(--input-border);background:#f0f7ff;cursor:pointer;';
      if (url) li.onclick = () => { window.location.href = url; };
      li.innerHTML = `<div style="font-weight:600">${message}</div><div style="font-size:12px;color:var(--text-muted)">Just now</div>`;
      list.insertBefore(li, list.firstChild);
      
      const badge = document.getElementById('notifBadge');
      if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
        badge.style.display = 'inline-flex';
      }
    }
  }

  // Mounts the universal navbar, personalizes it based on auth state,
  // and binds interactivity for profile menu and notifications.
  async function mountNavbar() {
    try {
      const mount = document.createElement('div');
      mount.id = 'universalNavbar';
      const tpl = await (await fetch('/partials/navbar.html', { cache: 'no-cache' })).text();
      // Inject the fetched HTML into a container at the top of the body.
      mount.innerHTML = tpl;
      document.body.insertBefore(mount, document.body.firstChild);
      // Hide any other header elements to avoid duplicate navbars on pages with static headers.
      document.querySelectorAll('header').forEach(h => { if (h !== mount.querySelector('header')) h.style.display = 'none'; });
      const s = await fetchSession();
      const auth = mount.querySelector('#authArea');
      const nav = mount.querySelector('.nav-secondary');
      const isLanding = ['/', '/index.html'].includes(currentPathname() || location.pathname);
      if (s.loggedIn) {
        // Ensure "Home" link is present for logged-in users.
        // Inject "Home" link
        if (nav && !nav.querySelector('[data-nav="home"]')) {
          const a = document.createElement('a');
          a.className = 'nav-link';
          a.setAttribute('data-nav', 'home');
          a.href = '/home.html';
          a.textContent = 'Home';
          nav.insertAdjacentElement('afterbegin', a);
        }

        const userAvatar = (s.user && s.user.profile_pic)
          ? `<img src="${s.user.profile_pic}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`
          : '<span>👤</span>';

        // Build authenticated action area
        const chatsLinkHtml = `
          <a href="/my-chats.html" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:4px;color:inherit;text-decoration:none;font-weight:600">
            <span style="display:flex;align-items:center;gap:10px">💬 My Chats</span>
            <span id="chatUnreadBadge" style="display:none;background:var(--danger);color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:800;">0</span>
          </a>`;

        auth.innerHTML = `
          <a class="btn btn-sell" href="/sell.html">+ SELL</a>
          <div style="position:relative">
            <button id="profToggle" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;border-radius:4px;border:1px solid var(--border-light);background:#fff;font-size:14px;font-weight:600">
              ${userAvatar}<span>${(s.user && s.user.full_name) || 'Profile'}</span><span>▾</span>
            </button>
            <div id="profMenu" style="position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--border-light);border-radius:4px;box-shadow:var(--shadow-lg);padding:8px;display:none;min-width:220px">
              <a href="/my-profile.html" style="display:block;padding:10px 12px;border-radius:4px;color:inherit;text-decoration:none;font-weight:600;font-size:14px">📊 My Dashboard</a>
              <a href="/my-ads.html?tab=orders" style="display:block;padding:10px 12px;border-radius:4px;color:inherit;text-decoration:none;font-weight:600;font-size:14px">🔔 Order Requests</a>
              <a href="/my-orders.html" style="display:block;padding:10px 12px;border-radius:4px;color:inherit;text-decoration:none;font-weight:600;font-size:14px">📦 My Orders</a>
              ${chatsLinkHtml}
              <a href="/favorites.html" style="display:block;padding:10px 12px;border-radius:4px;color:inherit;text-decoration:none;font-weight:600;font-size:14px">❤️ My Favorites</a>
              <a href="/cart.html" style="display:block;padding:10px 12px;border-radius:4px;color:inherit;text-decoration:none;font-weight:600;font-size:14px">🛒 My Cart</a>
              <hr style="margin:8px 0; border:0; border-top:1px solid var(--border-light);">
              <a href="#" id="logoutLink" style="display:block;padding:10px 12px;border-radius:4px;color:var(--danger);text-decoration:none;font-weight:700;font-size:14px">🚪 Logout</a>
            </div>
          </div>
        `;

        // Bind profile menu toggling and logout behavior.
        const profToggle = auth.querySelector('#profToggle');
        const profMenu = auth.querySelector('#profMenu');
        profToggle.addEventListener('click', () => {
          profMenu.style.display = profMenu.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => { if (!auth.contains(e.target)) profMenu.style.display = 'none'; });
        auth.querySelector('#logoutLink').addEventListener('click', async (e) => { e.preventDefault(); try { await fetch('/logout'); } catch {} location.href = '/'; });

        // Ensure panels close on navigation
        document.addEventListener('click', (e) => {
          if (e.target.closest('a')) {
            document.querySelectorAll('.notif-panel, #profMenu').forEach(p => p.style.display = 'none');
          }
        });

        // Save reference to badge element
        _chatBadgeEl = document.getElementById('chatUnreadBadge');

        // ─── Notification Bell ───
        // Renders notification bell, loads recent notifications on open,
        // and allows marking all as read.
        const bellMount = mount.querySelector('#notifMount');
        if (bellMount) {
          bellMount.style.display = 'inline-block';
          bellMount.innerHTML = `
            <button class="notif-btn" id="notifBtn" aria-label="Notifications" style="position:relative;border:1px solid var(--border-light);background:#fff;padding:8px 12px;border-radius:4px;cursor:pointer">
              <span class="notif-icon">🔔</span>
              <span id="notifBadge" class="notif-badge" style="display:none;position:absolute;top:-8px;right:-8px;background:var(--danger);color:#fff;border-radius:999px;padding:2px 6px;font-size:11px;font-weight:800;border:2px solid #fff;">0</span>
            </button>
            <div class="notif-panel" id="notifPanel" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--border-light);border-radius:4px;box-shadow:var(--shadow-lg);padding:0;min-width:320px;max-height:450px;overflow:hidden;flex-direction:column">
              <div class="notif-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--border-light);background:#f8f9fa">
                <div style="font-weight:800;font-size:15px;color:var(--primary)">🔔 Notifications</div>
                <a id="notifMarkAll" style="cursor:pointer;font-weight:700;color:var(--secondary);font-size:12px">Mark all read</a>
              </div>
              <ul class="notif-list" style="list-style:none;margin:0;padding:0;overflow-y:auto;flex:1"></ul>
            </div>
          `;
          async function loadNotifications() {
            try {
              const r = await fetch('/api/notifications?limit=20');
              const d = await r.json();
              if (!d.success) return;
              const list = d.notifications || [];
              const listEl = bellMount.querySelector('.notif-list');
              const existingRealtime = Array.from(listEl.querySelectorAll('.notif-item[data-realtime]'));
              const staticHtml = list.map(n => `
                <li class="notif-item ${n.read_status === 'unread' ? 'unread' : ''}" style="padding:8px;border-bottom:1px solid var(--input-border);${n.action_url ? 'cursor:pointer;' : ''}" ${n.action_url ? `onclick="window.location.href='${n.action_url}'"` : ''}>
                  <div style="font-weight:600">${n.message}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${new Date(n.created_at).toLocaleString()}</div>
                </li>`).join('') || '<li class="notif-item"><div style="padding:12px;color:var(--text-muted);text-align:center">No notifications yet</div></li>';
              listEl.innerHTML = staticHtml;
              // Re-prepend realtime items
              existingRealtime.reverse().forEach(rt => listEl.insertBefore(rt, listEl.firstChild));
              const unread = d.unreadCount || 0;
              const badge = bellMount.querySelector('#notifBadge');
              badge.textContent = unread > 99 ? '99+' : unread;
              badge.style.display = unread > 0 ? 'inline-flex' : 'none';
            } catch {}
          }
          const panel = bellMount.querySelector('#notifPanel');
          bellMount.querySelector('#notifBtn').addEventListener('click', async () => {
            const open = panel.style.display === 'flex';
            document.querySelectorAll('.notif-panel').forEach(p => p.style.display = 'none');
            if (!open) { panel.style.display = 'flex'; await loadNotifications(); } else { panel.style.display = 'none'; }
          });
          document.addEventListener('click', (e) => { if (!bellMount.contains(e.target)) panel.style.display = 'none'; });
          bellMount.querySelector('#notifMarkAll').addEventListener('click', async () => {
            try { await fetch('/api/notifications/mark-all-read', { method: 'POST' }); } catch {}
            await loadNotifications();
          });
          loadNotifications();
        }

        // ─── Load initial unread message count ───
        // Retrieves baseline unread count to show on the chat badge.
        try {
          const ucRes = await fetch('/api/messages/unread-count');
          const ucData = await ucRes.json();
          if (ucData.success) setChatBadge(ucData.count || 0);
        } catch {}

        // ─── Connect real-time socket ───
        // Registers the user with the socket for live updates.
        if (s.user && s.user.id) {
          connectSocket(s.user.id);
        }

      } else {
        // Not logged in: render actions suitable to landing vs other pages.
        auth.innerHTML = `
          <a class="btn btn-outline" href="/index.html?mode=login" id="loginNavBtn">Login</a>
          <a class="btn btn-primary" href="/index.html?mode=signup" id="signupNavBtn">Sign Up</a>
        `;
        
        // If on landing page, override default link behavior to open modals directly
        if (isLanding) {
          const lBtn = document.getElementById('loginNavBtn');
          const sBtn = document.getElementById('signupNavBtn');
          if (lBtn) lBtn.onclick = (e) => { e.preventDefault(); if(window.openModal) window.openModal('login'); };
          if (sBtn) sBtn.onclick = (e) => { e.preventDefault(); if(window.openModal) window.openModal('signup'); };
        }
      }
      markActive(nav);
      // Login success ribbon
      // Shows a temporary success bar when redirected with ?login=success, then cleans the URL.
      const url = new URL(location.href);
      if (url.searchParams.get('login') === 'success') {
        const bar = document.createElement('div');
        bar.className = 'success-bar';
        bar.textContent = 'You have successfully logged in.';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#2d5016,#3d6b1f);color:#a8e063;padding:14px 20px;text-align:center;font-weight:600;z-index:60;border-bottom:2px solid #4a7c2a;';
        document.body.appendChild(bar);
        setTimeout(() => { bar.remove(); }, 2500);
        url.searchParams.delete('login');
        history.replaceState({}, '', url.toString());
      }
    } catch {}
  }
  // Ensure the navbar mounts after the DOM is ready for reliable insertion at the top of <body>.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavbar);
  } else {
    mountNavbar();
  }
})();
