// ================== Utilities ==================
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const out = $('#output');
const preview = $('#preview');
const STORAGE_KEY = 'codeweb';

const escapeHtml = s =>
    String(s).replace(/[&<>"]/g, c => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;'
    }[c]
));

function log(msg, type='info'){
    const color = type==='error' ? 'var(--err)' : type==='warn' ? 'var(--warn)' : 'var(--brand)';
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.innerHTML = `<span style="color:${color}">[${time}]</span> ${escapeHtml(msg)}`;
    out.appendChild(line); out.scrollTop = out.scrollHeight;
}

function clearOut(){ out.innerHTML=''; }
$('#clearOut')?.addEventListener('click', clearOut);

// ================== ACE Editors (HTML/CSS/JS) ==================
function makeEditor(id, mode){

    const ed = ace.edit(id, {
        theme:'ace/theme/dracula',
        mode, tabSize:2, useSoftTabs:true, showPrintMargin:false, wrap:true
    });
    ed.session.setUseWrapMode(true);
    ed.commands.addCommand({
        name:'run', bindKey:{win:'Ctrl-Enter',mac:'Command-Enter'},
        exec(){ runWeb(false); }
    });
    ed.commands.addCommand({
        name:'save', bindKey:{win:'Ctrl-S',mac:'Command-S'},
        exec(){ saveProject(); }
    });
    return ed;
}

const ed_html = makeEditor('ed_html','ace/mode/html');
const ed_css = makeEditor('ed_css','ace/mode/css');
const ed_js = makeEditor('ed_js','ace/mode/javascript');
const ed_py = makeEditor('ed_py','ace/mode/python');
const ed_c = makeEditor('ed_c','ace/mode/c_cpp');
const ed_cpp = makeEditor('ed_cpp','ace/mode/c_cpp');
const ed_java = makeEditor('ed_java','ace/mode/java');

// ================== Tabs (robust + a11y) ==================
const TAB_ORDER = ['html','css','js','py','c','cpp','java'];
const wraps   = Object.fromEntries($$('#webEditors .editor-wrap').map(w => [w.dataset.pane, w]));
const editors = { html: ed_html, css: ed_css, js: ed_js, py: ed_py, c: ed_c, cpp: ed_cpp, java: ed_java };

function activePane(){
    const t = $('#webTabs .tab.active');
    return t ? t.dataset.pane : 'html';
}

function showPane(name){
    TAB_ORDER.forEach(k => { if(wraps[k]) wraps[k].hidden = (k !== name); });
    $$('#webTabs .tab').forEach(t => {
        const on = t.dataset.pane === name;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
    });
    requestAnimationFrame(() => {
        const ed = editors[name];
        if(ed && ed.resize){ ed.resize(true); ed.focus(); }
    });
}

$('#webTabs')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tab'); if(!btn) return;
    showPane(btn.dataset.pane);
});

$('#webTabs')?.addEventListener('keydown', (e)=>{
    const idx = TAB_ORDER.indexOf(activePane());
    if(e.key==='ArrowLeft' || e.key==='ArrowRight'){
        const delta = e.key==='ArrowLeft' ? -1 : 1;
        showPane(TAB_ORDER[(idx+delta+TAB_ORDER.length)%TAB_ORDER.length]);
        e.preventDefault();
    }
});

showPane('html');

// ================== Preview ==================
function buildWebSrcdoc(withTests=false){
    const html  = ed_html.getValue();
    const css   = ed_css.getValue();
    const js    = ed_js.getValue();
    const tests = ($('#testArea')?.value || '').trim();

    return `<!doctype html>
        <html lang="en" dir="ltr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <style>${css}\n</style>
        </head>

        <body>
            ${html}
            <script>
            try{
                ${js}
                ${withTests && tests ? `\n/* tests */\n${tests}` : ''}
            }catch(e){console.error(e)}<\/script>
        </body>
        </html>`;
}

function runWeb(withTests=false){
    preview.srcdoc = buildWebSrcdoc(withTests);
    log(withTests ? 'Run with tests.' : 'Web preview updated.');
}

async function runBackend(lang) {
    const code = editors[lang].getValue();

    log(`Running ${lang} code...`);

    const res = await fetch("https://coderunnerbackend-fmsf.onrender.com/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, code })
    });

    const data = await res.json();
    log(data.output || data.error || "No output");
}


let pyodide;

async function initPy() {
    pyodide = await loadPyodide();
    log("Python ready (Pyodide)");
}
initPy();

async function runPython() {
    try {
        const code = ed_py.getValue();

        // Execute the user's code while capturing stdout/stderr into a buffer
        // so prints are returned to JS. Avoid using the name `out` which
        // conflicts with the DOM `out` variable above.
        const wrapped = `import sys, io, traceback\n_buf = io.StringIO()\n_old_out = sys.stdout\n_old_err = sys.stderr\nsys.stdout = _buf\nsys.stderr = _buf\ntry:\n${code.split('\n').map(l => '    ' + l).join('\n')}\nexcept Exception:\n    traceback.print_exc()\nfinally:\n    sys.stdout = _old_out\n    sys.stderr = _old_err\n_buf.getvalue()`;

        log("Running python code...");
        const result = await pyodide.runPythonAsync(wrapped);
        if (result && String(result).trim()) log(String(result));
        else log("Done");
    } catch (e) {
        log(e.toString(), 'error');
    }
}

runBackend("c")
runBackend("cpp")
runBackend("java")

$('#runWeb')?.addEventListener('click', ()=>{
    const pane = activePane();
    if (pane === 'html' || pane === 'css' || pane === 'js')
        runWeb(false);
    else if (pane === 'py')
        runPython(); // pyodide
    else
        runBackend(pane); // c / cpp / java
});

