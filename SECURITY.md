# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          | Security Updates |
| ------- | ------------------ | ---------------- |
| 1.1.x   | :white_check_mark: | :white_check_mark: |
| 1.0.x   | :white_check_mark: | :white_check_mark: |
| < 1.0   | :x:                | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** create a public GitHub issue
   - Security vulnerabilities should be reported privately to prevent exploitation

### 2. Report via Email
   - **Email**: [Your security email address]
   - **Subject**: `[SECURITY] SF Middleware Vulnerability Report`
   - **Include**:
     - Description of the vulnerability
     - Steps to reproduce
     - Potential impact
     - Suggested fix (if available)
     - Your contact information

### 3. Response Timeline
   - **Initial Response**: Within 48 hours
   - **Status Update**: Within 7 days
   - **Fix Timeline**: Depends on severity (see below)

### 4. Severity Levels

| Severity | Response Time | Fix Timeline |
|----------|---------------|--------------|
| **Critical** | 24 hours | 7 days |
| **High** | 48 hours | 14 days |
| **Medium** | 7 days | 30 days |
| **Low** | 14 days | 90 days |

### 5. Disclosure Policy
   - We will acknowledge receipt of your report
   - We will keep you informed of our progress
   - We will credit you in the security advisory (if desired)
   - We will coordinate public disclosure after a fix is available

## Security Features

This project implements multiple layers of security:

### Authentication & Authorization
- ✅ JWT authentication with httpOnly cookies
- ✅ Refresh token mechanism (7-day expiry, one-time use)
- ✅ Token revocation and blacklist system
- ✅ API key authentication with SHA-256 hash validation
- ✅ Role-based access control (USER, ADMIN, SUPER_ADMIN)
- ✅ Permission-based API key access control
- ✅ CSRF protection for state-changing operations
- ✅ Environment-specific API keys

### Input Validation & Sanitization
- ✅ Global validation pipeline with DTOs
- ✅ Input sanitization (XSS prevention)
- ✅ SQL injection prevention (Prisma ORM + parameterized queries)
- ✅ Request size limits (10MB max)
- ✅ Batch operation limits (1000 items max)
- ✅ Sort field whitelisting
- ✅ Password complexity validation

### Network Security
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Rate limiting (tiered by endpoint type)
- ✅ SSL/TLS support (HTTPS in production)
- ✅ Trust proxy configuration

### Data Protection
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ API key encryption (AES-256-GCM)
- ✅ Sensitive data redaction in logs
- ✅ Secure cookie settings (httpOnly, secure, sameSite)

### Monitoring & Logging
- ✅ Comprehensive audit logging
- ✅ Error tracking and management
- ✅ Request tracking
- ✅ Failed login attempt tracking
- ✅ Security event logging

## Security Best Practices

### For Developers

1. **Never commit secrets**
   - Use environment variables
   - Add `.env` to `.gitignore`
   - Use `.env.template` for documentation

2. **Keep dependencies updated**
   ```bash
   npm audit
   npm audit fix
   ```

3. **Validate all inputs**
   - Use DTOs with class-validator
   - Sanitize user inputs
   - Validate file uploads

4. **Use parameterized queries**
   - Always use Prisma ORM (prevents SQL injection)
   - Never use raw SQL with user input

5. **Follow principle of least privilege**
   - Grant minimum required permissions
   - Use role-based access control
   - Validate permissions on every request

6. **Log security events**
   - Log authentication attempts
   - Log authorization failures
   - Log sensitive operations

### For Deployment

1. **Environment Variables**
   - Use strong, unique secrets for each environment
   - Rotate secrets regularly
   - Never share secrets between environments

2. **Database Security**
   - Use strong database passwords
   - Restrict database access (localhost only)
   - Enable SSL for database connections
   - Regular backups with encryption

3. **Redis Security**
   - Enable Redis AUTH
   - Use strong Redis passwords
   - Restrict Redis access (localhost only)
   - Use SSL/TLS for remote connections

4. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Enable fail2ban for SSH
   - Use VPN for server access

5. **SSL/TLS Configuration**
   - Use Let's Encrypt or similar
   - Enable HSTS (HTTP Strict Transport Security)
   - Use strong cipher suites
   - Regular certificate renewal

6. **Monitoring**
   - Monitor failed login attempts
   - Monitor rate limit violations
   - Monitor error rates
   - Set up alerts for anomalies

## Security Checklist

### Pre-Deployment
- [ ] All environment variables set with strong values
- [ ] Database passwords changed from defaults
- [ ] Redis AUTH enabled with strong password
- [ ] JWT_SECRET is strong and unique
- [ ] SSL certificates configured
- [ ] Firewall rules configured
- [ ] Rate limiting configured appropriately
- [ ] CORS origins configured correctly
- [ ] Security headers enabled (Helmet)
- [ ] Error messages sanitized (no stack traces in production)

### Post-Deployment
- [ ] Health checks passing
- [ ] SSL certificate valid and auto-renewal configured
- [ ] Database backups configured
- [ ] Log rotation configured
- [ ] Monitoring and alerts configured
- [ ] Access logs reviewed regularly
- [ ] Security updates applied regularly

### Ongoing Maintenance
- [ ] Regular dependency updates (`npm audit`)
- [ ] Regular security patches
- [ ] Regular log reviews
- [ ] Regular backup verification
- [ ] Regular security audits
- [ ] Regular penetration testing (recommended)

## Known Security Considerations

### API Key Storage
- API keys are hashed using SHA-256 before storage
- Plain text keys are only shown once during creation
- Keys should be stored securely by clients

### Password Requirements
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Cannot contain user information (name, email, company)
- Cannot be a common password

### Rate Limiting
- High-volume endpoints: 1000 requests/minute per IP
- General API endpoints: 500 requests/15 minutes per IP
- Health checks: No rate limiting
- Admin endpoints: No rate limiting for authenticated admins

### Session Management
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry, one-time use
- Tokens are automatically revoked on logout
- All sessions can be revoked in case of security breach

## Security Updates

We regularly update dependencies and address security vulnerabilities. To stay updated:

1. **Monitor Dependencies**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Check CHANGELOG.md**
   - Security fixes are documented in the changelog

3. **Subscribe to Security Advisories**
   - Check repository for security advisories
   - Monitor NestJS security updates
   - Monitor Node.js security updates

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Security Contact

For security-related questions or to report vulnerabilities:

- **Email**: ordinaryadventurer75@gmail.com
- **Response Time**: Within 48 hours

## Acknowledgments

We appreciate the security researchers and community members who help keep this project secure. Security researchers who responsibly disclose vulnerabilities will be credited in our security advisories (if desired).

---

**Last Updated**: November 2025

**Version**: 1.1.0

