# Quick Setup Guide for dr.php

## What This Does

Instead of typing `http://192.168.1.100:3131/123456` every time you want to connect to Deskreen, you can just visit `https://yourdomain.com/dr.php` and it will automatically redirect you to your current session!

## Setup Steps

### Step 1: Upload dr.php to Your Server

1. Upload `dr.php` to your web server
2. Make sure the directory is writable by PHP
3. Test by visiting: `https://yourdomain.com/dr.php` (you should see a nice page saying "No Active Deskreen Session")

### Step 2: Configure Deskreen

**Option A: Using .env file (Recommended)**

Create a `.env` file in the Deskreen root directory:

```bash
echo "DESKREEN_REMOTE_URL=https://yourdomain.com/dr.php" > .env
```

**Option B: Set environment variable**

```bash
# macOS/Linux
export DESKREEN_REMOTE_URL="https://yourdomain.com/dr.php"

# Windows
setx DESKREEN_REMOTE_URL "https://yourdomain.com/dr.php"
```

### Step 3: Run Deskreen

```bash
npm run dev
```

### Step 4: Use It!

1. Start Deskreen on your computer
2. Open `https://yourdomain.com/dr.php` on your phone/tablet
3. You're instantly connected in fullscreen! 🎉

## How It Works

```
Deskreen Starts
     ↓
Automatically sends IP:PORT/ROOM to dr.php
     ↓
dr.php saves the URL
     ↓
You visit dr.php from any device
     ↓
Instantly redirected to your Deskreen session
     ↓
Auto-fullscreen activates
     ↓
You're viewing your screen!
```

## Testing

### Test manually first:

1. Visit your dr.php with parameters:
   ```
   https://yourdomain.com/dr.php?ip=192.168.1.100&port=3131&room=123456
   ```

2. You should see:
   ```json
   {
     "success": true,
     "url": "http://192.168.1.100:3131/123456",
     "message": "URL saved successfully"
   }
   ```

3. Now visit without parameters:
   ```
   https://yourdomain.com/dr.php
   ```

4. You should be redirected to: `http://192.168.1.100:3131/123456`

### Check Deskreen logs:

When you start Deskreen, you should see:
```
Sending connection URL to remote: https://yourdomain.com/dr.php?ip=...
Remote URL updated successfully: { success: true, ... }
```

## Troubleshooting

**Not sending to remote?**
- Check that `DESKREEN_REMOTE_URL` is set: `echo $DESKREEN_REMOTE_URL`
- Restart Deskreen after setting the variable

**PHP errors?**
- Check directory permissions: `chmod 755 /path/to/directory`
- Check PHP error logs

**Still not working?**
- Check browser console for errors
- Check Deskreen console output
- Verify your server is accessible from your computer

## Security Tips

1. **Use HTTPS**: Always use `https://` for your dr.php URL
2. **Protect the data file**: Add `.htaccess` rules to block access to `deskreen_url.txt`
3. **Keep sessions short**: Default 1-hour expiration is good for security

## Example .htaccess

```apache
# Protect data file
<Files "deskreen_url.txt">
    Order allow,deny
    Deny from all
</Files>

# Optional: Restrict access to dr.php by IP (if you have a static IP)
# <Files "dr.php">
#     Order deny,allow
#     Deny from all
#     Allow from 1.2.3.4
# </Files>
```

## Pro Tip: Bookmark It!

Add `https://yourdomain.com/dr.php` as a bookmark on your phone's home screen for one-tap access to your Deskreen session!

**iOS:**
1. Open Safari and visit dr.php
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Name it "My Screen"

**Android:**
1. Open Chrome and visit dr.php
2. Tap the menu (⋮)
3. Tap "Add to Home Screen"
4. Name it "My Screen"

Now you have a one-tap icon to view your computer screen anywhere! 📱💻
