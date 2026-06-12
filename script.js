'use strict';

console.log("=== script.js is executing ===");

// ── Supabase Configuration ────────────────────────────────────────────────
const supabaseUrl = 'https://zirvmdtbonemnomxleeu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcnZtZHRib25lbW5vbXhsZWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzM5MTQsImV4cCI6MjA5Njc0OTkxNH0.ED0mLPelog-BYIFYXcBXha2QuCxUtzeRFAemuSOzehE';

let supabaseClient = null;

// Fail-safe wrapper initialization to secure landing layout flow
try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  } else if (window.supabaseJs) {
    supabaseClient = window.supabaseJs.createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn('Supabase CDN not loaded. Running in offline/demo mode.');
  }
} catch (err) {
  console.error('Supabase initialization failed:', err);
}

// ── Sample Seed Data (Used to initialize fresh database tables if empty) ─
const SAMPLE_RESOURCES = [
  { id: 1, type: 'blood', emoji: '🩸', direction: 'need', title: 'B+ Blood Needed Urgently', loc: 'Bhopal', area: 'Bhopal (Arera Colony)', km: 1.2, urgent: true, contact: '+91-98765-00001', name: 'Ramesh Kumar', posted: '2 min ago', lat: 23.2100, lng: 77.4200 },
  { id: 2, type: 'blood', emoji: '🩸', direction: 'offer', title: 'O- Rare Blood Donor Available', loc: 'Bhopal', area: 'Bhopal (M P Nagar)', km: 2.1, urgent: true, contact: '+91-98765-00005', name: 'Deepak Roy', posted: '5 min ago', lat: 23.2300, lng: 77.4350 },
  { id: 3, type: 'blood', emoji: '🩸', direction: 'offer', title: 'A+ Blood Donor Volunteer', loc: 'Indore', area: 'Indore (Vijay Nagar)', km: 3.5, urgent: false, contact: '+91-98765-00010', name: 'Sunil Gwalior', posted: '25 min ago', lat: 22.7500, lng: 75.8900 },
  { id: 4, type: 'transport', emoji: '🚑', direction: 'offer', title: 'Ambulance Service (24/7)', loc: 'Bhopal', area: 'Bhopal (Habibganj)', km: 1.0, urgent: true, contact: '+91-98765-00018', name: 'Sohan Lal', posted: '4 min ago', lat: 23.2150, lng: 77.4400 },
  { id: 5, type: 'medicine', emoji: '💊', direction: 'offer', title: 'Oxygen Cylinder (10L Filled)', loc: 'Bhopal', area: 'Bhopal (Lalghati)', km: 4.8, urgent: true, contact: '+91-98765-00026', name: 'Narendra Dev', posted: '11 min ago', lat: 23.2700, lng: 77.3600 },
  { id: 6, type: 'food', emoji: '🍱', direction: 'offer', title: 'Home-cooked Meals ×10', loc: 'Jabalpur', area: 'Jabalpur (Ranjhi)', km: 5.0, urgent: false, contact: '+91-98765-00004', name: 'Sita Devi', posted: '2 hr ago', lat: 23.1900, lng: 80.0050 },
  { id: 7, type: 'shelter', emoji: '🏠', direction: 'offer', title: 'Safe Room for 2 persons', loc: 'Sehore', area: 'Sehore (Chanakyapuri)', km: 8.3, urgent: false, contact: '+91-98765-00006', name: 'Meena Thakur', posted: '3 hr ago', lat: 23.2120, lng: 77.0950 }
];

const TICKER_ITEMS = [
  '🩸 17 active donors near you',
  '🚑 38 transport offers available',
  '💊 19 medicine donations listed',
  '🏠 6 shelter spots open',
  '🍱 12 food packages ready',
  '🆘 3 emergency SOS active',
];

const CATEGORIES = [
  { id: 'all', emoji: '🔍', label: 'All' },
  { id: 'blood', emoji: '🩸', label: 'Blood' },
  { id: 'transport', emoji: '🚑', label: 'Transport' },
  { id: 'medicine', emoji: '💊', label: 'Medicine' },
  { id: 'food', emoji: '🍱', label: 'Food' },
  { id: 'shelter', emoji: '🏠', label: 'Shelter' },
];

// ── Application State ─────────────────────────────────────────────────────
let currentScreen = 's-landing';
let currentTab = 'home';
let homeCat = 'all';
let homeSearchLoc = '';
let appMode = 'seeker'; // 'seeker' (Need Help) or 'provider' (Can Help)
let dbResources = [];      // Live data fetched from Supabase
let dbNotifications = [];      // User notifications from Supabase
let currentUser = null;    // Supabase Authenticated User
let userProfile = null;    // Decoupled user metadata profile
let isSignUpMode = false;   // Handles Login/Signup screen state toggle
let mockChats = [];      // In-memory chats for offline/demo mode

// Active Chat Subscription Handlers
let activeChatRoomId = null;
let activeChatSubscription = null;
let activeChatMessages = [];
let currentChatResource = null;

// Profile summary metrics
let myPostCount = 0;
let myResponseCount = 0;

