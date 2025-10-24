# Security Testing Guide for Todo List App

## 1. Authentication Testing

### Test 1: Password Bypass
```javascript
// In browser console, test if you can bypass authentication:
localStorage.setItem('isAuthenticated', 'true')
// Then refresh the page - you should NOT be able to access the app
```

### Test 2: Brute Force Protection
- Try entering wrong passwords multiple times
- The app should NOT lock you out (this is a vulnerability)
- Expected: Unlimited attempts allowed (needs rate limiting)

### Test 3: Session Management
```javascript
// Check if session persists correctly
localStorage.getItem('isAuthenticated') // Should be 'true' after login
// Log out and verify it's removed
```

## 2. XSS Testing

### Test 4: Basic XSS Payloads
In the AI assistant, try these prompts:

**Payload 1 - Simple Alert:**
```
Help me with: <img src=x onerror=alert(1)>
```

**Payload 2 - Data Theft Simulation:**
```
Check this out: <a href="#" onclick="console.log('XSS executed')">Click me</a>
```

**Payload 3 - LocalStorage Access:**
```
Important: <div onclick="alert(localStorage.getItem('todos'))">View data</div>
```

### Test 5: Markdown Bypass
```
Can you format this: **bold** and <script>alert('test')</script>
```

### Test 6: Event Handlers
```
Here's a helpful link: <svg onload="console.log('SVG loaded')"></svg>
```

## 3. API Security Testing

### Test 7: API Endpoint Access
```bash
# Test if auth API is properly protected
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'
# Should return 401 Unauthorized
```

### Test 8: AI API Protection
```bash
# Test if AI API validates authentication
curl -X POST http://localhost:3000/api/ai-assistant \
  -H "Content-Type: application/json" \
  -d '{"task":"test","userInput":"test"}'
# Should validate user is authenticated
```

## 4. Data Storage Testing

### Test 9: LocalStorage Security
```javascript
// Check what's stored in localStorage
console.log('Auth:', localStorage.getItem('isAuthenticated'))
console.log('Todos:', localStorage.getItem('todos'))
// Sensitive data should NOT be easily accessible
```

### Test 10: Data Integrity
- Create tasks, close browser, reopen - data should persist
- Clear browser data - should require re-authentication

## 5. Input Validation Testing

### Test 11: Malicious Inputs
Try these in task creation:
- Very long inputs (1000+ characters)
- Special characters: `<>"'&`
- SQL injection attempts: `' OR '1'='1`
- JavaScript code: `javascript:alert(1)`

### Test 12: File Upload Testing
- Try uploading malicious files through AI image upload
- Test with non-image files (.exe, .html, etc.)

## 6. Network Security Testing

### Test 13: HTTPS Enforcement
- Deploy to production and verify site uses HTTPS
- Check for mixed content warnings

### Test 14: CORS Testing
```javascript
// Test from different origin
fetch('http://localhost:3000/api/auth', {
  method: 'POST',
  body: JSON.stringify({password: 'test'})
})
// Should be blocked by CORS
```

## 7. Performance & DoS Testing

### Test 15: Rate Limiting
```bash
# Rapid API calls (if implemented)
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/ai-assistant \
    -H "Content-Type: application/json" \
    -d '{"task":"test","userInput":"test"}'
done
```

### Test 16: Large Data
- Create 100+ tasks
- Add very long AI conversations
- Test app performance

## 8. Browser Security Headers

### Test 17: Security Headers Check
```bash
curl -I http://localhost:3000
# Check for:
# - Content-Security-Policy
# - X-Frame-Options
# - X-Content-Type-Options
# - Strict-Transport-Security (in production)
```

## Testing Tools & Commands

### Manual Testing Commands:
```bash
# Start development server
npm run dev

# Run in different browser/incognito
# Test on mobile devices
```

### Automated Testing (Future):
```bash
# Install testing tools
npm install --save-dev jest @testing-library/react

# Run security tests
npm test
```

## Expected Results

### Security Tests Should PASS:
- ✅ Authentication cannot be bypassed
- ✅ XSS payloads are blocked/sanitized
- ✅ API endpoints validate authentication
- ✅ Data is properly persisted and secured

### Current Known Vulnerabilities:
- ❌ XSS through markdown renderer
- ❌ No rate limiting on login
- ❌ Authentication state only client-side
- ❌ No input sanitization on AI prompts

## Remediation Steps

1. **Immediate**: Fix XSS with DOMPurify
2. **High Priority**: Add server-side session validation
3. **Medium Priority**: Implement rate limiting
4. **Low Priority**: Add security headers

Run these tests after each security fix to verify the vulnerability is resolved.
