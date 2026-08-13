# ABDULKAREM CCTV Gateway

This gateway runs **MediaMTX** on a machine that can reach the cameras/NVRs. It converts private-network RTSP streams into browser-safe HLS/WebRTC streams for the Vercel dashboard.

## Architecture

`IP Camera / NVR -> RTSP (LAN) -> MediaMTX Gateway -> HLS or WebRTC (HTTPS) -> Vercel Camera Command Center`

MediaMTX supports reading RTSP camera/server sources and exposing them as HLS and WebRTC/WHEP streams. See the official documentation: https://mediamtx.org/docs/publish/rtsp-cameras-and-servers and https://mediamtx.org/docs/read/hls

## 1. Prepare the gateway machine

Install Docker and Docker Compose on a machine that can reach the camera/NVR IPs. A Windows PC, Linux server, or small on-premise server can be used.

Copy `.env.example` to `.env` and set a strong gateway username/password.

## 2. Add your camera/NVR streams

Edit `mediamtx.yml` and add a path for each source. Example:

```yaml
paths:
  cam101:
    source: rtsp://viewer:CAMERA_PASSWORD@192.168.10.101:554/Streaming/Channels/101
    rtspTransport: tcp
  cam102:
    source: rtsp://viewer:CAMERA_PASSWORD@192.168.10.102:554/Streaming/Channels/101
    rtspTransport: tcp
```

Do not commit real camera usernames/passwords to GitHub. Put production secrets in the local `.env` or another secret-management system.

## 3. Start

```bash
docker compose up -d
```

Check the gateway logs:

```bash
docker compose logs -f mediamtx
```

## 4. Browser stream URLs

For a camera path called `cam101`:

- HLS playlist: `https://YOUR_GATEWAY_HOST:8888/cam101/index.m3u8`
- WebRTC page: `https://YOUR_GATEWAY_HOST:8889/cam101`
- WHEP endpoint: `https://YOUR_GATEWAY_HOST:8889/cam101/whep`

For production, terminate HTTPS at a reverse proxy such as Caddy/Nginx/Traefik and expose only the browser-facing ports. Do not expose camera RTSP ports to the public internet.

## 5. Connect Vercel

Set the Vercel environment variable used by the dashboard:

```text
VITE_CAMERA_GATEWAY_URL=https://YOUR_GATEWAY_HOST
```

Then redeploy the Vercel project.

## 6. PTZ and ONVIF

MediaMTX handles media transport. PTZ/ONVIF control should be implemented through a separate authenticated gateway API on the same on-premise machine. The Vercel dashboard should call that API; the browser must not talk directly to the camera's private IP.

## Security notes

- Use HTTPS for the browser-facing gateway.
- Use unique strong credentials for gateway and cameras.
- Restrict firewall access to the dashboard/users that need it.
- Keep RTSP/ONVIF private on the LAN/VPN.
- Treat camera credentials as secrets.
