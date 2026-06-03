Perfect. ✅
We are locking this in as an architectural decision.

---

# 🔒 Locked Decision #2

## Phase 1: Web Application Only

## Phase 2: Expo Android (Plug-in Ready)

Backend will be built **client-agnostic from day one**.

No rewrites later.

---

# 🏗 Final Locked Architecture

```text
Web App (React)
        ↓
Spring Boot REST API
        ↓
Python ML Microservice
        ↓
MongoDB
```

Future:

```text
Expo Android
        ↓
Spring Boot REST API (unchanged)
        ↓
Python ML (unchanged)
```

---

# 📜 Architectural Rules (Now Official)

### ✅ 1. Backend is 100% REST-based

* No server-side rendered auth sessions
* No UI logic in backend
* JSON in / JSON out

---

### ✅ 2. Stateless Authentication

* Firebase JWT
* Authorization: Bearer <token>
* No cookies
* No server sessions

This ensures mobile compatibility later.

---

### ✅ 3. API Versioning From Day One

All routes must start with:

```
/api/v1/
```

Example:

```
/api/v1/auth/me
/api/v1/farms
/api/v1/predict
```

Future changes → `/api/v2/`

---

### ✅ 4. Standard Response Format

Every response must follow:

Success:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

Error:

```json
{
  "success": false,
  "data": null,
  "message": "Unauthorized"
}
```

Mobile depends heavily on predictable responses.

---

### ✅ 5. Monorepo Structure (Future-Proofed)

```bash
agriintel/
│
├── frontend/
│   ├── web-app/
│   └── mobile-app/  # Empty for now
│
├── backend-springboot/
├── ml-service/
└── infra/
```

Mobile folder exists conceptually even if empty.

---

### ✅ 6. Backend Must Never Know Client Type

Spring Boot must not:

* Detect “web” vs “mobile”
* Render views
* Depend on browser cookies
* Use session state

It only processes authenticated REST requests.

---

### ✅ 7. CORS Only for Web

CORS config allowed for web domain.

Expo later will not require it.

---

# 🎯 What This Achieves

✔ Faster MVP
✔ Less complexity now
✔ Clean architecture
✔ Easy Android integration later
✔ No backend rewrite
✔ No auth refactor

---

# 📌 Final Locked Architecture Summary

You now officially have:

1. Python ML as independent microservice ✅
2. Spring Boot as orchestrator ✅
3. MongoDB as DB (for now) ✅
4. Web-only MVP first ✅
5. Expo-ready backend architecture ✅

This is production-grade planning.

---

If you want next, we should lock one more thing:

* API endpoint design
* Backend package structure
* Database schema
* Or environment setup (dev / staging / prod)

Tell me what to finalize next.
