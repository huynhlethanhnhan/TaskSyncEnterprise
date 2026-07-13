# Phase 3.7.5 Prometheus Monitoring Review

## 1. Executive Summary

The Phase 3.7.5 implementation is functionally well-scoped and structurally
sound. It adds only the three requested monitoring artifacts, leaves
application code unchanged, defines the required 15-second Prometheus scrape,
persists the TSDB in a named volume, and prepares a dedicated observability
network for later components.

The Docker Compose model passes Docker CLI static validation. Live container,
Prometheus semantic configuration, and backend scrape validation were not run
because the Docker daemon is unavailable and no local `promtool` binary is
installed. This is an environmental limitation, not an implementation failure.

The review found one high-severity reproducibility issue, two medium-severity
security/documentation gaps, two low-severity maintainability issues, and three
informational observations. The floating `latest` image tag, public-by-default
web binding, and incomplete manual-test documentation should be corrected
before Phase 3.7.6.

**Final verdict: CHANGES REQUIRED**

## 2. Scope Reviewed

Files reviewed:

- `monitoring/prometheus/prometheus.yml`
- `docker-compose.monitoring.yml`
- `docs/monitoring/prometheus_setup.md`
- Root `docker-compose.yml`, only to check backend port and container-name
  compatibility
- `backend/Dockerfile` and root `README.md`, only to confirm the backend startup
  contract

The review did not modify application code, start Phase 3.7.6, add Grafana,
commit, push, or start containers.

## 3. Git and Branch Verification

| Check | Result |
|---|---|
| Current branch | PASS — `develop` |
| Expected untracked files only | PASS — exactly the three Phase 3.7.5 files |
| Tracked working-tree modifications | PASS — none |
| Staged modifications | PASS — none |
| Application code modified | PASS — no |
| Unrelated files modified | PASS — none detected |
| Secrets or credentials | PASS — none detected |
| Private IP addresses | PASS — none detected |
| Machine-specific committed paths | PASS — none in file content |

The requested path-scoped `git diff` produced no patch because all three files
are currently untracked. Scope was therefore verified with `git status`,
`git ls-files --others --exclude-standard`, `git diff --name-only`, and
`git diff --cached --name-only`.

The Git status scan emitted a permission warning for
`backend/.pytest_cache/`. This did not prevent the expected untracked files or
tracked modifications from being identified and is unrelated to Phase 3.7.5.

## 4. Prometheus Configuration Review

`monitoring/prometheus/prometheus.yml` satisfies the core scrape contract:

| Requirement | Location | Result |
|---|---:|---|
| Global configuration | Lines 5–14 | PASS |
| `scrape_interval: 15s` | Line 7 | PASS |
| `evaluation_interval: 15s` | Line 11 | PASS |
| Bounded `scrape_timeout: 10s` | Line 14 | PASS |
| Job `tasksync-backend` | Line 18 | PASS |
| Explicit HTTP scheme | Line 21 | PASS |
| Explicit `/metrics` path | Line 24 | PASS |
| Target `host.docker.internal:8000` | Line 30 | PASS |
| Only required endpoint scraped | Lines 16–35 | PASS |
| Secrets absent | Entire file | PASS |

Both `scheme: http` and `metrics_path: /metrics` are present. Prometheus already
defaults to HTTP and `/metrics`, so these keys are technically optional. They
are nevertheless recommended here because they document the scrape contract,
avoid ambiguity, and protect readability if defaults or deployment assumptions
change.

The target is correct for the documented deployment: the root Compose file
publishes the backend on host port `8000`, Docker Desktop resolves
`host.docker.internal`, and the monitoring Compose file supplies the Linux
`host-gateway` mapping. No other application, health, documentation, or
administrative endpoint is scraped.

The `service: tasksync-backend` label is useful and stable. The hard-coded
`environment: production` label may be misleading because the setup guide also
describes local-development use; see finding F-04.

The configuration is extensible: recording/alert rule evaluation is already
bounded globally, and future `rule_files`, alerting configuration, or service
discovery can be added without restructuring the existing job.

Prometheus semantic validation with `promtool check config` remains pending.
Docker Compose does not parse the content of a bind-mounted Prometheus file, so
successful Compose rendering alone is not equivalent to `promtool` validation.

## 5. Docker Compose Review

`docker-compose.monitoring.yml` parses successfully with Docker Compose v2 and
resolves one service (`prometheus`), one volume (`prometheus_data`), and one
network (`observability`).

Passing controls:

