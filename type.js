 

    const keyMap = [
        [{e:'`',h:'~'},{e:'1',h:'!'},{e:'2',h:'@'},{e:'3',h:'#'},{e:'4',h:'$'},{e:'5',h:'%'},{e:'6',h:'^'},{e:'7',h:'&'},{e:'8',h:'*'},{e:'9',h:'('},{e:'0',h:')'},{e:'-',h:'_'},{e:'=',h:'+'},{e:'BS',w:50}],
        [{e:'Tab',w:50},{e:'q',h:'Q'},{e:'w',h:'W'},{e:'e',h:'E'},{e:'r',h:'R'},{e:'t',h:'T'},{e:'y',h:'Y'},{e:'u',h:'U'},{e:'i',h:'I'},{e:'o',h:'O'},{e:'p',h:'P'},{e:'[',h:'{'},{e:']',h:'}'},{e:'\\',h:'|'}],
        [{e:'Caps',w:60},{e:'a',h:'A'},{e:'s',h:'S'},{e:'d',h:'D'},{e:'f',h:'F'},{e:'g',h:'G'},{e:'h',h:'H'},{e:'j',h:'J'},{e:'k',h:'K'},{e:'l',h:'L'},{e:';',h:':'},{e:"'",h:'"'},{e:'Enter',w:70}],
        [{e:'Shift',w:70},{e:'z',h:'Z'},{e:'x',h:'X'},{e:'c',h:'C'},{e:'v',h:'V'},{e:'b',h:'B'},{e:'n',h:'N'},{e:'m',h:'M'},{e:',',h:'<'},{e:'.',h:'>'},{e:'/',h:'?'},{e:'Shift',w:70}],
        [{e:'Space',w:250, c:'Space'}]
    ];

    // --- STATE ---
    let currIdx = 0;
    let timerInt = null;
    let seconds = 0;
    let isRunning = false;
    let isFinished = false;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playTone(type) {
        if(document.getElementById('soundSetting').value === 'off') return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (type === 'correct') {
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.type = 'sine'; gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.05);
        } else {
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.type = 'sawtooth'; gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        }
    }

    // --- INIT ---
    function init() {
        renderKeyboard();
        loadSettings(true); // true means use default if no save found
        loadLesson();
        applyLockState();
        const inp = document.getElementById('input-box');
        inp.addEventListener('input', handleInput);
        inp.addEventListener('keydown', handleKeyLogic);
        inp.addEventListener('keyup', (e) => visualKey(e.code, false));
    }

    function toggleLock() {
        isLocked = !isLocked;
        applyLockState();
    }

    function applyLockState() {
        const btn = document.getElementById('lockBtn');
        const selects = document.querySelectorAll('.toolbar select');
        selects.forEach(s => s.disabled = isLocked);
        btn.innerText = isLocked ? "🔒 Locked" : "🔓 Unlock";
        btn.style.background = isLocked ? "#ef4444" : "#64748b";
    }

    function saveAndApply() {
        if(isLocked) return;
        const settings = {
            highlight: document.getElementById('highlightSetting').value,
            jump: document.getElementById('jumpSetting').value,
            spacing: document.getElementById('spacingSetting').value,
            scroll: document.getElementById('scrollSetting').value,
            bs: document.getElementById('bsSetting').value,
            kb: document.getElementById('kbSetting').value,
            sound: document.getElementById('soundSetting').value,
            timeLimit: document.getElementById('timeSetting').value
        };
        localStorage.setItem('krutiSettings', JSON.stringify(settings));
        applySettings(settings);
    }

    function loadSettings(useDefault = false) {
        const saved = localStorage.getItem('krutiSettings');
        const s = saved ? JSON.parse(saved) : DEFAULT_CONFIG;
        
        Object.keys(s).forEach(key => {
            let id = key === 'timeLimit' ? 'timeSetting' : key + 'Setting';
            let el = document.getElementById(id);
            if(el) el.value = s[key];
        });
        applySettings(s);
    }

    function applySettings(s) {
        const src = document.getElementById('source-text');
        src.className = `text-panel mode-${s.highlight}`;
        const root = document.getElementById('kruti-exam-engine');
        if(s.spacing === 'compact') { root.style.setProperty('--char-spacing', '0px'); root.style.setProperty('--min-char-width', '5px'); }
        else if(s.spacing === 'wide') { root.style.setProperty('--char-spacing', '4px'); root.style.setProperty('--min-char-width', '8px'); }
        else { root.style.setProperty('--char-spacing', '0px'); root.style.setProperty('--min-char-width', '0px'); }
        document.getElementById('kbContainer').classList.toggle('hidden', s.kb === 'hide');
    }

    function renderKeyboard() {
        const kb = document.getElementById('keyboard'); kb.innerHTML='';
        keyMap.forEach(row => {
            const r = document.createElement('div'); r.className='row';
            row.forEach(k => {
                const d = document.createElement('div'); 
                d.className = `key ${k.e==='Space'?'space':''} ${k.e==='Shift'?'shift':''}`;
                if(k.w) d.style.width = k.w+'px';
                if(k.h) d.innerHTML = `<span class="eng">${k.e.toUpperCase()}</span><span class="hi">${k.h}</span><span style="font-family:'MyKruti';position:absolute;bottom:-6px;">${k.e}</span>`;
                else d.innerText = k.e;
                let code = k.c || (k.e.length===1 ? (isNaN(k.e)?'Key'+k.e.toUpperCase():'Digit'+k.e) : k.e);
                if(k.e==='BS') code='Backspace'; if(k.e==='Tab') code='Tab'; if(k.e==='Enter') code='Enter'; if(k.e==='Shift') code='ShiftLeft';
                const sym = {';':'Semicolon', "'":'Quote', ',':'Comma', '.':'Period', '/':'Slash', '[':'BracketLeft', ']':'BracketRight', '\\':'Backslash', '-':'Minus', '=':'Equal'};
                if(sym[k.e]) code = sym[k.e];
                d.dataset.code = code; r.appendChild(d);
            });
            kb.appendChild(r);
        });
    }

     function loadLesson() {
    // पहले टाइटल बदलें
    document.getElementById('lessonTitle').innerText = lessons[currIdx].name;
    const txt = lessons[currIdx].text;
    const src = document.getElementById('source-text');
    
    // पहले HTML खाली करें और नए अक्षर (spans) बनाएं
    src.innerHTML = '';
    txt.split('').forEach(c => {
        const s = document.createElement('span');
        s.innerHTML = c === ' ' ? '&nbsp;' : c; 
        src.appendChild(s);
    });

    // अब जब अक्षर बन चुके हैं, तब resetTest को कॉल करें
    resetTest();
}
    function handleInput(e, silent = false) {
        if(isFinished) return;
        const inp = document.getElementById('input-box');
        if(!isRunning && inp.value.length > 0) startTimer();
        const val = inp.value;
        const txt = lessons[currIdx].text;
        const len = val.length;
        if(e && !silent && len > 0) {
            const lastChar = val[len-1]; const targetChar = txt[len-1];
            if(lastChar === targetChar) playTone('correct'); else playTone('error');
        }
        if(len >= txt.length) { finishTest(); }
        const spans = document.getElementById('source-text').querySelectorAll('span');
        const mode = document.getElementById('highlightSetting').value;
        spans.forEach(s => { s.className = ''; });
        for(let i=0; i<len; i++) { if(i < txt.length) spans[i].classList.add(val[i] === txt[i] ? 'correct' : 'incorrect'); }
        if(len < txt.length) {
            const currSpan = spans[len]; currSpan.classList.add('current');
            highlightKeyGuide(txt[len]);
            if(mode === 'word') {
                let start = len; while(start>0 && txt[start-1]!==' ') start--;
                let end = len; while(end<txt.length && txt[end]!==' ') end++;
                for(let k=start; k<end; k++) spans[k].classList.add('word-active');
            }
            if(document.getElementById('scrollSetting').value === 'on') {
                const box = document.getElementById('source-text');
                if(currSpan.offsetTop > box.scrollTop + box.clientHeight - 60) box.scrollTop = currSpan.offsetTop - 50;
                else if(currSpan.offsetTop < box.scrollTop) box.scrollTop = currSpan.offsetTop - 50;
            }
        }
        updateLiveStats(len, txt);
    }

    function handleKeyLogic(e) {
        if(isFinished) { e.preventDefault(); return; }
        visualKey(e.code, true);
        if(e.code === 'Tab') e.preventDefault();
        const inp = document.getElementById('input-box');
        const txt = lessons[currIdx].text;
        if(inp.value.length >= txt.length && e.code !== 'Backspace') { e.preventDefault(); return; }
        if(e.code === 'Space' && document.getElementById('jumpSetting').value === 'on') {
            e.preventDefault(); const currLen = inp.value.length;
            let nextSpace = txt.indexOf(' ', currLen);
            if(nextSpace === -1) inp.value += ' ';
            else { let pad = ""; for(let i = currLen; i <= nextSpace; i++) pad += " "; inp.value += pad; }
            handleInput({inputType: 'insertText'});
        }
        if(e.code === 'Backspace') {
            const bs = document.getElementById('bsSetting').value;
            if(bs === 'off') { e.preventDefault(); return; }
            if(bs === 'word' && inp.value.length > 0 && inp.value[inp.value.length-1] === ' ') e.preventDefault();
        }
    }

    function startTimer() {
        isRunning = true; seconds = 0;
        const limit = parseInt(document.getElementById('timeSetting').value);
        timerInt = setInterval(() => {
            seconds++;
            let displaySec = limit > 0 ? limit - seconds : seconds;
            if(limit > 0 && displaySec <= 0) { displaySec = 0; finishTest(); }
            const m = Math.floor(displaySec/60).toString().padStart(2,'0');
            const s = (displaySec%60).toString().padStart(2,'0');
            const timerEl = document.getElementById('timer');
            timerEl.innerText = `${m}:${s}`;
            if(limit > 0 && displaySec < 10) timerEl.classList.add('warning');
        }, 1000);
    }

    function finishTest() {
        if(isFinished) return;
        isFinished = true; isRunning = false;
        clearInterval(timerInt);
        const inp = document.getElementById('input-box');
        inp.blur(); inp.classList.add('disabled');
        showResult();
    }
