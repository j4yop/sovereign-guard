# Internal Enterprise API Reference
**Classification:** EngineeringDocs  
**Service:** Core Microservices Gateway  
**Environment:** Local Emulation / SAM Local

## 1. Endpoints
### `GET /api/v1/health`
Returns service health and active agent connections.
- **Classification:** PublicInternal
- **Authorization:** Read-only

### `GET /api/v1/catalog/services`
Lists available microservices and their schema specifications.
- **Classification:** PublicInternal
- **Authorization:** Read-only

### `POST /api/v1/cloud/provision`
Provisions simulated cloud resources (mutating action).
- **Classification:** Restricted
- **Requires:** `context.admin_override == true`
- **Cedar Guard:** Automatically blocked for autonomous agents unless explicitly permitted.