- `tasksync-prometheus` does not conflict with `tasksync-backend`,
  `tasksync-redis`, or `tasksync-sqlserver`.
- Container port 9090 is published to host port 9090.
- The Prometheus configuration bind mount is read-only.
- The named `tasksync-prometheus-data` volume persists `/prometheus`.
- `restart: unless-stopped` is correct.
- The 15-day and 10 GB TSDB limits are bounded and reasonable defaults for a
  local single-host environment.
- All configured Prometheus command flags are valid for the reviewed current
  Prometheus 3.x release line.
- `--web.enable-lifecycle=false` avoids enabling the HTTP reload/shutdown
  lifecycle endpoints.
- Health timing (15-second interval, 5-second timeout, five retries, 15-second
  start period) is reasonable.
- `host.docker.internal:host-gateway` is rendered correctly.
- The named bridge network supports later Grafana, Alertmanager, Loki, and Tempo
  services through normal Compose networking.
- No host network, privileged mode, Docker socket, device, or host filesystem
  mount is present.
- No secrets are embedded.
- `no-new-privileges:true` is appropriate.

The official default Prometheus image is BusyBox-based and runs as `nobody`, so
an explicit Compose `user` is unnecessary. Forcing a numeric user without
testing could break existing named-volume permissions or a future image
variant. The named volume is the portable choice: on Windows Docker Desktop it
is managed inside the Linux VM, while on Linux its ownership is initialized
against the image's `/prometheus` directory. Live startup must still verify
write access.

The current BusyBox image family is compatible with a `wget` readiness check,
but the floating image tag means that dependency is not reproducibly proven.
Pinning the tested BusyBox release and running the health check resolves the
risk. A future distroless image must use a different health-check strategy
because shell utilities are intentionally absent.

`read_only: true` could improve hardening because `/prometheus` is already a
writable volume and the configuration is read-only. It should be introduced
only after testing whether the selected image needs any additional writable
path; a `/tmp` tmpfs may be required by future versions or enabled features.
Its absence is not a blocker for this local stack.

Compose-level resource limits are optional for this phase. TSDB disk use is
already bounded. CPU and memory limits should be established from observed
workload and set in the production deployment platform rather than guessed in
the portable local Compose file.

## 6. Security Review

The implementation has a small attack surface: no credentials, Docker socket,
host networking, privileged mode, lifecycle API, or writable configuration is
present. Prometheus runs under the image's non-root user and has
`no-new-privileges` enabled.

The material security gap is the default `0.0.0.0:9090` host binding.
Prometheus has no authentication configured, so machines that can reach the
developer host may access queries, labels, targets, configuration status, and
other operational metadata. The documentation warns about this and offers a
localhost override, but secure behavior should be the default for a local
deployment.

The floating image tag also weakens supply-chain control because future pulls
can change image contents without a repository change or review.

## 7. Portability Review

Windows 11 Docker Desktop and modern Linux Docker Engine are both considered:

- Docker Desktop supplies `host.docker.internal` automatically.
- `extra_hosts: host.docker.internal:host-gateway` supplies the equivalent host
  route on supported Linux Docker Engine releases.
- The backend must listen on `0.0.0.0:8000` and publish host port 8000; the
  existing backend Dockerfile and root Compose file do so.
- A named Docker volume avoids host-path ownership and path-syntax differences.
- PowerShell host verification uses `Invoke-WebRequest` and
  `Invoke-RestMethod`; no Bash-only host commands are documented.

The troubleshooting text suggests testing from inside the container but does
not provide a command. This is preferable to publishing an unverified command
that assumes utilities exist. Once the image is pinned, the guide may provide a
tested `wget` command for the BusyBox variant.

## 8. Documentation Review

The setup guide clearly covers architecture, basic prerequisites, Prometheus
startup/shutdown, Compose validation, metric endpoint verification, targets,
PromQL, expected `UP` state, log inspection, readiness, persistence, Windows and
Linux host routing, security limitations, production guidance, and common
troubleshooting.

All provided commands are PowerShell-compatible. No documented host command is
Bash-only, and no command assumes host `curl`.

Required documentation gaps remain:

- No explicit backend startup command is provided.
- Windows prerequisites do not explicitly state that Docker Desktop must be
  running in Linux-container mode.
- The guide warns against `down --volumes` but does not provide an intentional,
  explicit data-reset procedure or confirmation step.
- It documents Compose validation but not Prometheus semantic validation with
  `promtool check config`.
- Local and production guidance exists, but the default public binding conflicts
  with the safer local posture described in the text.

## 9. Static Validation Results

### Read-only structural validation