function getWordCount(inputValue) {
    const mode = document.getElementById('modeSetting').value;
    if (mode === 'char') {
        // Standard: हर 5 अक्षर एक शब्द (International Standard)
        return inputValue.length / 5;
    } else {
        // Actual: स्पेस के आधार पर असली शब्दों की गिनती
        const trimmed = inputValue.trim();
        return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    }
}
     function updateLiveStats(len, txt) {
    if(seconds < 1) return;
    const val = document.getElementById('input-box').value;
    const mode = document.getElementById('modeSetting').value;
    
    // शब्दों की गिनती
    const wordCount = getWordCount(val);
    const wpm = Math.round(wordCount / (seconds / 60));
    
    // गलतियाँ गिनना
    let err = 0;
    for(let i=0; i<len; i++) if(val[i] !== txt[i]) err++;
    const acc = len > 0 ? Math.floor(((len - err) / len) * 100) : 100;

    // UI अपडेट
    document.getElementById('speed-label').innerText = mode === 'char' ? 'WPM (Std)' : 'WPM (Act)';
    document.getElementById('wpm').innerText = wpm;
    document.getElementById('acc').innerText = acc + '%';
    
    // अगर आपने पिछले स्टेप में word-count वाला span बनाया है:
    if(document.getElementById('word-count')) {
        document.getElementById('word-count').innerText = Math.floor(wordCount);
    }
}

 function showResult() {
    const inpValue = document.getElementById('input-box').value;
    const sourceText = lessons[currIdx].text;
    
    // --- 1. शब्दों की गणना (Word Logic) ---
    // trim() इस्तेमाल किया ताकि शुरू और अंत के फालतू स्पेस हट जाएं
    const typedWords = inpValue.trim().split(/\s+/);
    const sourceWords = sourceText.trim().split(/\s+/);
    
    let correctWordsCount = 0;
    let wrongWordsCount = 0;

    // अगर इनपुट खाली नहीं है तभी शब्द गिनें
    if (inpValue.trim() !== "") {
        typedWords.forEach((word, index) => {
            if (index < sourceWords.length) {
                if (word === sourceWords[index]) {
                    correctWordsCount++;
                } else {
                    wrongWordsCount++;
                }
            }
        });
    }

    // --- 2. अक्षरों और गलतियों की गणना (Letter Logic) ---
    let letterErrors = 0;
    for(let i = 0; i < inpValue.length; i++) {
        if(i < sourceText.length && inpValue[i] !== sourceText[i]) {
            letterErrors++;
        }
    }

    // --- 3. स्पीड और एक्यूरेसी (WPM & Accuracy) ---
    const timeMin = seconds / 60;
    // Standard WPM: (कुल अक्षर / 5) / समय
    const wpm = timeMin > 0 ? Math.round((inpValue.length / 5) / timeMin) : 0;
    const acc = inpValue.length > 0 ? Math.floor(((inpValue.length - letterErrors) / inpValue.length) * 100) : 0;

    // --- 4. UI अपडेट करें (Modal display) ---
    document.getElementById('res-wpm').innerText = wpm + ' WPM';
    document.getElementById('res-acc').innerText = acc + '%';
    document.getElementById('res-err').innerText = letterErrors; // कुल गलत अक्षर
    document.getElementById('res-time').innerText = seconds + 's';
    document.getElementById('res-key').innerText = inpValue.length;
    
    // अगर आपने HTML में ये IDs बनाई हैं तो ये भी अपडेट होंगी:
    if(document.getElementById('res-cor-words')) 
        document.getElementById('res-cor-words').innerText = correctWordsCount;
    if(document.getElementById('res-err-words')) 
        document.getElementById('res-err-words').innerText = wrongWordsCount;

    document.getElementById('resultModal').style.display = 'flex';

    // --- 5. हिस्ट्री में सेव करें (Saving to History) ---
    const history = JSON.parse(localStorage.getItem('typingHistory') || '[]');
    history.unshift({
        date: new Date().toLocaleDateString(),
        wpm: wpm,
        acc: acc,
        corWords: correctWordsCount, // सही शब्द
        errWords: wrongWordsCount,   // गलत शब्द
        errChar: letterErrors        // गलत अक्षर
    });

    // सिर्फ टॉप 50 रिकॉर्ड रखें और सेव करें
    localStorage.setItem('typingHistory', JSON.stringify(history.slice(0, 50)));
}

   function showHistory() {
    const history = JSON.parse(localStorage.getItem('typingHistory') || '[]');
    const body = document.getElementById('historyBody');
    
    body.innerHTML = history.map(h => `
        <tr>
            <td>${h.date}</td>
            <td><b>${h.wpm}</b></td>
            <td>${h.acc}%</td>
            <td style="color:green">${h.corWords || 0}</td> <td style="color:red">${h.errWords || 0}</td>   <td>${h.errChar || 0}</td>
        </tr>
    `).join('');
    
    document.getElementById('historyModal').style.display = 'flex';
}

    function clearHistory() { if(confirm("Clear all records?")) { localStorage.removeItem('typingHistory'); showHistory(); } }
    function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }
    function closeModal() { document.getElementById('resultModal').style.display = 'none'; }

