# Deskreen Setup for https://www.supasorn.com/dr.php

## Quick Start

Your Deskreen is now configured to automatically send connection URLs to:
**https://www.supasorn.com/dr.php**

### How to Use

1. **Start Deskreen:**
   ```bash
   ./run-with-remote.sh
   ```
   
   Or manually:
   ```bash
   export DESKREEN_REMOTE_URL=https://www.supasorn.com/dr.php
   npm run dev
   ```

2. **Access from any device:**
   - Open **https://www.supasorn.com/dr.php** on your phone, tablet, or another computer
   - You'll be instantly redirected to your Deskreen session
   - Auto-fullscreen will activate (may require one click on some browsers)

### Files Already Configured

- ✅ `.env` - Contains `DESKREEN_REMOTE_URL=https://www.supasorn.com/dr.php`
- ✅ `dr.php` - Ready to upload to your server
- ✅ `run-with-remote.sh` - Convenient script to run Deskreen
- ✅ Deskreen code modified to send URLs automatically

### What Happens When You Start Deskreen

```
1. Deskreen starts
2. Creates a sharing session (e.g., room ID: 123456)
3. Automatically sends request to your server:
   → GET https://www.supasorn.com/dr.php?ip=192.168.1.X&port=3131&room=123456
4. Your dr.php saves the URL
5. Ready! Anyone visiting https://www.supasorn.com/dr.php gets redirected
```

### Console Output You'll See

When Deskreen successfully sends the URL:
```
Sending connection URL to remote: https://www.supasorn.com/dr.php?ip=192.168.1.100&port=3131&room=123456
Remote URL updated successfully: { success: true, url: 'http://192.168.1.100:3131/123456', message: 'URL saved successfully' }
```

If the remote URL is not configured:
```
(nothing - silently skipped)
```

If there's an error:
```
Failed to send connection URL to remote: [error details]
Remote URL update failed: [error details]
```

### Upload dr.php to Your Server

You need to upload `dr.php` to https://www.supasorn.com/

**Via FTP/SFTP:**
1. Connect to your server
2. Upload `dr.php` to the web root or subdirectory
3. Ensure the directory is writable (chmod 755)
4. Test by visiting: https://www.supasorn.com/dr.php

**Via SSH:**
```bash
# Upload using scp
scp dr.php user@supasorn.com:/path/to/web/root/

# Or if already on server, just create it
nano /path/to/web/root/dr.php
# Paste the contents
```

**Permissions:**
```bash
chmod 755 /path/to/web/root/
chmod 644 /path/to/web/root/dr.php
```

### Testing the Setup

1. **Test dr.php manually:**
   ```
   https://www.supasorn.com/dr.php?ip=192.168.1.100&port=3131&room=123456
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "url": "http://192.168.1.100:3131/123456",
     "message": "URL saved successfully"
   }
   ```

2. **Visit without parameters:**
   ```
   https://www.supasorn.com/dr.php
   ```
   
   Should redirect to: `http://192.168.1.100:3131/123456`

3. **Start Deskreen and check console:**
   - Look for "Sending connection URL to remote..."
   - Look for "Remote URL updated successfully..."

### Mobile Access

**Add to Home Screen for One-Tap Access:**

**iPhone/iPad:**
1. Open Safari → https://www.supasorn.com/dr.php
2. Tap Share (square with arrow) → "Add to Home Screen"
3. Name it "My Screen" or "Deskreen"
4. Tap the icon whenever you want to view your computer!

**Android:**
1. Open Chrome → https://www.supasorn.com/dr.php
2. Menu (⋮) → "Add to Home Screen"
3. Name it "My Screen" or "Deskreen"
4. Tap the icon whenever you want to view your computer!

### Complete Feature Set

When you use this setup, you get:

1. ✨ **Auto-send URL** - Deskreen → dr.php (automatic)
2. ✨ **Auto-confirm connection** - No dialog needed
3. ✨ **Auto-select "Entire Screen"** - No button click needed
4. ✨ **Auto-select screen** - Single or secondary screen
5. ✨ **Auto-confirm sharing** - Instant streaming
6. ✨ **Easy access** - Just visit dr.php
7. ✨ **Auto-fullscreen** - Immersive viewing (one click if needed)

**Total time from "Start Deskreen" to "Viewing on phone":**
- ~3 seconds to start Deskreen and send URL
- ~1 second to open dr.php on phone
- ~1 second for auto-fullscreen
= **~5 seconds total!** 🚀

### Troubleshooting

**"No Active Deskreen Session" page shows:**
- Deskreen hasn't started yet, or
- URL expired (after 1 hour), or
- dr.php didn't receive the URL

**Deskreen console shows "Failed to send connection URL":**
- Check your internet connection
- Verify dr.php is uploaded and accessible
- Check server logs for PHP errors

**dr.php returns errors:**
- Check directory permissions (755)
- Check PHP error logs
- Verify dr.php is uploaded correctly

**Auto-fullscreen doesn't work:**
- This is normal - browsers require user interaction
- Just click/touch anywhere on the page
- Fullscreen will activate immediately

### Security

- ✅ **URLs expire after 1 hour** - Prevents stale connections
- ✅ **IP/Port validation** - Only valid addresses accepted
- ✅ **HTTPS recommended** - Use secure connection to dr.php
- ✅ **No credentials stored** - Just temporary connection URLs

### Advanced: Changing the Remote URL

To use a different URL in the future:

1. Edit `.env`:
   ```bash
   nano .env
   # Change to: DESKREEN_REMOTE_URL=https://newurl.com/dr.php
   ```

2. Or set environment variable:
   ```bash
   export DESKREEN_REMOTE_URL=https://newurl.com/dr.php
   ```

3. Or pass when running:
   ```bash
   DESKREEN_REMOTE_URL=https://newurl.com/dr.php npm run dev
   ```

### Support Files

- `dr.php` - The PHP script (upload this!)
- `.env` - Environment configuration (already set)
- `run-with-remote.sh` - Convenient run script
- `DR_PHP_README.md` - Complete PHP script documentation
- `QUICK_SETUP.md` - Quick setup guide

---

**You're all set!** Just upload `dr.php` to your server and run `./run-with-remote.sh` to start! 🎉
