async function openMenu() {
  console.log("openMenu triggered");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  
  if (!sidebar) {
    console.warn("Menu sidebar not found in DOM. Attempting emergency injection...");
    await injectMenu();
    const newSidebar = document.getElementById("sidebar");
    const newOverlay = document.getElementById("overlay");
    if (newSidebar) newSidebar.classList.add("active");
    if (newOverlay) newOverlay.classList.add("active");
    return;
  }

  sidebar.classList.add("active");
  if (overlay) overlay.classList.add("active");
  
  // Desktop shimmer feedback
  if (window.innerWidth >= 992) {
      sidebar.style.transition = 'all 0.3s ease';
      sidebar.style.boxShadow = '0 0 30px rgba(42,125,225,0.4)';
      setTimeout(() => sidebar.style.boxShadow = '', 500);
  }
}

async function injectMenu() {
  const menuContainer = document.getElementById("menu-container");
  if (!menuContainer) {
    console.error("Menu container (#menu-container) missing from page!");
    return;
  }
  try {
    const response = await fetch("components/menu.html");
    if (!response.ok) throw new Error("Menu component fetch failed");
    const html = await response.text();
    menuContainer.innerHTML = html;
    console.log("Menu injected successfully");
    // Re-run highlighting logic
    highlightActiveLink();
  } catch (err) {
    console.error("Failed to inject menu:", err);
  }
}

function highlightActiveLink() {
  const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
  const navLinks = document.querySelectorAll("#navMenu a");
  navLinks.forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.parentElement.classList.add("active");
    }
  });
}

function closeMenu() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  if (sidebar) sidebar.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

async function logout() {
  if (window.supabase) {
    await window.supabase.auth.signOut();
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inject Menu
  await injectMenu();

  // 2. Fetch Full User Data for Menu if Supabase is available
  if (window.supabase) {
    const { data: { user }, error: authErr } = await window.supabase.auth.getUser();
    
    if (user && !authErr) {
      
      // Ping database for the custom fields
      const { data, error } = await window.supabase
        .from('users')
        .select('first_name, last_name, avatar_url, merchant_id, role, wallet_balance')
        .eq('id', user.id)
        .single();
        
      setTimeout(() => {
        // Name Logic
        let firstName = data?.first_name || "User";
        let lastName = data?.last_name || "";
        const sidebarNameElem = document.getElementById("sidebarName");
        if (sidebarNameElem) sidebarNameElem.innerText = `${firstName} ${lastName}`.trim();

        // Email
        const sidebarEmailElem = document.getElementById("sidebarEmail");
        if(sidebarEmailElem) sidebarEmailElem.innerText = user.email;

        // Balance
        const sidebarBalance = document.getElementById("sidebarBalance");
        if(sidebarBalance) {
          sidebarBalance.innerText = parseFloat(data?.wallet_balance || 0).toFixed(2);
        }

        // ==========================================
        // ROLE BADGE LOGIC
        // ==========================================
        const roleConfig = {
          'admin':        { label: 'ADMIN',        bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', prefix: 'ADMIN-CODE: ' },
          'super_agent':  { label: 'SUPER AGENT',  bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', prefix: 'AGENT-CODE: ' },
          'elite_agent':  { label: 'ELITE AGENT',  bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', prefix: 'AGENT-CODE: ' },
          'vip_customer': { label: 'VIP CUSTOMER', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', prefix: 'VIP-CODE: ' },
          'client':       { label: 'CLIENT',       bg: '#e2e8f0',               color: '#64748b', prefix: 'CLIENT CODE: ' },
        };

        const userRole = data?.role || 'client';
        const roleStyle = roleConfig[userRole] || roleConfig['client'];

        // Merchant ID / Client Code Logic
        const sidebarMerchantElem = document.getElementById("sidebarMerchant");
        if(sidebarMerchantElem && data?.merchant_id) {
          sidebarMerchantElem.innerText = (roleStyle.prefix || 'CODE: ') + data.merchant_id.toUpperCase();
        }

        // Store role globally for other pages
        window.currentUserRole = userRole;

        // Visibility Toggles using classes instead of broken div structure
        const adminItems = document.querySelectorAll(".admin-nav-item");
        const agentItems = document.querySelectorAll(".agent-nav-item");

        adminItems.forEach(el => {
          el.style.display = (userRole === 'admin') ? 'block' : 'none';
        });

        agentItems.forEach(el => {
          el.style.display = (userRole === 'client') ? 'none' : 'block';
        });

        // Avatar Logic
        let initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase() || 'D4';
        const avatarElem = document.querySelector(".avatar");
        
        if (avatarElem) {
            if(data?.avatar_url) {
                avatarElem.innerHTML = `<img src="${data.avatar_url}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                avatarElem.style.background = 'transparent';
                avatarElem.style.color = 'transparent';
            } else {
                avatarElem.innerText = initials;
            }
        }
      }, 100);
    }
  }
});

// GLOBAL SUCCESS MODAL INJECTOR
window.showSuccessPopup = function(title, message, callback) {
  let overlay = document.getElementById("globalSuccessOverlay");
  
  // Create it on the fly if it doesn't exist
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "globalSuccessOverlay";
    overlay.className = "success-overlay";
    overlay.innerHTML = `
      <div class="success-modal">
        <div class="success-icon">✓</div>
        <h3 id="successTitle">Success!</h3>
        <p id="successMessage">Action completed successfully.</p>
        <button class="success-btn" id="successBtn">Continue</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  // Set Text
  document.getElementById("successTitle").innerText = title;
  document.getElementById("successMessage").innerText = message;
  
  // Refresh Button Listeners
  const btn = document.getElementById("successBtn");
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener("click", () => {
    overlay.classList.remove("active");
    if (callback) callback();
  });
  
  // Activate CSS animations
  setTimeout(() => overlay.classList.add("active"), 10);
};

// GLOBAL SMS DISPATCHER (moved to supabase.js)
