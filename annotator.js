(function () {
    if (window.__FST_ANNOTATOR_ACTIVE) {
        console.warn("fst-annotator sudah aktif!");
        return;
    }
    window.__FST_ANNOTATOR_ACTIVE = true;
    console.log("🚀 fullstuck Annotator Injected!");

    // --- 1. STATE & DATABASE (Session Manager) ---
    const loadDB = () => {
        const data = JSON.parse(localStorage.getItem('fst_annotator_db'));
        return data || { activeSession: null, sessions: {}, sessionCounter: 1 };
    };
    const saveDB = (db) => localStorage.setItem('fst_annotator_db', JSON.stringify(db));

    let DB = loadDB();

    // Inisialisasi sesi default jika kosong
    if (Object.keys(DB.sessions).length === 0) {
        const defaultId = 'sess_' + Date.now();
        DB.sessions[defaultId] = { id: defaultId, title: 'Session ' + DB.sessionCounter, annotations: [] };
        DB.sessionCounter++;
        DB.activeSession = defaultId;
        saveDB(DB);
    } else if (!DB.activeSession || !DB.sessions[DB.activeSession]) {
        DB.activeSession = Object.keys(DB.sessions)[0];
        saveDB(DB);
    }

    const getLogs = () => {
        try { return JSON.parse(sessionStorage.getItem('fst_annotator_logs')) || { network: [], events: [] }; }
        catch (e) { return { network: [], events: [] }; }
    };
    const saveLogs = (logs) => sessionStorage.setItem('fst_annotator_logs', JSON.stringify(logs));

    const STATE = {
        isDebugMode: false,
        hoveredElement: null,
        isReleasing: false,
        pendingElement: null,
        logs: getLogs()
    };

    const getActiveSession = () => DB.sessions[DB.activeSession];

    // Logger
    const addNetworkLog = (req, res) => {
        STATE.logs.network.push({ time: new Date().toLocaleTimeString(), ...req, ...res });
        if (STATE.logs.network.length > 50) STATE.logs.network.shift();
        saveLogs(STATE.logs);
    };
    const addEventLog = (action, details) => {
        STATE.logs.events.push({ time: new Date().toLocaleTimeString(), action, details });
        if (STATE.logs.events.length > 50) STATE.logs.events.shift();
        saveLogs(STATE.logs);
    };

    // Mencatat saat halaman SSR baru dimuat
    addEventLog('PAGE_LOAD', window.location.pathname);

    // Override Fetch & History
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
        const method = args[1]?.method || 'GET';
        
        let reqBody = args[1]?.body;
        if (typeof reqBody === 'string') reqBody = reqBody.substring(0, 300);
        else if (reqBody instanceof FormData) reqBody = '[FormData]';
        else if (reqBody) reqBody = '[Object/Blob]';

        try {
            const response = await originalFetch.apply(this, args);
            const clone = response.clone();
            clone.text().then(resBody => addNetworkLog({ url, method, reqBody }, { status: response.status, resBody: resBody.substring(0, 300) })).catch(() => { });
            return response;
        } catch (error) {
            addNetworkLog({ url, method, reqBody }, { status: 'FAILED', error: error.message });
            throw error;
        }
    };
    
    // Override XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        let method = 'GET';
        let url = 'unknown';
        let reqBody = null;

        const originalOpen = xhr.open;
        xhr.open = function(...args) {
            method = args[0] || 'GET';
            url = args[1] || 'unknown';
            return originalOpen.apply(xhr, args);
        };

        const originalSend = xhr.send;
        xhr.send = function(body) {
            if (typeof body === 'string') reqBody = body.substring(0, 300);
            else if (body instanceof FormData) reqBody = '[FormData]';
            else if (body) reqBody = '[Object/Blob]';
            
            return originalSend.apply(xhr, arguments);
        };

        xhr.addEventListener('load', function() {
            let resBody = '';
            try {
                if (xhr.responseType === '' || xhr.responseType === 'text' || xhr.responseType === 'json') {
                    resBody = (typeof xhr.response === 'string' ? xhr.response : JSON.stringify(xhr.response) || xhr.responseText || '').substring(0, 300);
                }
            } catch (e) { }
            addNetworkLog({ url, method, reqBody }, { status: xhr.status, resBody });
        });

        xhr.addEventListener('error', function() {
            addNetworkLog({ url, method, reqBody }, { status: 'FAILED', error: 'XHR Network Error' });
        });

        return xhr;
    };
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
        addEventLog('NAVIGATE_PUSH', args[2]);
        return originalPushState.apply(this, args);
    };
    window.addEventListener('popstate', () => addEventLog('NAVIGATE_POP', location.pathname));

    // --- 2. CSS STYLES ---
    const style = document.createElement('style');
    style.innerHTML = `
    .fst-annotator-ui { font-family: sans-serif; box-sizing: border-box; z-index: 999999; }
    .fst-annotator-btn { background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
    .fst-annotator-btn:hover { background: #2563eb; }
    .fst-annotator-btn.danger { background: #ef4444; }
    .fst-annotator-btn.danger:hover { background: #dc2626; }
    .fst-annotator-btn.success { background: #10b981; }
    .fst-annotator-btn.secondary { background: #6b7280; }
    
    #fst-annotator-trigger { position: fixed; bottom: 20px; right: 20px; width: 45px; height: 45px; background: #1e1e1e; border: 2px solid #3b82f6; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; cursor: grab; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.5); user-select: none; }
    #fst-annotator-trigger:active { cursor: grabbing; }
    
    #fst-annotator-panel { position: fixed; top: 20px; right: 20px; background: #1e1e1e; color: #fff; padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid #333; display: none; flex-direction: column; gap: 8px; width: 260px; cursor: move; }
    #fst-annotator-panel-content { display: flex; flex-direction: column; gap: 8px; cursor: default; }
    
    #fst-annotator-badge { position: fixed; background: #000; color: #00ff00; padding: 4px 8px; font-size: 11px; font-family: monospace; border-radius: 4px; pointer-events: none; display: none; white-space: nowrap; }
    
    .fst-annotator-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1e1e1e; padding: 16px; border-radius: 8px; display: none; flex-direction: column; gap: 10px; width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); border: 1px solid #444; }
    .fst-annotator-modal textarea { width: 100%; background: #000; color: #00ff00; border: 1px solid #555; padding: 8px; font-family: monospace; border-radius: 4px; box-sizing: border-box; resize: vertical; }
    .fst-annotator-modal .title { color: white; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
  `;
    document.head.appendChild(style);

    // --- 3. DOM ELEMENTS ---
    const badge = document.createElement('div');
    badge.id = 'fst-annotator-badge';
    badge.className = 'fst-annotator-ui';

    const trigger = document.createElement('div');
    trigger.id = 'fst-annotator-trigger';
    trigger.className = 'fst-annotator-ui';
    trigger.title = "Drag me or Click to open panel";
    trigger.innerText = 'FST';

    const panel = document.createElement('div');
    panel.id = 'fst-annotator-panel';
    panel.className = 'fst-annotator-ui';
    panel.innerHTML = `
    <div style="font-weight: bold; text-align: center; pointer-events: none;">🛠️ FST Annotator</div>
    <div id="fst-annotator-panel-content">
      <div style="display: flex; gap: 4px;">
        <select id="fst-annotator-session-select" style="flex: 1; padding: 4px; border-radius: 4px; background: #333; color: white; border: 1px solid #555;"></select>
        <button id="fst-annotator-btn-new-sess" class="fst-annotator-btn">+</button>
      </div>
      <button id="fst-annotator-btn-del-sess" class="fst-annotator-btn danger">Delete Session</button>
      <hr style="border-color: #444; width: 100%; margin: 4px 0;">
      <button id="fst-annotator-btn-toggle" class="fst-annotator-btn">Mode Inspect: OFF</button>
      <button id="fst-annotator-btn-view-md" class="fst-annotator-btn success">View Markdown Report</button>
      <button id="fst-annotator-btn-close-panel" class="fst-annotator-btn secondary">Close Panel</button>
    </div>
  `;

    const notePopup = document.createElement('div');
    notePopup.id = 'fst-annotator-note-popup';
    notePopup.className = 'fst-annotator-ui fst-annotator-modal';
    notePopup.innerHTML = `
    <div class="title" id="fst-annotator-popup-title">Anotasi Elemen</div>
    <textarea id="fst-annotator-note" placeholder="Tulis instruksi anotasi di sini..." style="height: 100px;"></textarea>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="fst-annotator-btn-cancel-note" class="fst-annotator-btn secondary">Cancel</button>
      <button id="fst-annotator-btn-save-release-note" class="fst-annotator-btn" style="background: #f59e0b;">Save & Release</button>
      <button id="fst-annotator-btn-save-note" class="fst-annotator-btn success">Save Note</button>
    </div>
  `;

    const mdPopup = document.createElement('div');
    mdPopup.id = 'fst-annotator-md-popup';
    mdPopup.className = 'fst-annotator-ui fst-annotator-modal';
    mdPopup.innerHTML = `
    <div class="title">Markdown Report</div>
    <textarea id="fst-annotator-md-result" readonly style="height: 250px;"></textarea>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="fst-annotator-btn-close-md" class="fst-annotator-btn secondary">Close</button>
      <button id="fst-annotator-btn-copy-md" class="fst-annotator-btn success">Copy to Clipboard</button>
    </div>
  `;

    // --- SPA PERSISTENCE ---
    const ensureUI = () => {
        if (!document.body) return;
        const elements = [badge, trigger, panel, notePopup, mdPopup];
        elements.forEach(el => {
            if (!document.body.contains(el)) document.body.appendChild(el);
        });
        if (!document.head.contains(style)) document.head.appendChild(style);
    };

    let currentBody = document.body;
    const uiObserver = new MutationObserver(() => ensureUI());
    
    // Interval check as fallback for full body replacement
    setInterval(() => {
        if (currentBody !== document.body) {
            uiObserver.disconnect();
            currentBody = document.body;
            if (currentBody) uiObserver.observe(currentBody, { childList: true });
        }
        ensureUI();
    }, 1000);

    ensureUI();
    if (currentBody) uiObserver.observe(currentBody, { childList: true });

    // --- 4. CORE LOGIC & EVENT HANDLERS ---

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;

        handle.onmousedown = (e) => {
            if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            e.preventDefault();
            isDragging = false;
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };
        function elementDrag(e) {
            isDragging = true;
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.bottom = "auto";
            element.style.right = "auto";
        }
        function closeDragElement(e) {
            document.onmouseup = null;
            document.onmousemove = null;
            if (!isDragging && element.id === 'fst-annotator-trigger') {
                panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
            }
        }
    }

    makeDraggable(trigger, trigger);
    makeDraggable(panel, panel);

    const renderSessions = () => {
        const select = document.getElementById('fst-annotator-session-select');
        select.innerHTML = '';
        Object.values(DB.sessions).forEach(sess => {
            const opt = document.createElement('option');
            opt.value = sess.id;
            opt.textContent = `${sess.title} (${sess.annotations.length})`;
            if (sess.id === DB.activeSession) opt.selected = true;
            select.appendChild(opt);
        });
    };
    renderSessions();

    document.getElementById('fst-annotator-session-select').onchange = (e) => {
        DB.activeSession = e.target.value;
        saveDB(DB);
    };

    // LOGIKA BARU: Tambah sesi incremental tanpa prompt
    document.getElementById('fst-annotator-btn-new-sess').onclick = () => {
        const title = 'Session ' + DB.sessionCounter;
        DB.sessionCounter++; // Naikkan counter permanen
        const newId = 'sess_' + Date.now();

        DB.sessions[newId] = { id: newId, title, annotations: [] };
        DB.activeSession = newId;
        saveDB(DB);
        renderSessions();
    };

    document.getElementById('fst-annotator-btn-del-sess').onclick = () => {
        if (Object.keys(DB.sessions).length <= 1) return alert("Minimal harus ada 1 sesi.");
        if (confirm("Hapus sesi ini?")) {
            delete DB.sessions[DB.activeSession];
            DB.activeSession = Object.keys(DB.sessions)[0];
            saveDB(DB);
            renderSessions();
        }
    };

    document.getElementById('fst-annotator-btn-close-panel').onclick = () => panel.style.display = 'none';

    const getSelector = (el) => {
        if (!el || el.nodeType !== 1) return '';
        let selector = el.tagName.toLowerCase();
        if (el.id) return `${selector}#${el.id}`;
        if (el.className && typeof el.className === 'string') {
            selector += '.' + el.className.trim().replace(/\s+/g, '.');
        }
        return selector;
    };

    document.getElementById('fst-annotator-btn-toggle').onclick = () => {
        STATE.isDebugMode = !STATE.isDebugMode;
        const btn = document.getElementById('fst-annotator-btn-toggle');
        btn.innerText = `Mode Inspect: ${STATE.isDebugMode ? 'ON' : 'OFF'}`;
        btn.style.background = STATE.isDebugMode ? '#10b981' : '#3b82f6';
        if (!STATE.isDebugMode && STATE.hoveredElement) {
            STATE.hoveredElement.style.outline = '';
            badge.style.display = 'none';
        }
    };

    document.addEventListener('mouseover', (e) => {
        if (!STATE.isDebugMode || e.target.closest('.fst-annotator-ui')) return;
        STATE.hoveredElement = e.target;
        STATE.hoveredElement.style.outline = '2px dashed #ff00ff';
        STATE.hoveredElement.style.outlineOffset = '-2px';
        badge.textContent = getSelector(STATE.hoveredElement);
        badge.style.display = 'block';
    }, true);

    document.addEventListener('mousemove', (e) => {
        if (!STATE.isDebugMode) return;
        badge.style.top = `${e.clientY + 15}px`;
        badge.style.left = `${e.clientX + 15}px`;
    }, true);

    document.addEventListener('mouseout', (e) => {
        if (!STATE.isDebugMode || !STATE.hoveredElement) return;
        STATE.hoveredElement.style.outline = '';
        badge.style.display = 'none';
    }, true);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.fst-annotator-ui')) return;
        if (STATE.isReleasing) return; // Allow natural event to pass
        if (!STATE.isDebugMode) return;
        
        e.preventDefault();
        e.stopPropagation();

        STATE.pendingElement = e.target;
        addEventLog('CLICK', getSelector(e.target));
        STATE.isDebugMode = false;

        if (STATE.hoveredElement) STATE.hoveredElement.style.outline = '2px solid #ff00ff';
        badge.style.display = 'none';

        document.getElementById('fst-annotator-popup-title').innerText = `Target: ${getSelector(e.target)}`;
        document.getElementById('fst-annotator-note').value = '';
        notePopup.style.display = 'flex';
        document.getElementById('fst-annotator-note').focus();
    }, true);

    document.getElementById('fst-annotator-btn-cancel-note').onclick = () => {
        notePopup.style.display = 'none';
        if (STATE.hoveredElement) STATE.hoveredElement.style.outline = '';
        document.getElementById('fst-annotator-btn-toggle').click();
    };

    const saveCurrentNote = () => {
        const note = document.getElementById('fst-annotator-note').value;
        const selector = getSelector(STATE.hoveredElement);
        const session = getActiveSession();

        // Tangkap InnerText dari elemen jika ada (max 100 char)
        let elText = STATE.hoveredElement.innerText || '';
        if (elText.length > 100) elText = elText.substring(0, 100) + '...';

        // LOGIKA BARU: Simpan dengan URL
        session.annotations.push({
            url: window.location.href, // <--- Tambahan URL Path
            selector,
            innerText: elText.trim(),
            note,
            context: { network: STATE.logs.network.slice(-3), events: STATE.logs.events.slice(-3) }
        });

        saveDB(DB);
        renderSessions();

        notePopup.style.display = 'none';
        if (STATE.hoveredElement) STATE.hoveredElement.style.outline = '';
        document.getElementById('fst-annotator-btn-toggle').click();
    };

    document.getElementById('fst-annotator-btn-save-note').onclick = saveCurrentNote;

    document.getElementById('fst-annotator-btn-save-release-note').onclick = () => {
        saveCurrentNote();
        if (STATE.pendingElement) {
            STATE.isReleasing = true;
            STATE.pendingElement.click(); // Re-trigger normal click
            STATE.isReleasing = false;
            STATE.pendingElement = null;
        }
    };

    // LOGIKA BARU: Pemformatan Markdown yang rapi
    document.getElementById('fst-annotator-btn-view-md').onclick = () => {
        const session = getActiveSession();
        if (!session || session.annotations.length === 0) return alert('Sesi ini belum memiliki anotasi.');

        let md = `# AI Debugging Report\n**Session:** ${session.title}\n**Generated:** ${new Date().toLocaleString()}\n\n`;

        session.annotations.forEach((a, i) => {
            md += `### [Issue #${i + 1}] Target Element\n`;
            md += `- **URL:** ${a.url || 'Unknown'}\n`;
            md += `- **Selector:** \`${a.selector}\`\n`;
            if (a.innerText) md += `- **Element Text:** "${a.innerText}"\n`;

            md += `\n**Instruction / Note:**\n> ${a.note}\n\n`;

            // Ubah Event JSON ke Timeline 1, 2, 3
            if (a.context.events && a.context.events.length > 0) {
                md += `**User Journey (Before Issue):**\n`;
                a.context.events.forEach((ev, idx) => {
                    md += `${idx + 1}. [${ev.time}] **${ev.action}** -> \`${ev.details}\`\n`;
                });
                md += `\n`;
            }

            if (a.context.network && a.context.network.length > 0) {
                md += `**Recent Network API Logs:** \n\`\`\`json\n${JSON.stringify(a.context.network, null, 2)}\n\`\`\`\n`;
            }
            md += `---\n\n`;
        });

        document.getElementById('fst-annotator-md-result').value = md;
        mdPopup.style.display = 'flex';
    };

    document.getElementById('fst-annotator-btn-close-md').onclick = () => mdPopup.style.display = 'none';

    document.getElementById('fst-annotator-btn-copy-md').onclick = () => {
        const mdText = document.getElementById('fst-annotator-md-result').value;
        navigator.clipboard.writeText(mdText).then(() => {
            const btn = document.getElementById('fst-annotator-btn-copy-md');
            const originalText = btn.innerText;
            btn.innerText = "Copied! ✓";
            setTimeout(() => btn.innerText = originalText, 2000);
        });
    };

})();