function resetTest() {
    clearInterval(timerInt);
    isRunning = false; isFinished = false; seconds = 0;
    const inp = document.getElementById('input-box');
    inp.value = ''; inp.classList.remove('disabled');
    
    const timerEl = document.getElementById('timer');
    timerEl.classList.remove('warning');
    const limit = parseInt(document.getElementById('timeSetting').value);
    
    if(limit > 0) {
        const m = Math.floor(limit/60).toString().padStart(2,'0');
        const s = (limit%60).toString().padStart(2,'0');
        timerEl.innerText = `${m}:${s}`;
    } else { timerEl.innerText = '00:00'; }

    document.getElementById('wpm').innerText = '0';
    document.getElementById('acc').innerText = '100%';

    const s = document.getElementById('source-text');
    s.scrollTop = 0;
    const spans = s.querySelectorAll('span');
    
    // सभी स्पैन से क्लास हटाएं
    spans.forEach(span => span.className = '');

    // सिर्फ तभी आगे बढ़ें जब स्पैन्स मौजूद हों
    if(spans.length > 0) {
        spans[0].classList.add('current');
        
        // Word highlight logic
        if(document.getElementById('highlightSetting').value === 'word') {
             const txt = lessons[currIdx].text;
             let end = 0; 
             while(end < txt.length && txt[end] !== ' ') end++;
             for(let i = 0; i < end; i++) {
                 if(spans[i]) spans[i].classList.add('word-active');
             }
        }
        
        const txt = lessons[currIdx].text;
        if(txt) highlightKeyGuide(txt[0]);
    }
}

    function changeLesson(dir) {
        const next = currIdx + dir;
        if(next >= 0 && next < lessons.length) { currIdx = next; loadLesson(); }
    }

    function highlightKeyGuide(char) {
        document.querySelectorAll('.key.guide').forEach(k=>k.classList.remove('guide'));
        let targetCode = null;
        if(char === ' ') targetCode = 'Space';
        else {
            for(let row of keyMap) {
                for(let k of row) {
                    if(k.h === char || k.e === char) {
                        targetCode = k.c || (k.e.length===1 ? (isNaN(k.e)?'Key'+k.e.toUpperCase():'Digit'+k.e) : k.e);
                        const sym = {';':'Semicolon', "'":'Quote', ',':'Comma', '.':'Period', '/':'Slash', '[':'BracketLeft', ']':'BracketRight', '\\':'Backslash', '-':'Minus', '=':'Equal'};
                        if(sym[k.e]) targetCode = sym[k.e];
                        break;
                    }
                }
                if(targetCode) break;
            }
        }
        if(targetCode) {
            const el = document.querySelector(`.key[data-code="${targetCode}"]`);
            if(el) el.classList.add('guide');
        }
    }
    
    function visualKey(code, active) {
        if(code==='ShiftRight') code='ShiftLeft';
        const k = document.querySelector(`.key[data-code="${code}"]`);
        if(k) active ? k.classList.add('active') : k.classList.remove('active');
    }

    function toggleFullScreen() {
        const elem = document.getElementById("kruti-exam-engine");
        if (!document.fullscreenElement) { elem.requestFullscreen().catch(err => { alert(`Error: ${err.message}`); }); } 
        else { document.exitFullscreen(); }
    }
  
  
  function changeLesson(dir) {
    // यहाँ अपना लिंक डालें जहाँ आप यूज़र को भेजना चाहते हैं
    const redirectURL = "https://www.testquestions.in"; 

    const next = currIdx + dir;

    // अगर "Next" दबाया है और यह आखिरी लेसन है
    if (dir === 1 && next >= lessons.length) {
        if(confirm("सभी टेस्ट पूरे हो गए हैं! क्या आप मुख्य वेबसाइट पर जाना चाहते हैं?")) {
            window.location.href = redirectURL;
        }
    } 
    // अगर अगला लेसन लिस्ट के अंदर है
    else if (next >= 0 && next < lessons.length) {
        currIdx = next;
        loadLesson();
    }
}

    init();
