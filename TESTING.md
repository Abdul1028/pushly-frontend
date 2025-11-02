# 🧪 Testing Guide for Pushly API Server

This guide provides comprehensive testing instructions for the secure and scalable Pushly API Server architecture.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Authentication Testing](#authentication-testing)
4. [Project Management Testing](#project-management-testing)
5. [Deployment Testing](#deployment-testing)
6. [Security Testing](#security-testing)
7. [Performance Testing](#performance-testing)
8. [Error Handling Testing](#error-handling-testing)
9. [API Documentation](#api-documentation)
10. [Automated Testing](#automated-testing)

## 🔧 Prerequisites

- **Postman** or **Insomnia** for API testing
- **curl** for command-line testing
- **Database access** (PostgreSQL)
- **AWS credentials** configured
- **Java 17+** and **Maven** for running the application

## 🚀 Environment Setup

### 1. Start the Application

```bash
# Navigate to project directory
cd /Users/abdul/Desktop/pushly/api-server

# Run the application
./mvnw spring-boot:run
```

### 2. Verify Application Health

```bash
# Health check
curl -X GET https://api.wareality.tech/api/public/health

# Expected response:
{
  "status": "UP",
  "service": "Pushly API Server",
  "timestamp": "1703123456789"
}
```

## 🔐 Authentication Testing

### 1. User Registration

```bash
curl -X POST https://api.wareality.tech/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'
```

**Expected Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "USER",
    "enabled": true
  }
}
```

### 2. User Login

```bash
curl -X POST https://api.wareality.tech/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'
```

**Expected Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "USER"
  }
}
```

### 3. Get Current User

```bash
# Replace YOUR_JWT_TOKEN with the token from login response
curl -X GET https://api.wareality.tech/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📁 Project Management Testing

### 1. Create Project

```bash
curl -X POST https://api.wareality.tech/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Test Project",
    "description": "A test project for API testing",
    "gitURL": "https://github.com/username/repo.git",
    "gitBranch": "main",
    "subdomain": "test-project",
    "maxConcurrentDeployments": 3,
    "deploymentRetentionDays": 30,
    "autoDeploy": false
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": 1,
  "name": "My Test Project",
  "description": "A test project for API testing",
  "gitURL": "https://github.com/username/repo.git",
  "gitBranch": "main",
  "subdomain": "test-project",
  "createdBy": {
    "id": 1,
    "email": "john.doe@example.com"
  },
  "createdAt": "2023-12-21T10:30:00",
  "maxConcurrentDeployments": 3,
  "deploymentRetentionDays": 30
}
```

### 2. Get User Projects

```bash
curl -X GET "https://api.wareality.tech/api/projects?page=0&size=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Specific Project

```bash
curl -X GET https://api.wareality.tech/api/projects/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Update Project

```bash
curl -X PUT https://api.wareality.tech/api/projects/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Test Project",
    "description": "Updated description",
    "gitURL": "https://github.com/username/repo.git",
    "gitBranch": "develop",
    "subdomain": "updated-project"
  }'
```

### 5. Delete Project

```bash
curl -X DELETE https://api.wareality.tech/api/projects/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚀 Deployment Testing

### 1. Create Deployment

```bash
curl -X POST https://api.wareality.tech/api/projects/1/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gitCommitHash": "abc123def456",
    "gitBranch": "main",
    "environment": "STAGING"
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": 1,
  "project": {
    "id": 1,
    "name": "My Test Project"
  },
  "status": "QUEUED",
  "environment": "STAGING",
  "gitCommitHash": "abc123def456",
  "gitBranch": "main",
  "version": "staging-1703123456789",
  "createdAt": "2023-12-21T10:30:00"
}
```

### 2. Get Project Deployments

```bash
curl -X GET "https://api.wareality.tech/api/projects/1/deployments?page=0&size=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Deployments by Environment

```bash
curl -X GET "https://api.wareality.tech/api/projects/1/deployments/environment/STAGING?page=0&size=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Deploy to Environment

```bash
curl -X POST "https://api.wareality.tech/api/projects/1/deployments/1/deploy?environment=PRODUCTION" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Get Active Deployments

```bash
curl -X GET https://api.wareality.tech/api/projects/1/deployments/active \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Rollback Deployment

```bash
curl -X POST "https://api.wareality.tech/api/projects/1/deployments/1/rollback?environment=PRODUCTION" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Stop Deployment

```bash
curl -X POST https://api.wareality.tech/api/projects/1/deployments/1/stop \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Cleanup Old Deployments

```bash
curl -X POST https://api.wareality.tech/api/projects/1/deployments/cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛡️ Security Testing

### 1. Test Unauthorized Access

```bash
# Try to access protected endpoint without token
curl -X GET https://api.wareality.tech/api/projects

# Expected Response (401 Unauthorized):
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource",
  "path": "/api/projects"
}
```

### 2. Test Invalid Token

```bash
curl -X GET https://api.wareality.tech/api/projects \
  -H "Authorization: Bearer invalid_token"

# Expected Response (401 Unauthorized)
```

### 3. Test Cross-User Access

```bash
# Create another user
curl -X POST https://api.wareality.tech/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "password": "securePassword123"
  }'

# Try to access first user's project with second user's token
curl -X GET https://api.wareality.tech/api/projects/1 \
  -H "Authorization: Bearer JANE_USER_TOKEN"

# Expected Response (403 Forbidden):
{
  "error": "Access denied",
  "message": "You don't have permission to access this project"
}
```

### 4. Test Input Validation

```bash
# Test invalid email format
curl -X POST https://api.wareality.tech/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "invalid-email",
    "password": "securePassword123"
  }'

# Expected Response (400 Bad Request):
{
  "email": "Email should be valid"
}
```

### 5. Test Password Requirements

```bash
# Test weak password
curl -X POST https://api.wareality.tech/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "123"
  }'

