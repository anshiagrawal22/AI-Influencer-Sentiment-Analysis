// Global Chart instances
let sentimentChart = null;
let botHumanChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Navigation Tabs
    initTabs();
    
    // Initialize File Upload Handlers
    initUpload();
    
    // Initialize Live Analyzer Handler
    initLiveAnalyzer();
    
    // Automatically load default dataset on startup
    loadDefaultDataset();
});

/* Navigation / Tabs System */
function initTabs() {
    const links = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.dashboard-section');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            // Toggle active link styling
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Toggle visible sections
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    });
}

/* API: Load Default Dataset */
async function loadDefaultDataset() {
    showDashboardLoading(true);
    try {
        const response = await fetch('/upload', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to load default dataset');
        
        const data = await response.json();
        updateDashboard(data);
    } catch (err) {
        console.error(err);
        showToast('Error loading default dataset.', 'error');
    } finally {
        showDashboardLoading(false);
    }
}

/* API: File Upload & Drag-and-Drop */
function initUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const uploadBtn = document.getElementById('trigger-upload-btn');
    
    if (!dropZone || !fileInput) return;
    
    // Click to upload
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });
    
    // Drag & Drop visual states
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
        }, false);
    });
    
    // Drop file
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0 && files[0].name.endsWith('.csv')) {
            handleFileUpload(files[0]);
        } else {
            showToast('Please drop a valid .csv file.', 'warning');
        }
    });
}

async function handleFileUpload(file) {
    showDashboardLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to process file');
        }
        
        const data = await response.json();
        updateDashboard(data);
        showToast(`Successfully analyzed ${data.total_comments} comments from ${file.name}.`, 'success');
        
        // Auto navigate to dashboard tab
        document.querySelector('[data-target="analytics-view"]').click();
        
    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        showDashboardLoading(false);
    }
}

/* API: Live Single Comment Analyzer */
function initLiveAnalyzer() {
    const inputArea = document.getElementById('live-comment-input');
    const analyzeBtn = document.getElementById('live-analyze-btn');
    const clearBtn = document.getElementById('live-clear-btn');
    const resultsPanel = document.getElementById('live-results-panel');
    const loader = document.getElementById('live-loader');
    
    if (!analyzeBtn || !inputArea) return;
    
    analyzeBtn.addEventListener('click', async () => {
        const text = inputArea.value.trim();
        if (!text) {
            showToast('Please type a comment to analyze.', 'warning');
            return;
        }
        
        // Loading state
        loader.classList.remove('hidden');
        resultsPanel.classList.add('opacity-60');
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) throw new Error('Analysis failed');
            const data = await response.json();
            
            displayLiveResults(data);
            
        } catch (err) {
            console.error(err);
            showToast('Failed to analyze comment.', 'error');
        } finally {
            loader.classList.add('hidden');
            resultsPanel.classList.remove('opacity-60');
        }
    });
    
    clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        resetLiveResults();
    });
}

function displayLiveResults(data) {
    // Reveal container
    document.getElementById('live-empty-state').classList.add('hidden');
    document.getElementById('live-results-container').classList.remove('hidden');
    
    // Set Sentiment Badge
    const sentimentBadge = document.getElementById('live-sentiment');
    sentimentBadge.textContent = data.sentiment.toUpperCase();
    sentimentBadge.className = `px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider badge-sentiment-${data.sentiment}`;
    
    // Set Comment Type Badge
    const typeBadge = document.getElementById('live-comment-type');
    typeBadge.textContent = data.comment_type.toUpperCase();
    typeBadge.className = `px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider badge-${data.comment_type.toLowerCase()}`;
    
    // Set Emotion Badge
    const emotionBadge = document.getElementById('live-emotion');
    emotionBadge.textContent = data.emotion.toUpperCase();
    emotionBadge.className = `px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider badge-emotion-${data.emotion}`;
    
    // Set Summary description
    document.getElementById('live-summary').textContent = data.summary;
}

function resetLiveResults() {
    document.getElementById('live-empty-state').classList.remove('hidden');
    document.getElementById('live-results-container').classList.add('hidden');
}

/* Dashboard Update System */
function updateDashboard(data) {
    // 1. KPI Cards
    document.getElementById('stat-total-comments').textContent = data.total_comments;
    document.getElementById('stat-avg-sentiment').textContent = data.avg_polarity.toFixed(2);
    document.getElementById('stat-bot-ratio').textContent = `${data.bot_ratio}%`;
    document.getElementById('stat-spam-ratio').textContent = `${data.spam_ratio}%`;
    
    // 2. Render Keywords
    renderKeywords(data.top_keywords);
    
    // 3. Render Comments Table
    renderCommentsTable(data.comments);
    
    // 4. Update Charts
    updateCharts(data);
}