// ── Geocoding & Adaptive Search Logic ──────────────────────────────────────
const KNOWN_PLACES = {
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'connaught place': { lat: 28.6304, lng: 77.2177 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'jabalpur': { lat: 23.1815, lng: 79.9864 },
  'sehore': { lat: 23.2032, lng: 77.0844 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'gurgaon': { lat: 28.4595, lng: 77.0266 },
  'gurugram': { lat: 28.4595, lng: 77.0266 }
};

function getCoordinatesForSearch(query) {
  const q = query.trim().toLowerCase();
  for (const place in KNOWN_PLACES) {
    if (q.includes(place) || place.includes(q)) {
      return KNOWN_PLACES[place];
    }
  }
  let hash = 0;
  for (let i = 0; i < q.length; i++) {
    hash = q.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 20.0 + Math.abs(hash % 100) / 10.0;
  const lng = 75.0 + Math.abs((hash >> 8) % 100) / 10.0;
  return { lat, lng };
}

// ── Supabase Database Sync Logic ──────────────────────────────────────────

// Seeds database with sample resources if completely empty
async function seedDatabaseIfEmpty() {
  if (!supabaseClient || !currentUser) return;
  try {
    const { count, error } = await supabaseClient
      .from('resources')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    if (count === 0) {
      showToast('🌱 Seeding demo posts to active map...');
      const seedItems = SAMPLE_RESOURCES.map(r => ({
        user_id: currentUser.id,
        category: r.type.charAt(0).toUpperCase() + r.type.slice(1),
        resource_type: r.direction,
        title: r.title,
        description: `Demo coordinates set in ${r.area}.`,
        location: r.area || r.loc,
        latitude: r.lat,
        longitude: r.lng,
        contact_number: r.contact,
        urgency_level: r.urgent ? 'urgent' : 'standard',
        status: 'active'
      }));

      const { error: insertError } = await supabaseClient
        .from('resources')
        .insert(seedItems);

      if (insertError) throw insertError;
      showToast('✅ Map seeded!');
    }
  } catch (err) {
    console.error('Seeding check failed:', err);
  }
}

// Loads active resources from DB
async function loadResources() {
  if (!supabaseClient) {
    // In demo mode, load SAMPLE_RESOURCES or existing dbResources
    if (dbResources.length === 0) {
      dbResources = SAMPLE_RESOURCES.map(r => ({
        id: r.id,
        user_id: 'mock-user-id',
        type: r.type,
        emoji: r.emoji,
        direction: r.direction,
        title: r.title,
        description: `Mock coordinates set in ${r.area || r.loc}.`,
        loc: r.area || r.loc,
        area: r.area || r.loc,
        km: r.km || 1.5,
        urgent: r.urgent,
        contact: r.contact,
        name: r.name,
        posted: r.posted || '5 min ago',
        lat: r.lat,
        lng: r.lng
      }));
    }

    // Recompute distances dynamically if home search coordinates are set
    if (homeSearchLoc.trim()) {
      const center = getCoordinatesForSearch(homeSearchLoc);
      dbResources.forEach(r => {
        const dist = calculateDistance(center.lat, center.lng, r.lat, r.lng);
        r.km = Math.round(dist * 10) / 10;
      });
    }
    return;
  }

  if (!currentUser) return;
  await seedDatabaseIfEmpty();

  try {
    const { data, error } = await supabaseClient
      .from('resources')
      .select(`
        *,
        profiles:user_id (
          full_name,
          profile_photo
        )
      `)
      .eq('status', 'active');

    if (error) throw error;

    dbResources = data.map(r => ({
      id: r.id,
      user_id: r.user_id,
      type: r.category.toLowerCase(),
      emoji: r.category === 'Blood' ? '🩸' : r.category === 'Transport' ? '🚑' : r.category === 'Medicine' ? '💊' : r.category === 'Food' ? '🍱' : '🏠',
      direction: r.resource_type,
      title: r.title,
      description: r.description,
      loc: r.location,
      area: r.location,
      km: 1.5, // Mock initial distance calculation
      urgent: r.urgency_level === 'urgent',
      contact: r.contact_number,
      name: r.profiles?.full_name || 'Anonymous User',
      posted: timeAgo(new Date(r.created_at)),
      lat: r.latitude,
      lng: r.longitude
    }));

    // Recompute distances dynamically if home search coordinates are set
    if (homeSearchLoc.trim()) {
      const center = getCoordinatesForSearch(homeSearchLoc);
      dbResources.forEach(r => {
        const dist = calculateDistance(center.lat, center.lng, r.lat, r.lng);
        r.km = Math.round(dist * 10) / 10;
      });
    }
  } catch (err) {
    console.error('Error fetching resources:', err);
    showToast('⚠️ Error loading active map data');
  }
}

// Loads notifications
async function loadNotifications() {
  if (!supabaseClient) {
    dbNotifications = [
      { id: 'mock-notif-1', type: 'new_resource_match', title: '🩸 Active Blood Request Nearby', content: 'O- Rare Blood needed at Arera Colony (Bhopal)', created_at: new Date().toISOString(), is_read: false },
      { id: 'mock-notif-2', type: 'emergency_alert', title: '🚨 SOS Broadcaster Notification', content: 'A guest user triggered an SOS emergency near you!', created_at: new Date(Date.now() - 300000).toISOString(), is_read: false }
    ];
    return;
  }
  if (!currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    dbNotifications = data;
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

// Loads summary counts for profile metrics page
async function loadProfileCounts() {
  if (!supabaseClient) {
    myPostCount = dbResources.filter(r => r.name === (userProfile?.full_name || 'Demo User')).length;
    myResponseCount = 0;
    return;
  }
  if (!currentUser) return;
  try {
    const { count: postsCount } = await supabaseClient
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);

    myPostCount = postsCount || 0;

    const { count: chatsCount } = await supabaseClient
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`);

    myResponseCount = chatsCount || 0;
  } catch (err) {
    console.error(err);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hrs ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min ago";
  return "Just now";
}

function getFilteredHomeResources() {
  let resources = [...dbResources];

  // Seeker Mode -> Show offers. Provider Mode -> Show requests (needs).
  if (appMode === 'seeker') {
    resources = resources.filter(r => r.direction === 'offer');
  } else {
    resources = resources.filter(r => r.direction === 'need');
  }

  // Category selection pill filter
  if (homeCat !== 'all') {
    resources = resources.filter(r => r.type === homeCat);
  }

  return resources;
}

// ── Screen Routing ────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('show'));
  const target = document.getElementById(id);
  if (target) target.classList.add('show');
  currentScreen = id;
}

window.goToLogin = function () {
  isSignUpMode = false;

  // Directly set Sign In UI state (do NOT call toggleAuthMode — it flips the mode)
  const signupFields = document.querySelectorAll('.signup-only');
  signupFields.forEach(f => f.classList.add('hidden'));
  const titleEl = document.getElementById('login-title');
  const subtitleEl = document.getElementById('login-subtitle');
  const submitBtn = document.getElementById('login-submit-btn');
  const footerText = document.getElementById('login-footer-text');
  const options = document.getElementById('login-options-container');
  if (titleEl) titleEl.textContent = "Welcome back";
  if (subtitleEl) subtitleEl.textContent = "Sign in to access emergency resources";
  if (submitBtn) submitBtn.textContent = "Sign In";
  if (options) options.style.display = "flex";
  if (footerText) footerText.innerHTML = `Don't have an account? <a href="#" onclick="event.preventDefault(); isSignUpMode=true; toggleAuthMode();">Sign up free</a>`;

  // Clear inputs
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const nameInput = document.getElementById('login-fullname');
  const phoneInput = document.getElementById('login-phone');
  if (emailInput) emailInput.value = '';
  if (passInput) {
    passInput.value = '';
    passInput.type = 'password';
  }
  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';

  const eyeIcon = document.getElementById('eye-icon');
  if (eyeIcon) {
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }

  showScreen('s-login');
};

window.backToLanding = function () {
  showScreen('s-landing');
};

window.toggleLoginPassword = function () {
  const passInput = document.getElementById('login-password');
  const eyeIcon = document.getElementById('eye-icon');
  if (!passInput) return;

  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (eyeIcon) {
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      `;
    }
  } else {
    passInput.type = 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    }
  }
};

// Toggle Auth inputs Signin/Signup
window.toggleAuthMode = function () {
  const signupFields = document.querySelectorAll('.signup-only');
  const title = document.getElementById('login-title');
  const subtitle = document.getElementById('login-subtitle');
  const submitBtn = document.getElementById('login-submit-btn');
  const footerText = document.getElementById('login-footer-text');
  const options = document.getElementById('login-options-container');

  if (isSignUpMode) {
    // Switching to Sign In
    isSignUpMode = false;
    signupFields.forEach(f => f.classList.add('hidden'));
    if (title) title.textContent = "Welcome back";
    if (subtitle) subtitle.textContent = "Sign in to access emergency resources";
    if (submitBtn) submitBtn.textContent = "Sign In";
    if (options) options.style.display = "flex";
    if (footerText) footerText.innerHTML = `Don't have an account? <a href="#" onclick="event.preventDefault(); isSignUpMode=true; toggleAuthMode();">Sign up free</a>`;
  } else {
    // Switching to Sign Up
    isSignUpMode = true;
    signupFields.forEach(f => f.classList.remove('hidden'));
    if (title) title.textContent = "Create Account";
    if (subtitle) subtitle.textContent = "Register today to start coordinating help";
    if (submitBtn) submitBtn.textContent = "Sign Up Free";
    if (options) options.style.display = "none";
    if (footerText) footerText.innerHTML = `Already have an account? <a href="#" onclick="event.preventDefault(); isSignUpMode=false; toggleAuthMode();">Sign in</a>`;
  }
};

window.submitLogin = async function () {
  const emailVal = document.getElementById('login-email')?.value?.trim();
  const passVal = document.getElementById('login-password')?.value?.trim();

  if (!emailVal) {
    showToast('⚠️ Please enter your email address');
    return;
  }
  if (!passVal) {
    showToast('⚠️ Please enter your password');
    return;
  }

  if (!supabaseClient) {
    showToast('🔑 Logging in to Demo Guest Account...');
    const nameVal = document.getElementById('login-fullname')?.value?.trim() || emailVal.split('@')[0];
    currentUser = {
      id: 'demo-user-id',
      email: emailVal
    };
    userProfile = {
      full_name: nameVal,
      profile_photo: '',
      current_mode: 'need_help'
    };
    appMode = 'seeker';
    updateTopbarAvatar();
    showScreen('s-role-select');
    return;
  }

  if (isSignUpMode) {
    const nameVal = document.getElementById('login-fullname')?.value?.trim() || 'Anonymous';
    const phoneVal = document.getElementById('login-phone')?.value?.trim() || '';

    showToast('Creating profile...');
    const { data, error } = await supabaseClient.auth.signUp({
      email: emailVal,
      password: passVal,
      options: {
        data: {
          full_name: nameVal,
          phone_number: phoneVal
        }
      }
    });

    if (error) {
      showToast(`⚠️ Signup Failed: ${error.message}`);
      return;
    }
    showToast('👋 Sign up successful! Sign-in initialized.');
  } else {
    showToast('Authenticating...');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailVal,
      password: passVal
    });

    if (error) {
      showToast(`⚠️ Auth Failed: ${error.message}`);
      return;
    }
  }
};

window.submitGoogleLogin = async function () {
  if (!supabaseClient) {
    showToast('🔑 Logging in with Google (Demo/Offline)...');
    currentUser = {
      id: 'demo-google-user',
      email: 'demo.google@example.com'
    };
    userProfile = {
      full_name: 'Demo Google User',
      profile_photo: '',
      current_mode: 'need_help'
    };
    appMode = 'seeker';
    updateTopbarAvatar();
    showScreen('s-role-select');
    return;
  }
  showToast('🔑 Redirecting to Google Login...');
  const redirectUrl = window.location.hostname.includes('github.io')
    ? 'https://saurabh2807.github.io/delete/'
    : window.location.origin;

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });

  if (error) showToast(`⚠️ OAuth Error: ${error.message}`);
};

window.submitGuestLogin = function () {
  showToast('🔑 Logging in to Demo Guest Account...');
  currentUser = {
    id: 'demo-user-id',
    email: 'guest@example.com'
  };
  userProfile = {
    full_name: 'Demo Guest User',
    profile_photo: '',
    current_mode: 'need_help'
  };
  appMode = 'seeker';
  updateTopbarAvatar();
  showScreen('s-role-select');
};

window.selectRole = async function (mode) {
  appMode = mode; // 'seeker' or 'provider'
  if (currentUser && supabaseClient) {
    const dbMode = mode === 'seeker' ? 'need_help' : 'can_help';
    await supabaseClient
      .from('profiles')
      .update({ current_mode: dbMode })
      .eq('id', currentUser.id);

    if (userProfile) userProfile.current_mode = dbMode;
  }

  showScreen('s-app');
  appNav('home');
};

// ── Bottom Nav ────────────────────────────────────────────────────────────
async function appNav(tab) {
  if (currentTab === tab && tab !== 'home') {
    tab = 'home';
  }
  currentTab = tab;
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  const btn = document.getElementById('nav-' + tab);
  if (btn) btn.classList.add('on');

  if (tab === 'home') {
    await loadResources();
    renderHome();
  } else if (tab === 'post') {
    renderPost();
  } else if (tab === 'alerts') {
    await loadNotifications();
    renderAlerts();
  } else if (tab === 'chats') {
    renderChatsInbox();
  } else if (tab === 'profile') {
    await loadProfileCounts();
    renderProfile();
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Modal ─────────────────────────────────────────────────────────────────
function showModal(html) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal-sheet">${html}</div></div>`;
}
function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

// ── Emergency SOS ─────────────────────────────────────────────────────────
function emergencySOS() {
  showModal(`
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;margin-bottom:8px;">🆘</div>
      <h2 style="font-size:20px;font-weight:900;color:#DC2626;">Emergency SOS</h2>
      <p style="font-size:13px;color:#64748B;margin-top:6px;line-height:1.5;">This will broadcast your location to all nearby helpers immediately.</p>
    </div>
    <button class="btn-primary" onclick="sosBroadcast()" style="margin-bottom:10px;">📡 Broadcast Now</button>
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
  `);
}

async function sosBroadcast() {
  closeModal();
  showToast('🆘 Generating SOS Alerts...');

  if (currentUser && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('notifications')
        .insert([{
          user_id: currentUser.id,
          type: 'emergency_alert',
          title: '🚨 Emergency SOS Proximity Alert',
          content: `${userProfile?.full_name || 'A user'} triggered an SOS broadcast near your location!`,
          metadata: { lat: 23.25, lng: 77.41 }
        }]);

      if (error) throw error;
      showToast('🆘 SOS Broadcasted to helpers!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ SOS Broadcast error');
    }
  } else {
    showToast('🆘 Mock SOS Broadcasted to 17 nearby helpers!');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════════════════
let feedMap = null;

function initFeedMap(resources) {
  const container = document.getElementById('map-feed');
  if (!container) return;

  if (feedMap) {
    try {
      feedMap.remove();
    } catch (e) {
      console.error(e);
    }
    feedMap = null;
  }

  let centerLat = 23.2599; // Default Bhopal
  let centerLng = 77.4126;

  if (homeSearchLoc.trim()) {
    const coords = getCoordinatesForSearch(homeSearchLoc);
    centerLat = coords.lat;
    centerLng = coords.lng;
  } else if (resources.length > 0 && resources[0].lat && resources[0].lng) {
    centerLat = resources[0].lat;
    centerLng = resources[0].lng;
  }

  feedMap = L.map('map-feed', {
    zoomControl: false
  }).setView([centerLat, centerLng], 12);

  L.control.zoom({ position: 'bottomright' }).addTo(feedMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(feedMap);

  resources.forEach(r => {
    if (r.lat && r.lng) {
      const popupContent = `
        <div style="font-family:'Inter', sans-serif; min-width:160px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:16px;">${r.emoji}</span>
            <strong style="font-size:12px; color:#0F172A; text-transform:uppercase;">${r.type}</strong>
            ${r.urgent ? '<span style="background:#DC2626; color:white; font-size:9px; font-weight:800; padding:1px 5px; border-radius:99px; margin-left:auto;">SOS</span>' : ''}
          </div>
          <div style="font-size:13px; font-weight:700; color:#1E293B; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.title}">${r.title}</div>
          <div style="font-size:11px; color:#64748B; margin-bottom:8px;">📍 ${r.area || r.loc} (${r.km} km)</div>
          <button onclick="closeModal(); contactHelper('${r.id}', '${r.contact}', '${r.name}', ${r.km}, '${r.emoji}')" style="width:100%; height:28px; background:linear-gradient(135deg,#16A34A,#15803D); color:white; font-size:11.5px; font-weight:800; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;">Contact</button>
        </div>
      `;
      L.marker([r.lat, r.lng]).addTo(feedMap).bindPopup(popupContent);
    }
  });
}

function renderHome() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  const tickerHTML = doubled.map(t => `<span class="ticker-item">${t}</span>`).join('');

  const pillsHTML = CATEGORIES.map(c => `
    <div class="cat-pill ${homeCat === c.id ? 'active' : ''}"
         data-cat="${c.id}"
         onclick="homeSetCat('${c.id}')">
      ${c.emoji} ${c.label}
    </div>`).join('');

  const resultsHTML = buildHomeResults();

  content.innerHTML = `
    <div style="padding:14px 16px 20px;">

      <div class="live-ticker">
        <div class="live-badge">
          <div class="live-dot"></div>
          LIVE
        </div>
        <div class="ticker-scroll">
          <div class="ticker-inner">${tickerHTML}</div>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-num" style="color:#DC2626;">${appMode === 'seeker' ? '12' : '15'}</div>
          <div class="stat-label">${appMode === 'seeker' ? 'Helpers' : 'Seekers'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:#16A34A;">30</div>
          <div class="stat-label">${appMode === 'seeker' ? 'Active Offers' : 'Active Requests'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:#EA580C;">5 km</div>
          <div class="stat-label">Radius</div>
        </div>
      </div>

      <div class="search-row">
        <div class="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="loc-search-input"
                 type="text"
                 placeholder="Search by city / area…"
                 value="${homeSearchLoc}"
                 onkeydown="if(event.key==='Enter') homeDoSearch()"/>
        </div>
        <button class="go-btn" onclick="homeDoSearch()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Go
        </button>
      </div>

      <div class="section-label">Resource Type</div>
      <div class="pill-scroll">${pillsHTML}</div>

      <div id="map-feed"></div>

      <div id="home-results">${resultsHTML}</div>
    </div>`;

  initFeedMap(getFilteredHomeResources());
}

function buildHomeResults() {
  let filtered = getFilteredHomeResources();

  let header = '';
  if (homeSearchLoc.trim()) {
    header = `
      <div class="loc-header">
        <button class="back-btn" onclick="homeClearSearch()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h3>Results near</h3>
        <span class="loc-tag">📍 ${homeSearchLoc}</span>
      </div>`;
  } else {
    header = `<div class="section-label" style="margin-bottom:12px;">${appMode === 'seeker' ? 'Nearby Help Offers' : 'Nearby Help Requests'}</div>`;
  }

  if (filtered.length === 0) {
    return header + `
      <div class="empty-state">
        <div class="big-icon">🔍</div>
        <div style="font-size:15px;font-weight:700;color:#475569;margin-bottom:4px;">No results found</div>
        <div style="font-size:13px;">Try a different location or category</div>
      </div>`;
  }

  const cards = filtered.map(r => {
    const badgeColor = r.direction === 'offer' ? 'background:#E0F2FE;color:#0369A1;' : 'background:#FEE2E2;color:#DC2626;';
    const badgeText = r.direction === 'offer' ? '🤝 Offer' : '🆘 Request';
    const buttonText = appMode === 'seeker' ? 'Contact' : 'Help';

    return `
    <div class="res-card ${r.urgent ? 'urgent' : ''}">
      <div class="res-icon">${r.emoji}</div>
      <div class="res-body">
        <div class="res-title-row">
          <span class="res-title">${r.title}</span>
          ${r.urgent ? '<span class="urgent-badge">URGENT</span>' : ''}
          <span style="${badgeColor}font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:999px;margin-left:6px;display:inline-flex;align-items:center;gap:3px;flex-shrink:0;">${badgeText}</span>
        </div>
        <div class="res-meta">📍 ${r.area || r.loc} &nbsp;·&nbsp; ${r.km} km &nbsp;·&nbsp; ${r.posted}</div>
      </div>
      <button class="contact-btn" onclick="contactHelper('${r.id}','${r.contact}','${r.name}',${r.km},'${r.emoji}')">${buttonText}</button>
    </div>`;
  }).join('');

  return header + cards;
}

window.homeSetCat = function (cat) {
  homeCat = cat;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === cat);
  });
  const res = document.getElementById('home-results');
  if (res) res.innerHTML = buildHomeResults();

  initFeedMap(getFilteredHomeResources());
};

