# 📚 Library Management System  
*A Database Design and Web Application Project (NYU, Jan–May 2025)*  

## 📌 Overview  
This project implements a **Library Management System (LMS)** to automate core library operations such as book rentals, room reservations, event management, and invoicing. It integrates a **normalized MySQL relational schema** with a **Node.js + Express backend** and **Firebase Authentication** for secure, role-based access.  

Key features include:  
- 🔑 Role-based access (Admin, Author, Customer, Sponsor)  
- 🗂️ Book inventory management with rentals and returns  
- 📅 Study room reservations with concurrency control  
- 💳 Automated invoice generation via SQL triggers  
- 🎟️ Event, seminar, and exhibition management  
- 🛡️ Security features: SQL injection prevention, stored procedures, JWT tokens, parameterized queries, and security questions for password reset  

---

## 🛠️ Tech Stack  
- **Database**: MySQL (20+ normalized tables, triggers, stored procedures, indexing)  
- **Backend**: Node.js, Express.js  
- **Authentication**: Firebase Authentication + JWT  
- **Frontend**: HTML5, CSS, JavaScript (Studio Ghibli–themed UI)  
- **Testing & Tools**: Postman, Chart.js, Firebase Admin SDK  

---

## 📂 Project Structure  
```
├── config/          # DB connection & environment setup
├── controllers/     # Business logic & SQL operations
├── middleware/      # Authentication & role validation
├── public/          # Frontend (HTML, CSS, JS)
├── routes/          # Express routes
├── schema.sql       # Database DDL & triggers
├── server.js        # Main server entry point
└── package.json     # Dependencies & scripts
```

---

## ⚙️ Setup Instructions  

### 1. Clone the Repository  
```bash
git clone https://github.com/your-username/Library-Management-System.git
cd Library-Management-System
```

### 2. Install Dependencies  
```bash
npm install
```

### 3. Configure Environment  
Create a `.env` file:  
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=library_db
FIREBASE_API_KEY=your-firebase-api-key
```

Import `schema.sql` into MySQL to create tables, triggers, and stored procedures.  

### 4. Run the Application  
```bash
npm start
```
App will be available at **http://localhost:3000**  

---

##  Features in Detail  
- **Admins**: Manage users, books, invoices, and room reservations  
- **Authors**: Register for seminars and manage authored books  
- **Customers**: Borrow/return books, reserve rooms, register for events, and view invoices  
- **Sponsors**: Access sponsor dashboard and manage contributions  

---

##  Security Highlights  
- Firebase Authentication + JWT for login/role verification  
- Parameterized queries + stored procedures to prevent SQL injection  
- Security questions for password reset with bcrypt hashing  
- Transactions with `FOR UPDATE` locks for safe concurrency  
- XSS prevention via input sanitization and safe DOM handling  

---

##  Future Improvements  
- Book borrowing/return notifications via email  
- Mobile-friendly frontend (React/Angular)  
- Analytics dashboards for admins (usage patterns, revenue trends)  

---


## 🔗 GitHub Link  
[Library Management System Repository](https://github.com/your-username/Library-Management-System)  