$('#runTests')?.addEventListener('click', ()=>runWeb(true));

$('#openPreview')?.addEventListener('click', ()=>{
    const src = buildWebSrcdoc(false);
    const w = window.open('about:blank');
    w.document.open(); w.document.write(src); w.document.close();
});

// ================== Save / Load (Web-only) ==================
function projectJSON(){
    return {
        version: 1,
        kind: 'web-only',
        assignment: $('#assignment')?.value || '',
        test: $('#testArea')?.value || '',
        html: ed_html.getValue(),
        css: ed_css.getValue(),
        js: ed_js.getValue(),
        py: ed_py.getValue(),
        c: ed_c.getValue(),
        cpp: ed_cpp.getValue(),
        java: ed_java.getValue()
    };
}

function loadProject(obj){
    try{
        if($('#assignment')) $('#assignment').value = obj.assignment || '';
        if($('#testArea'))   $('#testArea').value   = obj.test || '';
        ed_html.setValue(obj.html || '', -1);
        ed_css.setValue(obj.css   || '', -1);
        ed_js.setValue(obj.js     || '', -1);
        ed_py.setValue(obj.py     || '', -1);
        ed_c.setValue(obj.c     || '', -1);
        ed_cpp.setValue(obj.cpp     || '', -1);
        ed_java.setValue(obj.java     || '', -1);
        log('Web project loaded.');
    }catch(e){ 
        log('Unable to load project: '+e, 'error'); 
    }
}

function setDefaultContent(){
    ed_html.setValue(`<!--Write you code here-->`, -1);
    ed_css.setValue(`/*Write you code here*/`, -1);
    ed_js.setValue(`// Write you code here`, -1);
    ed_py.setValue(`# Write you code here`, -1);
    ed_c.setValue(`// Write you code here`, -1);
    ed_cpp.setValue(`// Write you code here`, -1);
    ed_java.setValue(`// Write you code here, take file as Main.java`, -1);
}

function saveProject(){
    try{
        const data = JSON.stringify(projectJSON(), null, 2);
        localStorage.setItem(STORAGE_KEY, data);
        const blob = new Blob([data], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'codeweb.json';
        a.click();
        log('Saved locally and downloaded JSON file.');
    }catch(e){ 
        log('Unable to save: '+e, 'error'); 
    }
}

$('#saveBtn')?.addEventListener('click', saveProject);
$('#loadBtn')?.addEventListener('click', ()=> $('#openFile').click());
$('#openFile')?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    try{
        const obj = JSON.parse(await f.text()); loadProject(obj);
    }catch(err){ 
        log('Invalid project file', 'error'); 
    }
});

// ================== Initial load ==================
try{
    const cache = localStorage.getItem(STORAGE_KEY);
    if(cache){ 
        loadProject(JSON.parse(cache)); 
    }else { 
        setDefaultContent(); 
    }
}catch{ 
    setDefaultContent(); 
}

log('Code Editor ready');

function normalizeProject(raw){
    if (!raw || typeof raw !== 'object') throw new Error('Not an object');

    // accept old/new shapes; fall back to empty strings
    const html = typeof raw.html === 'string' ? raw.html : (raw.web && raw.web.html) || '';
    const css  = typeof raw.css  === 'string' ? raw.css  : (raw.web && raw.web.css ) || '';
    const js   = typeof raw.js   === 'string' ? raw.js   : (raw.web && raw.web.js  ) || '';
    const py   = typeof raw.py   === 'string' ? raw.py   : (raw.web && raw.web.py  ) || '';
    const c   = typeof raw.c   === 'string' ? raw.c   : (raw.web && raw.web.c  ) || '';
    const cpp   = typeof raw.cpp   === 'string' ? raw.cpp  : (raw.web && raw.web.cpp  ) || '';
    const java   = typeof raw.java   === 'string' ? raw.java   : (raw.web && raw.web.java  ) || '';
    return {
        version: 1,
        kind: 'web-only',
        assignment: typeof raw.assignment === 'string' ? raw.assignment : (raw.task || ''),
        test: typeof raw.test === 'string' ? raw.test: (raw.tests || ''),
        html, css, js, py, c, cpp, java
    };
}

function safeSetValue(id, val){
    const el = document.getElementById(id);
    if (el) {
        el.value = val; 
    }
    else { 
        log(`Warning: #${id} not found; skipped setting value`, 'warn'); 
    }
}

function loadProject(raw){
    const proj = normalizeProject(raw);
    safeSetValue('assignment', proj.assignment);
    safeSetValue('testArea',   proj.test);
    if (typeof ed_html?.setValue === 'function') ed_html.setValue(proj.html, -1);
    if (typeof ed_css?.setValue  === 'function') ed_css.setValue(proj.css, -1);
    if (typeof ed_js?.setValue   === 'function') ed_js.setValue(proj.js, -1);
    if (typeof ed_py?.setValue   === 'function') ed_py.setValue(proj.py, -1);
    if (typeof ed_c?.setValue   === 'function') ed_c.setValue(proj.c, -1);
    if (typeof ed_cpp?.setValue   === 'function') ed_cpp.setValue(proj.cpp, -1);
    if (typeof ed_java?.setValue   === 'function') ed_java.setValue(proj.java, -1);
    log('Project loaded.');
}

// ===== Initial restore (after DOM is parsed) =====
window.addEventListener('DOMContentLoaded', () => {
    try{
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            const obj = JSON.parse(cached);
            loadProject(obj);
        } else {
            if (!document.getElementById('assignment')) return;
        }
    }catch(e){
        log('Skipping auto-restore: ' + e, 'warn');
    }
});