| Validation | Result |
|---|---|
| Required Prometheus keys and values inspected | PASS |
| Required Compose keys and values inspected | PASS |
| Scope and secret scan | PASS |
| Container-name collision scan | PASS |
| PowerShell command review | PASS |
| `promtool check config` | NOT EXECUTED — no local binary/image available |

### Docker CLI validation

| Command | Result |
|---|---|
| `docker compose -f docker-compose.monitoring.yml config` | PASS |
| `docker compose -f docker-compose.monitoring.yml config --services` | PASS — `prometheus` |
| `docker compose -f docker-compose.monitoring.yml config --volumes` | PASS — `prometheus_data` |
| `docker compose -f docker-compose.monitoring.yml config --networks` | PASS — `observability` |

Docker emitted a warning that the sandbox could not read the user's Docker CLI
configuration file. Rendering still completed successfully and returned exit
code 0, so this did not invalidate the Compose model.

## 10. Live Validation Status

**NOT EXECUTED — Docker daemon unavailable**

- Image pull/inspection: not executed
- `promtool check config` inside the selected image: not executed
- Container startup and health status: not executed
- TSDB volume write/persistence test: not executed
- Prometheus readiness API: not executed
- Backend `/metrics` response: not executed
- Prometheus target state: not executed
- PromQL `up{job="tasksync-backend"}` result: not executed

The Docker client is installed, but `docker version` could not connect to the
Windows named pipe for the Docker Engine. Per the review requirements, this
does not by itself cause a failed verdict.

## 11. Findings Table

| ID | Severity | File / location | Problem | Risk | Recommended correction | Must fix before Phase 3.7.6 |
|---|---|---|---|---|---|---|
| F-01 | HIGH | `docker-compose.monitoring.yml:7`; setup guide lines 13 and 85–88 | `prom/prometheus:latest` is a floating tag. | A later pull can silently change binaries, command behavior, utilities, permissions, or vulnerabilities; review and rollback are not reproducible. | Pin the reviewed BusyBox image to `prom/prometheus:v3.13.1` and preferably record/pin its deployment digest after pull. Update the guide to match. | Yes |
| F-02 | MEDIUM | `docker-compose.monitoring.yml:19–22` | Port 9090 binds to every host interface by default. | The unauthenticated Prometheus UI/API and operational metadata may be exposed to the local network. | Default `PROMETHEUS_BIND_ADDRESS` to `127.0.0.1`. Require an explicit override only for a protected production network or authenticated reverse proxy. | Yes |
| F-03 | MEDIUM | `docs/monitoring/prometheus_setup.md:45–59`, 90–119 | Manual-test documentation omits an explicit backend startup command, explicit Windows Docker Desktop/Linux-container prerequisite, tested `promtool` validation command, and intentional data-reset procedure. | Operators can test against a stopped backend, skip Prometheus semantic validation, or misunderstand persistence/reset behavior. | Add `docker compose -f docker-compose.yml up -d backend`, Docker Desktop mode/daemon guidance, a pinned-image `promtool check config` command, and an explicit destructive reset sequence with warning and volume verification. | Yes; fix before manual testing |
| F-04 | LOW | `monitoring/prometheus/prometheus.yml:35` | `environment: production` is hard-coded while the guide describes local development and single-host use. | Local samples can be mislabeled as production, contaminating future dashboards and alerts. | Remove the environment label until configuration templating exists, or generate it from an explicitly documented deployment value. | Yes, before building Phase 3.7.6 dashboards |
| F-05 | LOW | `docker-compose.monitoring.yml:58–63` | `attachable: true` is not required for Compose-managed future services. | It permits manually started containers to attach to the observability network, slightly broadening access. | Remove it unless standalone debug/one-off containers are an intentional documented requirement. Keeping it is acceptable with that rationale. | No |
| F-06 | INFORMATIONAL | `docker-compose.monitoring.yml:45–47` | Root filesystem is not declared read-only. | A compromised process has more writable image-layer surface than necessary, though it remains non-root and unprivileged. | Optionally test `read_only: true` with the pinned image and add only proven writable mounts/tmpfs. Do not enable without a startup and query test. | No |
| F-07 | INFORMATIONAL | `docker-compose.monitoring.yml` service definition | CPU and memory limits are absent. | A pathological workload may consume host resources, but arbitrary limits could also cause avoidable outages. | Measure normal usage and define platform-specific production limits; retain bounded TSDB size/time controls. | No |
| F-08 | INFORMATIONAL | Live validation | Docker daemon is stopped. | Runtime health, health-check utility availability, named-volume permissions, and scrape reachability remain unproven. | Execute the manual checklist after required corrections and Docker Desktop startup. | No; environment action required for validation |

