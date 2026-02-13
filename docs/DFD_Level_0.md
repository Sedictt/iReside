# Data Flow Diagram — Level 0 (Context Diagram)

## System: iReside — Multi-Unit Rental Management Platform

**Scope:** Barangay Marulas, Valenzuela City
**Notation Used:** Yourdon-DeMarco (standard academic convention)

---

## Notation Guide and Conventions

The following standard Yourdon-DeMarco symbols are used throughout this diagram:

| Symbol | Shape | Usage |
|---|---|---|
| **External Entity** | **Rectangle** (square box) | Represents an outside actor or system that sends data to or receives data from the system. Drawn at the edges/corners of the diagram. |
| **Process** | **Circle** (rounded bubble) | Represents a function or transformation that the system performs on data. Labeled with a process number and name. In a Level 0 diagram, there is exactly **one** process representing the entire system. |
| **Data Flow** | **Arrow** (directed line with arrowhead) | Represents the movement of data between an external entity and the process. Each arrow is labeled with a short description of the data it carries. The arrowhead indicates the direction of flow. |
| **Data Store** | **Two parallel horizontal lines** (open-ended rectangle) | Represents a repository of data at rest. **Not used in a Level 0 context diagram** — data stores appear starting at Level 1. |

### Level 0 Conventions

- The Level 0 diagram is also known as the **Context Diagram**.
- It contains exactly **one process** (the entire system), shown as a single circle at the center.
- All users and outside systems are shown as **external entities** (rectangles) positioned around the central process.
- **Data flows** (labeled arrows) connect each external entity to the process, showing what data enters and exits the system.
- **No data stores** appear at this level. Data stores are introduced in the Level 1 decomposition.
- Each data flow arrow must be **labeled** — unlabeled arrows are not permitted.
- Data flows are **unidirectional** — use one arrow per direction. If data flows both ways between an entity and the process, draw two separate arrows (one pointing in, one pointing out).

---

## Diagram Components

### Central Process (Circle)

Draw a **single circle** at the center of the diagram with the following label inside:

> **0**
> **iReside Multi-Unit Rental Management System**

This circle represents the entire iReside platform — all internal logic, databases, APIs, and sub-processes are abstracted within this one symbol. The number **0** indicates that this is the top-level (context) process.

---

### External Entities (Rectangles)

Draw **three rectangles**, positioned around the central circle:

#### Entity 1 — Tenant

> **TENANT**
> (Prospective and Active Renter)

Draw this rectangle to the **left** of the central process. This entity represents any individual who uses the platform to search for rental properties, submit inquiries, sign leases, pay rent, file maintenance requests, communicate with landlords, interact with neighboring tenants, and consult the AI concierge.

#### Entity 2 — Landlord

> **LANDLORD**
> (Property Owner / Manager)

Draw this rectangle to the **right** of the central process. This entity represents property owners or managers who use the platform to list properties, manage units, process inquiries and leases, track finances, handle maintenance, and communicate with tenants. Before gaining access, a landlord must first submit an application vetted by the administrator.

#### Entity 3 — System Administrator

> **SYSTEM ADMINISTRATOR**
> (Platform Moderator)

Draw this rectangle at the **bottom** of the central process. This entity represents the platform's administrative authority responsible for reviewing, approving, or rejecting landlord applications to ensure only legitimate property owners operate on the platform.

---

## Data Flows (Labeled Arrows)

### A. Between Tenant (Rectangle) and Process 0 (Circle)

#### Arrows Pointing Inward: Tenant → System

Draw **nine arrows** from the Tenant rectangle toward the central process circle. Label each arrow as follows:

1. **Registration and Login Credentials** — The tenant provides an email, password, and role selection during signup, and login credentials during authentication.

2. **Property Search Queries and Filters** — The tenant submits search parameters including location, search radius (1–10 km), price range, property type, and desired amenities.

3. **Unit Inquiry Details** — The tenant submits an inquiry containing their name, email, phone, preferred move-in date, optional unit selection, and a message of interest.

4. **Lease Signature** — The tenant provides a canvas-based digital signature to accept the terms and conditions of a lease agreement.

5. **Maintenance Request** — The tenant submits a maintenance request containing a title, description, and priority level.

6. **Chat Messages** — The tenant sends text messages to their landlord through the real-time messaging system.

