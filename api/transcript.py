"""
Vercel Python Serverless Function — YouTube Transcript API
Fetches YouTube video transcripts using the youtube-transcript-api library.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import re
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig, GenericProxyConfig
from youtube_transcript_api.formatters import TextFormatter


# ─── Helpers ───────────────────────────────────────────────────────────────────

RE_YOUTUBE = re.compile(
    r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)'
    r'([^"&?/\s]{11})',
    re.IGNORECASE,
)


def extract_video_id(url_or_id: str) -> str:
    """Extract the 11-char video ID from a YouTube URL or raw ID string."""
    url_or_id = url_or_id.strip()
    m = RE_YOUTUBE.search(url_or_id)
    if m:
        return m.group(1)
    # If it already looks like a bare video ID
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id
    return url_or_id


def build_api_client() -> YouTubeTranscriptApi:
    """
    Build a YouTubeTranscriptApi instance, optionally with proxy config
    sourced from environment variables.

    Supported env-var patterns (checked in order):
      1. WEBSHARE_PROXY_USERNAME + WEBSHARE_PROXY_PASSWORD  → WebshareProxyConfig
      2. HTTP_PROXY (and optionally HTTPS_PROXY)            → GenericProxyConfig
    """
    ws_user = os.environ.get('WEBSHARE_PROXY_USERNAME', '').strip()
    ws_pass = os.environ.get('WEBSHARE_PROXY_PASSWORD', '').strip()

    if ws_user and ws_pass:
        print('[transcript.py] Using Webshare rotating residential proxy')
        return YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=ws_user,
                proxy_password=ws_pass,
            )
        )

    http_proxy = os.environ.get('HTTP_PROXY', '').strip()
    https_proxy = os.environ.get('HTTPS_PROXY', http_proxy).strip()

    if http_proxy:
        print('[transcript.py] Using generic HTTP/HTTPS proxy')
        return YouTubeTranscriptApi(
            proxy_config=GenericProxyConfig(
                http_url=http_proxy,
                https_url=https_proxy,
            )
        )

    # No proxy — direct connection
    print('[transcript.py] No proxy configured, using direct connection')
    return YouTubeTranscriptApi()


def fetch_transcript(video_id: str) -> str:
    """
    Fetch the transcript for a given video ID.
    Preference order: Korean (ko) → English (en) → first available.
    Returns the full transcript joined as a single string.
    """
    ytt_api = build_api_client()

    # Try preferred languages first
    try:
        fetched = ytt_api.fetch(video_id, languages=['ko', 'en'])
        formatter = TextFormatter()
        return formatter.format_transcript(fetched)
    except Exception as e:
        print(f'[transcript.py] Preferred languages failed: {e}')

    # Fallback: list all transcripts and pick the first available
    try:
        transcript_list = ytt_api.list(video_id)
        for transcript in transcript_list:
            try:
                fetched = transcript.fetch()
                formatter = TextFormatter()
                return formatter.format_transcript(fetched)
            except Exception:
                continue
    except Exception as e:
        print(f'[transcript.py] Listing transcripts failed: {e}')
        raise

    raise Exception('No transcripts are available for this video')


# ─── CORS helpers ──────────────────────────────────────────────────────────────

def set_cors_headers(handler: BaseHTTPRequestHandler):
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type')


def send_json(handler: BaseHTTPRequestHandler, status: int, body: dict):
    handler.send_response(status)
    set_cors_headers(handler)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(body, ensure_ascii=False).encode('utf-8'))


# ─── Vercel handler class ─────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    """Vercel Python Serverless Function handler."""

    def do_OPTIONS(self):
        """CORS preflight."""
        self.send_response(200)
        set_cors_headers(self)
        self.end_headers()

    def do_GET(self):
        """Handle GET /api/transcript?videoId=... or ?url=..."""
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        video_param = (qs.get('videoId') or qs.get('url') or [None])[0]
        self._handle_request(video_param)

    def do_POST(self):
        """Handle POST with JSON body { videoId: "..." } or { url: "..." }."""
        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            body = json.loads(body_bytes)
        except json.JSONDecodeError:
            body = {}

        video_param = body.get('videoId') or body.get('url')
        self._handle_request(video_param)

    def _handle_request(self, video_param: str | None):
        if not video_param:
            send_json(self, 400, {'error': 'videoId or url is required'})
            return

        video_id = extract_video_id(video_param)
        print(f'[transcript.py] Request for video: {video_id}')

        if len(video_id) != 11:
            send_json(self, 400, {'error': '올바르지 않은 유튜브 비디오 ID 형식입니다.'})
            return

        try:
            transcript_text = fetch_transcript(video_id)
            print(f'[transcript.py] ✅ Success! Length: {len(transcript_text)} chars')
            send_json(self, 200, {'transcript': transcript_text})
        except Exception as e:
            err_msg = str(e)
            print(f'[transcript.py] ❌ Error: {err_msg}')

            if any(keyword in err_msg for keyword in [
                'Transcript is disabled',
                'No transcripts are available',
                'TranscriptsDisabled',
                'NoTranscriptFound',
                'VideoUnavailable',
            ]):
                send_json(self, 404, {
                    'error': '자막이 제공되지 않는 영상입니다. 직접 컨텍스트나 운동 명칭을 기입해주세요.',
                    'code': 'TRANSCRIPT_DISABLED',
                })
            else:
                send_json(self, 500, {
                    'error': err_msg or '유튜브 서버에서 자막을 가져오는 도중 오류가 발생했습니다.',
                    'code': 'FETCH_ERROR',
                })
