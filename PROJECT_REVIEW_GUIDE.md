# Kirana Shop Management System - Final Year Project Review Guide

## 1) Project Overview

This project is a full-stack **Kirana (retail shop) management system** built to digitize daily store operations.

It covers:
- Inventory management
- Billing and sales
- Purchase orders and supplier payments
- Customer management
- Dashboard analytics and reports
- JWT-based authentication (Login + Register)

Primary goal: replace manual bookkeeping with a fast, secure, and scalable web application.

---

## 2) Problem Statement

Small retail shops usually manage stock, bills, and purchases manually in notebooks or spreadsheets.  
This causes:
- Stock mismatch and no real-time visibility
- Slow billing and poor traceability
- Difficult profit/loss tracking
- No centralized data for business decisions

This system solves those issues with one integrated platform.

---

## 3) Tech Stack

### Frontend
- React 18
- Vite 5
- React Router 6
- Tailwind CSS 4 + custom CSS variables (dark/light theme)
- Lucide React icons

### Backend
- Spring Boot 3.4.3
- Java 21
- Spring Data JPA
- Spring Security + JWT (jjwt)
- Bean Validation

### Database
- H2 in-memory (default for local development)
- PostgreSQL (production-ready schema available)

---

## 4) High-Level Architecture

1. User interacts with React UI.
2. Frontend sends REST API request to Spring Boot backend.
3. JWT token is validated by security filter.
4. Controller -> Service -> Repository layers process business logic.
5. Data is read/written via JPA entities to H2/PostgreSQL.
6. JSON response is returned to frontend.

Design patterns used:
- Layered architecture (Controller/Service/Repository)
- DTO-based API contracts
- Soft-delete strategy (`deleted_at`)
- Multi-tenant style data scoping using retailer context

---

## 5) Core Modules Implemented

### 5.1 Authentication
- Login with **email or phone number + password**
- Register new retailer account
- Password hashing with **BCrypt**
- JWT token generation and validation
- Google Sign-In button is UI-ready placeholder (for future OAuth wiring)

### 5.2 Dashboard
- Today sales and bill count
- Inventory alerts (low/out-of-stock)
- Stock value summary

### 5.3 Inventory
- Add/edit/delete items
- SKU/barcode/category support
- Stock thresholds and reorder points

### 5.4 Purchases
- Supplier management
- Create purchase orders with multiple items
- Item search and add flow
- Inline new-item creation if item does not exist
- Status update to `received` adds stock automatically

### 5.5 Billing/Sales
- Multi-item bill creation
- Supports payment modes (cash/card/UPI/credit)
- Automatic stock deduction

### 5.6 Customers and Suppliers
- Full CRUD operations
- Search support and history linkage

### 5.7 Reports/Payments
- Supplier payment records
- Summary and top items endpoints

---

## 6) Database Design Summary

Key tables:
- `retailers`
- `items`
- `sales`, `sale_items`
- `purchase_orders`, `purchase_order_items`
- `suppliers`, `supplier_payments`
- `customers`
- `inventory_transactions`
- `daily_summary`
- `returns`, `return_items`

Notable design points:
- `retailers.password_hash` added for secure auth
- `deleted_at` used for soft delete
- Automatic timestamps on create/update

---

## 7) Exact Steps to Run Locally (Different Terminals)

Open **3 terminals** from project root `E:\4th-yr-project`.

## Terminal 1 - Backend

```powershell
cd backend & ".mvn\wrapper\maven\bin\mvn.cmd" clean spring-boot:run
```

Expected:
- Backend runs at `http://localhost:5000`
- H2 console available at `http://localhost:5000/h2-console`

## Terminal 2 - Frontend

```powershell
cd frontend
npm install
npm run dev
```

Expected:
- Frontend runs at `http://localhost:3000`

## Terminal 3 - Seed mock data

```powershell
cd E:\4th-yr-project powershell -ExecutionPolicy Bypass -File .\seed-data.ps1
```