window.homeDoSearch = async function () {
  const inp = document.getElementById('loc-search-input');
  if (!inp) return;
  homeSearchLoc = inp.value.trim();

  await loadResources();
  const res = document.getElementById('home-results');
  if (res) res.innerHTML = buildHomeResults();

  initFeedMap(getFilteredHomeResources());
};

window.homeClearSearch = async function () {
  homeSearchLoc = '';
  const inp = document.getElementById('loc-search-input');
  if (inp) inp.value = '';

  await loadResources();
  const res = document.getElementById('home-results');
  if (res) res.innerHTML = buildHomeResults();

  initFeedMap(getFilteredHomeResources());
};

window.contactHelper = function (id, contact, name, km, emoji) {
  showModal(`
    <div style="text-align:center;margin-bottom:20px;">
      <div style="width:60px;height:60px;border-radius:18px;background:#FEF2F2;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:30px;">${emoji || '🤝'}</div>
      <h3 style="font-size:17px;font-weight:800;color:#0F172A;">${name}</h3>
      <p style="font-size:13px;color:#64748B;margin-top:4px;">${contact}</p>
      <div style="display:inline-flex;align-items:center;gap:5px;background:#F1F5F9;border-radius:999px;padding:5px 12px;margin-top:10px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span style="font-size:12px;font-weight:700;color:#475569;">${km} km away</span>
      </div>
    </div>

    <a href="tel:${contact}" style="display:block;text-decoration:none;margin-bottom:10px;">
      <button style="width:100%;height:50px;background:linear-gradient(135deg,#DC2626,#B91C1C);color:white;font-size:15px;font-weight:800;border:none;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(220,38,38,0.3);">
        📞 Call Now
      </button>
    </a>

    <button onclick="closeModal(); openChat('${id}')" style="width:100%;height:50px;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:white;font-size:15px;font-weight:800;border:none;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(37,99,235,0.25);margin-bottom:10px;">
      💬 Chat Now
    </button>

    <button onclick="closeModal()" style="width:100%;height:46px;background:#F1F5F9;color:#475569;font-size:14px;font-weight:700;border:none;border-radius:12px;">
      Close
    </button>
  `);
};

