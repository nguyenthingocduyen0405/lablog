# Local paper question worker

This worker runs entirely on the JCloud Ubuntu instance. It downloads an
uploaded PDF from the configured Supabase Storage host, extracts text locally,
and asks the loopback-only Ollama service for a structured Korean/Vietnamese/
English quiz. It does not call OpenAI or another paid model API.

The default `qwen3:4b` model is about 2.5 GB. Generation is CPU-only on this
JCloud host. The worker generates two bounded batches of five questions and
combines them into one ten-question trilingual quiz, which can take roughly
25–35 minutes.
Scanned PDFs without embedded text need OCR before this worker can process them.

Secrets belong in `/etc/lablog-paper-ai.env` with mode `0600`. Never copy that
file into the repository. The systemd unit runs the worker as the dedicated,
non-login `lablog-ai` system user. `OLLAMA_URL` is validated as loopback-only.
PDF redirects are rejected, and extraction runs in a child process capped at
80 pages, 512 MB, and 45 seconds. The worker and Ollama services have separate
systemd memory limits; Ollama loads one model and processes one request at once.
The model stays loaded between the two batches and unloads after each job.
The worker heartbeats the queue before every model request so a valid long job
cannot be reclaimed while it is still generating.

Bootstrap the host after installing Ollama from its official Linux package:

```bash
sudo useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin lablog-ai
sudo install -d -o root -g root -m 0755 /opt/lablog-paper-ai
sudo install -o root -g root -m 0644 worker.py requirements.txt /opt/lablog-paper-ai/
sudo python3 -m venv /opt/lablog-paper-ai/.venv
sudo /opt/lablog-paper-ai/.venv/bin/pip install -r /opt/lablog-paper-ai/requirements.txt
sudo install -o root -g root -m 0644 lablog-paper-ai.service /etc/systemd/system/
sudo install -d -o root -g root -m 0755 /etc/systemd/system/ollama.service.d
sudo install -o root -g root -m 0644 ollama-lablog.conf /etc/systemd/system/ollama.service.d/lablog.conf
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl restart ollama
sudo -u ollama ollama pull qwen3:4b
sudo systemctl enable --now lablog-paper-ai

# Confirm the drop-in and runtime limits are active.
systemctl show ollama -p DropInPaths -p Environment -p MemoryMax
```

Useful operations:

```bash
sudo systemctl status ollama lablog-paper-ai
sudo journalctl -u lablog-paper-ai -n 100 --no-pager
sudo systemctl restart lablog-paper-ai
ollama list
```

The worker logs a startup line and one completion/failure line per job. Monitor
the service with `systemctl is-active` and alert on repeated `Worker loop failed`
or `Job ... failed` entries.
