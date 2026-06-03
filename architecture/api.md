# AICYP API DOCUMENTATION

Version 1
Base URL: `/api/v1`

---

## Overview

This document defines the complete REST API specification for **aicyp** (AI-based Crop Yield Prediction system). The API is versioned, stateless, Firebase JWT secured, mobile-ready, and production-scalable. All endpoints use a standardized response wrapper and support future extensibility.

---

## Standard Response Format

All endpoints return the following structure:

```json
{
  "success": true,
  "data": {},
  "message": null,
  "timestamp": "ISO-8601 string"
}
```

---

## Authentication

Authentication is handled using Firebase Authentication.

Clients must send a valid Firebase ID token in every protected request.

**Header:**

```
Authorization: Bearer <firebase-id-token>
```

The backend verifies the token and attaches user identity and role to the security context.

### Roles

* FARMER
* ADMIN

---

## Authentication Endpoints

### • GET /auth/me

**Description:** Returns the currently authenticated user profile.
**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "firebaseUid",
    "role": "FARMER or ADMIN",
    "createdAt": "ISO-8601 timestamp"
  },
  "message": null,
  "timestamp": "ISO-8601 timestamp"
}
```

---

## Farm Management Endpoints

### • POST /farms

**Description:** Create a new farm for the authenticated user.
**Authentication:** FARMER

**Request Body:**

```json
{
  "name": "string",
  "district": "string",
  "crop": "string",
  "landSize": number,
  "irrigationType": "string",
  "soilType": "string"
}
```

---

### • GET /farms

**Description:** Retrieve paginated list of farms belonging to the authenticated user.
**Authentication:** FARMER

**Query Parameters:**

* page (default 0)
* size (default 10)
* sort (field,direction)

**Example:**

```
/farms?page=0&size=10&sort=createdAt,desc
```

**Paginated Response:**

```json
{
  "success": true,
  "data": {
    "content": [],
    "page": 0,
    "size": 10,
    "totalElements": 0,
    "totalPages": 0,
    "last": false
  },
  "message": null,
  "timestamp": "ISO-8601"
}
```

---

### • GET /farms/{farmId}

**Description:** Retrieve specific farm by ID.
**Authentication:** FARMER

---

### • PUT /farms/{farmId}

**Description:** Update farm details.
**Authentication:** FARMER

---

### • DELETE /farms/{farmId}

**Description:** Soft delete farm (sets `isActive` to false).
**Authentication:** FARMER

---

## Prediction Endpoints

### • POST /predictions/generate

**Description:** Generate yield prediction for a farm.
**Authentication:** FARMER

**Request Body:**

```json
{
  "farmId": "string"
}
```

**Backend Flow:**

* Fetch farm
* Enrich soil baseline
* Fetch weather data
* Call ML microservice
* Store prediction
* Return response

**Response:**

```json
{
  "success": true,
  "data": {
    "predictionId": "string",
    "predictedYield": number,
    "confidence": number,
    "modelVersion": "string"
  },
  "message": null,
  "timestamp": "ISO-8601"
}
```

---

### • GET /predictions/{predictionId}

**Description:** Retrieve specific prediction by ID.
**Authentication:** FARMER

---

### • GET /predictions

**Description:** Retrieve paginated predictions for authenticated user.
**Authentication:** FARMER

**Query Parameters:**

* farmId (optional)
* riskLevel (optional)
* page
* size
* sort

---

### • GET /farms/{farmId}/predictions

**Description:** Retrieve paginated prediction history for a specific farm.
**Authentication:** FARMER

---

## Prediction Feedback Endpoint

### • POST /predictions/{predictionId}/feedback

**Description:** Submit actual yield and feedback for ML improvement and retraining.
**Authentication:** FARMER

**Request Body:**

```json
{
  "actualYield": number,
  "notes": "string"
}
```

---

## Recommendation Endpoints

### • POST /recommendations/generate

**Description:** Generate irrigation, fertilizer, and pest management recommendations.
**Authentication:** FARMER

**Request Body:**

```json
{
  "farmId": "string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "irrigationPlan": [],
    "fertilizerPlan": [],
    "pestRisk": "LOW | MEDIUM | HIGH"
  },
  "message": null,
  "timestamp": "ISO-8601"
}
```

---

## Metadata Endpoints

### • GET /meta/crops

Retrieve list of supported crops.

### • GET /meta/districts

Retrieve list of supported districts.

### • GET /meta/soil-types

Retrieve soil type options.

### • GET /meta/irrigation-types

Retrieve irrigation type options.

Authentication required for all metadata endpoints.

---

## Weather Endpoints

### • GET /weather/{district}

Retrieve cached weather data for a district.
Authentication required.

---

## Analytics Endpoints

### • GET /analytics/overview

Retrieve dashboard-level statistics.
Authentication: FARMER

### • GET /analytics/yield-trend

Retrieve yield trend data for charts.
Authentication: FARMER

Query Parameters:

* farmId (optional)
* year (optional)

### • GET /analytics/risk-distribution

Retrieve distribution of risk levels across predictions.
Authentication: FARMER

---

## Health and Monitoring Endpoints

### • GET /health

Returns overall system health including backend, database, and ML service status.

### • GET /health/ml

Checks ML service connectivity.

### • GET /health/database

Checks MongoDB connectivity.

Authentication not required for health endpoints.

---

## Admin Endpoints

All endpoints under `/admin` require ADMIN role.

### • GET /admin/models

Retrieve available ML model versions.

### • PUT /admin/models/activate/{version}

Activate specific ML model version.

### • GET /admin/users

Retrieve paginated list of users.

### • PUT /admin/users/{uid}/role

Update user role (FARMER or ADMIN).

### • GET /admin/system/stats

Retrieve system-wide statistics including total users, farms, and predictions.

---

## Pagination Strategy

All list endpoints must support:

* page
* size
* sort

Format example:

```
?page=0&size=10&sort=createdAt,desc
```

Page-based pagination is mandatory.
Raw arrays are not allowed in responses.

---

## DTO Policy

* No Mongo entity is exposed directly.
* All responses must use DTOs.
* Internal schema changes must not break API contracts.

---

## Error Handling

Errors use appropriate HTTP status codes:

* 400 Bad Request
* 401 Unauthorized
* 403 Forbidden
* 404 Not Found
* 500 Internal Server Error

Error responses still follow the standard response wrapper.

---

## Non-Goals

The following are not included:

* GraphQL
* WebSockets
* Batch prediction APIs
* Public ML endpoints
* Direct ML access from clients

---

This document defines the complete API surface for aicyp version 1.