# Expected Response (400 Bad Request):
{
  "password": "Password must be at least 8 characters"
}
```

## ⚡ Performance Testing

### 1. Test Concurrent Deployments

```bash
# Create multiple deployments simultaneously
for i in {1..5}; do
  curl -X POST https://api.wareality.tech/api/projects/1/deployments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d "{
      \"gitCommitHash\": \"commit$i\",
      \"gitBranch\": \"main\",
      \"environment\": \"STAGING\"
    }" &
done
wait
```

### 2. Test Large Dataset Pagination

```bash
# Test pagination with large number of deployments
curl -X GET "https://api.wareality.tech/api/projects/1/deployments?page=0&size=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Database Performance

```bash
# Create many projects and test retrieval
for i in {1..50}; do
  curl -X POST https://api.wareality.tech/api/projects \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d "{
      \"name\": \"Project $i\",
      \"description\": \"Test project $i\",
      \"gitURL\": \"https://github.com/test/repo$i.git\"
    }"
done
```

## 🚨 Error Handling Testing

### 1. Test Non-Existent Resources

```bash
# Try to get non-existent project
curl -X GET https://api.wareality.tech/api/projects/999999 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response (404 Not Found)
```

### 2. Test Invalid Environment

```bash
# Try to create deployment with invalid environment
curl -X POST https://api.wareality.tech/api/projects/1/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gitCommitHash": "abc123",
    "gitBranch": "main",
    "environment": "INVALID_ENV"
  }'

# Expected Response (400 Bad Request)
```

### 3. Test Duplicate Subdomain

```bash
# Try to create project with existing subdomain
curl -X POST https://api.wareality.tech/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Duplicate Project",
    "gitURL": "https://github.com/test/repo.git",
    "subdomain": "test-project"
  }'

# Expected Response (400 Bad Request):
{
  "error": "Internal server error",
  "message": "Subdomain already exists: test-project"
}
```

## 📚 API Documentation

### Postman Collection

Create a Postman collection with the following structure:

