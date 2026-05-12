# Auth-Gated App Testing Playbook

Use this when testing student-facing pages that require Google OAuth, by creating
a session manually via mongosh (instead of doing the real OAuth flow).

## Step 1: Create Test User & Session
```
mongosh --eval "
use('lost_found_db');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://i.pravatar.cc/150?img=1',
  role: 'student',
  points: 0, badges: [],
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test backend
```
curl -X GET "$BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser testing — set cookie before navigating
```python
await page.context.add_cookies([{
  "name": "session_token", "value": "YOUR_SESSION_TOKEN",
  "domain": "your-app.com", "path": "/", "httpOnly": True,
  "secure": True, "sameSite": "None"
}])
await page.goto("https://your-app.com/dashboard")
```

## Admin
Admin uses JWT email/password:
```
curl -X POST "$BACKEND_URL/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@campus.edu","password":"Admin@123"}'
```
Returns `{ access_token: "...", token_type: "bearer", user: {...} }`. Use `Authorization: Bearer <token>` for subsequent admin calls.

## Cleanup
```
mongosh --eval "use('lost_found_db'); db.users.deleteMany({email: /test\.user\./}); db.user_sessions.deleteMany({session_token: /test_session/});"
```
