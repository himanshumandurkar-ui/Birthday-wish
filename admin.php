<?php
session_start();
$profDir  = __DIR__ . '/profiles';
$cfgFile  = __DIR__ . '/admin-config.php';
$upDir    = __DIR__ . '/uploads';

function jout($a, $code = 200) { http_response_code($code); header('Content-Type: application/json'); echo json_encode($a); exit; }
function loadData($s) { global $profDir; $d = json_decode((string)@file_get_contents("$profDir/$s.json"), true); return is_array($d) ? $d : []; }
function getIdx() { global $profDir; $i = json_decode((string)@file_get_contents("$profDir/index.json"), true); if (!is_array($i) || empty($i['list'])) $i = ['default' => 'vedika', 'list' => ['vedika']]; return $i; }
function saveIdx($i) { global $profDir; file_put_contents("$profDir/index.json", json_encode($i, JSON_PRETTY_PRINT), LOCK_EX); }
function saveProf($s, $d) { global $profDir; return file_put_contents("$profDir/$s.json", json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX); }
function clean($v, $max) { return mb_substr(trim((string)$v), 0, $max); }

$cfg = file_exists($cfgFile) ? include $cfgFile : null;
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$auth = !empty($_SESSION['auth']);
$idx = getIdx();
$cur = $_GET['p'] ?? $idx['default']; if (!in_array($cur, $idx['list'], true)) $cur = $idx['default'];
$msg = '';
$action = $_POST['action'] ?? ($_GET['action'] ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'setup' && !$cfg) {
        $p = (string)($_POST['password'] ?? '');
        if (strlen($p) < 6) { $msg = 'Password must be at least 6 characters.'; }
        else {
            file_put_contents($cfgFile, "<?php\nreturn " . var_export(['hash' => password_hash($p, PASSWORD_DEFAULT)], true) . ";\n", LOCK_EX);
            session_regenerate_id(true); $_SESSION['auth'] = true; $_SESSION['csrf'] = bin2hex(random_bytes(16));
            header('Location: admin.php'); exit;
        }
    } elseif ($action === 'login' && $cfg) {
        if (password_verify((string)($_POST['password'] ?? ''), $cfg['hash'])) {
            session_regenerate_id(true); $_SESSION['auth'] = true; $_SESSION['csrf'] = bin2hex(random_bytes(16));
            header('Location: admin.php'); exit;
        }
        sleep(1); $msg = 'Wrong password.';
    } elseif ($action === 'logout') {
        $_SESSION = []; session_destroy(); header('Location: admin.php'); exit;
    } elseif (in_array($action, ['upload', 'save', 'create', 'delete', 'default'], true)) {
        if (!$auth) jout(['error' => 'Not logged in'], 401);
        $tok = $_SERVER['HTTP_X_CSRF'] ?? ($_POST['csrf'] ?? '');
        if (!hash_equals($csrf, (string)$tok)) jout(['error' => 'Bad token, reload the page'], 403);

        if ($action === 'upload') {
            $f = $_FILES['photo'] ?? null;
            if (!$f || $f['error'] !== UPLOAD_ERR_OK) jout(['error' => 'Upload failed (code ' . ($f['error'] ?? '?') . '). Check PHP upload limits.'], 400);
            if ($f['size'] > 20 * 1024 * 1024) jout(['error' => 'File too large (max 20 MB)'], 400);
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
            $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime] ?? null;
            if (!$ext || !@getimagesize($f['tmp_name'])) jout(['error' => 'Only JPG, PNG, WEBP or GIF images'], 400);
            if (!is_dir($upDir)) mkdir($upDir, 0755, true);
            $name = bin2hex(random_bytes(8)) . '.' . $ext;
            if (!move_uploaded_file($f['tmp_name'], "$upDir/$name")) jout(['error' => 'Could not save file'], 500);
            jout(['src' => "uploads/$name"]);
        }

        $in = json_decode((string)file_get_contents('php://input'), true);
        if (!is_array($in)) jout(['error' => 'Bad data'], 400);
        $slug = $_GET['p'] ?? ''; if (!in_array($slug, $idx['list'], true)) jout(['error' => 'Unknown person'], 400);
        if ($action === 'create') {
            $nm = clean($in['name'] ?? '', 60); if ($nm === '') jout(['error' => 'Type a name'], 400);
            $base = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($nm)), '-') ?: 'person';
            $new = $base; $n = 2; while (in_array($new, $idx['list'], true)) $new = substr($base, 0, 36) . '-' . $n++;
            $nd = loadData($slug); $nd['name'] = $nm; $nd['photos'] = []; $nd['birthday'] = '';
            saveProf($new, $nd); $idx['list'][] = $new; saveIdx($idx); jout(['slug' => $new]);
        }
        if ($action === 'default') { $idx['default'] = $slug; saveIdx($idx); jout(['ok' => true]); }
        if ($action === 'delete') {
            if (count($idx['list']) < 2) jout(['error' => 'Keep at least one person'], 400);
            @mkdir("$profDir/archive", 0755, true);
            @rename("$profDir/$slug.json", "$profDir/archive/$slug-" . date('Ymd-His') . ".json");
            $idx['list'] = array_values(array_diff($idx['list'], [$slug]));
            if ($idx['default'] === $slug) $idx['default'] = $idx['list'][0];
            saveIdx($idx); jout(['ok' => true]);
        }
        $d = loadData($slug);
        foreach (['name' => 60, 'heroEyebrow' => 80, 'heroTitle' => 80, 'heroLine' => 300, 'introA' => 120, 'introB' => 120,
                  'introText' => 600, 'bubbleTitle' => 80, 'bubbleSub' => 300, 'footerTitle' => 100, 'footerText' => 300,
                  'footerStrong' => 120, 'footerSmall' => 160] as $k => $max) {
            if (isset($in[$k])) $d[$k] = clean($in[$k], $max);
        }
        if (isset($in['birthday']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $in['birthday'])) $d['birthday'] = $in['birthday'];
        if (isset($in['accent']) && preg_match('/^#[0-9a-fA-F]{6}$/', $in['accent'])) $d['accent'] = $in['accent'];
        $d['showLetterBubble'] = !empty($in['showLetterBubble']);
        if (isset($in['letter'])) $d['letter'] = mb_substr(trim((string)$in['letter']), 0, 8000);
        $photos = [];
        foreach ((array)($in['photos'] ?? []) as $p) {
            $src = (string)($p['src'] ?? '');
            if (preg_match('#^(assets/[A-Za-z0-9._-]+|uploads/[a-f0-9]{16}\.(jpg|png|webp|gif))$#', $src) && file_exists(__DIR__ . '/' . $src))
                $photos[] = ['src' => $src, 'caption' => clean($p['caption'] ?? '', 120)];
        }
        $d['photos'] = $photos;
        if (saveProf($slug, $d) === false)
            jout(['error' => 'Could not write profile file (check folder permissions)'], 500);
        $keep = array_column($photos, 'src');
        foreach (array_merge(glob("$profDir/*.json") ?: [], glob("$profDir/archive/*.json") ?: []) as $pf) {
            $o = json_decode((string)file_get_contents($pf), true);
            foreach ((array)($o['photos'] ?? []) as $p) $keep[] = $p['src'] ?? '';
        }
        foreach (glob("$upDir/*") ?: [] as $file) {
            if (preg_match('/^[a-f0-9]{16}\.(jpg|png|webp|gif)$/', basename($file)) && !in_array('uploads/' . basename($file), $keep, true)) @unlink($file);
        }
        jout(['ok' => true]);
    }
}
$data = loadData($cur);
$e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Admin · Birthday site</title>
<style>
*{box-sizing:border-box}body{margin:0;font:16px/1.5 "Segoe UI",system-ui,sans-serif;background:#fff3f7;color:#3f2433}
.wrap{max-width:860px;margin:0 auto;padding:20px}
h1{font-size:26px;margin:0 0 4px;color:#7a2a4d}h2{font-size:20px;margin:0 0 12px;color:#7a2a4d}
.card{background:#fff;border:1px solid #f0cddb;border-radius:18px;padding:20px;margin:16px 0;box-shadow:0 8px 24px #b85c7b14}
label{display:block;font-weight:600;font-size:14px;margin:12px 0 4px}
input[type=text],input[type=date],input[type=password],textarea{width:100%;padding:11px;border:1px solid #e0b3c5;border-radius:10px;font:inherit;background:#fffafc;color:#3f2433}
input[type=color]{width:64px;height:44px;border:1px solid #e0b3c5;border-radius:10px;padding:2px;background:#fff}
.btn{border:0;border-radius:999px;background:#a8416c;color:#fff;padding:11px 20px;font:600 15px inherit;cursor:pointer;min-height:44px}
.btn.alt{background:#fff;color:#8f3f63;border:1.5px solid #d98aa9}.btn.del{background:#fff;color:#a3122f;border:1.5px solid #e29aaa}
.btn:disabled{opacity:.6;cursor:wait}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.top form{margin:0}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.ph{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid #f0cddb;border-radius:14px;margin-bottom:10px;flex-wrap:wrap}
.ph img{width:72px;height:72px;object-fit:cover;border-radius:10px}.ph input[type=text]{flex:1;min-width:160px}
.note{font-size:13px;color:#7b5d6c}.msg{color:#a3122f;font-weight:600}
#status{position:sticky;bottom:12px;background:#3f2433;color:#fff;padding:12px 18px;border-radius:12px;display:none;margin-top:12px}
:focus-visible{outline:3px solid #7a2a4d;outline-offset:2px}
</style></head><body><div class="wrap">
<?php if (!$cfg): ?>
  <div class="card"><h1>Set your admin password</h1><p class="note">First time here. Choose a password (6+ characters). Only you will be able to edit the site.</p>
  <?php if ($msg): ?><p class="msg"><?= $e($msg) ?></p><?php endif; ?>
  <form method="post"><input type="hidden" name="action" value="setup"><label for="pw">New password</label><input id="pw" type="password" name="password" required minlength="6" autocomplete="new-password"><p><button class="btn">Save password</button></p></form></div>
<?php elseif (!$auth): ?>
  <div class="card"><h1>Admin login</h1>
  <?php if ($msg): ?><p class="msg"><?= $e($msg) ?></p><?php endif; ?>
  <form method="post"><input type="hidden" name="action" value="login"><label for="pw">Password</label><input id="pw" type="password" name="password" required autocomplete="current-password"><p><button class="btn">Log in</button></p></form></div>
<?php else: ?>
  <div class="top"><div><h1>Birthday site admin</h1><p class="note">Change anything, then press Save. Photos upload and save by themselves.</p></div>
    <div class="row"><a class="btn alt" href="index.html" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center">View site</a>
    <form method="post"><input type="hidden" name="action" value="logout"><button class="btn alt">Log out</button></form></div></div>

  <div class="card"><h2>Whose birthday page?</h2>
    <div class="row"><select id="prof" aria-label="Choose person" style="padding:11px;border-radius:10px;border:1px solid #e0b3c5;font:inherit"><?php foreach ($idx['list'] as $s): $nm = loadData($s)['name'] ?? $s; ?><option value="<?= $e($s) ?>"<?= $s === $cur ? ' selected' : '' ?>><?= $e($nm) ?> (<?= $e($s) ?>)<?= $s === $idx['default'] ? ' · default' : '' ?></option><?php endforeach; ?></select>
    <button class="btn alt" id="newp" type="button">+ New person</button><button class="btn alt" id="defp" type="button">Make default</button><button class="btn del" id="delp" type="button">Delete (archived)</button></div>
    <p class="note">Share this link with this person: <b>index.html?for=<?= $e($cur) ?></b>. New person copies the current texts and letter, with no photos. Set their birth date below. Deleted people are archived in profiles/archive, not lost.</p></div>

  <div class="card"><h2>Photo bubbles</h2>
    <p class="note">Each photo becomes one bubble. Add as many as you like at once. Big photos are shrunk automatically.</p>
    <div class="row"><label class="btn" for="files" style="margin:0">+ Add photos</label><input id="files" type="file" accept="image/*" multiple hidden></div>
    <div id="photos" style="margin-top:14px"></div></div>

  <div class="card"><h2>Letter</h2>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="showLetterBubble"> Show the letter bubble</label>
    <label for="letter">Your birthday letter (blank line = new paragraph)</label><textarea id="letter" rows="14"></textarea></div>

  <div class="card"><h2>Names, texts and look</h2><div class="grid2">
    <div><label for="name">Friend's name</label><input type="text" id="name"></div>
    <div><label for="birthday">Birth date (opens the site)</label><input type="date" id="birthday"></div>
    <div><label for="heroEyebrow">Small line above title</label><input type="text" id="heroEyebrow"></div>
    <div><label for="heroTitle">Title (name is added after it)</label><input type="text" id="heroTitle"></div>
    <div style="grid-column:1/-1"><label for="heroLine">Line under the title</label><input type="text" id="heroLine"></div>
    <div><label for="introA">Intro heading, line 1</label><input type="text" id="introA"></div>
    <div><label for="introB">Intro heading, line 2 (coloured)</label><input type="text" id="introB"></div>
    <div style="grid-column:1/-1"><label for="introText">Intro paragraph</label><textarea id="introText" rows="3"></textarea></div>
    <div><label for="bubbleTitle">Bubble section title</label><input type="text" id="bubbleTitle"></div>
    <div><label for="bubbleSub">Bubble section text</label><input type="text" id="bubbleSub"></div>
    <div><label for="footerTitle">Footer title</label><input type="text" id="footerTitle"></div>
    <div><label for="footerText">Footer text</label><input type="text" id="footerText"></div>
    <div><label for="footerStrong">Footer wish</label><input type="text" id="footerStrong"></div>
    <div><label for="footerSmall">Footer small line</label><input type="text" id="footerSmall"></div>
    <div><label for="accent">Main colour (buttons, headings)</label><input type="color" id="accent"></div>
  </div></div>

  <div class="row"><button class="btn" id="save">Save all changes</button></div>
  <div id="status" role="status" aria-live="polite"></div>

<script>
const P = <?= json_encode($cur) ?>;
const CSRF = <?= json_encode($csrf) ?>;
const D = <?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>;
const TEXTS = ['name','birthday','heroEyebrow','heroTitle','heroLine','introA','introB','introText','bubbleTitle','bubbleSub','footerTitle','footerText','footerStrong','footerSmall','letter'];
const $ = id => document.getElementById(id);
let photos = Array.isArray(D.photos) ? D.photos.map(p => ({src: p.src, caption: p.caption || ''})) : [];
TEXTS.forEach(k => { $(k).value = D[k] || ''; });
$('accent').value = D.accent || '#bd6687';
$('showLetterBubble').checked = D.showLetterBubble !== false;

function say(t, bad) { const s = $('status'); s.textContent = t; s.style.display = 'block'; s.style.background = bad ? '#a3122f' : '#3f2433'; }

function renderPhotos() {
  const box = $('photos'); box.innerHTML = '';
  if (!photos.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'No photos yet. Press "+ Add photos".'; box.appendChild(p); }
  photos.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'ph';
    const img = document.createElement('img'); img.src = p.src; img.alt = '';
    const cap = document.createElement('input'); cap.type = 'text'; cap.value = p.caption; cap.placeholder = 'Caption (optional)'; cap.setAttribute('aria-label', 'Caption for photo ' + (i + 1));
    cap.oninput = () => { p.caption = cap.value; };
    const mk = (txt, label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'alt'); b.textContent = txt; b.setAttribute('aria-label', label); b.onclick = fn; return b; };
    row.append(img, cap,
      mk('↑', 'Move up', () => { if (i > 0) { [photos[i-1], photos[i]] = [photos[i], photos[i-1]]; renderPhotos(); } }),
      mk('↓', 'Move down', () => { if (i < photos.length - 1) { [photos[i+1], photos[i]] = [photos[i], photos[i+1]]; renderPhotos(); } }),
      mk('Remove', 'Remove photo', () => { photos.splice(i, 1); renderPhotos(); }, 'del'));
    box.appendChild(row);
  });
}

async function shrink(file) {
  try {
    const bm = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(bm.width, bm.height));
    const c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
    return b && b.size < file.size ? b : file;
  } catch (e) { return file; }
}

$('files').addEventListener('change', async e => {
  const list = [...e.target.files]; e.target.value = '';
  let ok = 0, bad = 0;
  for (let i = 0; i < list.length; i++) {
    say('Uploading ' + (i + 1) + ' of ' + list.length + '...');
    const fd = new FormData();
    fd.append('action', 'upload'); fd.append('csrf', CSRF);
    fd.append('photo', await shrink(list[i]), 'photo.jpg');
    try {
      const r = await fetch('admin.php', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.src) { photos.push({ src: j.src, caption: '' }); ok++; } else { bad++; console.warn(j.error); }
    } catch (err) { bad++; }
  }
  renderPhotos();
  if (ok) await save(ok + ' photo(s) added and saved.' + (bad ? ' ' + bad + ' failed.' : ''));
  else say(bad ? 'Upload failed. Check that the uploads folder is writable.' : '', !!bad);
});

async function save(okMsg) {
  const body = { photos, accent: $('accent').value, showLetterBubble: $('showLetterBubble').checked };
  TEXTS.forEach(k => { body[k] = $(k).value; });
  $('save').disabled = true;
  try {
    const r = await fetch('admin.php?action=save&p=' + encodeURIComponent(P), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': CSRF }, body: JSON.stringify(Object.assign({ action: 'save' }, body)) });
    const j = await r.json();
    if (j.ok) say(okMsg || 'Saved. Refresh the site to see the changes.'); else say(j.error || 'Save failed', true);
  } catch (e) { say('Save failed. Is Apache running?', true); }
  $('save').disabled = false;
}
$('save').onclick = () => save();
async function act(action, body) {
  const r = await fetch('admin.php?action=' + action + '&p=' + encodeURIComponent(P), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': CSRF }, body: JSON.stringify(body || {}) });
  return r.json();
}
$('prof').onchange = () => { location.href = 'admin.php?p=' + encodeURIComponent($('prof').value); };
$('newp').onclick = async () => { const n = prompt('Name of the new person?'); if (!n) return; const j = await act('create', { name: n }); if (j.slug) location.href = 'admin.php?p=' + j.slug; else say(j.error || 'Failed', true); };
$('defp').onclick = async () => { const j = await act('default'); if (j.ok) location.reload(); else say(j.error || 'Failed', true); };
$('delp').onclick = async () => { if (!confirm('Remove this person from the site? Their data is kept in profiles/archive.')) return; const j = await act('delete'); if (j.ok) location.href = 'admin.php'; else say(j.error || 'Failed', true); };
renderPhotos();
</script>
<?php endif; ?>
</div></body></html>
