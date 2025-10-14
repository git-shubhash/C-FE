# CURA Pharmacy Dashboard

CURA Pharmacy Dashboard is a full-stack web application designed for hospital pharmacy management. It streamlines the workflow for pharmacists by providing modules for prescription management, medicine inventory, billing, and analytics.

## Features

- **Prescription Management:**
  - Retrieve prescriptions by scanning QR codes or entering appointment IDs.
  - View, dispense, download, or send prescriptions via WhatsApp.
  - Integrated billing and payment (cash/online via Razorpay) for dispensed medicines.

- **Inventory Management:**
  - Add, edit, delete, and refill medicines.
  - Track stock status (in stock/low stock).
  - Export inventory data (full or low stock) to Excel.

- **Billing:**
  - View and manage billing history.
  - Download or print detailed invoices.
  - Send bills via WhatsApp.

- **Analytics:**
  - Dashboard with revenue, sales, and inventory statistics.
  - Visual sales trends and top-performing medicines.
  - Export analytics data to Excel.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, shadcn-ui, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (inferred from migrations)
- **Other:** Razorpay integration, PDF/Excel export, QR code scanning

## Getting Started

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```
2. Install dependencies:
   ```sh
   npm install
   cd server && npm install
   cd ..
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
4. The backend server runs separately in `/server`.

## HTTPS Development

To run the application with HTTPS (recommended for production-like development):

1. **Start both frontend and backend with HTTPS:**
   ```sh
   npm run start:https
   ```

2. **Or start them separately:**
   ```sh
   # Frontend with HTTPS
   npm run dev:https
   
   # Backend with HTTPS (in server directory)
   cd server && npm run dev
   ```

3. **Access the application:**
   - Frontend: https://localhost:8080
   - Backend API: https://localhost:5000

**Note:** The application uses self-signed certificates in the `certs/` directory. Your browser may show a security warning - this is normal for development. Click "Advanced" and "Proceed to localhost" to continue.

## Deployment

See [Lovable documentation](https://lovable.dev/projects/0b3ae198-8c40-4594-b066-62790cc5442e) or deploy with your preferred method.

---
