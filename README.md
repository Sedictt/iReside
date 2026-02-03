# Tenant Platform

A comprehensive, dual-sided SaaS ecosystem designed to seamlessly connect Landlords and Tenants. It bridges the gap between property management and modern living, providing distinct yet integrated portals for both sides of the rental experience.

## 🌟 The Vision

Traditional rental management is fragmented—landlords use spreadsheets, tenants use email/SMS, and payments happen elsewhere. **Tenant Platform** unifies this into a single, cohesive operating system.

It is **one platform with two powerful perspectives**:

### 🏢 1. The Landlord Portal (Business Operations)
*A command center for property owners to manage their portfolio efficiently.*
*   **Portfolio Intelligence**: A real-time Executive Dashboard tracking Revenue, Occupancy Rates, and Active Leases.
*   **Operational Control**: Centralized management of Properties, Units, and Tenant records.
*   **Maintenance Hub**: A ticketing system to track, prioritize, and resolve maintenance issues (Leaks, Repairs, etc.).
*   **Lease Management**: Digital handling of lease lifecycles, from inquiry to termination.
*   **Visual Planner**: A "Blueprint" tool to organize unit layouts spatially.

### 🏠 2. The Tenant Portal (Living Experience)
*A modern interface for residents to manage their home life.* (In Development)
*   **Discovery**: Browse available units with verified details.
*   **Payments**: Seamless rent payments and history tracking.
*   **Service Requests**: One-tap submission of maintenance tickets with status updates.
*   **Community**: Direct communication channel with property management.

---

## 🛠 Functional Architecture

The platform is built on a **Relational Data Model** (PostgreSQL) to ensure strict data integrity between the two distinct user roles.

### Core Systems:
*   **Role-Based Access Control (RBAC)**: Secure separation of data. Landlords see their assets; Tenants see their homes.
*   **Real-time Synchronization**: Updates to unit status or maintenance tickets reflect instantly for both parties.
*   **Financial Tracking**: Aggregates unit-level financial data into portfolio-level insights.

## 🚀 Tech Stack

*   **Frontend**: [Next.js 15](https://nextjs.org/) (React Server Components).
*   **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime).
*   **Design System**: Custom CSS Modules + Glassmorphism Aesthetics.

## ⚡ Getting Started

1.  **Clone & Install**:
    ```bash
    git clone [repo-url]
    npm install
    ```
2.  **Environment Setup**:
    *   Configure Supabase keys in `.env.local`.
    *   Run the schemas in `supabase_schema.sql` to initialize Tables, RLS Policies, and Triggers.
3.  **Launch**:
    ```bash
    npm run dev
    ```
