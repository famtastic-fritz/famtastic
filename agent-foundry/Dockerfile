# Agent Factory — fully isolated evaluation sandbox.
# Stdlib-only Python, so there is nothing to pip install. The container has its
# own filesystem; it cannot see or touch the host's ~/famtastic, which is the
# whole point: run it anywhere, it can't collide with other sessions.
FROM python:3.11-slim

LABEL org.opencontainers.image.title="agent-foundry" \
      org.opencontainers.image.description="Sandboxed self-managing agent factory"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app
COPY . /app

# Drop root. Everything the factory does happens under /app as an unprivileged
# user with no access to anything on the host.
RUN useradd -m -u 10001 factory && chown -R factory:factory /app
USER factory

# Default: run the bounded end-to-end proof and print the dashboard.
ENTRYPOINT ["python3"]
CMD ["run.py"]
