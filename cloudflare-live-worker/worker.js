function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  const permitted = !origin || allowed.includes(origin);
  return {
    permitted,
    headers: {
      'Access-Control-Allow-Origin': permitted && origin ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Creator-Secret',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff'
    }
  };
}

function json(request, env, status, value) {
  const cors = corsHeaders(request, env);
  return new Response(JSON.stringify(value), { status, headers: cors.headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: cors.permitted ? 204 : 403, headers: cors.headers });
    }

    if (url.pathname !== '/api/live-inputs' || request.method !== 'POST') {
      return json(request, env, 404, { success: false, error: 'Not found' });
    }

    if (!cors.permitted) {
      return json(request, env, 403, { success: false, error: 'Origin is not allowed' });
    }

    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN || !env.CREATOR_API_SECRET) {
      return json(request, env, 500, { success: false, error: 'Worker secrets are not configured' });
    }

    const creatorSecret = request.headers.get('X-Creator-Secret') || '';
    if (!creatorSecret || creatorSecret !== env.CREATOR_API_SECRET) {
      return json(request, env, 401, { success: false, error: 'Creator authorization failed' });
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > 8192) {
      return json(request, env, 413, { success: false, error: 'Request is too large' });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(request, env, 400, { success: false, error: 'Invalid JSON body' });
    }

    const roomId = String(body.roomId || '').slice(0, 100);
    const name = String(body.name || 'StreamPulse Live Room').slice(0, 100);
    if (!roomId) {
      return json(request, env, 400, { success: false, error: 'roomId is required' });
    }

    const lowLatency = Boolean(body.lowLatency);
    const recording = Boolean(body.recording) || lowLatency;
    const payload = {
      enabled: true,
      meta: { name, roomId, source: 'StreamPulse' },
      preferLowLatency: lowLatency,
      recording: {
        mode: recording ? 'automatic' : 'off',
        requireSignedURLs: false,
        hideLiveViewerCount: false,
        timeoutSeconds: 0,
        allowedOrigins: []
      }
    };

    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const cloudflareData = await cloudflareResponse.json().catch(() => ({}));
    const result = cloudflareData.result || {};
    if (!cloudflareResponse.ok || !cloudflareData.success) {
      const message = cloudflareData.errors?.[0]?.message || `Cloudflare API ${cloudflareResponse.status}`;
      return json(request, env, 502, { success: false, error: message });
    }

    if (!result.uid || !result.rtmps?.url || !result.rtmps?.streamKey || !result.playback?.hls) {
      return json(request, env, 502, { success: false, error: 'Cloudflare returned incomplete Live Input credentials' });
    }

    return json(request, env, 201, {
      success: true,
      inputId: result.uid,
      rtmpsUrl: result.rtmps.url,
      streamKey: result.rtmps.streamKey,
      hlsUrl: result.playback.hls,
      dashUrl: result.playback.dash || '',
      recording,
      lowLatency
    });
  }
};
