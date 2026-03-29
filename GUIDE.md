# 🚀 Local Development Setup Guide
### Inventory Management System

---

## ✅ Running Order
1. **PostgreSQL** (must be running first)
2. **Backend** (Spring Boot)
3. **ML Service** (FastAPI)
4. **Frontend** (React)

---

## Step 1 — PostgreSQL Database Setup

Run the following SQL commands to create the database and user:

```sql
CREATE DATABASE springdb;
CREATE USER springuser WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE springdb TO springuser;
```
or create using pgadmin application in windows


| Field         | Value          |
|---------------|----------------|
| Database name | `springdb`     |
| Username      | `springuser`   |
| Password      | `strongpassword` |

---

## Step 2 — ML Service Setup

**Navigate to the ml-service folder:**
```bash
cd inventory-management-system/ml-service
```

**Create and activate a virtual environment:**
```bash
python -m venv env


# Windows:
env\Scripts\activate   
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Create a `.env` file inside `ml-service/` with these values:**
```env
DB_USER=springuser
DB_PASSWORD=strongpassword
DB_HOST=localhost
DB_PORT=5432
DB_NAME=springdb
```


---

## Step 3 — Backend Setup

Set these environment variables **before** running the backend.

**Windows:**
```cmd
set DB_URL=jdbc:postgresql://localhost:5432/springdb
set DB_USERNAME=springuser
set DB_PASSWORD=strongpassword
set JWT_SECRET=3f9b1c7a9e4d2f8b6a5c1e7d4f9a2b8c6d1e3f7a9b5c2d8e4f1a7c6b9d3e2f8a
```

**Then run the backend:**
```bash
cd backend
mvn spring-boot:run
```

---

## Step 4 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Step 5 — Run the ML Service

Make sure your virtual environment is **still active**, then:

```bash
cd ml-service
uvicorn main:app --reload --port 8080
```

To test the ML API, open your browser and go to:
```
http://localhost:8080/docs
```

---

> ⚠️ **All 4 services must be running at the same time for the full system to work.**
