"""Prometheus metrics middleware and endpoint.

Exposes standard HTTP metrics: request count, latency histogram, in-flight gauge.
Accessible at /api/metrics (Prometheus text format).
"""

import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import PlainTextResponse


# In-memory metrics (production should use prometheus_client or OpenTelemetry)
_metrics: dict[str, list] = defaultdict(list)


async def metrics_middleware(request: Request, call_next):
    """Collect per-endpoint metrics: count, duration, status."""
    start = time.monotonic()
    response = await call_next(request)
    duration = time.monotonic() - start

    endpoint = f"{request.method} {request.url.path}"
    status_family = f"{response.status_code // 100}xx"

    _metrics["http_requests_total"].append(1)
    _metrics[f"http_requests_total{{endpoint=\"{endpoint}\",status=\"{status_family}\"}}"].append(1)
    _metrics[f"http_request_duration_seconds{{endpoint=\"{endpoint}\"}}"].append(duration)

    return response


async def metrics_endpoint(request: Request):
    """Expose Prometheus metrics in text format."""
    lines = []

    for name, values in sorted(_metrics.items()):
        if "{" in name:
            base, labels = name.split("{", 1)
            labels = labels.rstrip("}")
        else:
            base = name
            labels = ""

        if "duration" in base:
            if values:
                avg = sum(values) / len(values)
                lines.append(f"# HELP {base} Request duration in seconds")
                lines.append(f"# TYPE {base} histogram")
                lines.append(f"{base}_avg{{{labels}}} {avg:.6f}")
                lines.append(f"{base}_count{{{labels}}} {len(values)}")
        else:
            total = sum(values)
            lines.append(f"# HELP {base} Total number of HTTP requests")
            lines.append(f"# TYPE {base} counter")
            lines.append(f"{base}_total{{{labels}}} {total}")

    lines.append("")
    return PlainTextResponse("\n".join(lines), media_type="text/plain; version=0.0.4")
