const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, 'config.env');

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const rawLine of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 8787);
const BUCKET_ID = process.env.B2_BUCKET_ID || '6b0bfe4dcd55004aa6050a17';
const BUCKET_NAME = process.env.B2_BUCKET_NAME || 'streampulse-videos-2026';
const KEY_ID = process.env.B2_KEY_ID || '';
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY || '';
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024 * 1024);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-File-Name,X-Content-Type',
    'Cache-Control': 'no-store'
  };
}

function json(res, status, body) {
  res.writeHead(status, { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function authorizeAccount() {
  const auth = Buffer.from(`${KEY_ID}:${APPLICATION_KEY}`).toString('base64');
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${auth}` }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `B2 authorization failed (${response.status})`);
  return result;
}

async function getUploadTarget(account) {
  const response = await fetch(`${account.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: account.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: BUCKET_ID })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Cannot get B2 upload URL (${response.status})`);
  return result;
}

function safeFileName(value) {
  const base = path.basename(value || 'upload.bin').replace(/[\u0000-\u001f<>:"\\|?*]/g, '_');
  return `${Date.now()}-${base}`;
}

function sha1File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function receiveToTemp(req, tempPath, expectedBytes) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const output = fs.createWriteStream(tempPath, { flags: 'wx' });
    req.on('data', chunk => {
      received += chunk.length;
      if (received > MAX_BYTES) req.destroy(new Error('File exceeds upload limit'));
    });
    req.on('error', reject);
    output.on('error', reject);
    output.on('finish', () => {
      if (expectedBytes && received !== expectedBytes) reject(new Error('Upload was interrupted'));
      else resolve(received);
    });
    req.pipe(output);
  });
}

async function uploadFile(req, res) {
  if (!KEY_ID || !APPLICATION_KEY) {
    return json(res, 503, { error: 'config_missing', message: '請先執行 setup-backblaze.cmd 設定 B2 金鑰。' });
  }

  const expectedBytes = Number(req.headers['content-length'] || 0);
  if (expectedBytes > MAX_BYTES) return json(res, 413, { error: 'too_large', message: '檔案超過上傳大小限制。' });

  const fileName = safeFileName(decodeURIComponent(req.headers['x-file-name'] || 'upload.bin'));
  const contentType = req.headers['x-content-type'] || 'b2/x-auto';
  const tempPath = path.join(os.tmpdir(), `streampulse-${crypto.randomUUID()}.upload`);

  try {
    const fileSize = await receiveToTemp(req, tempPath, expectedBytes);
    const sha1 = await sha1File(tempPath);
    const account = await authorizeAccount();
    const target = await getUploadTarget(account);
    const encodedName = fileName.split('/').map(encodeURIComponent).join('/');
    const stream = fs.createReadStream(tempPath);
    const response = await fetch(target.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: target.authorizationToken,
        'X-Bz-File-Name': encodedName,
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'X-Bz-Content-Sha1': sha1
      },
      body: stream,
      duplex: 'half'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || `B2 upload failed (${response.status})`);

    const friendlyUrl = `${account.downloadUrl}/file/${encodeURIComponent(BUCKET_NAME)}/${encodedName}`;
    json(res, 200, { friendlyUrl, fileName, fileId: result.fileId, size: fileSize });
  } catch (error) {
    json(res, 500, { error: 'upload_failed', message: error.message });
  } finally {
    fs.rm(tempPath, { force: true }, () => {});
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, {
      ok: true,
      configured: Boolean(KEY_ID && APPLICATION_KEY),
      bucketName: BUCKET_NAME,
      bucketId: BUCKET_ID
    });
  }
  if (req.method === 'POST' && req.url === '/upload') return uploadFile(req, res);
  return json(res, 404, { error: 'not_found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`StreamPulse B2 endpoint: http://127.0.0.1:${PORT}`);
  console.log(`Bucket: ${BUCKET_NAME} (${BUCKET_ID})`);
  console.log(KEY_ID && APPLICATION_KEY ? 'B2 credentials: configured' : 'B2 credentials: missing - run setup-backblaze.cmd');
});