function renderKeywords(keywords) {
    const container = document.getElementById('keywords-container');
    container.innerHTML = '';
    
    if (keywords.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 col-span-3 text-center">No keywords detected</p>';
        return;
    }
    
    keywords.forEach(kw => {
        const div = document.createElement('div');
        div.className = 'keyword-tag p-2 flex justify-between items-center text-xs';
        div.innerHTML = `
            <span class="font-medium text-slate-600">#${kw.word}</span>
            <span class="text-3xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">${kw.count}</span>
        `;
        container.appendChild(div);
    });
}

function renderCommentsTable(comments) {
    const tbody = document.getElementById('comments-table-body');
    tbody.innerHTML = '';
    
    comments.forEach(comment => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition';
        
        // Source Class
        const sourceBadge = comment.source === 'Human' 
            ? '<span class="px-1.5 py-0.5 rounded text-4xs font-semibold badge-human uppercase">Human</span>'
            : '<span class="px-1.5 py-0.5 rounded text-4xs font-semibold badge-bot uppercase">Bot/Spam</span>';
            
        // Flag indicators
        let flags = '';
        if (comment.is_spam) flags += '<span class="px-1.5 py-0.5 rounded text-4xs font-bold badge-spam mr-1">SPAM</span>';
        if (comment.is_bot) flags += '<span class="px-1.5 py-0.5 rounded text-4xs font-bold badge-bot mr-1">BOT</span>';
        if (comment.is_promo) flags += '<span class="px-1.5 py-0.5 rounded text-4xs font-bold badge-promo">PROMO</span>';
        if (!flags) flags = '<span class="text-slate-400 font-medium">-</span>';
        
        // Sentiment Badge
        const sentimentBadge = `<span class="px-1.5 py-0.5 rounded text-4xs font-semibold badge-sentiment-${comment.sentiment} uppercase">${comment.sentiment}</span>`;
        
        // Emotion Badge
        const emotionBadge = `<span class="px-1.5 py-0.5 rounded text-4xs font-semibold badge-emotion-${comment.emotion} uppercase">${comment.emotion}</span>`;
        
        tr.innerHTML = `
            <td class="px-3 py-2 text-2xs text-slate-400 font-mono">#${comment.comment_id}</td>
            <td class="px-3 py-2 text-xs font-semibold text-slate-700">@${comment.username}</td>
            <td class="px-3 py-2 text-xs text-slate-600 max-w-xs truncate" title="${comment.comment_text}">${comment.comment_text}</td>
            <td class="px-3 py-2 text-2xs text-slate-500 font-medium">${comment.likes}</td>
            <td class="px-3 py-2">${sentimentBadge}</td>
            <td class="px-3 py-2">${emotionBadge}</td>
            <td class="px-3 py-2">${sourceBadge}</td>
            <td class="px-3 py-2 flex items-center mt-0.5">${flags}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

/* Charts Management (Updated with light theme, clean soft colors) */
function updateCharts(data) {
    // 1. Sentiment Distribution Chart
    const sentimentCtx = document.getElementById('sentimentChart').getContext('2d');
    if (sentimentChart) sentimentChart.destroy();
    
    sentimentChart = new Chart(sentimentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [
                    data.sentiment_distribution.positive,
                    data.sentiment_distribution.neutral,
                    data.sentiment_distribution.negative
                ],
                backgroundColor: ['#10b981', '#94a3b8', '#f43f5e'],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#475569', font: { family: 'Inter', size: 10 } }
                }
            },
            cutout: '70%'
        }
    });
    
    // 2. Bot/Spam vs Human Source Chart
    const botHumanCtx = document.getElementById('botHumanChart').getContext('2d');
    if (botHumanChart) botHumanChart.destroy();
    
    botHumanChart = new Chart(botHumanCtx, {
        type: 'bar',
        data: {
            labels: ['Human Origin', 'Bot/Spam Triggered'],
            datasets: [{
                data: [data.bot_vs_human.Human, data.bot_vs_human['Bot/Spam']],
                backgroundColor: ['#4f46e5', '#f97316'],
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#64748b', precision: 0, font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
}

/* UI Helper Utilities */
function showDashboardLoading(show) {
    const overlay = document.getElementById('dashboard-loader-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

function showToast(message, type = 'info') {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-md border transition-all duration-300 transform translate-y-10 opacity-0`;
    
    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        error: 'bg-rose-50 border-rose-200 text-rose-700',
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
        info: 'bg-slate-50 border-slate-200 text-slate-700'
    };
    
    toast.className += ` ${colors[type] || colors.info}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-5');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