// ══════════════════════════════════════════════════════════════════════════
// POST SCREEN
// ══════════════════════════════════════════════════════════════════════════
function renderPost() {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
    <div style="padding:16px;">
      <div style="background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:18px;padding:20px;">
        <h2 style="font-size:17px;font-weight:800;color:#0F172A;margin-bottom:16px;">Post a Resource</h2>

        <div class="form-group">
          <label class="form-label">I want to...</label>
          <select class="form-select" id="post-direction">
            <option value="offer" selected>🤝 Offer Help (Available / Share)</option>
            <option value="need">🆘 Request Help (Required / Need)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Resource Category</label>
          <select class="form-select" id="post-type">
            <option value="">Select category…</option>
            <option value="blood">🩸 Blood</option>
            <option value="transport">🚑 Transport</option>
            <option value="medicine">💊 Medicine</option>
            <option value="food">🍱 Food</option>
            <option value="shelter">🏠 Shelter</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Title / Description</label>
          <input class="form-input" id="post-title" type="text" placeholder="e.g. B+ Blood needed urgently"/>
        </div>

        <div class="form-group">
          <label class="form-label">Your Location</label>
          <input class="form-input" id="post-loc" type="text" placeholder="City / Area"/>
        </div>

        <div class="form-group">
          <label class="form-label">Contact Number</label>
          <input class="form-input" id="post-contact" type="tel" placeholder="+91-XXXXX-XXXXX"/>
        </div>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <input type="checkbox" id="post-urgent" style="width:16px;height:16px;accent-color:#DC2626;"/>
          <label for="post-urgent" style="font-size:14px;color:#475569;font-weight:600;">Mark as Urgent</label>
        </div>

        <button class="btn-primary" onclick="submitPost()">✅ Post Resource</button>
      </div>
    </div>`;
}

window.submitPost = async function () {
  const direction = document.getElementById('post-direction')?.value;
  const type = document.getElementById('post-type')?.value;
  const title = document.getElementById('post-title')?.value?.trim();
  const loc = document.getElementById('post-loc')?.value?.trim();
  const contact = document.getElementById('post-contact')?.value?.trim();
  const urgent = document.getElementById('post-urgent')?.checked || false;

  if (!type || !direction || !title || !loc || !contact) {
    showToast('⚠️ Please fill in all fields');
    return;
  }

  if (!currentUser) {
    showToast('⚠️ Authenticated profile required');
    return;
  }

  if (!supabaseClient) {
    showToast('Publishing resource (Demo)...');
    const center = getCoordinatesForSearch(loc);
    const newId = dbResources.length + 1;

    dbResources.unshift({
      id: newId,
      user_id: currentUser.id,
      type: type,
      emoji: type === 'blood' ? '🩸' : type === 'transport' ? '🚑' : type === 'medicine' ? '💊' : type === 'food' ? '🍱' : '🏠',
      direction: direction,
      title: title,
      description: `Coordination details for ${title} listed in ${loc} (Demo Mode).`,
      loc: loc,
      area: loc,
      km: 1.0,
      urgent: urgent,
      contact: contact,
      name: userProfile?.full_name || 'Demo User',
      posted: 'Just now',
      lat: center.lat + (Math.random() - 0.5) * 0.012,
      lng: center.lng + (Math.random() - 0.5) * 0.012
    });

    showToast('✅ Posted successfully!');

    if (direction === 'offer') {
      await selectRole('seeker');
    } else {
      await selectRole('provider');
    }
    return;
  }

  const center = getCoordinatesForSearch(loc);
  const dbCategory = type.charAt(0).toUpperCase() + type.slice(1);

  showToast('Publishing resource...');
  try {
    const { data, error } = await supabaseClient
      .from('resources')
      .insert([{
        user_id: currentUser.id,
        category: dbCategory,
        resource_type: direction,
        title,
        description: `Coordination details for ${title} listed in ${loc}.`,
        location: loc,
        latitude: center.lat + (Math.random() - 0.5) * 0.012,
        longitude: center.lng + (Math.random() - 0.5) * 0.012,
        contact_number: contact,
        urgency_level: urgent ? 'urgent' : 'standard',
        status: 'active'
      }])
      .select();

    if (error) throw error;
    showToast('✅ Posted successfully!');

    // Trigger notification matching trigger in real-time alert systems
    await supabaseClient
      .from('notifications')
      .insert([{
        user_id: currentUser.id,
        type: 'new_resource_match',
        title: `🤝 Resource Posted: ${title}`,
        content: `Your resource was listed successfully in ${loc}.`
      }]);

    // Navigate to respective feed
    if (direction === 'offer') {
      await selectRole('seeker');
    } else {
      await selectRole('provider');
    }
  } catch (err) {
    console.error(err);
    showToast(`⚠️ Post failed: ${err.message}`);
  }
};

// ─── Alerts Screen ────────────────────────────────────────────────────────
function renderAlerts() {
  const dot = document.getElementById('alert-dot');
  if (dot) dot.style.display = 'none';

  const content = document.getElementById('app-content');
  if (!content) return;

  const typeConfig = {
    new_message: { icon: '💬', color: '#DBEAFE', title: 'New Message Received' },
    new_resource_match: { icon: '🤝', color: '#F0FDF4', title: 'Resource Sync Match' },
    help_request_response: { icon: '🏥', color: '#FFEDD5', title: 'Help Coordination' },
    emergency_alert: { icon: '🆘', color: '#FEE2E2', title: 'PROXIMITY SOS ALERT' }
  };

  const listItems = dbNotifications.map(n => {
    const config = typeConfig[n.type] || { icon: '🔔', color: '#F1F5F9', title: n.title };
    return `
      <div style="display:flex;gap:12px;align-items:flex-start;background:#FFFFFF;border:1.5px solid ${n.is_read ? '#E2E8F0' : '#DC2626'};border-radius:14px;padding:14px;margin-bottom:10px; opacity: ${n.is_read ? '0.8' : '1'};">
        <div style="width:42px;height:42px;border-radius:12px;background:${config.color};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${config.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:#0F172A;">${n.title || config.title}</div>
          <div style="font-size:12px;color:#64748B;margin-top:2px;">${n.content}</div>
          ${!n.is_read ? `<button onclick="markAlertRead('${n.id}')" style="margin-top:6px;border:none;background:none;color:#DC2626;font-size:11px;font-weight:700;cursor:pointer;padding:0;">Mark as read</button>` : ''}
        </div>
        <div style="font-size:11px;color:#94A3B8;white-space:nowrap;flex-shrink:0;">${timeAgo(new Date(n.created_at))}</div>
      </div>`;
  }).join('');

  const fallbackItems = `
    <div style="display:flex;gap:12px;align-items:flex-start;background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:14px;padding:14px;margin-bottom:10px;">
      <div style="width:42px;height:42px;border-radius:12px;background:#FEE2E2;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🩸</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:700;color:#0F172A;">New blood request near you</div>
        <div style="font-size:12px;color:#64748B;margin-top:2px;">B+ needed · Bhopal · 1.2 km</div>
      </div>
      <div style="font-size:11px;color:#94A3B8;white-space:nowrap;flex-shrink:0;">2 min ago</div>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:14px;padding:14px;margin-bottom:10px;">
      <div style="width:42px;height:42px;border-radius:12px;background:#FFEDD5;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🆘</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:700;color:#0F172A;">SOS broadcast in your area</div>
        <div style="font-size:12px;color:#64748B;margin-top:2px;">Emergency · 0.8 km from you</div>
      </div>
      <div style="font-size:11px;color:#94A3B8;white-space:nowrap;flex-shrink:0;">5 min ago</div>
    </div>`;

  content.innerHTML = `
    <div style="padding:16px;">
      <div class="section-label" style="margin-bottom:12px;">Recent Alerts</div>
      ${dbNotifications.length > 0 ? listItems : fallbackItems}
    </div>`;
}

window.markAlertRead = async function (id) {
  if (!supabaseClient) {
    showToast('Marked as read (Demo)');
    return;
  }
  try {
    const { error } = await supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
    showToast('Marked as read');
    await loadNotifications();
    renderAlerts();
  } catch (err) {
    console.error(err);
  }
};

// ─── Profile Screen ───────────────────────────────────────────────────────
function renderProfile() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const name = userProfile?.full_name || 'Anonymous User';
  const email = currentUser?.email || 'No email synced';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarUrl = userProfile?.profile_photo || '';

  const avatarDisplay = avatarUrl
    ? `<img src="${avatarUrl}" alt="Avatar" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #E2E8F0;margin:0 auto 12px;cursor:pointer;" onclick="changeAvatar()"/>`
    : `<div onclick="changeAvatar()" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#DC2626,#EA580C);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:26px;font-weight:800;color:white;cursor:pointer;">${initials}</div>`;

  const roleToggleHtml = `
    <div style="display:flex;align-items:center;gap:14px;background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:10px;">
      <span style="font-size:22px;">👤</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:#0F172A;">Active Role / Mode</div>
        <div style="font-size:12px;color:#64748B;">Currently: <b>${appMode === 'seeker' ? 'Seeking Help 🆘' : 'Offering Help 🤝'}</b></div>
      </div>
      <div onclick="toggleProfileRole()" style="position:relative;width:62px;height:32px;background:${appMode === 'seeker' ? '#DC2626' : '#16A34A'};border-radius:999px;cursor:pointer;padding:4px;transition:background 0.3s;flex-shrink:0;">
        <div style="width:24px;height:24px;background:white;border-radius:50%;position:absolute;transition:left 0.3s;left:${appMode === 'seeker' ? '4px' : '34px'};display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
          ${appMode === 'seeker' ? '🆘' : '🤝'}
        </div>
      </div>
    </div>
  `;

  const optionsHtml = [
    { icon: '📋', label: 'My Posts', sub: 'Resources you have shared', action: 'showMyPosts()' },
    { icon: '🤝', label: 'My Responses', sub: 'Requests you have responded to', action: 'showMyResponses()' },
    { icon: '🔔', label: 'Notifications', sub: 'Manage alert preferences', action: 'showNotificationPrefs()' },
    { icon: '⚙️', label: 'Settings', sub: 'App preferences & privacy', action: 'showSettings()' },
    { icon: '❓', label: 'Help & Support', sub: 'FAQs and contact us', action: 'showHelpSupport()' },
  ].map(o => `
    <div style="display:flex;align-items:center;gap:14px;background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;" onclick="${o.action}">
      <span style="font-size:22px;">${o.icon}</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:#0F172A;">${o.label}</div>
        <div style="font-size:12px;color:#64748B;">${o.sub}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`).join('');

  content.innerHTML = `
    <div style="padding:16px;">
      <div style="background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:18px;padding:20px;margin-bottom:14px;text-align:center;">
        <input type="file" id="profile-photo-upload" style="display: none;" onchange="handleAvatarUpload(this.files[0])" accept="image/*" />
        ${avatarDisplay}
        <div style="font-size:18px;font-weight:800;color:#0F172A;">${name}</div>
        <div style="font-size:13px;color:#64748B;margin-top:2px;">✉️ ${email}</div>
        <div style="display:flex;gap:16px;justify-content:center;margin-top:14px;">
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:900;color:#DC2626;">${myResponseCount}</div>
            <div style="font-size:11px;color:#94A3B8;">Chats</div>
          </div>
          <div style="width:1px;background:#E2E8F0;"></div>
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:900;color:#16A34A;">${myPostCount}</div>
            <div style="font-size:11px;color:#94A3B8;">Posts</div>
          </div>
          <div style="width:1px;background:#E2E8F0;"></div>
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:900;color:#F59E0B;">⭐ 5.0</div>
            <div style="font-size:11px;color:#94A3B8;">Rating</div>
          </div>
        </div>
      </div>

      ${roleToggleHtml}

      ${optionsHtml}

      <button class="btn-secondary" onclick="signOutUser()" style="margin-top:8px;">🚪 Sign Out</button>
    </div>`;
}

