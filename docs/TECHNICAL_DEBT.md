# Technical Debt & Improvement Roadmap

This document tracks technical debt, code quality issues, and planned improvements for Kometa Preview Studio.

---

## Critical Issues (Must Fix Before Production)

### 1. Zero Test Coverage
**Priority:** CRITICAL
**Impact:** Cannot safely refactor, no regression protection
**Location:** Entire codebase

**Action Items:**
- [ ] Set up Jest for backend (`npm install --save-dev jest @types/jest ts-jest`)
- [ ] Set up Vitest for frontend (`npm install --save-dev vitest @testing-library/react`)
- [ ] Write unit tests for critical paths:
  - `plexClient.ts` - Search and metadata fetching
  - `yaml.ts` - Config parsing and validation
  - `resolveTargets.ts` - Target filtering logic
  - `configGenerator.ts` - Preview config generation
- [ ] Add integration tests for API endpoints
- [ ] Target 80% coverage for core modules

---

### 2. In-Memory Profile Storage
**Priority:** HIGH
**Impact:** Data loss on server restart
**Location:** `backend/src/api/configUpload.ts:14`

```typescript
const profiles = new Map<string, Profile>();  // Lost on restart!
```

**Action Items:**
- [ ] Create `ProfileRepository` interface
- [ ] Implement file-based storage (`data/profiles.json`)
- [ ] Add atomic writes with temp file + rename pattern
- [ ] Add LRU cache with max 100 profiles

---

### 3. Status Enum Mismatch (Frontend/Backend)
**Priority:** HIGH
**Impact:** API contract broken