```
Pushly API Server
├── Authentication
│   ├── Register User
│   ├── Login User
│   └── Get Current User
├── Projects
│   ├── Create Project
│   ├── Get User Projects
│   ├── Get Project by ID
│   ├── Update Project
│   └── Delete Project
├── Deployments
│   ├── Create Deployment
│   ├── Get Project Deployments
│   ├── Get Deployment by ID
│   ├── Deploy to Environment
│   ├── Rollback Deployment
│   ├── Stop Deployment
│   └── Cleanup Deployments
└── Public
    ├── Health Check
    └── Service Info
```

### Environment Variables in Postman

Set up these variables in Postman:

- `base_url`: `https://api.wareality.tech`
- `jwt_token`: `{{token from login response}}`
- `project_id`: `{{id from project creation}}`
- `deployment_id`: `{{id from deployment creation}}`

## 🤖 Automated Testing

### 1. Unit Tests

Create unit tests for services:

```java
@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {
    
    @Mock
    private ProjectRepository projectRepository;
    
    @InjectMocks
    private ProjectService projectService;
    
    @Test
    void shouldCreateProjectSuccessfully() {
        // Test implementation
    }
    
    @Test
    void shouldThrowExceptionWhenSubdomainExists() {
        // Test implementation
    }
}
```

### 2. Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-test.properties")
class ProjectControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateProjectWithValidData() {
        // Test implementation
    }
}
```

### 3. Security Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SecurityTest {
    
    @Test
    void shouldRejectUnauthorizedAccess() {
        // Test implementation
    }
    
    @Test
    void shouldAllowAuthorizedAccess() {
        // Test implementation
    }
}
```

## 📊 Test Scenarios Checklist

### ✅ Authentication Tests
- [ ] User registration with valid data
- [ ] User registration with invalid data
- [ ] User login with valid credentials
- [ ] User login with invalid credentials
- [ ] JWT token validation
- [ ] Token expiration handling

### ✅ Project Management Tests
- [ ] Create project with valid data
- [ ] Create project with duplicate subdomain
- [ ] Get user's projects
- [ ] Get specific project
- [ ] Update project
- [ ] Delete project
- [ ] Cross-user access prevention

### ✅ Deployment Tests
- [ ] Create deployment
- [ ] Get project deployments
- [ ] Deploy to environment
- [ ] Rollback deployment
- [ ] Stop deployment
- [ ] Cleanup old deployments
- [ ] Concurrent deployment limits

### ✅ Security Tests
- [ ] Unauthorized access prevention
- [ ] Invalid token handling
- [ ] Cross-user data access prevention
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention

### ✅ Performance Tests
- [ ] Large dataset handling
- [ ] Concurrent request handling
- [ ] Database query optimization
- [ ] Memory usage monitoring

### ✅ Error Handling Tests
- [ ] Non-existent resource handling
- [ ] Invalid input handling
- [ ] Database constraint violations
- [ ] Network error handling

## 🔍 Monitoring and Debugging

### 1. Application Logs

Monitor application logs for:
- Authentication attempts
- Database queries
- ECS task executions
- Error occurrences

### 2. Database Monitoring

Check database for:
- User creation
- Project relationships
- Deployment status updates
- Data integrity

### 3. AWS ECS Monitoring

Monitor ECS for:
- Task creation
- Task status changes
- Resource utilization
- Error logs

## 🚀 Production Testing

Before deploying to production:

1. **Load Testing**: Use tools like JMeter or Gatling
2. **Security Scanning**: Use OWASP ZAP or similar tools
3. **Database Performance**: Test with production-like data volumes
4. **AWS Integration**: Test with actual AWS resources
5. **Monitoring Setup**: Ensure all monitoring is in place

## 📝 Test Results Documentation

Document test results including:
- Test execution date
- Environment details
- Pass/fail status
- Performance metrics
- Issues found and resolutions
- Recommendations for improvements

---

## 🎯 Quick Test Commands

```bash
# Quick health check
curl https://api.wareality.tech/api/public/health

# Quick authentication test
curl -X POST https://api.wareality.tech/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"testpass123"}'

# Quick project creation test
curl -X POST https://api.wareality.tech/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Project","gitURL":"https://github.com/test/repo.git"}'
```

This comprehensive testing guide ensures your API server is thoroughly tested for security, functionality, and performance before production deployment.