window.changeAvatar = function () {
  document.getElementById('profile-photo-upload')?.click();
};

window.handleAvatarUpload = async function (file) {
  if (!file || !currentUser || !supabaseClient) return;
  showToast('Uploading photo...');

  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabaseClient
      .from('profiles')
      .update({ profile_photo: publicUrl })
      .eq('id', currentUser.id);

    if (dbError) throw dbError;

    showToast('✅ Avatar updated successfully!');
    if (userProfile) userProfile.profile_photo = publicUrl;
    renderProfile();
    updateTopbarAvatar();
  } catch (err) {
    console.error(err);
    showToast(`⚠️ Upload error: ${err.message}`);
  }
};

function updateTopbarAvatar() {
  const avatarEl = document.getElementById('app-profile-avatar');
  if (!avatarEl) return;

  if (userProfile?.profile_photo) {
    avatarEl.innerHTML = `<img src="${userProfile.profile_photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;"/>`;
  } else {
    const name = userProfile?.full_name || 'Anonymous User';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

window.signOutUser = async function () {
  showToast('Signing out...');
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  } else {
    currentUser = null;
    userProfile = null;
    showScreen('s-landing');
  }
};

window.toggleProfileRole = async function () {
  const nextMode = appMode === 'seeker' ? 'provider' : 'seeker';
  appMode = nextMode;

  if (supabaseClient && currentUser) {
    const dbMode = nextMode === 'seeker' ? 'need_help' : 'can_help';
    await supabaseClient
      .from('profiles')
      .update({ current_mode: dbMode })
      .eq('id', currentUser.id);

    if (userProfile) userProfile.current_mode = dbMode;
  }

  showToast(`Switched mode successfully!`);
  renderProfile();
};

// ── Profile Modals Implementation ──────────────────────────────────────────
window.showMyPosts = async function () {
  if (!currentUser) return;

  showToast('Loading posts...');
  if (!supabaseClient) {
    const mappedPosts = dbResources
      .filter(r => r.user_id === currentUser.id)
      .map(p => ({
        id: p.id,
        emoji: p.emoji,
        title: p.title,
        area: p.area || p.loc,
        time: p.posted,
        status: (p.status || 'active').charAt(0).toUpperCase() + (p.status || 'active').slice(1)
      }));
    renderMyPostsList(mappedPosts);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('resources')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedPosts = data.map(p => ({
      id: p.id,
      emoji: p.category === 'Blood' ? '🩸' : p.category === 'Transport' ? '橫' : p.category === 'Medicine' ? '💊' : p.category === 'Food' ? '🍱' : '🏠',
      title: p.title,
      area: p.location,
      time: timeAgo(new Date(p.created_at)),
      status: p.status.charAt(0).toUpperCase() + p.status.slice(1)
    }));

    renderMyPostsList(mappedPosts);
  } catch (err) {
    console.error(err);
    showToast('⚠️ Failed to load posts');
  }
};

function renderMyPostsList(posts) {
  let listHtml = '';
  if (posts.length === 0) {
    listHtml = `<div style="text-align:center;padding:24px;color:#94A3B8;">No active posts found.</div>`;
  } else {
    listHtml = posts.map(p => `
      <div id="mypost-${p.id}" style="display:flex;align-items:flex-start;gap:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:10px;">
        <div style="width:36px;height:36px;border-radius:8px;background:#FEF2F2;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${p.emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span style="font-size:13.5px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</span>
          </div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">📍 ${p.area} · ${p.time}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
            <span id="postbadge-${p.id}" style="font-size:10px;font-weight:800;background:${p.status === 'Active' ? '#DCFCE7' : '#E2E8F0'};color:${p.status === 'Active' ? '#16A34A' : '#64748B'};padding:2px 6px;border-radius:999px;">${p.status}</span>
            ${p.status === 'Active' ? `<button onclick="resolvePost('${p.id}')" id="resolvebtn-${p.id}" style="border:none;background:transparent;color:#DC2626;font-size:11px;font-weight:700;cursor:pointer;padding:2px 6px;">Mark Resolved</button>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  showModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:800;color:#0F172A;">📋 My Posts</h2>
      <button onclick="closeModal()" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#94A3B8;">&times;</button>
    </div>
    <div style="max-height:300px;overflow-y:auto;padding-right:4px;">
      ${listHtml}
    </div>
    <button class="btn-secondary" onclick="closeModal()" style="margin-top:14px;">Close</button>
  `);
}

window.resolvePost = async function (postId) {
  showToast('Updating post status...');
  if (!supabaseClient) {
    showToast('Post marked as resolved!');
    const badge = document.getElementById(`postbadge-${postId}`);
    if (badge) {
      badge.textContent = 'Fulfilled';
      badge.style.background = '#E2E8F0';
      badge.style.color = '#64748B';
    }
    const btn = document.getElementById(`resolvebtn-${postId}`);
    if (btn) btn.style.display = 'none';

    const item = dbResources.find(r => String(r.id) === String(postId));
    if (item) {
      item.status = 'fulfilled';
      dbResources = dbResources.filter(r => String(r.id) !== String(postId));
    }
    await loadResources();
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('resources')
      .update({ status: 'fulfilled' })
      .eq('id', postId);

    if (error) throw error;
    showToast('Post marked as resolved!');

    const badge = document.getElementById(`postbadge-${postId}`);
    if (badge) {
      badge.textContent = 'Fulfilled';
      badge.style.background = '#E2E8F0';
      badge.style.color = '#64748B';
    }
    const btn = document.getElementById(`resolvebtn-${postId}`);
    if (btn) btn.style.display = 'none';

    await loadResources();
  } catch (err) {
    console.error(err);
    showToast('⚠️ Update failed');
  }
};

window.showMyResponses = async function () {
  if (!currentUser) return;
  showToast('Loading response chats...');

  if (!supabaseClient) {
    const listHtml = mockChats.map(c => `
      <div style="display:flex;align-items:flex-start;gap:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:10px;">
        <div style="width:36px;height:36px;border-radius:8px;background:#FEF2F2;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${c.emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.resource_title || 'Direct Chat'}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">Chat partner: <b>${c.peer_name || 'Anonymous'}</b></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
            <span style="font-size:10px;font-weight:800;background:#DBEAFE;color:#2563EB;padding:2px 6px;border-radius:999px;">Active Thread</span>
            <button onclick="closeModal(); openChat('${c.resource_id}')" style="border:none;background:#F1F5F9;color:#475569;font-size:11px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:8px;display:flex;align-items:center;gap:4px;">
              💬 Open Chat
            </button>
          </div>
        </div>
      </div>`).join('');

    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-size:18px;font-weight:800;color:#0F172A;">🤝 My Responses</h2>
        <button onclick="closeModal()" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#94A3B8;">&times;</button>
      </div>
      <div style="max-height:300px;overflow-y:auto;padding-right:4px;">
        ${listHtml || '<div style="text-align:center;padding:20px;color:#94A3B8;">No active chats found.</div>'}
      </div>
      <button class="btn-secondary" onclick="closeModal()" style="margin-top:14px;">Close</button>
    `);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('chats')
      .select(`
        *,
        resource:resource_id (
          id,
          title,
          category
        ),
        participant_1_prof:participant_1 ( full_name ),
        participant_2_prof:participant_2 ( full_name )
      `)
      .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const listHtml = data.map(c => {
      const isPart1 = c.participant_1 === currentUser.id;
      const peerName = isPart1 ? c.participant_2_prof?.full_name : c.participant_1_prof?.full_name;
      const emoji = c.resource?.category === 'Blood' ? '🩸' : c.resource?.category === 'Transport' ? '🚑' : c.resource?.category === 'Medicine' ? '💊' : c.resource?.category === 'Food' ? '🍱' : '🏠';

      return `
        <div style="display:flex;align-items:flex-start;gap:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:#FEF2F2;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${emoji}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.resource?.title || 'Direct Chat'}</div>
            <div style="font-size:11.5px;color:#64748B;margin-top:2px;">Chat partner: <b>${peerName || 'Anonymous'}</b></div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
              <span style="font-size:10px;font-weight:800;background:#DBEAFE;color:#2563EB;padding:2px 6px;border-radius:999px;">Active Thread</span>
              <button onclick="closeModal(); openChat('${c.resource_id}')" style="border:none;background:#F1F5F9;color:#475569;font-size:11px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:8px;display:flex;align-items:center;gap:4px;">
                💬 Open Chat
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-size:18px;font-weight:800;color:#0F172A;">🤝 My Responses</h2>
        <button onclick="closeModal()" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#94A3B8;">&times;</button>
      </div>
      <div style="max-height:300px;overflow-y:auto;padding-right:4px;">
        ${listHtml || '<div style="text-align:center;padding:20px;color:#94A3B8;">No active chats found.</div>'}
      </div>
      <button class="btn-secondary" onclick="closeModal()" style="margin-top:14px;">Close</button>
    `);
  } catch (err) {
    console.error(err);
    showToast('⚠️ Error loading responses');
  }
};

window.showSettings = function () {
  showModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:800;color:#0F172A;">⚙️ App Settings</h2>
      <button onclick="closeModal()" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#94A3B8;">&times;</button>
    </div>
    
    <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
        <div>
          <div style="font-size:13.5px;font-weight:700;color:#0F172A;">Push Notifications</div>
          <div style="font-size:11px;color:#64748B;">Get real-time request alerts</div>
        </div>
        <div style="width: 38px; height: 22px; background: #16A34A; border-radius: 999px; position: relative; padding: 2px; cursor: pointer;" onclick="togglePref(this)">
          <div class="dot" style="width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; right: 2px; transition: 0.2s;"></div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
        <div>
          <div style="font-size:13.5px;font-weight:700;color:#0F172A;">Proximity SOS Alerts</div>
          <div style="font-size:11px;color:#64748B;">Notify for SOS within 5 km</div>
        </div>
        <div style="width: 38px; height: 22px; background: #16A34A; border-radius: 999px; position: relative; padding: 2px; cursor: pointer;" onclick="togglePref(this)">
          <div class="dot" style="width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; right: 2px; transition: 0.2s;"></div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
        <div>
          <div style="font-size:13.5px;font-weight:700;color:#0F172A;">GPS Location Access</div>
          <div style="font-size:11px;color:#64748B;">For accurate proximity mapping</div>
        </div>
        <div style="width: 38px; height: 22px; background: #16A34A; border-radius: 999px; position: relative; padding: 2px; cursor: pointer;" onclick="togglePref(this)">
          <div class="dot" style="width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; right: 2px; transition: 0.2s;"></div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;">
      <button class="btn-primary" onclick="saveSettings()" style="flex:1;height:44px;font-size:13.5px;">Save Settings</button>
      <button class="btn-secondary" onclick="closeModal()" style="flex:1;height:44px;font-size:13.5px;">Cancel</button>
    </div>
  `);
};

window.togglePref = function (el) {
  const dot = el.querySelector('.dot');
  if (el.style.background.includes('rgb(22, 163, 74)') || el.style.background.includes('#16A34A')) {
    el.style.background = '#CBD5E1';
    if (dot) {
      dot.style.right = 'auto';
      dot.style.left = '2px';
    }
  } else {
    el.style.background = '#16A34A';
    if (dot) {
      dot.style.left = 'auto';
      dot.style.right = '2px';
    }
  }
};

window.saveSettings = function () {
  showToast('Settings saved successfully!');
  closeModal();
};

window.showNotificationPrefs = function () {
  showToast('Preferences updated!');
};

window.showHelpSupport = function () {
  const faqs = [
    { q: 'How do I request help?', a: 'Go to the Post screen, fill in resource details, check "Urgent" if needed, and submit to broadcast to nearby helpers.' },
    { q: 'Is my phone number shared?', a: 'Only when you click "Contact" and explicitly initiate a phone call or chat. Your privacy is protected.' },
    { q: 'How does the map search work?', a: 'Searching for a city centers the map on that city and dynamically adapts listing locations to prevent empty feeds.' }
  ];

  const listHtml = faqs.map((f, idx) => `
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:10px;">
      <div onclick="toggleFaq(${idx})" style="font-size:13.5px;font-weight:700;color:#0F172A;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;">
        <span>${f.q}</span>
        <span id="faq-icon-${idx}" style="font-size:12px;color:#94A3B8;">➕</span>
      </div>
      <div id="faq-ans-${idx}" style="display:none;font-size:12px;color:#64748B;margin-top:8px;line-height:1.5;">${f.a}</div>
    </div>
  `).join('');

  showModal(`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:800;color:#0F172A;">❓ Help & Support</h2>
      <button onclick="closeModal()" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#94A3B8;">&times;</button>
    </div>
    <div style="max-height:280px;overflow-y:auto;padding-right:4px;">
      ${listHtml}
      
      <div style="margin-top:14px;background:#FEF2F2;border:1px solid #FEE2E2;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:#DC2626;">Need direct assistance?</div>
        <div style="font-size:11px;color:#64748B;margin-top:2px;">Our response team is active 24/7.</div>
        <button onclick="showToast('Support ticket created!'); closeModal();" style="margin-top:8px;border:none;background:#DC2626;color:white;font-size:11px;font-weight:800;padding:6px 12px;border-radius:8px;cursor:pointer;">Contact Helpdesk</button>
      </div>
    </div>
    <button class="btn-secondary" onclick="closeModal()" style="margin-top:14px;">Close</button>
  `);
};

window.toggleFaq = function (idx) {
  const ans = document.getElementById(`faq-ans-${idx}`);
  const icon = document.getElementById(`faq-icon-${idx}`);
  if (!ans || !icon) return;
  if (ans.style.display === 'none') {
    ans.style.display = 'block';
    icon.textContent = '➖';
  } else {
    ans.style.display = 'none';
    icon.textContent = '➕';
  }
};

// ══════════════════════════════════════════════════════════════════════════
// LIVE REAL-TIME CHAT VIEW
// ══════════════════════════════════════════════════════════════════════════
window.openChat = async function (resourceId) {
  let resource = dbResources.find(r => String(r.id) === String(resourceId));
  if (!resource && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('resources')
        .select(`
          *,
          profiles:user_id (
            full_name,
            profile_photo
          )
        `)
        .eq('id', resourceId)
        .single();
        
      if (data) {
        resource = {
          id: data.id,
          user_id: data.user_id,
          type: data.category.toLowerCase(),
          emoji: data.category === 'Blood' ? '🩸' : data.category === 'Transport' ? '🚑' : data.category === 'Medicine' ? '💊' : data.category === 'Food' ? '🍱' : '🏠',
          direction: data.resource_type,
          title: data.title,
          description: data.description,
          loc: data.location,
          area: data.location,
          km: 1.5,
          urgent: data.urgency_level === 'urgent',
          contact: data.contact_number,
          name: data.profiles?.full_name || 'Anonymous User',
          posted: timeAgo(new Date(data.created_at)),
          lat: data.latitude,
          lng: data.longitude
        };
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!resource) {
    const sample = SAMPLE_RESOURCES.find(r => String(r.id) === String(resourceId));
    if (sample) {
      resource = {
        id: sample.id,
        user_id: 'mock-user-id',
        type: sample.type,
        emoji: sample.emoji,
        direction: sample.direction,
        title: sample.title,
        description: `Mock coordinates set in ${sample.area || sample.loc}.`,
        loc: sample.area || sample.loc,
        area: sample.area || sample.loc,
        km: sample.km || 1.5,
        urgent: sample.urgent,
        contact: sample.contact,
        name: sample.name,
        posted: sample.posted || '5 min ago',
        lat: sample.lat,
        lng: sample.lng
      };
    } else {
      // Fallback
      resource = {
        id: resourceId,
        user_id: 'mock-user-id',
        type: 'general',
        emoji: '💬',
        direction: 'need',
        title: 'Direct Message',
        description: '',
        loc: 'Unknown',
        area: 'Unknown',
        km: 1.0,
        urgent: false,
        contact: '',
        name: 'Chat Partner',
        posted: 'Just now',
        lat: 23.25,
        lng: 77.41
      };
    }
  }

  if (!currentUser) {
    showToast('⚠️ Please sign in to message');
    return;
  }

  // Hide UI blocks for fullscreen chat feel
  const botNav = document.querySelector('.botnav');
  if (botNav) botNav.style.display = 'none';
  const sosFab = document.getElementById('sos-fab');
  if (sosFab) sosFab.style.display = 'none';
  const topBar = document.getElementById('app-topbar');
  if (topBar) topBar.style.display = 'none';

  currentChatResource = resource;

  if (!supabaseClient) {
    showToast('💬 Opening mock chat room...');
    activeChatRoomId = 'mock-' + resourceId;

    // Add to mockChats if not exists
    if (!mockChats.some(c => String(c.resource_id) === String(resourceId))) {
      mockChats.push({
        id: activeChatRoomId,
        resource_id: resourceId,
        peer_name: resource.name,
        resource_title: resource.title,
        resource_category: resource.type,
        emoji: resource.emoji,
        messages: [
          { sender: 'received', text: `Hello! I saw your post regarding "${resource.title}". How can I help?`, time: '10:00 AM' }
        ]
      });
    }

    const chatRoom = mockChats.find(c => String(c.resource_id) === String(resourceId));
    activeChatMessages = chatRoom.messages;
    renderChatLayout(resource);
    return;
  }

  showToast('Opening chat room...');
  try {
    // Sort participant IDs to match composite index on database
    const p1 = currentUser.id < resource.user_id ? currentUser.id : resource.user_id;
    const p2 = currentUser.id < resource.user_id ? resource.user_id : currentUser.id;

    // Fetch existing chat thread
    let { data: chatRoom, error: fetchErr } = await supabaseClient
      .from('chats')
      .select('*')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .eq('resource_id', resourceId);

    if (fetchErr) throw fetchErr;

    if (!chatRoom || chatRoom.length === 0) {
      // Create new chat room record
      const { data: newRoom, error: insErr } = await supabaseClient
        .from('chats')
        .insert([{
          participant_1: p1,
          participant_2: p2,
          resource_id: resourceId
        }])
        .select()
        .single();

      if (insErr) throw insErr;
      activeChatRoomId = newRoom.id;
    } else {
      activeChatRoomId = chatRoom[0].id;
    }

    // Load initial chat messages
    const { data: messages, error: msgError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('chat_id', activeChatRoomId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    activeChatMessages = messages.map(m => ({
      sender: m.sender_id === currentUser.id ? 'sent' : 'received',
      text: m.content,
      time: getFormattedTime(new Date(m.created_at))
    }));

    renderChatLayout(resource);
    subscribeToChatMessages();
  } catch (err) {
    console.error('Chat entry failed:', err);
    showToast(`⚠️ Chat failed: ${err.message}`);
    window.closeChat();
  }
};

function renderChatLayout(resource) {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <button class="chat-back-btn" onclick="closeChat()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="res-icon" style="width:36px; height:36px; border-radius:10px; font-size:18px; background:#FEF2F2; display:flex; align-items:center; justify-content:center;">${resource.emoji}</div>
        <div class="chat-user-info">
          <span class="chat-user-name">${resource.name}</span>
          <span class="chat-user-status" id="chat-status">online</span>
        </div>
      </div>
      
      <div class="chat-messages" id="chat-messages-list">
        ${renderChatMessagesHTML()}
      </div>
      
      <div class="chat-input-bar">
        <input type="text" class="chat-input" id="chat-input-field" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendChatMessage()"/>
        <button class="chat-send-btn" onclick="sendChatMessage()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  scrollToChatBottom();
}

window.closeChat = function () {
  if (activeChatSubscription && supabaseClient) {
    supabaseClient.removeChannel(activeChatSubscription);
    activeChatSubscription = null;
  }
  activeChatRoomId = null;
  currentChatResource = null;

  const botNav = document.querySelector('.botnav');
  if (botNav) botNav.style.display = 'block';
  const sosFab = document.getElementById('sos-fab');
  if (sosFab) sosFab.style.display = 'flex';
  const topBar = document.getElementById('app-topbar');
  if (topBar) topBar.style.display = 'block';

  appNav(currentTab);
};

function renderChatMessagesHTML() {
  return activeChatMessages.map(m => `
    <div class="chat-bubble ${m.sender === 'sent' ? 'sent' : 'received'}">
      <div>${m.text}</div>
      <div class="chat-time">${m.time}</div>
    </div>
  `).join('');
}

window.sendChatMessage = async function () {
  const inp = document.getElementById('chat-input-field');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || !activeChatRoomId || !currentUser) return;

  if (!supabaseClient) {
    inp.value = '';
    const chatRoom = mockChats.find(c => c.id === activeChatRoomId);
    if (chatRoom) {
      chatRoom.messages.push({
        sender: 'sent',
        text: text,
        time: getFormattedTime(new Date())
      });
      activeChatMessages = chatRoom.messages;
      const list = document.getElementById('chat-messages-list');
      if (list) {
        list.innerHTML = renderChatMessagesHTML();
        scrollToChatBottom();
      }

      // Simulate reply
      setTimeout(() => {
        chatRoom.messages.push({
          sender: 'received',
          text: 'This is a demo mode auto-reply. Real-time messages require a database connection.',
          time: getFormattedTime(new Date())
        });
        activeChatMessages = chatRoom.messages;
        if (list) {
          list.innerHTML = renderChatMessagesHTML();
          scrollToChatBottom();
        }
      }, 1500);
    }
    return;
  }

  inp.value = '';

  try {
    const { error } = await supabaseClient
      .from('messages')
      .insert([{
        chat_id: activeChatRoomId,
        sender_id: currentUser.id,
        content: text
      }]);

    if (error) throw error;
  } catch (err) {
    console.error(err);
    showToast('⚠️ Send failed');
  }
};

function subscribeToChatMessages() {
  if (!activeChatRoomId || !supabaseClient) return;

  activeChatSubscription = supabaseClient
    .channel(`chat-room-${activeChatRoomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${activeChatRoomId}`
    }, payload => {
      const msg = payload.new;
      activeChatMessages.push({
        sender: msg.sender_id === currentUser.id ? 'sent' : 'received',
        text: msg.content,
        time: getFormattedTime(new Date(msg.created_at))
      });

      const list = document.getElementById('chat-messages-list');
      if (list) {
        list.innerHTML = renderChatMessagesHTML();
        scrollToChatBottom();
      }

      // Mark message read if received
      if (msg.sender_id !== currentUser.id) {
        markMessageAsRead(msg.id);
      }
    })
    .subscribe();
}

async function markMessageAsRead(msgId) {
  if (!supabaseClient) return;
  try {
    await supabaseClient
      .from('messages')
      .update({ is_read: true })
      .eq('id', msgId);
  } catch (err) {
    console.error(err);
  }
}

function scrollToChatBottom() {
  const list = document.getElementById('chat-messages-list');
  if (list) {
    list.scrollTop = list.scrollHeight;
  }
}

function getFormattedTime(date = new Date()) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}

// ── Realtime Global Listeners ──────────────────────────────────────────────
let globalResourceSubscription = null;
let globalNotificationSubscription = null;

function startGlobalSubscriptions() {
  if (!currentUser || !supabaseClient) return;

  // Unsubscribe previous channels if exist
  if (globalResourceSubscription) supabaseClient.removeChannel(globalResourceSubscription);
  if (globalNotificationSubscription) supabaseClient.removeChannel(globalNotificationSubscription);

  // Alert channel for new resource posts
  globalResourceSubscription = supabaseClient
    .channel('public:resources')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resources' }, payload => {
      const post = payload.new;
      if (post.user_id !== currentUser.id) {
        showToast(`🔔 New Resource Listed: ${post.title}`);
        // Refresh feed map if we are on home tab
        if (currentTab === 'home' && currentScreen === 's-app') {
          loadResources().then(() => renderHome());
        }
      }
    })
    .subscribe();

  // User alerts channel for new notification matches
  globalNotificationSubscription = supabaseClient
    .channel(`user-notifications-${currentUser.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${currentUser.id}`
    }, payload => {
      const notif = payload.new;
      showToast(`🔔 Alert: ${notif.title}`);

      // Update alerts dot indicator
      const dot = document.getElementById('alert-dot');
      if (dot) dot.style.display = 'block';

      if (currentTab === 'alerts' && currentScreen === 's-app') {
        loadNotifications().then(() => renderAlerts());
      }
    })
    .subscribe();
}

function showOfflineBanner() {
  if (document.getElementById('offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = 'position: fixed; top: 12px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 480px; background: rgba(254, 242, 242, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #FCA5A5; color: #991B1B; border-radius: 12px; text-align: center; padding: 12px 16px; font-size: 12.5px; font-weight: 700; z-index: 10000; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 10px 30px rgba(220,38,38,0.1); transition: all 0.3s ease;';
  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:16px;">⚠️</span>
      <span>Live backend connection offline. Running in Demo Mode.</span>
    </div>
    <div style="display:flex; gap:8px;">
      <button onclick="window.location.reload()" style="background: #DC2626; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">Retry</button>
      <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: #991B1B; border: none; font-size: 16px; cursor: pointer; font-weight: bold; padding: 0 4px;">&times;</button>
    </div>
  `;
  document.body.appendChild(banner);
}

// ── Chats Inbox Screen Renderer ───────────────────────────────────────────
async function renderChatsInbox() {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
    <div style="padding:16px;">
      <div class="section-label" style="margin-bottom:12px;">Active Conversations</div>
      <div id="chats-list-container" style="display:flex; flex-direction:column; gap:12px;">
        <div style="text-align:center; padding:32px; color:#94A3B8;">Loading conversations...</div>
      </div>
    </div>`;

  if (!currentUser) {
    document.getElementById('chats-list-container').innerHTML = `
      <div style="text-align:center; padding:32px; color:#94A3B8;">
        <span style="font-size:32px;">🔒</span>
        <div style="font-size:15px; font-weight:700; color:#475569; margin-top:8px;">Sign in required</div>
        <div style="font-size:13px; margin-top:2px;">Please log in to view your inbox.</div>
      </div>`;
    return;
  }

  // Load chats
  let chatsData = [];
  if (!supabaseClient) {
    chatsData = mockChats.map(c => ({
      id: c.id,
      resource_id: c.resource_id,
      peer_name: c.peer_name,
      title: c.resource_title || 'Direct Chat',
      emoji: c.emoji || '💬',
      unread_count: c.messages.filter(m => m.sender === 'received').length // Mock unread count
    }));
  } else {
    try {
      const { data, error } = await supabaseClient
        .from('chats')
        .select(`
          *,
          resource:resource_id (
            id,
            title,
            category
          ),
          participant_1_prof:participant_1 ( full_name ),
          participant_2_prof:participant_2 ( full_name )
        `)
        .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each chat, fetch unread messages count
      chatsData = await Promise.all(data.map(async c => {
        const isPart1 = c.participant_1 === currentUser.id;
        const peerName = isPart1 ? c.participant_2_prof?.full_name : c.participant_1_prof?.full_name;
        const emoji = c.resource?.category === 'Blood' ? '🩸' : c.resource?.category === 'Transport' ? '🚑' : c.resource?.category === 'Medicine' ? '💊' : c.resource?.category === 'Food' ? '🍱' : '🏠';
        
        // Fetch unread count for this chat room
        const { count: unreadCount } = await supabaseClient
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', c.id)
          .neq('sender_id', currentUser.id)
          .eq('is_read', false);

        return {
          id: c.id,
          resource_id: c.resource_id,
          peer_name: peerName || 'Anonymous',
          title: c.resource?.title || 'Direct Chat',
          emoji: emoji,
          unread_count: unreadCount || 0
        };
      }));
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error loading inbox');
    }
  }

  const container = document.getElementById('chats-list-container');
  if (chatsData.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:48px 20px; color:#94A3B8;">
        <span style="font-size:40px;">✉️</span>
        <div style="font-size:15px; font-weight:700; color:#475569; margin-top:8px;">No active conversations</div>
        <div style="font-size:13px; margin-top:2px;">When you coordinate with helpers, chats will show up here.</div>
      </div>`;
    return;
  }

  container.innerHTML = chatsData.map(c => `
    <div style="display:flex; align-items:center; gap:12px; background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:16px; padding:14px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: box-shadow 0.15s;">
      <div style="width:44px; height:44px; border-radius:12px; background:#FEF2F2; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">${c.emoji}</div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:14px; font-weight:800; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.peer_name}</span>
          ${c.unread_count > 0 ? `<span style="background:#DC2626; color:white; font-size:10px; font-weight:800; padding:2px 7px; border-radius:999px; margin-left:auto; display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px;">${c.unread_count}</span>` : ''}
        </div>
        <div style="font-size:12px; color:#64748B; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">About: ${c.title}</div>
      </div>
      <button onclick="openChat('${c.resource_id}')" style="height:36px; padding:0 14px; background:linear-gradient(135deg, #2563EB, #1D4ED8); color:white; font-size:12px; font-weight:700; border:none; border-radius:10px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; gap:4px; box-shadow:0 3px 8px rgba(37,99,235,0.15);">
        💬 Open
      </button>
    </div>`).join('');
}

// ── Init State / Auth State Listener ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (supabaseClient) {
    // Listen for session login events
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        currentUser = session.user;

        try {
          // Fetch user profile from DB safely
          const { data: profile, error: profileErr } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id);

          if (profile && profile.length > 0) {
            userProfile = profile[0];
            appMode = userProfile.current_mode === 'can_help' ? 'provider' : 'seeker';
          } else {
            // Fallback profile details if profile creation trigger is still in queue
            userProfile = {
              full_name: currentUser.user_metadata?.full_name || 'Anonymous User',
              profile_photo: currentUser.user_metadata?.avatar_url || '',
              current_mode: 'need_help'
            };
            appMode = 'seeker';
          }
        } catch (e) {
          console.error("Profile parsing bypassed safely:", e);
          userProfile = {
            full_name: currentUser.user_metadata?.full_name || 'Anonymous User',
            profile_photo: currentUser.user_metadata?.avatar_url || '',
            current_mode: 'need_help'
          };
          appMode = 'seeker';
        }

        updateTopbarAvatar();
        startGlobalSubscriptions();

        if (currentScreen === 's-landing' || currentScreen === 's-login') {
          showScreen('s-role-select');
        } else {
          appNav(currentTab);
        }
      } else {
        currentUser = null;
        userProfile = null;

        // Stop subscriptions on logout
        if (globalResourceSubscription) supabaseClient.removeChannel(globalResourceSubscription);
        if (globalNotificationSubscription) supabaseClient.removeChannel(globalNotificationSubscription);

        showScreen('s-landing');
      }
    });
  } else {
    // Fallback: Running offline/demo mode
    showOfflineBanner();
    showScreen('s-landing');
  }
});