Severity totals:

- BLOCKER: 0
- HIGH: 1
- MEDIUM: 2
- LOW: 2
- INFORMATIONAL: 3

## 12. Required Fixes

Before manual testing:

1. Pin the Prometheus BusyBox image to the tested release
   `prom/prometheus:v3.13.1` and update documentation.
2. Change the default published host interface from `0.0.0.0` to
   `127.0.0.1`; document the controlled override for protected deployments.
3. Add the backend startup command, Docker Desktop Linux-container prerequisite,
   pinned-image `promtool` validation command, and explicit intentional data
   reset instructions to the setup guide.

Before Phase 3.7.6 dashboard work:

4. Remove or correctly parameterize the hard-coded `environment: production`
   target label so Grafana does not build on misleading data.

## 13. Optional Improvements

- Remove `attachable: true` unless manual container attachment is part of the
  supported operational workflow.
- Test `read_only: true` with the pinned image and add a `/tmp` tmpfs only if
  runtime evidence shows it is required.
- After pulling the pinned tag, record the repository digest for controlled
  production promotion.
- Establish CPU and memory limits from measured ingestion/query workloads.
- Add recording and alert rule files only in their assigned future phase.

No explicit Compose `user` change is recommended. The official BusyBox image
already runs as `nobody`; overriding it can create cross-platform named-volume
permission failures. No distroless migration is recommended in this phase
because the current `wget` health check would need redesign and volume ownership
would require verified migration handling.

## 14. Manual Test Checklist

After applying the required fixes and starting Docker Desktop:

- [ ] Confirm Docker Desktop uses Linux containers and `docker info` succeeds.
- [ ] Start the backend and dependencies:
      `docker compose -f docker-compose.yml up -d backend`.
- [ ] Verify `Invoke-WebRequest http://localhost:8000/metrics` returns HTTP 200
      and Prometheus text format.
- [ ] Pull the pinned Prometheus image.
- [ ] Run `promtool check config` using that exact image and the mounted
      `monitoring/prometheus/prometheus.yml`.
- [ ] Run `docker compose -f docker-compose.monitoring.yml config` and its
      `--services`, `--volumes`, and `--networks` views.
- [ ] Start Prometheus with
      `docker compose -f docker-compose.monitoring.yml up -d`.
- [ ] Confirm `docker compose -f docker-compose.monitoring.yml ps` reports the
      service healthy.
- [ ] Confirm `Invoke-WebRequest http://localhost:9090/-/ready` returns HTTP 200.
- [ ] Inspect
      `docker compose -f docker-compose.monitoring.yml logs --tail 100 prometheus`
      for configuration, permission, TSDB, or scrape errors.
- [ ] Open `http://localhost:9090/targets` and confirm `tasksync-backend` is
      `UP` at `http://host.docker.internal:8000/metrics`.
- [ ] Query `up{job="tasksync-backend"}` and confirm the sample value is `1`.
- [ ] Restart/recreate Prometheus and confirm previous TSDB data remains.
- [ ] On Linux, confirm the `host-gateway` mapping resolves and the target stays
      `UP`.
- [ ] Confirm port 9090 is bound to `127.0.0.1` by default and is not reachable
      from another host.
- [ ] If testing a deliberate reset, stop the stack, remove only the documented
      Prometheus volume, restart, and confirm an empty TSDB. Do not remove the
      root application's Redis or SQL Server volumes.

## 15. Final Verdict

**CHANGES REQUIRED**

The core scrape configuration, Compose structure, persistence, restart policy,
Linux host mapping, and future observability network are correct. No blocker or
application-code regression exists. Phase 3.7.5 should not advance to Phase
3.7.6 until the image is pinned, localhost is the secure default, the manual
test documentation is completed, and the environment label is corrected.

Live runtime validation remains:

**NOT EXECUTED — Docker daemon unavailable**

### Commands Executed

```powershell
git branch --show-current
git status --short
git diff -- monitoring/prometheus/prometheus.yml docker-compose.monitoring.yml docs/monitoring/prometheus_setup.md
git ls-files --others --exclude-standard
git diff --name-only
git diff --cached --name-only
docker compose -f docker-compose.monitoring.yml config
docker compose -f docker-compose.monitoring.yml config --services
docker compose -f docker-compose.monitoring.yml config --volumes
docker compose -f docker-compose.monitoring.yml config --networks
docker version
docker info --format '{{json .ServerVersion}}'
```

