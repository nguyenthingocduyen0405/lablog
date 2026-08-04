# Paper question worker

This worker runs on the JCloud Ubuntu instance. It claims queued paper jobs
through service-role-only Supabase RPCs, sends the public paper PDF to the
OpenAI Responses API, validates a structured multilingual quiz, and completes
the job atomically.

Secrets belong in `/etc/lablog-paper-ai.env` with mode `0600`. Never copy that
file into the repository. The systemd unit runs the worker as the dedicated,
non-login `lablog-ai` system user.

Bootstrap the host with a dedicated account and virtual environment:

```bash
sudo useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin lablog-ai
sudo install -d -o root -g root -m 0755 /opt/lablog-paper-ai
sudo install -o root -g root -m 0644 worker.py requirements.txt /opt/lablog-paper-ai/
sudo python3 -m venv /opt/lablog-paper-ai/.venv
sudo /opt/lablog-paper-ai/.venv/bin/pip install -r /opt/lablog-paper-ai/requirements.txt
sudo install -o root -g root -m 0644 lablog-paper-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lablog-paper-ai
```

Useful operations:

```bash
sudo systemctl status lablog-paper-ai
sudo journalctl -u lablog-paper-ai -n 100 --no-pager
sudo systemctl restart lablog-paper-ai
```

The worker logs a startup line and one completion/failure line per job. Monitor
the service with `systemctl is-active` and alert on repeated `Worker loop failed`
or `Job ... failed` entries.
