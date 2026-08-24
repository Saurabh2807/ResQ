# 🚨 ResQ — Real-Time Emergency Resource Coordination Platform

<div align="center">

![ResQ Banner](ambulance_rescue.png)

### *"Together, We Can Save More Lives"*

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3 / Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Leaflet.js](https://img.shields.io/badge/Leaflet.js-Map_Engine-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend_%26_Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 📌 Overview

**ResQ** is a hyper-local, real-time emergency coordination web application designed to bridge the gap between people in critical distress and nearby responders, donors, and relief volunteers. 

Whether it is an urgent requirement for **Blood donors**, **Emergency Transport / Ambulance**, **Critical Medicines**, **Food & Water supplies**, or **Temporary Shelter**, ResQ facilitates instant matching, live GPS mapping, direct real-time communication, and one-tap emergency SOS broadcasts.

---

## ✨ Key Features

- 🆘 **One-Tap Emergency SOS FAB**: Instant emergency trigger broadcasting immediate alert signals and location to nearby responders.
- 🔄 **Dual Application Modes**:
  - **"I Need Help" (Seeker)**: Quickly request life-saving resources, browse nearby relief camps/supplies, and initiate direct chats with donors.
  - **"I Can Help" (Provider / Volunteer)**: Post available resources (blood units, beds, transport, ration packs) and respond to active emergency requests.
- 🗺️ **Interactive Real-Time Map (Leaflet.js)**:
  - Live GPS pinning of verified resources and emergency requests.
  - Color-coded category markers (Blood, Transport, Medicine, Food, Shelter).
  - Distance estimation and location details.
- 💬 **Live 1-on-1 Chat (Supabase Realtime)**:
  - Instant direct messaging between resource seekers and providers.
  - Live unread notification badges and message timestamps.
- 📢 **Emergency Posting & Filters**:
  - Filter listings by category (`Blood`, `Transport`, `Medicine`, `Food`, `Shelter`) and listing type (`Need` vs `Offer`).
  - Add descriptions, urgency flags, and direct contact numbers.
- 🔔 **Real-Time Notification Feed**:
  - Instant alerts for new messages, matched resources, and SOS triggers.
- 👤 **User Profiles & Role Switching**:
  - Seamless toggle between "Need Help" and "Can Help" modes anytime.
  - Profile details, avatar customization, and contact information management.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | HTML5, Modern Vanilla CSS3, Tailwind CSS (CDN) |
| **Icons & Typography** | SVG Vector Icons, Google Fonts (*Inter*) |
| **Maps & Geolocation** | [Leaflet.js](https://leafletjs.com/) & OpenStreetMap Tiles |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL Database, Supabase Auth) |
| **Realtime Engine** | Supabase Realtime Channels (PostgreSQL CDC / WebSockets) |
| **Storage & Security** | Supabase Storage, Row Level Security (RLS) Policies |

---

## 📁 Project Structure

```bash
ResQ/
├── index.html                   # Main application SPA container & screen layouts
├── styles.css                   # Custom stylesheets, glassmorphism, animations, UI components
├── script.js                    # Core application logic, Supabase client, Leaflet map, chat logic
├── ambulance_rescue.png         # Landing page hero illustration
├── supabase/
│   ├── schema.sql               # Complete PostgreSQL schema, RLS policies, triggers & functions
│   └── supabase_integration.md  # Detailed backend integration guide and code snippets
└── README.md                    # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Clone or Download the Repository

```bash
git clone https://github.com/Saurabh2807/ResQ.git
cd ResQ
```

### 2. Configure Supabase Backend

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql`, copy all contents, and execute the SQL query to create:
   - Custom ENUM types (`user_mode`, `resource_category`, `resource_type`, etc.)
   - Tables (`profiles`, `resources`, `chats`, `messages`, `notifications`)
   - Row Level Security (RLS) policies
   - Automated triggers for new user profile creation
   - Realtime publication enables
4. In `script.js`, configure your Supabase project credentials:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

### 3. Run Locally

Since ResQ is built with pure web standards (HTML/CSS/JS), you can run it with any static web server:

**Option A: Using Python (Built-in)**
```bash
# Python 3
python3 -m http.server 8000
```
Then visit: `http://localhost:8000`

**Option B: Using VS Code Live Server**
- Open the project in VS Code.
- Right-click `index.html` and select **"Open with Live Server"**.

**Option C: Using Node `serve` or `npx`**
```bash
npx serve .
```

---

## 📱 Application Flow & Screens

| Screen / View | Description |
|---|---|
| **Landing Screen (`#s-landing`)** | Welcomes users with emergency branding and unified "Get Started" CTA. |
| **Authentication (`#s-login`)** | Sign In / Sign Up tab with email/password and OAuth support. |
| **Role Selector (`#s-role-select`)** | Mode selection: *"I Need Help"* vs *"I Can Help"*. |
| **Main App (`#s-app`)** | Main interactive hub with top bar, bottom navigation, and floating SOS button. |
| ├── **Home View (`home`)** | Interactive Leaflet emergency map + categorized resource feed. |
| ├── **Post View (`post`)** | Modal to publish emergency resource requests or volunteer offers. |
| ├── **Chats View (`chats`)** | Real-time direct messaging between seekers and providers. |
| ├── **Alerts View (`alerts`)** | Critical notifications and SOS emergency alerts feed. |
| └── **Profile View (`profile`)** | User settings, mode toggle, and contact details. |

---

## 🔒 Security & Database Schema Highlights

- **Row Level Security (RLS)**: Enforced on all tables (`profiles`, `resources`, `chats`, `messages`, `notifications`).
- **Profile Auto-Creation**: Trigger automatically creates a `public.profiles` row when a user registers via Supabase Auth.
- **Realtime Sync**: Subscribes directly to table inserts and updates for instant chat and notification propagation.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve ResQ:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ for rapid emergency response and humanitarian relief.</sub>
</div>