7. **Community Issue Report** — The tenant files an issue report by selecting a target unit, choosing a category (noise, harassment, cleanliness, safety, other), and providing a description and priority.

8. **AI Concierge Question** — The tenant types a natural-language question about their property into the AI concierge chat interface.

9. **Payment Receipt and Reference Number** — After paying externally via GCash, the tenant uploads a receipt screenshot and transaction reference number for verification.

#### Arrows Pointing Outward: System → Tenant

Draw **ten arrows** from the central process circle toward the Tenant rectangle. Label each arrow as follows:

1. **Authentication Confirmation** — The system returns confirmation of successful login or registration along with a session token.

2. **Listing Search Results** — The system returns matching properties as map markers and listing cards with property details, photos, amenities, pricing, and location.

3. **Inquiry Status Updates** — The system notifies the tenant of inquiry status changes (submitted → read → replied → approved or rejected).

4. **Lease Agreement and Signing Status** — The system presents lease details and the current signing status (pending tenant, pending landlord, or active).

5. **Maintenance Status Updates** — The system provides updates as maintenance requests move through open → in progress → resolved.

6. **Real-Time Chat Messages** — The system delivers incoming landlord messages to the tenant's conversation thread in real time.

7. **Community Responses and Neighbor List** — The system returns threaded responses on community issues and a list of active neighbors in the same property.

8. **AI Concierge Answer** — The system returns answers from the landlord-configured knowledge base, or a fallback message if no match is found.

9. **Invoice and Payment Status** — The system presents invoices with their status (pending, paid, overdue) and the landlord's GCash QR code.

10. **Dashboard Summary** — The system provides an overview of the tenant's active lease, upcoming payments, quick-action links, and recent activity.

---

### B. Between Landlord (Rectangle) and Process 0 (Circle)

#### Arrows Pointing Inward: Landlord → System

Draw **seventeen arrows** from the Landlord rectangle toward the central process circle. Label each arrow as follows:

1. **Registration and Login Credentials** — The landlord provides email, password, and role selection during signup, and login credentials during authentication.

2. **Landlord Application** — The prospective landlord submits a business name, address, government-issued ID, and property ownership document for administrative vetting.

3. **Property and Unit Data** — The landlord enters property information and unit details including number, type, rent, status, and spatial layout positions for the unit map.

4. **Listing Details** — The landlord provides listing content: title, description, property type, pricing, deposit/advance terms, lease duration, location coordinates, amenities, house rules, contact preferences, SEO metadata, and publication status.

5. **Listing Photos** — The landlord uploads property photographs with type tags (cover, exterior, interior, amenity, unit, floor plan), captions, alt text, and display order.

6. **Inquiry Decision** — The landlord submits a decision to approve or reject a tenant inquiry.

7. **Lease Creation Details** — Upon approval, the landlord provides the selected unit, lease start and end dates, and confirmed rent amount.

8. **Landlord Counter-Signature** — The landlord provides a canvas-based digital signature to countersign and activate a lease.

9. **Chat Messages** — The landlord sends text messages to tenants through the real-time messaging system.

10. **Financial Transaction Entries** — The landlord records income and expense entries with type, category, description, amount, date, and optional property association.

11. **Invoice Details** — The landlord creates invoices specifying the tenant, description, amount, due date, and optional unit association.

12. **Payment Approval or Rejection** — The landlord reviews tenant-submitted receipts and approves or rejects each payment submission.

13. **Task Details** — The landlord creates tasks with a title, description, priority, due date, and property assignment.

14. **Maintenance Status Updates** — The landlord updates the status of maintenance requests (open → in progress → resolved).

15. **AI Concierge Knowledge Base Entries** — The landlord adds or removes Q&A entries organized by category for each property, feeding the tenant-facing AI concierge.

16. **Payment Method Setup** — The landlord uploads a GCash QR code image with label, account name, account number, and payment instructions.

17. **Profile and Settings Updates** — The landlord updates personal profile data, notification preferences, security settings, and display preferences.

#### Arrows Pointing Outward: System → Landlord

Draw **sixteen arrows** from the central process circle toward the Landlord rectangle. Label each arrow as follows:

1. **Authentication Confirmation** — The system returns confirmation of successful login or registration along with a session token.

