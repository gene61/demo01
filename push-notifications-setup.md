# Push Notifications Setup Guide

## Overview
Your todo app now supports push notifications for task deadlines. Here's how to set it up:

## 1. Generate VAPID Keys

VAPID keys are required for push notifications. Run this command to generate them:

```bash
cd demo01
npx web-push generate-vapid-keys
```

This will output something like:
```
=======================================
Public Key:
BP4QyZfB8B6U6K... (long string)
Private Key:
qPrIvAtEkEy... (long string)
=======================================
```

## 2. Set Environment Variables

Add these to your `.env.local` file:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here

# Existing keys
DEEPSEEK_API_KEY=sk-a5da86ad63764615bc081e6dffd06bec
APP_PASSWORD=your-secure-password
```

## 3. Deploy to Vercel

### Add Environment Variables in Vercel:
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the same environment variables as in `.env.local`

### Enable Cron Jobs:
The cron job is already configured in `vercel.json` to run every hour:
```json
"crons": [
  {
    "path": "/api/notifications/check-deadlines",
    "schedule": "0 * * * *"
  }
]
```

## 4. How It Works

### Frontend Features:
- **Deadline Input**: Optional datetime picker for tasks
- **Push Subscription**: One-click notification subscription
- **Service Worker**: Handles background notifications

### Backend Features:
- **Subscription API**: Stores user push subscriptions
- **Deadline Checker**: Runs hourly via Vercel cron
- **Notification Sender**: Sends push notifications for due tasks

### Notification Types:
1. **Due Soon**: Tasks due within 1 hour
2. **Overdue**: Tasks past their deadline

## 5. Testing Push Notifications

### Manual Test:
1. Add a task with a deadline 5 minutes in the future
2. Subscribe to notifications
3. Wait for the notification (cron runs every hour)

### Force Test:
You can manually trigger the deadline check:
```bash
curl -X POST https://your-app.vercel.app/api/notifications/check-deadlines \
  -H "Content-Type: application/json" \
  -d '{"todos": [{"id": "1", "text": "Test Task", "deadline": "2025-10-24T14:00:00Z", "completed": false}]}'
```

## 6. Browser Support

Push notifications work in:
- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop)
- ✅ Edge (Desktop)
- ❌ Safari (limited support)

## 7. Security Notes

- Push subscriptions are stored in memory (resets on server restart)
- In production, use a database for persistent storage
- VAPID keys authenticate your server with push services
- Notifications require user permission

## 8. Troubleshooting

### Common Issues:

1. **"Notifications not supported"**
   - Check browser compatibility
   - Ensure HTTPS (required for push notifications)

2. **"Permission denied"**
   - User must grant notification permission
   - Clear site data and retry

3. **No notifications received**
   - Check VAPID keys are set correctly
   - Verify cron job is running
   - Check browser console for errors

4. **Service Worker not registering**
   - Ensure `public/sw.js` exists
   - Check browser supports service workers

## 9. Production Considerations

### Database Storage:
Replace the in-memory subscription store with a database:
```javascript
// In src/app/api/notifications/subscribe/route.ts
// Replace Map() with database calls
```

### Error Handling:
Add retry logic for failed notifications and cleanup expired subscriptions.

### Monitoring:
Monitor cron job execution and notification delivery rates.

## 10. Next Steps

1. Generate VAPID keys and add to environment variables
2. Deploy to Vercel with environment variables
3. Test with a task that has a near-future deadline
4. Monitor Vercel logs for cron job execution

Your app is now ready for push notifications! 🎉
