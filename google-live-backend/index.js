'use strict';

const express = require('express');
const admin = require('firebase-admin');
const { LivestreamServiceClient } = require('@google-cloud/livestream').v1;

admin.initializeApp();
const app = express();
const client = new LivestreamServiceClient();
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'streampulse-3eb7a';
const location = process.env.LIVE_LOCATION || 'asia-east1';
const outputBucket = process.env.LIVE_OUTPUT_BUCKET || '';
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || 'https://akarenka.github.io')
  .split(',').map(value => value.trim()).filter(Boolean);

app.use(express.json({ limit: '8kb' }));
app.use((req, res, next) => {
  const origin = req.get('Origin') || '';
  if (origin && allowedOrigins.includes(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Creator-Secret');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return allowedOrigins.includes(origin) ? res.sendStatus(204) : res.sendStatus(403);
  if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ success: false, error: 'Origin is not allowed' });
  next();
});

function cleanId(value, fallback) {
  const cleaned = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 42);
  return cleaned || fallback;
}

async function authorize(req, roomId) {
  const bearer = String(req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (bearer) {
    const decoded = await admin.auth().verifyIdToken(bearer[1]);
    const room = await admin.firestore().collection('liveRooms').doc(roomId).get();
    if (!room.exists || room.data().ownerUid !== decoded.uid) throw Object.assign(new Error('Only the room owner can generate credentials'), { status: 403 });
    return decoded.uid;
  }
  const configuredSecret = process.env.CREATOR_API_SECRET || '';
  if (configuredSecret && req.get('X-Creator-Secret') === configuredSecret) return 'shared-secret';
  throw Object.assign(new Error('Firebase login or Creator API Access Code is required'), { status: 401 });
}

function splitRtmpEndpoint(endpointUri) {
  const slash = endpointUri.lastIndexOf('/');
  if (slash < 8 || slash === endpointUri.length - 1) throw new Error('Google returned an invalid RTMP endpoint');
  return { rtmpsUrl: endpointUri.slice(0, slash + 1), streamKey: endpointUri.slice(slash + 1) };
}

app.get('/health', (req, res) => res.json({ ok: true, provider: 'google', projectId, location, outputBucketConfigured: Boolean(outputBucket) }));

app.post('/api/live-inputs', async (req, res) => {
  try {
    if (!outputBucket) return res.status(500).json({ success: false, error: 'LIVE_OUTPUT_BUCKET is not configured' });
    const roomId = String(req.body.roomId || '').slice(0, 100);
    if (!roomId) return res.status(400).json({ success: false, error: 'roomId is required' });
    await authorize(req, roomId);

    const suffix = Date.now().toString(36);
    const baseId = cleanId(roomId, 'room');
    const inputId = `${baseId.slice(0, 42)}-${suffix}`.slice(0, 63).replace(/-$/, '');
    const channelId = `channel-${inputId}`.slice(0, 63).replace(/-$/, '');
    const parent = client.locationPath(projectId, location);

    const [inputOperation] = await client.createInput({ parent, inputId, input: { type: 'RTMP_PUSH' } });
    const [input] = await inputOperation.promise();
    const endpoint = splitRtmpEndpoint(input.uri || '');
    const outputPrefix = `live/${baseId}/${channelId}`;
    const outputUri = `gs://${outputBucket}/${outputPrefix}/`;

    const channel = {
      inputAttachments: [{ key: 'primary-input', input: client.inputPath(projectId, location, inputId) }],
      output: { uri: outputUri },
      elementaryStreams: [
        { key: 'video-720p', videoStream: { h264: { profile: 'high', heightPixels: 720, widthPixels: 1280, bitrateBps: 3000000, frameRate: 30 } } },
        { key: 'audio-aac', audioStream: { codec: 'aac', channelCount: 2, bitrateBps: 160000 } }
      ],
      muxStreams: [{ key: 'main', elementaryStreams: ['video-720p', 'audio-aac'], segmentSettings: { seconds: req.body.lowLatency ? 2 : 4 } }],
      manifests: [{ fileName: 'manifest.m3u8', type: 'HLS', muxStreams: ['main'], maxSegmentCount: req.body.lowLatency ? 5 : 10 }]
    };

    const [channelOperation] = await client.createChannel({ parent, channelId, channel });
    await channelOperation.promise();
    const [startOperation] = await client.startChannel({ name: client.channelPath(projectId, location, channelId) });
    await startOperation.promise();

    return res.status(201).json({
      success: true,
      provider: 'google',
      inputId,
      channelId,
      rtmpsUrl: endpoint.rtmpsUrl,
      streamKey: endpoint.streamKey,
      hlsUrl: `https://storage.googleapis.com/${outputBucket}/${outputPrefix}/manifest.m3u8`,
      location
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ success: false, error: error.message || 'Google Live Stream creation failed' });
  }
});

app.listen(process.env.PORT || 8080, () => console.log('StreamPulse Google Live backend started'));
