VEDIKA BIRTHDAY SURPRISE WEBSITE

Files:
- index.html / style.css / script.js: the public website
- profiles/: one .json per person (texts, photos, letter), index.json lists them, archive/ keeps deleted ones.
  Each person opens with index.html?for=their-slug (no ?for= opens the default person)
- admin.php: your admin page (needs PHP, e.g. XAMPP)
- uploads/: photos added through admin
- assets/: the six original photos

RUN (XAMPP):
1. Put this folder in C:\xampp\htdocs\vedika-birthday-website (index.html must be directly inside).
2. Start Apache in XAMPP.
3. Site:  http://localhost/vedika-birthday-website/   (unlock with the birth date in admin, default 11 Nov 2026)
4. Admin: http://localhost/vedika-birthday-website/admin.php
   First visit asks you to create a password. Forgot it? Delete admin-config.php and open admin again.

SITE FLOW: pages with Next/Back buttons (no scrolling). Photos stay hidden until a bubble is popped; bubbles float around.

ADMIN CAN: add many photos at once, reorder, caption and remove them, edit the letter,
show/hide the letter bubble, change names/texts/birth date and the main colour.

SHARING WITH VEDIKA:
- Static hosts (Netlify, GitHub Pages) cannot run PHP. Edit on your PC with admin, then upload the whole
  folder (including data.json, uploads/ and assets/). Do NOT upload admin.php or admin-config.php there.
- Or use a PHP host and keep admin.php with your password.
- The birthday gate is a fun interaction, not security: the date is readable in data.json.
