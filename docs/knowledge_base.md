# CI/CD Dashboard Knowledge Base & Conversation Summary

This document captures the implementation history, system troubleshooting steps, Git commands, and verification workflows completed during our pair programming session.

---

## 📅 Session Timeline & Implemented Features

### 1. Starting the Application
* **Command:** `npm run dev` (starts the Express server locally on port `3000`).
* **Active URLs:**
  * Landing page: `http://localhost:3000/`
  * Dashboard: `http://localhost:3000/dashboard`
  * Health-check: `http://localhost:3000/health`
* **Status:** Verified operational.

### 2. Live Demo Pipeline Animation
* **Objective:** Create a full-screen, self-contained animated modal of the CI/CD pipeline.
* **Component Pipeline Flow:**
  ```text
  Developer → GitHub Repo → GitHub Actions → (Lint + Test + Build in parallel) → Docker Build → Docker Hub → Render Deploy → Live App
  ```
* **Engine Design (`public/pipeline-demo.js`):**
  * Handcrafted using pure SVG nodes/paths and custom high-performance CSS keyframe animations.
  * Node state engine representing `waiting` (grey), `running` (pulsing blue), `success` (glowing green), and `failure` (glowing red).
  * Dashboard control panel: **Pause / Resume**, **Restart**, and **End Demo** controls.
  * Integration of the floating **Live Run Telemetry** panel displaying:
    * Run Number
    * Branch
    * Trigger
    * Commit SHA
    * Stage and Progress % Bar
  * **Result Sync Fix:** The true outcome result (`Result: success` or `Result: failure`) remains masked as `⏳ running...` during the animation and only reveals itself once all animation stages have fully completed to match a real-life execution.

---

## 🐛 Troubleshooting & Bug Resolution

During execution, the GitHub Actions pipeline runs were showing a status of `failure`. 

### The Mismatch Root Cause
* **Broken File:** [health.js](file:///c:/Users/Mohan%20Raj%20P/Downloads/ci_cd-pipeline-dashboard/src/routes/health.js)
* **Code Issue:** The health route hardcoded `status: 'broken'` in the JSON response payload.
* **Test Mismatch:** The Jest unit test suite in [app.test.js](file:///c:/Users/Mohan%20Raj%20P/Downloads/ci_cd-pipeline-dashboard/tests/app.test.js#L18) expected `status: 'ok'`.
* **Consequence:** Jest test failed on every single commit push, terminating the GitHub Actions workflow before it reached the Docker build and Render deployment stages.
* **Fix Applied:** Changed `status: 'broken'` → `status: 'ok'` in `src/routes/health.js`. Tests now pass 100% locally and remotely.

---

## 📋 Git Workflow Guide

Here are the commands to stage, commit, and push changes to the repository:

```powershell
# 1. Stage modified files
git add public/dashboard.html public/dashboard.js public/pipeline-demo.js src/routes/health.js

# 2. Create commit
git commit -m "feat: integrate animated live pipeline demo and fix health route test bug"

# 3. Push to remote main branch (triggers automated CI/CD pipeline)
git push origin main
```

---

## 🎓 Guide: How to Show Failed Test Cases to Evaluators

If an evaluator asks to see how the CI/CD pipeline catches errors:

1. Open [src/routes/health.js](file:///c:/Users/Mohan%20Raj%20P/Downloads/ci_cd-pipeline-dashboard/src/routes/health.js) and change `status: 'ok'` to `status: 'broken'`.
2. Save the file and run the following in your terminal:
   ```powershell
   git add src/routes/health.js
   git commit -m "demo: trigger a failed CI pipeline test"
   git push origin main
   ```
3. Show the evaluator the pipeline response:
   * **Local unit test terminal:** Run `npm run test` to show Jest throwing a status expectation error.
   * **GitHub Actions workflow tab:** Show the workflow step exit with an error.
   * **Dashboard Live Demo:** In the telemetry panel, the **Result** field will display **✕ failure** in red when the animation sequence ends.
