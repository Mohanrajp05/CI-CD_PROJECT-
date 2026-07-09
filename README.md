<<<<<<< HEAD
# CI-CD_PROJECT-
A full-stack CI/CD demonstration featuring a Node.js + Express web app, automated Jest testing &amp; ESLint checks, Docker containerization, and a live, self-updating pipeline monitoring dashboard pulling directly from the GitHub Actions REST API
=======
# CI/CD Pipeline for Web Application Deployment

A complete full-stack demonstration showcase of modern DevOps continuous integration and continuous deployment principles. This project pairs a Node.js + Express web application with an automated GitHub Actions build/test/deploy pipeline and a live, self-updating status dashboard pulling from the GitHub Actions REST API.

---

## 🏗️ System Architecture

```text
Developer → git push → GitHub Repo
                            │
                            ▼
                    GitHub Actions Pipeline
                    ┌─────────────────────┐
                    │ 1. Checkout code     │
                    │ 2. Install deps      │
                    │ 3. Lint              │
                    │ 4. Run tests         │
                    │ 5. Build app         │
                    │ 6. Build Docker image│
                    │ 7. Push to Docker Hub│
                    │ 8. Call deploy hook  │
                    └─────────┬───────────┘
                              │
                              ▼
                        Render (hosting)
                              │
                              ▼
                    Live Web App + /dashboard
                              │
                              ▼
                          End User
```

### Dashboard Data Flow (Polling / Public Read-Only)

```text
Browser loads /dashboard
        │
        ▼
Frontend JS calls GitHub REST API:
GET https://api.github.com/repos/{owner}/{repo}/actions/runs
        │
        ▼
Render as a table: run #, branch, commit message, status, duration, timestamp, link to logs
        │
        ▼
Auto-refresh every 30s (poll, no auth token needed for public repos)
```

---

## 🛠️ Project Structure

The project represents a modular, clean, and testable codebase:

```text
my-web-app/
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Actions workflow orchestrator
├── public/
│   ├── index.html          ← Sleek main app landing page with live statistics
│   ├── dashboard.html      ← Pipeline telemetry dashboard (no-framework SPA)
│   ├── dashboard.js        ← Fetches real-time GitHub Actions API & renders runs
│   └── style.css           ← Extra visual transitions & UI polish
├── src/
│   └── routes/
│       └── health.js       ← Modular Express health check route handler
├── tests/
│   └── app.test.js         ← Test suite (Jest + Supertest) verifying 4 key endpoints
├── index.js                 ← Express production server entrypoint
├── Dockerfile              ← Multi-stage production container build
├── .dockerignore           ← Prevents bloated image sizes by excluding logs & node_modules
├── .gitignore              ← Standard git ignore definitions
├── package.json            ← Dependencies, linting, testing, and dev script configurations
└── README.md               ← Documentation, architecture diagram, and manual steps guide
```

---

## 🚀 How the Pipeline Works

1. **Continuous Integration (Lint & Test)**: On any commit pushed or Pull Request opened against `main`, GitHub Actions spins up an Ubuntu node, pulls the repository, installs dependencies, executes **ESLint** for code style verification, and fires **Jest & Supertest** to execute all route tests.
2. **Containerization (Docker)**: If the checks pass and the commit is on the `main` branch, the workflow starts the `dockerize-and-deploy` job. It logs into Docker Hub using secrets, compiles a multi-stage Docker image, bakes the triggering short commit SHA into the runtime environment via `GIT_SHA` build-args, and pushes tags (`latest` and `:${SHA_SHORT}`) to the Docker Hub registry.
3. **Automated Deployment (Webhooks)**: The workflow executes an authenticated `POST` request to the Render deploy hook. Render instantly pulls the newly compiled Docker image from Docker Hub and carries out a rolling, zero-downtime containerized release.

---

## 🧬 Live Status Dashboard `/dashboard`

Serving straight from the web application's host, the `/dashboard` route delivers a visual interface showing the history of your automated deployments:
* **High-Contrast Banners**: Instantly identifies "🟢 All Systems Operational" or "🔴 Last Build Failed" depending on the outcome of the last workflow execution.
* **Telemetry Sync**: Live-polls the GitHub Actions API every 30 seconds to update status, duration, trigger type, and commit logs with a visual countdown timer.
* **Custom Repo Selector**: Includes an interactive configuration panel where you can input any public `owner/repo` slug to point the dashboard's telemetry directly to your repository!
* **SHA Verification**: Prominently displays the active runtime commit SHA from `/api/version` (which is baked into the Docker container during build-time) so you can prove the dashboard matches the live environment.

---

## 🧪 Testing Locally

To verify that the application and tests execute flawlessly before pushing to production, run:

```bash
# Install local testing packages
npm install

# Run the linting checks
npm run lint

# Execute Jest and Supertest suite
npm run test

# Boot the Express web server locally
npm run dev
```

---

## 🔴 "Proof it Works" (Failing-Test Demonstration)

This pipeline protects against buggy code reaching production:
1. Open `tests/app.test.js` or `src/routes/health.js` and break an expectation (e.g., change the status code from `200` to `500` or change the response body from `"ok"` to `"broken"`).
2. Push your changes to a feature branch or open a Pull Request.
3. Observe your GitHub Actions history: the `build-and-test` job will fail on the `Run Test Suite` step.
4. Because the test failed, the `dockerize-and-deploy` job is blocked from running, ensuring the broken code is **never compiled into an image or pushed to production**.
5. Revert the bug, push to `main`, and watch the pipeline automatically green-light, build, and deploy the healthy release.
>>>>>>> 4e510d0 (Initial commit)