2. **Application Status** — The system informs the landlord of their application status (pending, approved, or rejected with reason).

3. **Dashboard KPIs** — The system displays four computed metrics: monthly revenue, occupancy rate, active tenant count, and pending issues count.

4. **Property and Unit Inventory** — The system returns the full property portfolio with each unit's number, type, rent, status, and tenant name, supporting filtering and sorting.

5. **Unit Map / Visual Layout** — The system renders a 2D grid-based floor plan with color-coded status indicators (green = vacant, blue = occupied, orange = near-due, red = maintenance).

6. **Listing Performance Metrics** — The system provides per-listing analytics including view count, inquiry count, and publication status, along with aggregate totals.

7. **Incoming Inquiries** — The system presents inquiries organized by status (new, read, replied, archived) with tenant details, message, and timestamps.

8. **Lease Records and Signature Status** — The system displays lease agreements with signing status, signature URLs, and related timestamps.

9. **Real-Time Chat Messages** — The system delivers incoming tenant messages to the landlord's conversation thread in real time.

10. **Financial Reports and Statistics** — The system provides financial summaries: total and monthly income, expenses, net income, trend charts, and per-property breakdowns.

11. **Invoice Status Summary** — The system displays all invoices with aggregate metrics (total, collected, outstanding) and per-status breakdowns (paid, pending, overdue).

12. **Payment Submissions for Review** — The system presents tenant-uploaded receipts with receipt image, reference number, associated invoice, and timestamp.

13. **Task List and Progress** — The system returns the task list with status, priority badges, overdue alerts, and an overall completion percentage.

14. **Maintenance Requests and AI Analysis** — The system displays maintenance requests with AI-generated analysis: category, severity, summary, recommended action, estimated cost, and confidence score.

15. **Tenant Directory** — The system provides a list of all tenants with active or pending leases, including name, contact info, property, unit, lease period, rent, and status.

16. **Alerts and Notifications** — The system delivers critical, warning, and informational alerts for maintenance, payments, inquiries, and routine updates.

---

### C. Between System Administrator (Rectangle) and Process 0 (Circle)

#### Arrows Pointing Inward: Admin → System

Draw **two arrows** from the System Administrator rectangle toward the central process circle. Label each arrow as follows:

1. **Admin Login Credentials** — The administrator provides email and password to authenticate and access the admin portal.

2. **Application Review Decision** — The administrator submits a decision for each landlord application: approve (upgrading the user's role to landlord) or reject (with a mandatory rejection reason).

#### Arrows Pointing Outward: System → Admin

Draw **three arrows** from the central process circle toward the System Administrator rectangle. Label each arrow as follows:

1. **Authentication Confirmation** — The system returns confirmation of successful login and grants access to the admin portal (restricted to users with the admin role).

2. **Landlord Application Queue** — The system presents all submitted applications sorted by date, filterable by status (pending, under review, approved, rejected), with applicant details and uploaded documents.

3. **Review Audit Trail** — The system displays a record of all past decisions including review timestamp, the decision made, and rejection reason (if applicable).

---

## Data Flow Count Summary

| External Entity | Inbound Arrows (Entity → System) | Outbound Arrows (System → Entity) | Total Flows |
|---|---|---|---|
| Tenant | 9 | 10 | 19 |
| Landlord | 17 | 16 | 33 |
| System Administrator | 2 | 3 | 5 |
| **Total** | **28** | **29** | **57** |

---

## System Boundary

Everything **inside** the circle (Process 0) includes all internal operations:

- User authentication and role-based access control
- Listing management and publication workflow
- Map-based property discovery engine
- Inquiry processing and decision pipeline
- Lease creation, digital signing, and countersigning
- Real-time bidirectional messaging engine
- Property and unit inventory management
- 2D spatial unit map / visual floor planner
- Financial ledger and invoicing
- Manual payment verification (GCash QR + receipt)
- Task management
- Maintenance request handling with AI-powered analysis
- AI property concierge (knowledge-base-driven FAQ)
- Community and neighbor interaction system
- Administrative landlord application vetting
- Notification and alert engine
- Cloud storage for media, signatures, and documents
- Row-level security for data isolation

Everything **outside** the circle is represented by the three external entity rectangles (Tenant, Landlord, System Administrator) and their connecting data flow arrows.
