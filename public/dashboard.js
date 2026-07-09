// Configuration State
let githubRepoSlug = localStorage.getItem('cicd_dashboard_repo') || 'Mohanrajp05/CI-CD_PROJECT-';
let countdownSecs = 30;
let refreshIntervalId = null;
let countdownIntervalId = null;
let latestRunData = null; // Stored for Live Demo telemetry panel

// DOM Elements
const repoSlugInput   = document.getElementById('repo-slug-input');
const saveRepoBtn     = document.getElementById('save-repo-btn');
const manualRefreshBtn= document.getElementById('manual-refresh-btn');
const liveDemoBtn     = document.getElementById('live-demo-btn');
const liveVersionSha  = document.getElementById('live-version-sha');
const runsTableBody   = document.getElementById('runs-table-body');
const systemStatusBanner  = document.getElementById('system-status-banner');
const statusIndicatorDot  = document.getElementById('status-indicator-dot');
const statusHeadline      = document.getElementById('status-headline');
const statusSubline       = document.getElementById('status-subline');
const syncTimerText   = document.getElementById('sync-timer-text');
const syncProgressBar = document.getElementById('sync-progress-bar');
const currentRepoLabel= document.getElementById('current-repo-label');

// Initialize Configuration Panel
repoSlugInput.value = githubRepoSlug;

// Event Listeners
saveRepoBtn.addEventListener('click', () => {
  const newSlug = repoSlugInput.value.trim();
  if (newSlug) {
    githubRepoSlug = newSlug;
    localStorage.setItem('cicd_dashboard_repo', newSlug);
    triggerTelemetrySync();
  }
});

manualRefreshBtn.addEventListener('click', () => {
  triggerTelemetrySync();
});

// Live Demo Button
if (liveDemoBtn) {
  liveDemoBtn.addEventListener('click', () => {
    if (window.PipelineDemo) {
      window.PipelineDemo.open(latestRunData);
    }
  });
}

// Format duration helper
function formatDuration(startedAt, updatedAt) {
  const start = new Date(startedAt);
  const end = new Date(updatedAt);
  const diffMs = end - start;
  
  if (isNaN(diffMs) || diffMs <= 0) {
    return '--';
  }
  
  const diffSecs = Math.round(diffMs / 1000);
  if (diffSecs < 60) {
    return `${diffSecs}s`;
  }
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  return `${mins}m ${secs}s`;
}

