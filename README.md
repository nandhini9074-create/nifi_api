# Dynamic Partner Data Routing - POC

This is a Proof of Concept (POC) demonstrating dynamic API payload processing using **NestJS**, **Apache NiFi**, and **PostgreSQL**. The architecture avoids hardcoding partner-specific configurations in the application code.

## Architecture Flow

Client -> NestJS (Validation) -> Apache NiFi (Routing & Transform) -> PostgreSQL (Mapping Store & Target Table) -> NestJS -> Client

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+)
- Apache NiFi (v1.20+)

## 1. PostgreSQL Setup

1. Start your PostgreSQL database.
2. Run the SQL script located in `sql/init.sql` to create the tables and seed mapping data:
   ```bash
   psql -U your_user -d your_database -f sql/init.sql
   ```

## 2. NestJS Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   (Update the `.env` file if NiFi runs on a different URL).
3. Start the NestJS API:
   ```bash
   npm run start:dev
   ```
   The API will be available at `http://localhost:3000/api/v1`

## 3. Apache NiFi Flow Setup

Design the following flow in your NiFi UI:

1. **HandleHttpRequest**
   - Listening Port: `8085`
   - Allowed Paths: `/partner-data`
   - Allowed HTTP Methods: `POST`

2. **EvaluateJsonPath**
   - Destination: `flowfile-attribute`
   - Add property `partner_id`: `$.partner_id`

3. **LookupRecord** or **ExecuteSQL** (to fetch mapping from PostgreSQL)
   - Connection Pool: DBCPConnectionPool connected to PostgreSQL.
   - Query: `SELECT mapping_spec FROM partner_mapping_config WHERE partner_id = '${partner_id}' AND active = true`
   - Store the fetched JSON into an attribute, e.g., `mapping_spec`

4. **JoltTransformJSON**
   - Jolt Specification: Use Expression Language to dynamically use the mapping: `${mapping_spec}`
   - Alternatively, use a custom script or a parameterized Jolt transformation. *Note: If NiFi's JoltTransformJSON does not natively support EL for the spec property, you may use an ExecuteScript or InvokeScriptedProcessor in Groovy/Python to run Jolt dynamically.*

5. **PutDatabaseRecord**
   - Record Reader: JsonTreeReader
   - Database Connection Pooling Service: PostgreSQL DBCPConnectionPool
   - Table Name: `normalized_customer`
   - Statement Type: `INSERT`

6. **HandleHttpResponse** (Success Route)
   - HTTP Status Code: `200`
   - Use `ReplaceText` or similar processor before this to craft the JSON response body. 
   - Body should be: `{"success": true, "partner_id": "${partner_id}", "data": <transformed JSON>}`

7. **HandleHttpResponse** (Error Routes)
   - Return customized error messages for transformation failure or mapping-not-found (Status: `400` or `404`).

## Testing with Postman/cURL

Once everything is running, test the NestJS API using different partner structures.

### Test 1: EIB Partner
```bash
curl -X POST http://localhost:3000/api/v1/partner-data \
-H "Content-Type: application/json" \
-d '{
  "partner_id": "EIB",
  "user_name": "Nandhini",
  "phone": "9876543210"
}'
```

### Test 2: ADIB Partner
```bash
curl -X POST http://localhost:3000/api/v1/partner-data \
-H "Content-Type: application/json" \
-d '{
  "partner_id": "ADIB",
  "customer_name": "Nandhini",
  "mobile": "9876543210"
}'
```

### Test 3: Missing Partner ID (Validation Error)
```bash
curl -X POST http://localhost:3000/api/v1/partner-data \
-H "Content-Type: application/json" \
-d '{
  "user_name": "Nandhini"
}'
```
Expected: `400 Bad Request` from NestJS.

### Test 4: Unknown Partner
```bash
curl -X POST http://localhost:3000/api/v1/partner-data \
-H "Content-Type: application/json" \
-d '{
  "partner_id": "XYZ",
  "name": "Nandhini"
}'
```
Expected: NiFi should return mapping-not-found error, and NestJS relays it cleanly.
