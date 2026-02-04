<p align="center">
  <img src="https://img.shields.io/badge/Status-Active%20Development-4338ca?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Version-0.1.0-6366f1?style=for-the-badge" alt="Version">
</p>

<h1 align="center">🏠 Leasely – The Modern Rental Platform</h1>

<p align="center">
  <strong>Connecting Landlords and Tenants through a seamless, unified digital experience.</strong>
</p>

---

## 📖 What is Leasely?

**Leasely** is a comprehensive, web-based platform designed to simplify the entire rental lifecycle. It serves as a single digital hub where **property owners (Landlords)** can manage their real estate portfolios and **renters (Tenants)** can discover, apply for, and manage their living spaces.

Think of it as the **"operating system" for rental properties**—replacing fragmented tools like spreadsheets, email threads, and paper contracts with one intuitive, modern application.

---

## � The Problem We Solve

The traditional rental market is broken and inefficient:

| For Landlords | For Tenants |
|---|---|
| Managing properties across scattered spreadsheets | Scouring multiple websites for listings |
| Tracking rent payments manually via bank statements | No easy way to communicate with landlords |
| Handling maintenance requests via text/email | Uncertainty about lease terms and payment history |
| No centralized view of business performance | Difficulty finding verified, trustworthy properties |

**Leasely** solves this by providing **one platform with two powerful, interconnected portals.**

---

## 🌟 Key Features

The platform is divided into two distinct user experiences:

### 🏢 The Landlord Portal – *Your Business Command Center*

This is a full-featured dashboard for property owners and managers to run their rental business professionally.

| Feature | Description |
|---|---|
| **Executive Dashboard** | At-a-glance view of total revenue, occupancy rates, active leases, and pending tasks. |
| **Property & Unit Management** | Add, edit, and organize your entire property portfolio. Track each unit's status (Vacant, Occupied, Maintenance). |
| **Listing Publisher** | Create beautiful, public-facing listings with photos, amenities, pricing, and a streamlined "Walk-In Visit" scheduler. |
| **Tenant Directory** | A CRM for your renters. View contact info, lease history, and payment status for each tenant. |
| **Maintenance Ticketing** | Receive, prioritize, and track maintenance requests from tenants. |
| **Invoice & Finance Tracking** | Generate invoices, record payments, and monitor the financial health of each property. |
| **Visual Blueprint Planner** | A drag-and-drop tool to visualize your property's floor plan and unit layout. |
| **Statistics & Reports** | Analyze trends in occupancy, revenue, and other key performance indicators over time. |

---

### 🔎 The Tenant Portal – *Your Home Discovery Experience*

This is a consumer-facing interface designed to help renters find their next home.

| Feature | Description |
|---|---|
| **Smart Property Search** | An interactive map-based search to explore available listings in any area. Users can search by location and see results on a live map. |
| **Proximity Filtering** | A visual "Search Radius" bubble on the map that users can toggle on/off and resize (e.g., 1km to 10km) to filter properties near a specific point. |
| **Price & Amenity Filters** | Narrow down results by rent budget, property type (Apartments, Dorms), and must-have amenities (Wifi, Parking, etc.). |
| **Rich Listing Details** | Clicking a property opens a full-screen modal with a large image gallery, detailed descriptions, amenities, pricing breakdown, and a direct "Inquire Now" button. |
| **Favorites & Inquiries** | (Coming Soon) Save properties to a wishlist and send inquiries directly to landlords. |

---

## �️ How It Works (User Journey)

### For a Landlord:
1.  **Sign Up / Log In:** Create an account or sign in via email.
2.  **Add Properties:** List your buildings and individual units with all relevant details.
3.  **Publish Listings:** Make specific units publicly visible to potential tenants, complete with photos and pricing.
4.  **Manage Operations:** Track your tenants, handle maintenance, and monitor revenue from a single dashboard.

### For a Tenant:
1.  **Browse Listings:** Visit the public search page (no login required to browse).
2.  **Explore the Map:** Use the interactive map to pan, zoom, and click on property markers showing prices.
3.  **Filter Results:** Use the sidebar to refine search by category, amenities, and price.
4.  **View Details:** Click any property card to see a full gallery, description, and features.
5.  **Inquire:** Click "Inquire Now" to express interest to the landlord.

---

## 🏗️ System Architecture (Simple Overview)

Leasely is built with a modern, scalable technology stack:

```
┌─────────────────────────────────────────────────────────┐
│                       THE USER                          │
│              (Landlord or Tenant on a browser)          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│   - The website you see and interact with.              │
│   - Renders pages, handles forms, displays data.        │
│   - Communicates with the backend database.             │
└────────────────────────┬────────────────────────────────┘
                         │ (Secure API Calls)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 BACKEND (Supabase)                      │
│   - Database: Stores all data (properties, users, etc.) │
│   - Authentication: Handles secure login/signup.        │
│   - Storage: Stores uploaded images (listing photos).   │
│   - Security: Ensures users can only see their own data.│
└─────────────────────────────────────────────────────────┘
```

**Key Technologies:**
*   **Next.js:** A React-based framework for building fast, modern websites.
*   **Supabase:** An open-source backend platform providing a PostgreSQL database, user authentication, and file storage.

---

## 🔐 Security & Data Privacy

*   **Role-Based Access:** Landlords can only see properties and tenants they own. Tenants can only see their own lease and payment history.
*   **Secure Authentication:** User logins are handled by industry-standard secure protocols.
*   **Data Encryption:** All data in transit is encrypted over HTTPS.

---

## 🚀 Project Status & Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1: Core Landlord Portal** | ✅ Complete | Dashboard, Properties, Units, Tenants, Listings, Blueprint |
| **Phase 2: Tenant Search & Discovery** | ✅ Complete | Interactive Map, Filters, Listing Detail Modal |
| **Phase 3: Landlord Financials** | ✅ Complete | Statistics, Invoices, Task Management |
| **Phase 4: Tenant Account Portal** | 🔜 Planned | Tenant login, Favorites, Inquiry History, Payment Portal |
| **Phase 5: Communication Hub** | 🔜 Planned | In-app messaging between Landlords and Tenants |

---

## 📞 Contact & Support

For questions, feedback, or partnership inquiries, please reach out to the development team.

---

<p align="center">
  <em>Built with ❤️ for a better rental experience.</em>
</p>
