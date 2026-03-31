# Deskreen Remote URL Redirector (dr.php)

A simple PHP script that allows you to access your Deskreen session through a fixed URL without needing to remember or type the IP address, port, and room ID each time.

## How It Works

1. **Deskreen sends the connection details** to your PHP script automatically when a session starts
2. **You access the fixed URL** (e.g., `https://yourdomain.com/dr.php`) from any device
3. **The script redirects you** to your current Deskreen session automatically

## Installation

### 1. Upload the PHP Script

Upload `dr.php` to your web server. For example:
- `https://yourdomain.com/dr.php`
- `https://yourdomain.com/deskreen/dr.php`

Make sure the directory is writable by PHP so it can create `deskreen_url.txt`.

### 2. Configure Deskreen

Set the environment variable `DESKREEN_REMOTE_URL` to point to your PHP script.

**Option A: Set in your shell (temporary)**
```bash
export DESKREEN_REMOTE_URL="https://yourdomain.com/dr.php"
npm run dev
```

**Option B: Set in `.env` file (recommended)**

Create or edit a `.env` file in the Deskreen root directory:
```env
DESKREEN_REMOTE_URL=https://yourdomain.com/dr.php
```

**Option C: Set permanently in your system**

macOS/Linux:
```bash
echo 'export DESKREEN_REMOTE_URL="https://yourdomain.com/dr.php"' >> ~/.zshrc
# or ~/.bashrc for bash
```

Windows:
```cmd
setx DESKREEN_REMOTE_URL "https://yourdomain.com/dr.php"
```

### 3. Build and Run Deskreen

```bash
npm run build
npm run dev
```

## Usage

### Automatic Mode (Recommended)

1. Start Deskreen on your computer
2. Wait for the session to be created
3. Open `https://yourdomain.com/dr.php` on your client device
4. You'll be automatically redirected to your Deskreen session

### Manual Mode

If you want to manually save a URL:

**Save a full URL:**
```
https://yourdomain.com/dr.php?url=http://192.168.1.100:3131/123456
```

**Save using components:**
```
https://yourdomain.com/dr.php?ip=192.168.1.100&port=3131&room=123456
```

**Redirect to saved URL:**
```
https://yourdomain.com/dr.php
```

## Features

- ✅ **Automatic URL Updates**: Deskreen sends the connection URL automatically
- ✅ **Expiration**: URLs expire after 1 hour for security
- ✅ **Validation**: Validates IP addresses and port numbers
- ✅ **JSON API**: Returns JSON responses when saving URLs
- ✅ **Beautiful Error Page**: Shows a nice message when no session is active
- ✅ **Lightweight**: Single PHP file, no database required

## Configuration

Edit the configuration section in `dr.php`:

```php
// Configuration
$dataFile = __DIR__ . '/deskreen_url.txt';  // Where to store the URL
$maxAge = 3600;  // URL expires after 1 hour (in seconds)
```

### Changing Expiration Time

```php
$maxAge = 1800;   // 30 minutes
$maxAge = 7200;   // 2 hours
$maxAge = 86400;  // 24 hours
```

## Security Considerations

1. **HTTPS Recommended**: Use HTTPS for your PHP script to prevent URL interception
2. **File Permissions**: Ensure `deskreen_url.txt` is not publicly accessible
3. **Expiration**: URLs automatically expire after the configured time
4. **IP Validation**: The script validates IP addresses before saving

### Securing the URL File

Add this to your `.htaccess` file:
```apache
<Files "deskreen_url.txt">
    Order allow,deny
    Deny from all
</Files>
```

Or for nginx, add to your config:
```nginx
location ~* deskreen_url\.txt$ {
    deny all;
}
```

## Troubleshooting

### "Failed to save URL" error

Check file permissions:
```bash
chmod 755 /path/to/directory
chmod 644 /path/to/dr.php
```

### URL not updating automatically

1. Check that `DESKREEN_REMOTE_URL` environment variable is set
2. Check Deskreen console for error messages
3. Verify your server is accessible from your Deskreen machine
4. Check PHP error logs on your server

### "URL has expired" message

The saved URL is older than 1 hour. Start a new Deskreen session or increase `$maxAge`.

## API Reference

### Save URL Endpoint

**Request:**
```
GET /dr.php?ip=192.168.1.100&port=3131&room=123456
```

**Response (Success):**
```json
{
    "success": true,
    "url": "http://192.168.1.100:3131/123456",
    "message": "URL saved successfully"
}
```

**Response (Error):**
```
HTTP 400 Bad Request
Invalid IP, port, or room parameters
```

### Redirect Endpoint

**Request:**
```
GET /dr.php
```

**Response (Active Session):**
```
HTTP 302 Found
Location: http://192.168.1.100:3131/123456
```

**Response (No Session):**
```
HTTP 404 Not Found
[HTML page with error message]
```

**Response (Expired Session):**
```
HTTP 410 Gone
Saved URL has expired. Please generate a new connection.
```

## Example Workflow

1. **You're at your computer**: Start Deskreen
2. **Deskreen automatically sends** the connection URL to `https://yourdomain.com/dr.php`
3. **You're on your phone**: Open `https://yourdomain.com/dr.php`
4. **Instant redirect**: You're now viewing your screen on your phone in fullscreen!

No typing IP addresses, no scanning QR codes (optional), no manual configuration!

## License

This script is provided as-is for use with Deskreen CE.