This script will auto:
- Get auth token
- Insert suppliers, items, customers
- Create purchase orders and mark some as received
- Create sales records
- Record supplier payments

---

## 8) Demo Credentials and Auth Flow

Seeded retailer (H2 schema):
- Email: `rajesh@example.com`
- Password: `password123`

Flow:
1. Open `http://localhost:3000/login`
2. Login using above credentials
3. Or go to register flow and create a new retailer
4. On success, JWT is stored in `localStorage` and protected routes open

---

## 9) How to Feed Extra Mock Data Manually (API)

First, get a token:

```powershell
$token = (Invoke-RestMethod "http://localhost:5000/api/auth/demo-token").data.token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
```

Add supplier:

```powershell
$supplier = @{
  company_name = "Demo Foods Pvt Ltd"
  contact_person = "Rohit Verma"
  phone = "9876511111"
  email = "rohit@demofoods.com"
  address = "Pune, Maharashtra"
  gst_number = "27ABCDE1234F1Z5"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/suppliers" -Method POST -Headers $headers -Body $supplier
```

Add item:

```powershell
$item = @{
  name = "Demo Rice 1kg"
  sku = "DEMO-001"
  barcode = "8901000000001"
  category = "Groceries"
  unit = "packet"
  purchase_price = 42
  selling_price = 55
  current_stock = 100
  min_stock_threshold = 20
  reorder_point = 25
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/items" -Method POST -Headers $headers -Body $item
```

Create purchase order:

```powershell
$po = @{
  supplier_id = 1
  total_amount = 1100
  notes = "Review demo PO"
  items = @(
    @{ item_id = 1; quantity = 10; unit_price = 110 }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:5000/api/purchase-orders" -Method POST -Headers $headers -Body $po
```

---

## 10) How to Verify Data During Review

### Option A: H2 Console
1. Open `http://localhost:5000/h2-console`
2. JDBC URL: `jdbc:h2:mem:kirana_db`
3. User: `sa`, Password: *(empty)*

Sample queries:

```sql
SELECT id, business_name, email FROM retailers;
SELECT id, name, current_stock FROM items ORDER BY id;
SELECT id, final_amount, payment_method, payment_status FROM sales ORDER BY id DESC;
SELECT id, supplier_id, status, total_amount FROM purchase_orders ORDER BY id DESC;
```

### Option B: API checks

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:5000/api/items" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:5000/api/sales" -Headers $headers
```

---

## 11) Key Engineering Work Completed

- Migrated backend local setup to H2 for zero-setup dev run
- Fixed lazy-loading issues using transactional read boundaries
- Added secure authentication system:
  - `password_hash` in schema
  - BCrypt password verification
  - Register endpoint and DTO
  - Login via email/phone
- Replaced frontend auto-login with dedicated auth pages
- Implemented consistent theming support in auth screens
- Improved purchase flow for item search + inline item creation
- Added realistic data seeding script for complete project demo

---

## 12) What to Say in Review (Short Script)

1. **Problem**: Kirana shops need reliable digital tracking for stock, billing, and supplier cycles.  
2. **Solution**: Built a full-stack SPA + REST backend with secure auth and modular business workflows.  
3. **Technical depth**: JWT security, BCrypt hashing, layered architecture, soft delete, transactional services, and schema design.  
4. **Business value**: Real-time inventory visibility, reduced manual errors, and faster daily operations.  
5. **Future scope**: Google OAuth backend integration, role-based access, persistent production deployment on PostgreSQL + cloud hosting.

---

## 13) Common Troubleshooting

- Port 5000 busy:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```

- Frontend not opening:
  - ensure `npm run dev` is running in `frontend`
  - open exact URL shown by Vite (usually `http://localhost:3000`)

- Login failure:
  - verify backend is running
  - use seeded credentials above
  - ensure DB is freshly initialized on backend restart (H2 is in-memory)

---

Good luck for your review. This file is designed so you can directly present from it.