// Format relative timestamp helper
function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  
  if (isNaN(diffMs)) return '--';
  
  const diffSecs = Math.round(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Update Top Banner UI based on the latest run status
function updateStatusBanner(latestRun) {
  if (!latestRun) {
    // No runs found
    systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-slate-900 border-slate-800 text-slate-400";
    statusIndicatorDot.className = "h-4 w-4 rounded-full bg-slate-400";
    statusHeadline.textContent = "No Runs Found";
    statusSubline.textContent = "We couldn't locate any Actions runs for the configured repository.";
    return;
  }

  const isCompleted = latestRun.status === 'completed';
  const conclusion = latestRun.conclusion;

  if (isCompleted) {
    if (conclusion === 'success') {
      systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      statusIndicatorDot.className = "h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
      statusHeadline.textContent = "🟢 All Systems Operational";
      statusSubline.textContent = `Last build (Run #${latestRun.run_number}) succeeded and deployed successfully on ${new Date(latestRun.updated_at).toLocaleString()}.`;
    } else if (conclusion === 'failure') {
      systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-rose-500/10 border-rose-500/30 text-rose-400";
      statusIndicatorDot.className = "h-4 w-4 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
      statusHeadline.textContent = "🔴 Last Build Failed";
      statusSubline.textContent = `The most recent pipeline execution (Run #${latestRun.run_number}) failed testing or deployment. Immediate review advised.`;
    } else {
      systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-amber-500/10 border-amber-500/30 text-amber-400";
      statusIndicatorDot.className = "h-4 w-4 rounded-full bg-amber-500";
      statusHeadline.textContent = "🟡 Build Partially Succeeded";
      statusSubline.textContent = `The most recent run finished with result code: '${conclusion}'.`;
    }
  } else {
    // In-Progress / Queued
    systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
    statusIndicatorDot.className = "h-4 w-4 rounded-full bg-indigo-500 animate-ping";
    statusHeadline.textContent = "🔄 Pipeline Execution In Progress";
    statusSubline.textContent = `Run #${latestRun.run_number} is currently active on branch '${latestRun.head_branch}'...`;
  }
}

// Sync function
async function triggerTelemetrySync() {
  currentRepoLabel.textContent = `Target repository: github.com/${githubRepoSlug}`;
  
  // Reset countdown
  countdownSecs = 30;
  updateCountdownText();

  // Fetch server commit SHA
  try {
    const versionResponse = await fetch('/api/version');
    const versionData = await versionResponse.json();
    liveVersionSha.textContent = versionData.version.substring(0, 8);
    liveVersionSha.setAttribute('title', versionData.version);
  } catch {
    liveVersionSha.textContent = 'dev-local';
  }

  // Fetch GitHub actions run history
  try {
    const url = `https://api.github.com/repos/${githubRepoSlug}/actions/runs`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const runs = data.workflow_runs || [];
    
    // Take the last 15 runs
    const slicedRuns = runs.slice(0, 15);
    
    if (slicedRuns.length === 0) {
      runsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-10 text-center text-slate-500 font-medium">
            No pipeline actions runs discovered in this repository yet.
          </td>
        </tr>
      `;
      updateStatusBanner(null);
      return;
    }

    // Build table HTML
    let tableHtml = '';
    slicedRuns.forEach(run => {
      // Determine status badge colors
      let badgeClass = 'bg-slate-800 text-slate-300 border border-slate-700';
      let statusLabel = run.status;
      
      if (run.status === 'completed') {
        if (run.conclusion === 'success') {
          badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          statusLabel = 'success';
        } else if (run.conclusion === 'failure') {
          badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
          statusLabel = 'failure';
        } else {
          badgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
          statusLabel = run.conclusion || 'neutral';
        }
      } else {
        badgeClass = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse';
        statusLabel = 'in-progress';
      }

      // Truncate commit message
      const commitMsg = run.head_commit ? run.head_commit.message : 'No message';
      const truncatedMsg = commitMsg.length > 38 ? commitMsg.substring(0, 38) + '...' : commitMsg;

      // Clean Event Trigger
      const eventLabel = run.event.replace('_', ' ');

      // Render line
      tableHtml += `
        <tr class="hover:bg-slate-800/30 transition-colors bg-slate-900 border-b border-slate-800/50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="font-semibold text-slate-200 font-mono">#${run.run_number}</div>
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">${eventLabel}</div>
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded text-xs bg-slate-800 text-indigo-300 border border-slate-700 font-mono">${run.head_branch}</span>
            </div>
            <div class="text-xs text-slate-400 mt-1 truncate max-w-xs" title="${commitMsg}">${truncatedMsg}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${badgeClass}">
              ${statusLabel}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
            ${formatDuration(run.run_started_at, run.updated_at)}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
            ${formatRelativeTime(run.updated_at)}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-xs">
            <a href="${run.html_url}" target="_blank" class="inline-flex items-center font-semibold text-indigo-400 hover:text-indigo-300">
              View Logs ↗
            </a>
          </td>
        </tr>
      `;
    });

    runsTableBody.innerHTML = tableHtml;
    
    // Cache latest run for Live Demo panel
    latestRunData = slicedRuns[0] || null;

    // Update the banner based on the latest run (index 0)
    updateStatusBanner(slicedRuns[0]);

  } catch (err) {
    console.error('Telemetry fetch failed:', err);
    
    const is404 = err.message && err.message.includes('404');
    
    if (is404) {
      // Show elegant Step-by-Step CI/CD Configuration Setup
      runsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-left bg-slate-900">
            <div class="max-w-3xl mx-auto space-y-6">
              <!-- Header Alert -->
              <div class="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5 flex items-start space-x-3">
                <span class="text-indigo-400 text-lg">💡</span>
                <div>
                  <h4 class="font-bold text-sm text-indigo-300">Repository Live Connection Pending</h4>
                  <p class="text-xs text-slate-300 mt-1">
                    The GitHub repository slug <span class="font-mono bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-200">${githubRepoSlug}</span> was not found or is private. Follow the checklist below to establish a live pipeline!
                  </p>
                </div>
              </div>

              <!-- Setup Checklist -->
              <div>
                <h4 class="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3">Required Pipeline Secrets & API Keys</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Secret 1 -->
                  <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span class="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">1. Docker Hub User</span>
                      <h5 class="font-bold text-xs text-slate-200 mt-1">DOCKERHUB_USERNAME</h5>
                      <p class="text-[11px] text-slate-400 mt-2">Your Docker Hub username to authenticate and push built images.</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500">
                      Platform: <a href="https://hub.docker.com" target="_blank" class="text-indigo-400 hover:underline">Docker Hub ↗</a>
                    </div>
                  </div>

                  <!-- Secret 2 -->
                  <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span class="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">2. Docker Hub Token</span>
                      <h5 class="font-bold text-xs text-slate-200 mt-1">DOCKERHUB_TOKEN</h5>
                      <p class="text-[11px] text-slate-400 mt-2">A secure Personal Access Token generated in Docker Hub settings.</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500">
                      Platform: <a href="https://hub.docker.com" target="_blank" class="text-indigo-400 hover:underline">Docker Hub ↗</a>
                    </div>
                  </div>

                  <!-- Secret 3 -->
                  <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span class="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">3. Render Hook</span>
                      <h5 class="font-bold text-xs text-slate-200 mt-1">RENDER_DEPLOY_HOOK</h5>
                      <p class="text-[11px] text-slate-400 mt-2">The Web Deploy URL hook from Render to trigger auto-redeployments.</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500">
                      Platform: <a href="https://render.com" target="_blank" class="text-indigo-400 hover:underline">Render ↗</a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Integration Steps -->
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 space-y-3">
                <h5 class="font-bold text-slate-200">How to activate your GitHub Actions Pipeline:</h5>
                <ol class="list-decimal pl-4 space-y-2 text-slate-400 text-[11px]">
                  <li>Create a new public repository on GitHub (e.g., <span class="font-mono bg-slate-900 px-1 text-slate-300">cicd-pipeline-demo</span>).</li>
                  <li>In your repository, navigate to <span class="font-semibold text-slate-300">Settings → Secrets and variables → Actions</span>.</li>
                  <li>Click <span class="font-semibold text-slate-300">"New repository secret"</span> and add the three keys above.</li>
                  <li>Push your codebase to the repository to trigger your very first live automated CI/CD pipeline!</li>
                </ol>
              </div>
            </div>
          </td>
        </tr>
      `;

      // Update the status banner to inform user of repo pending connection
      systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
      statusIndicatorDot.className = "h-4 w-4 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse";
      statusHeadline.textContent = "⚙️ Dashboard Setup Pending";
      statusSubline.textContent = `Connect your public GitHub repository to enable live actions and telemetry status.`;

    } else {
      // General Connection error
      runsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-rose-400 font-medium bg-slate-900">
            <div class="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 max-w-lg mx-auto text-left text-xs">
              <p class="font-bold text-sm mb-1 text-rose-400">Could Not Fetch GitHub Actions Telemetry</p>
              <p class="mb-2 text-slate-300">This is typically caused by one of the following:</p>
              <ul class="list-disc pl-4 space-y-1 text-slate-300">
                <li>Rate limit exceeded by your browser's current IP.</li>
                <li>The repository slug <span class="font-mono bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded">${githubRepoSlug}</span> is either private, misspelled, or does not exist.</li>
              </ul>
              <p class="mt-3 text-rose-400">Please verify your public repository settings in the sidebar config.</p>
            </div>
          </td>
        </tr>
      `;
      
      // Soft error in banner
      systemStatusBanner.className = "mb-8 rounded-2xl p-6 border transition-all duration-300 shadow-sm bg-rose-500/10 border-rose-500/30 text-rose-400";
      statusIndicatorDot.className = "h-4 w-4 rounded-full bg-rose-400";
      statusHeadline.textContent = "Failed to sync telemetry";
      statusSubline.textContent = "Could not reach the GitHub Actions REST API. Check the table log below.";
    }
  }
}

// Progress Countdown
function updateCountdownText() {
  syncTimerText.textContent = `Syncing in ${countdownSecs}s`;
  const pct = (countdownSecs / 30) * 100;
  syncProgressBar.style.width = `${pct}%`;
}

function startTimers() {
  // Clear any existing timers
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  if (countdownIntervalId) clearInterval(countdownIntervalId);

  // Set 30s poll
  refreshIntervalId = setInterval(() => {
    triggerTelemetrySync();
  }, 30000);

  // Set 1s countdown clock
  countdownIntervalId = setInterval(() => {
    countdownSecs--;
    if (countdownSecs <= 0) {
      countdownSecs = 30;
    }
    updateCountdownText();
  }, 1000);
}

// Start
triggerTelemetrySync();
startTimers();