Additional read-only PowerShell and `rg` inspections checked line-numbered file
content, existing container names, backend port/startup contracts,
documentation coverage, required settings, secrets, private IP addresses, and
machine-specific paths.

### Authoritative References

- Prometheus installation and named-volume guidance:
  <https://prometheus.io/docs/prometheus/latest/installation/>
- Official Prometheus Dockerfile (BusyBox base, `USER nobody`, `/prometheus`
  volume, bundled `promtool`):
  <https://github.com/prometheus/prometheus/blob/main/Dockerfile>
- Prometheus releases used to identify the reviewed pinned version:
  <https://prometheus.io/download/>

## 16. Remediation Update

### Date of Remediation

2026-07-13 (Asia/Saigon)

### Findings Addressed

The required findings from the original review were remediated without changing
application, frontend, or database code:

- F-01: replaced floating `prom/prometheus:latest` with the reviewed pinned
  BusyBox release `prom/prometheus:v3.13.1`.
- F-02: changed the default host binding from every interface to local-only
  `127.0.0.1:9090`.
- F-03: expanded the setup guide with Docker daemon prerequisites, backend
  startup/inspection, metrics checks, pinned-image `promtool`, health/readiness,
  logs, target and PromQL validation, persistence testing, and safe intentional
  reset instructions.
- F-04: changed the static target label from misleading
  `environment: production` to truthful `environment: local`, with a comment
  reserving production label generation for deployment tooling.
- F-05: removed `attachable: true`; future Compose-managed observability
  services do not require it.

F-06 and F-07 remain optional and were intentionally not applied because
`read_only`, explicit user overrides, and resource limits require runtime
evidence. F-08 remains a runtime-validation status rather than a code defect.

### Files Changed

- `monitoring/prometheus/prometheus.yml`
- `docker-compose.monitoring.yml`
- `docs/monitoring/prometheus_setup.md`
- `docs/reports/phase_3_7_5_prometheus_review.md`

A separate completion report was created at
`docs/reports/phase_3_7_5_prometheus_completion.md`.

### Before and After Configuration

| Control | Before | After |
|---|---|---|
| Prometheus image | `prom/prometheus:latest` | `prom/prometheus:v3.13.1` |
| Default published host | `0.0.0.0:9090` | `127.0.0.1:9090` |
| Environment label | `production` | `local` |
| Network attachment | `attachable: true` | Compose-managed attachment only |
| Manual workflow | Partial | Complete PowerShell workflow |

All valid settings were preserved: 15-second scrape/evaluation intervals,
10-second timeout, explicit HTTP `/metrics` scrape, backend target, service
label, 15-day/10 GB retention, read-only configuration mount, named volume,
health check, `no-new-privileges`, `unless-stopped`, Linux host gateway, and the
dedicated observability bridge network.

### Validation Performed

- Confirmed branch `develop` and no tracked/staged changes outside scope.
- `docker compose -f docker-compose.monitoring.yml config`: PASS.
- `config --services`: PASS — `prometheus`.
- `config --volumes`: PASS — `prometheus_data`.
- `config --networks`: PASS — `observability`.
- Resolved image: PASS — `prom/prometheus:v3.13.1`.
- Resolved host binding: PASS — `127.0.0.1:9090` to container port 9090.
- Static requirement/content checks: PASS.

Docker emitted a sandbox warning for the user's Docker CLI configuration file,
but all Compose rendering commands completed successfully with exit code 0.

### Validation Not Performed

**NOT EXECUTED — Docker daemon unavailable**

- Image pull and local digest inspection
- Pinned-image `promtool check config`
- Prometheus startup and health check
- Backend `/metrics` live response
- Target `UP` verification
- PromQL result value `1`
- Named-volume persistence test

The installed Docker client could not connect to the Windows Docker Engine
named pipe. No runtime success is claimed.

### Remaining Optional Recommendations

- After starting Docker Desktop, execute the completion report's manual test
  workflow and record the pulled image digest without inventing one.
- Evaluate `read_only: true` only with runtime evidence and any proven writable
  tmpfs requirements.
- Establish production CPU/memory limits from measurements rather than guesses.
- Add alerts, Alertmanager, Grafana, Loki, and Tempo only in their assigned
  phases.

### Updated Verdict

**PASS WITH RUNTIME VALIDATION PENDING**

All required static corrections are complete. Phase 3.7.5 is ready for the
documented manual test workflow, but it is not fully complete and Phase 3.7.6
should not start until the runtime checks pass.
