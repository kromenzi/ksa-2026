# Real CCTV / Camera Gateway Setup

The camera UI now supports real browser playback. Browsers cannot play RTSP directly, so a gateway on the same network as the cameras must convert RTSP/ONVIF streams to HLS, WebRTC, or MJPEG.

## Vercel environment variable

Set:

`VITE_CAMERA_GATEWAY_URL=https://YOUR-GATEWAY-HOST`

The app will request:

`https://YOUR-GATEWAY-HOST/streams/<CAMERA_ID>/index.m3u8`

Example:

`https://gateway.example.com/streams/CAM-101/index.m3u8`

## Recommended gateway

Use MediaMTX, go2rtc, or an equivalent RTSP-to-WebRTC/HLS gateway inside the plant network. Keep camera credentials and RTSP URLs on the gateway; do not expose them in the browser.

## Required gateway behavior

- Pull RTSP from each camera/NVR.
- Publish HLS for broad browser compatibility and/or WebRTC for low latency.
- Enable CORS for the Vercel site.
- Expose HTTPS.
- Keep the gateway reachable from the operator browser.
- Map each camera ID to a stream path such as `/streams/CAM-101/index.m3u8`.

## Important

The repository demo camera records are no longer presented as fake live video. Without a configured gateway the UI explicitly reports that a real stream is not configured.