**Backend** (`backend/src/jobs/jobManager.ts:15`):
```typescript
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

**Frontend** (`frontend/src/api/client.ts:16`):
```typescript
status: 'queued' | 'resolving' | 'fetching' | 'rendering' | 'succeeded' | 'failed' | 'cancelled';
```

**Action Items:**
- [ ] Create shared types package or file
- [ ] Sync status values between frontend and backend
- [ ] Add runtime validation

---

### 4. Input Validation
**Priority:** HIGH
**Impact:** Security vulnerability
**Location:** `backend/src/index.ts:47-58`, `backend/src/util/yaml.ts`

**Current Issues:**
- MIME type validation can be bypassed
- No schema validation for YAML content
- No environment variable validation

**Action Items:**
- [ ] Install `zod` for runtime validation
- [ ] Create Kometa config schema
- [ ] Validate config structure after parsing
- [ ] Validate environment variables on startup

---

## High Priority Issues

### 5. Docker Image Pull Blocks Requests
**Priority:** HIGH
**Impact:** First preview can take minutes
**Location:** `backend/src/kometa/runner.ts:276-303`

**Action Items:**
- [ ] Pre-pull image during server initialization
- [ ] Add progress events during pull
- [ ] Cache pull status to avoid repeated checks

---

### 6. Code Duplication in Plex Client
**Priority:** MEDIUM-HIGH
**Impact:** Maintenance burden, bug surface
**Location:** `backend/src/plex/plexClient.ts:114-259`

`searchMovies()` and `searchShows()` share ~130 lines of identical logic.

**Action Items:**
- [ ] Extract common search logic to `searchByType(type, title, year?)`
- [ ] Use generics for return types
- [ ] Add comprehensive tests before refactoring

---

### 7. JobManager Does Too Much
**Priority:** MEDIUM
**Impact:** Hard to test and maintain
**Location:** `backend/src/jobs/jobManager.ts` (575 lines)

**Responsibilities (should be split):**
- Job lifecycle management
- Plex interaction orchestration
- Artifact management
- Event emission
- Disk I/O

**Action Items:**
- [ ] Extract `ArtifactManager` class
- [ ] Extract `JobRepository` class
- [ ] Keep `JobOrchestrator` as coordinator
- [ ] Define clear interfaces between components

---

## Medium Priority Issues

### 8. No Error Boundaries in React
**Priority:** MEDIUM
**Impact:** App crashes on component errors
**Location:** `frontend/src/App.tsx`

**Action Items:**
- [ ] Create `ErrorBoundary` component
- [ ] Wrap main routes with error boundary
- [ ] Add fallback UI for errors

---

### 9. Hardcoded Preview Targets in Frontend
**Priority:** MEDIUM
**Impact:** Duplication, out of sync
**Location:** `frontend/src/pages/Preview.tsx:23-29`

Same targets defined in:
- `backend/src/plex/resolveTargets.ts:60-145`
- `frontend/src/pages/Preview.tsx:23-29`
- `frontend/src/components/TestOptionsPanel.tsx:8-14`

**Action Items:**
- [ ] Remove hardcoded targets from frontend
- [ ] Fetch from `/api/preview/targets` on page load
- [ ] Cache in component state

---

### 10. Complex State in Preview Page
**Priority:** MEDIUM
**Impact:** Hard to reason about state changes
**Location:** `frontend/src/pages/Preview.tsx:37-43`

7 related state variables should use `useReducer`.

**Action Items:**
- [ ] Define `PreviewState` interface
- [ ] Create `previewReducer` function
- [ ] Replace useState calls with useReducer
- [ ] Define action types for state transitions

---

### 11. No Pagination for Job List
**Priority:** MEDIUM
**Impact:** Performance issue with many jobs
**Location:** `backend/src/api/previewStatus.ts:143-166`

**Action Items:**
- [ ] Add `page` and `limit` query parameters
- [ ] Implement offset-based pagination
- [ ] Add `total` count to response
- [ ] Update frontend to paginate

---

### 12. Silent Failures in Async Operations
**Priority:** MEDIUM
**Impact:** Hard to debug issues
**Locations:**
- `backend/src/jobs/jobManager.ts:343-350` - Returns null on error
- `backend/src/plex/fetchArtwork.ts:55-63` - No error handling on copyFile

**Action Items:**
- [ ] Add structured logging (pino or winston)
- [ ] Distinguish between "not found" and "error"
- [ ] Propagate errors with context

---

## Low Priority Issues

### 13. Magic Numbers
**Priority:** LOW
**Locations:**
- `backend/src/plex/plexClient.ts:41` - `30000` timeout
- `backend/src/index.ts:45` - `10 * 1024 * 1024` file size
- Various poll intervals

**Action Items:**
- [ ] Extract to `constants.ts` file
- [ ] Use descriptive constant names
- [ ] Document units in names (e.g., `TIMEOUT_MS`)

---

### 14. Missing Security Headers
**Priority:** LOW (local-only app)
**Location:** `backend/src/index.ts`

**Action Items:**
- [ ] Add `helmet` middleware for security headers
- [ ] Document HTTPS requirement for production
- [ ] Add rate limiting for API endpoints

---

### 15. Inconsistent API Response Format
**Priority:** LOW
**Impact:** API consumer confusion

**Action Items:**
- [ ] Define `ApiResponse<T>` envelope type
- [ ] Standardize success/error response format
- [ ] Add response middleware

---

## Dependency Updates

| Package | Current | Latest | Priority |
|---------|---------|--------|----------|
| typescript | ^5.3.3 | 5.4.x | Low |
| eslint | ^8.56.0 | 9.x | Low |
| express | ^4.18.2 | 4.21.x | Low |
| react | ^18.2.0 | 18.3.x | Low |

**Action Items:**
- [ ] Run `npm outdated` monthly
- [ ] Update patch versions immediately
- [ ] Plan minor/major updates quarterly

---

## Missing Dependencies

| Package | Purpose | Priority |
|---------|---------|----------|
| `zod` | Runtime validation | High |
| `pino` | Structured logging | Medium |
| `helmet` | Security headers | Low |
| `express-rate-limit` | Rate limiting | Low |

---

## Architecture Improvements

### Shared Types Package
Create `packages/shared` with:
- API request/response types
- Job status enums
- Preview target definitions
- Test options types

### Repository Pattern
Implement for:
- Profile storage
- Job metadata storage
- Artifact management

### Event-Driven Architecture
Consider:
- Job queue (Bull/BullMQ) for background processing
- Concurrent job limits
- Retry logic with exponential backoff

---

## Testing Strategy

### Unit Tests (Priority 1)
- Pure functions: `yaml.ts`, `hash.ts`
- Business logic: `resolveTargets.ts`, `configGenerator.ts`
- Plex client (with mocked HTTP)

### Integration Tests (Priority 2)
- API endpoint contracts
- Job lifecycle
- SSE event streaming

### E2E Tests (Priority 3)
- Full preview workflow
- Error scenarios
- Browser compatibility

---

## Quick Wins (< 30 min each)

1. [ ] Add environment variable validation on startup
2. [ ] Extract magic numbers to constants
3. [ ] Add TypeScript strict null checks
4. [ ] Create ErrorBoundary component
5. [ ] Add request logging middleware
6. [ ] Fix status enum mismatch

---

## Definition of Done for Technical Debt

- [ ] Issue is documented in this file
- [ ] Fix is implemented and tested
- [ ] Existing tests pass
- [ ] New tests added for the fix
- [ ] Code reviewed by another developer
- [ ] Documentation updated if needed
