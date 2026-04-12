
 <script>
  

    let rawData = [];
    let jobMaps = {}; 
    let dvMaps = {}; 

    let currentMasterList = [];
    let rangeStats = {}; 
    let displayList = []; 
    let listFilterMode = 'ALL'; 
    
    let currentPage = 1;
    const itemsPerPage = 12;

    // --- SECURITY GLOBALS ---
    let verifiedUserRoll = null;
    let verifiedUserRank = null;
    const GATE_API_BASE_URL = "https://fourth-grade-result-g6f7.onrender.com";

    // ✅ SYSTEM INITIALIZATION (Loads data first, hides loader, shows UI)
    async function init() {
        try {
            document.getElementById("loadText").innerText = "Downloading Core Merit Database...";
            const mainRes = await fetch(mainURL + "&t=" + Date.now());
            rawData = parseMainCSV(await mainRes.text());

            for (let i = 0; i < jobExams.length; i++) {
                if(jobExams[i].url) {
                    document.getElementById("loadText").innerText = `Syncing Job Filter: ${jobExams[i].name}...`;
                    try { const res = await fetch(jobExams[i].url + "&t=" + Date.now()); jobMaps[jobExams[i].id] = parseExclusionCSV(await res.text()); } 
                    catch(e) { console.warn("Skipped: " + jobExams[i].name); }
                }
            }
            for (let i = 0; i < dvLists.length; i++) {
                if(dvLists[i].url) {
                    document.getElementById("loadText").innerText = `Syncing DV Skip List: ${dvLists[i].name}...`;
                    try { const res = await fetch(dvLists[i].url + "&t=" + Date.now()); if(res.ok) dvMaps[dvLists[i].id] = parseExclusionCSV(await res.text()); } 
                    catch(e) { console.warn("DV Skip List not available yet"); }
                }
            }

            document.getElementById("loader").style.display = "none";
            document.getElementById("app").style.display = "block";
            renderToggles();
            
            // Note: processData() is NOT called here anymore until user verifies!

        } catch (error) { document.getElementById("loader").innerHTML = "<h2 style='color:red;'>⚠️ Network Error! Please Reload.</h2>"; }
    }

  
  
  
  
  
  
    // ✅ GATE CHECK LOGIC (Checks Roll + Displays Data + Checks Payment)
    async function checkGateAccess() {
        const roll = document.getElementById("gateRoll").value.trim();
        if(!roll) { alert("Please enter Roll Number first!"); return; }

        const btn = document.getElementById("gateCheckBtn");
        const err = document.getElementById("gateError");
        const paymentBox = document.getElementById("paymentDetailsBox");
        const payBtn = document.getElementById("gatePayBtn");
        const subtitle = document.getElementById("gateSubtitle");
        const infoBox = document.getElementById("userInfoDisplay");

        err.style.display = "none";

        // 1. Check if Roll exists in rawData
        let userData = rawData.find(r => r.roll === roll);
        if(!userData) {
            err.innerText = "❌ Roll Number not found in Merit List! Please check again.";
            err.style.display = "block";
            return;
        }

        // 2. Display User Data
      
      
      
      
        document.getElementById("uName").innerText = userData.name;
        document.getElementById("uFName").innerText = userData.fName;
        document.getElementById("uMName").innerText = userData.mName;
        document.getElementById("uRoll").innerText = userData.roll;
        document.getElementById("uCat").innerText = userData.cat;
        document.getElementById("uMarks").innerText = userData.marks;
        document.getElementById("uRank").innerText = userData.oRank;
        infoBox.style.display = "block";

        // Save Globals
        verifiedUserRoll = userData.roll;
        verifiedUserRank = userData.oRank;

        // Populate the Rank Input Field
        document.getElementById("f_fixed").value = verifiedUserRank;

        // 3. Check Payment Status via API
        btn.innerHTML = '⏳ Verifying Payment...';
        btn.disabled = true;

        try {
            const response = await fetch(`${GATE_API_BASE_URL}/api/check_roll/${roll}`);
            const data = await response.json();

            if (data.status === "success" && data.is_verified === true) {
                // ✅ PAYMENT MIL GAYA! Unlock Tool.
                btn.innerHTML = '✅ Access Granted!';
                btn.style.background = '#10b981';
                
                let processBtn = document.getElementById("processBtn");
                processBtn.disabled = false;
                processBtn.innerText = "⚡ PROCESS & ANALYZE MERIT";
                processBtn.style.animation = "pulse 2s infinite";
                document.getElementById("gateRoll").readOnly = true;

            } else {
                // ❌ PAYMENT NAHI HUA.
                btn.innerHTML = '🔓 Verify Roll No.';
                btn.disabled = false;
                
                paymentBox.style.display = "block"; 
                payBtn.style.display = "block"; 
                
                subtitle.innerText = "Payment required! Please enter Email ID for invoice & tracking.";
                subtitle.style.color = "#ef4444";
                subtitle.style.fontWeight = "bold";
            }
        } catch(e) {
            console.error("API Error:", e);
            btn.innerHTML = '🔓 Verify Roll No.';
            btn.disabled = false;
            err.innerText = "Server Error. Please try again later.";
            err.style.display = "block";
        }
    }

    // ✅ GATE PAYMENT LOGIC
    async function initiateGatePayment() {
        const roll = document.getElementById("gateRoll").value.trim();
        const email = document.getElementById("gateEmail").value.trim(); 
        
        if(!email) { alert("⚠️ Payment tracking ke liye Email ID zaroori hai!"); return; }

        const btn = document.getElementById("gatePayBtn");
        btn.innerHTML = '⏳ Generating Secure Link...';
        btn.disabled = true;

        try {
            const response = await fetch(`https://tqpay.onrender.com/api/create_payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roll_no: roll, name: email })
            });
            const data = await response.json();
            
            if(data.status === "success" && data.payment_url) {
                window.location.href = data.payment_url; 
            } else if(data.status === "already_paid") {
                alert("Wait! Our system shows you already paid. Unlocking now...");
                checkGateAccess(); 
            } else {
                alert("Gateway Error: " + data.message);
                btn.innerHTML = '💳 Pay ₹50 to Unlock';
                btn.disabled = false;
            }
        } catch(e) {
            alert("Payment Network Error. Please check your connection.");
            btn.innerHTML = '💳 Pay ₹50 to Unlock';
            btn.disabled = false;
        }
    }

    // 🔴 100% ORIGINAL PARSER (SubCat, Gender etc.)
    function parseMainCSV(csv) {
        let temp = [];
        const rows = csv.split(/\r?\n/);
        for (let i = 1; i < rows.length; i++) {
            let col = rows[i].split(',');
            if(col.length >= 10 && col[0]) {
                let rSub = col[7] ? col[7].trim().toUpperCase() : "";
                let subCat = "NONE";
                if(rSub.includes("LD")||rSub.includes("CP")) subCat = "LDCP";
                else if(rSub.includes("VI")||rSub.includes("BL")) subCat = "BLV";
                else if(rSub.includes("HI")) subCat = "HI";
                else if(rSub.includes("SP")) subCat = "SP";
                else if(rSub.includes("MI")||rSub.includes("MD")) subCat = "MIMD";
                else if(rSub.includes("WD")||rSub.includes("WID")) subCat = "WD";
                else if(rSub.includes("DV")||rSub.includes("DIV")) subCat = "DV";
                else if(rSub.includes("EX")||rSub.includes("SER")||rSub.includes("EXM")) subCat = "EXM";

                let cat = col[6].trim().toUpperCase().replace(/\./g, "");
                if(cat === "GEN" || cat === "UR") cat = "GENERAL";

                let gRaw = col[5] ? col[5].replace(/['"]/g, '').trim().charAt(0).toUpperCase() : 'M';
                if(gRaw !== 'F') gRaw = 'M';
                if(subCat === "WD" || subCat === "DV") gRaw = 'F';

                temp.push({
                    oRank: parseInt(col[0] || "999999"),
                    roll: col[2] ? col[2].replace(/[^0-9a-zA-Z]/g, '').trim() : "",
                    name: col[3] ? col[3].replace(/['"]/g, '').trim() : "",
                    fName: col[4] ? col[4].replace(/['"]/g, '').trim() : "",
                    mName: col[9] ? col[9].replace(/['"]/g, '').trim() : "N/A",
                    gender: gRaw,
                    cat: cat,
                    sub: subCat,
                    isTsp: (col[8]||"").toUpperCase().includes("YES"),
                    marks: parseFloat(col[10] || col[1] || 0)
                });
            }
        }
        return temp.sort((a,b) => a.oRank - b.oRank);
    }

    // 🔴 100% ORIGINAL MATCHING LOGIC
    function parseExclusionCSV(csv) {
        let maps = { rolls: new Map(), fullConcat: new Map(), basicConcat: new Map() };
        if(!csv) return maps;
        const rows = csv.split(/\r?\n/);
        for (let i = 1; i < rows.length; i++) {
            let col = rows[i].split(',');
            if (col.length < 1) continue;
            let r = "", origN = "", origF = "", origM = "";
            let textCols = [];
            for (let j = 0; j < col.length; j++) {
                let cell = col[j].replace(/['"]/g, '').trim();
                if (!cell) continue;
                if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cell) || /\d{4}-\d{2}-\d{2}/.test(cell)) continue;
                if (/^\d+\.\d+$/.test(cell) || /^\d{1,4}$/.test(cell)) continue;
                if (/^\d{5,10}$/.test(cell)) { if (!r) r = cell; continue; }
                let mixedMatch = cell.match(/^(\d{5,10})[-_\s]+(.+)$/);
                if (mixedMatch && !r) { r = mixedMatch[1]; let textPart = mixedMatch[2].trim(); if (/[a-zA-Z]/.test(textPart)) textCols.push(textPart); continue; }
                if (/[a-zA-Z]/.test(cell)) { let upper = cell.toUpperCase(); if (["M","F","OBC","GEN","GENERAL","SC","ST","EWS","MBC","YES","NO"].includes(upper)) continue; textCols.push(cell); }
            }
            origN = textCols[0] || ""; origF = textCols[1] || ""; origM = textCols[2] || "";
            let n = origN.toLowerCase().replace(/[^a-z]/g, ''); let f = origF.toLowerCase().replace(/[^a-z]/g, ''); let m = origM.toLowerCase().replace(/[^a-z]/g, '');
            let strFull = n + f + m; let strBasic = n + f;
            if (r.length >= 4) maps.rolls.set(r, r); 
            if (n.length >= 2 && f.length >= 2) {
                if (m.length >= 2) maps.fullConcat.set(strFull, { origN, origF, origM });
                if (!maps.basicConcat.has(strBasic)) maps.basicConcat.set(strBasic, []);
                maps.basicConcat.get(strBasic).push({ origN, origF, origM });
            }
        }
        return maps;
    }

    function renderToggles() {
        let jobHtml = "";
        jobExams.forEach((ex, idx) => {
            jobHtml += `<div class="toggle-box"><span>${ex.name}</span><label class="switch"><input type="checkbox" onchange="jobExams[${idx}].active=!jobExams[${idx}].active; processData();" ${ex.active ? 'checked' : ''}><span class="slider"></span></label></div>`;
        });
        document.getElementById("jobToggleGrid").innerHTML = jobHtml;

        let dvHtml = "";
        dvLists.forEach((dv, idx) => {
            dvHtml += `<div class="toggle-box"><span>${dv.name}</span><label class="switch"><input type="checkbox" onchange="dvLists[${idx}].active=!dvLists[${idx}].active; processData();" ${dv.active ? 'checked' : ''}><span class="slider dv-slider"></span></label></div>`;
        });
        document.getElementById("dvToggleGrid").innerHTML = dvHtml;
    }

    function setListMode(mode) {
        listFilterMode = mode;
        document.querySelectorAll('.btn-list-filter').forEach(b => b.className = 'btn-list-filter');
        let btn = document.getElementById(`btn_${mode}`);
        if(mode==='ALL') btn.classList.add('active-all');
        if(mode==='HONEST') btn.classList.add('active-honest');
        if(mode==='WASTER') btn.classList.add('active-waster');
        if(mode==='ABSENT') btn.classList.add('active-absent');
        filterAndRenderMasterTable();
    }

    function initStats() { return { M:0, F:0, WD:0, DV:0, EXM:0, LDCP:0, BLV:0, HI:0, SP:0, MIMD:0, Total:0 }; }

    // ✅ SMART DATA PROCESS LOGIC (With Anti-Hack)
    function processData() {
        // SECURITY CHECK
        if (!verifiedUserRank) {
            alert("⚠️ Please verify your Roll Number and complete payment first!");
            return;
        }

        const uiFixedRank = parseInt(document.getElementById("f_fixed").value);
        if (uiFixedRank !== verifiedUserRank) {
            alert("🚨 Rank Tampering Detected! Your Original Rank will be restored.");
            document.getElementById("f_fixed").value = verifiedUserRank;
            return; // Stop process
        }

        const customRank = parseInt(document.getElementById("f_custom").value) || 1;
        
        // Smart Min-Max Logic
        const minR = Math.min(customRank, verifiedUserRank);
        const maxR = Math.max(customRank, verifiedUserRank);

        const fArea = document.getElementById("f_area").value;
        const fCat = document.getElementById("f_cat").value;
        const fGender = document.getElementById("f_gender").value;
        const fSubcat = document.getElementById("f_subcat").value;

        currentMasterList = [];
        let newDynamicRank = 1;
        let globalActiveCount = 0;
        let globalRemovedCount = 0;
        
        // Exact Counters for the Mega Table (No Double Counting)
        let jobBreakdownStats = {};
        jobExams.forEach(ex => { if(ex.active) jobBreakdownStats[ex.name] = { total:0, honest:0, waster:0 }; });
        let multiJobKey = "🏆 Multiple Jobs (2+ Vacancies)"; 
        
        let globalNoJobSkip = 0; 
        rangeStats = { "NON-TSP": { Active: {}, Removed: {} }, "TSP": { Active: {}, Removed: {} } };

        rawData.forEach(s => {
            if(s.oRank < minR || s.oRank > maxR) return;
            
            let passArea = (fArea==="ALL") || (fArea==="TSP" && s.isTsp) || (fArea==="NON-TSP" && !s.isTsp);
            let passCat = (fCat==="ALL") || (s.cat===fCat);
            let passGender = (fGender==="ALL") || (s.gender===fGender);
            let passSubcat = (fSubcat==="ALL") || (fSubcat==="NONE" && s.sub==="NONE") || (fSubcat===s.sub);
            if(!(passArea && passCat && passGender && passSubcat)) return;

            let sN = s.name.toLowerCase().replace(/[^a-z]/g, ''); let sF = s.fName.toLowerCase().replace(/[^a-z]/g, ''); let sM = s.mName.toLowerCase().replace(/[^a-z]/g, '');
            let searchFull = sN + sF + sM; let searchBasic = sN + sF;
            
            s.matchDetails = []; s.isWarningMatch = false; s.hasOtherJob = false; s.isDvSkipped = false;
            let matchedJobNamesThisCandidate = new Set(); 

            // 1. Check Multiple DV Skip Lists
            dvLists.forEach(dv => {
                if(dv.active && dvMaps[dv.id]) {
                    let mapSet = dvMaps[dv.id];
                    if(s.roll && mapSet.rolls.has(s.roll)) { s.isDvSkipped = true; s.matchDetails.push({ exam: dv.name, type: 'dv', reason: `Matched by Roll: <span class="val">${mapSet.rolls.get(s.roll)}</span>` }); } 
                    else if(sM.length >= 1 && mapSet.fullConcat.has(searchFull)) { s.isDvSkipped = true; s.matchDetails.push({ exam: dv.name, type: 'dv', reason: `Perfect Name Match` }); } 
                    else if(mapSet.basicConcat.has(searchBasic)) {
                        let arr = mapSet.basicConcat.get(searchBasic);
                        if (arr.length === 1 && (arr[0].origM.toLowerCase().replace(/[^a-z]/g, '') === sM || sM === "")) { s.isDvSkipped = true; s.matchDetails.push({ exam: dv.name, type: 'dv', reason: `Name+Father Match` }); }
                    }
                }
            });

            // 2. Check Multiple Job Lists (ORIGINAL LOGIC)
            jobExams.forEach(ex => {
                if(ex.active && jobMaps[ex.id]) {
                    let mapSet = jobMaps[ex.id]; let foundHere = false;
                    if(s.roll && mapSet.rolls.has(s.roll)) { foundHere = true; s.matchDetails.push({ exam: ex.name, type: 'danger', reason: `Roll Match: <span class="val">${mapSet.rolls.get(s.roll)}</span>` }); } 
                    else if(sM.length >= 1 && mapSet.fullConcat.has(searchFull)) { foundHere = true; let d = mapSet.fullConcat.get(searchFull); s.matchDetails.push({ exam: ex.name, type: 'danger', reason: `Perfect Match: <span class="val">${d.origN}</span>` }); }
                    else if(mapSet.basicConcat.has(searchBasic)) {
                        let arr = mapSet.basicConcat.get(searchBasic);
                        if (arr.length > 1) { foundHere = true; s.isWarningMatch = true; s.matchDetails.push({ exam: ex.name, type: 'warn', reason: `⚠️ Duplicate Name Found` }); } 
                        else {
                            let mExcl = arr[0].origM.toLowerCase().replace(/[^a-z]/g, '');
                            if (mExcl === "" || sM === "") { foundHere = true; s.matchDetails.push({ exam: ex.name, type: 'danger', reason: `Name+Father Matched` }); } 
                            else if (mExcl !== sM) { foundHere = true; s.isWarningMatch = true; s.matchDetails.push({ exam: ex.name, type: 'warn', reason: `⚠️ Mother Name Mismatch` }); }
                        }
                    }
                    if(foundHere) { s.hasOtherJob = true; matchedJobNamesThisCandidate.add(ex.name); }
                }
            });

            // 3. REMOVE LOGIC
            s.isRemoved = s.hasOtherJob || s.isDvSkipped; 

            if(s.isRemoved) { 
                s.nRank = "-"; 
                globalRemovedCount++;
            } else { 
                s.nRank = newDynamicRank++; 
                globalActiveCount++; 
            }

            // 4. THE NO-DOUBLE-COUNTING LOGIC
            let matchedJobsArray = Array.from(matchedJobNamesThisCandidate);
            if (matchedJobsArray.length > 1) {
                if(!jobBreakdownStats[multiJobKey]) jobBreakdownStats[multiJobKey] = {total:0, honest:0, waster:0};
                jobBreakdownStats[multiJobKey].total++;
                if(s.isDvSkipped) jobBreakdownStats[multiJobKey].honest++;
                else jobBreakdownStats[multiJobKey].waster++;
            } else if (matchedJobsArray.length === 1) {
                let jName = matchedJobsArray[0];
                if(jobBreakdownStats[jName]) {
                    jobBreakdownStats[jName].total++;
                    if(s.isDvSkipped) jobBreakdownStats[jName].honest++;
                    else jobBreakdownStats[jName].waster++;
                }
            }

            // Absent with NO Job
            if(!s.hasOtherJob && s.isDvSkipped) { globalNoJobSkip++; }

            // 5. RESTORED CATEGORY STATS
            let areaKey = s.isTsp ? "TSP" : "NON-TSP";
            let statusKey = s.isRemoved ? "Removed" : "Active";
            if(!rangeStats[areaKey][statusKey][s.cat]) rangeStats[areaKey][statusKey][s.cat] = initStats();
            rangeStats[areaKey][statusKey][s.cat].Total++;
            if (["WD", "DV", "EXM", "LDCP", "BLV", "HI", "SP", "MIMD"].includes(s.sub)) {
                rangeStats[areaKey][statusKey][s.cat][s.sub]++;
            } else {
                rangeStats[areaKey][statusKey][s.cat][s.gender]++;
            }

            currentMasterList.push(s);
        });

        document.getElementById("countActive").innerText = globalActiveCount;
        document.getElementById("countRemoved").innerText = globalRemovedCount;

        renderMegaTable(jobBreakdownStats, globalNoJobSkip, multiJobKey);
        renderStatsDashboard(); 
        filterAndRenderMasterTable();
    }

    // 🔴 THE NEW MEGA TABLE RENDERING 🔴
    function renderMegaTable(stats, noJobSkipTotal, multiJobKey) {
        let html = "";
        let gTotal = 0, gHonest = 0, gWaster = 0;

        for(let job in stats) {
            if (job === multiJobKey) continue; 
            let t = stats[job].total; let h = stats[job].honest; let w = stats[job].waster;
            gTotal += t; gHonest += h; gWaster += w;
            html += `
            <tr>
                <td style="text-align:left; font-weight:700; color:var(--primary);">${job}</td>
                <td>${t}</td>
                <td style="color:#059669; font-weight:700; background:#ecfdf5;">${h}</td>
                <td style="color:#dc2626; font-weight:800; background:#fef2f2;">${w}</td>
                <td style="color:#94a3b8;">--</td>
            </tr>`;
        }

        if (stats[multiJobKey]) {
            let mt = stats[multiJobKey].total; let mh = stats[multiJobKey].honest; let mw = stats[multiJobKey].waster;
            gTotal += mt; gHonest += mh; gWaster += mw;
            html += `
            <tr style="background: #fffbeb;">
                <td style="text-align:left; font-weight:800; color:#b45309;">${multiJobKey}</td>
                <td style="font-weight:bold; color:#b45309;">${mt}</td>
                <td style="color:#059669; font-weight:800; background:#ecfdf5;">${mh}</td>
                <td style="color:#dc2626; font-weight:800; background:#fef2f2;">${mw}</td>
                <td style="color:#94a3b8;">--</td>
            </tr>`;
        }

        html += `
            <tr style="border-top: 2px solid var(--border-color);">
                <td style="text-align:left; font-weight:700; color:#5b21b6;">No Job Found (Only DV Skipped)</td>
                <td style="color:#94a3b8;">--</td>
                <td style="color:#94a3b8;">--</td>
                <td style="color:#94a3b8;">--</td>
                <td style="color:#7e22ce; font-weight:800; background:#ede9fe; font-size:1.1rem;">${noJobSkipTotal}</td>
            </tr>`;

        let realTotalRemoved = gTotal + noJobSkipTotal; 

        html += `
            <tr style="background: var(--bg-body); border-top: 3px solid var(--primary);">
                <td style="text-align:right; font-weight:800; text-transform:uppercase;">Grand Total Unique Candidates:</td>
                <td style="font-weight:800; font-size:1.1rem; color:var(--primary);">${gTotal}</td>
                <td style="color:#059669; font-weight:800; font-size:1.1rem;">${gHonest}</td>
                <td style="color:#dc2626; font-weight:800; font-size:1.1rem;">${gWaster}</td>
                <td style="color:#7e22ce; font-weight:800; font-size:1.1rem;">${noJobSkipTotal}</td>
            </tr>`;

        document.getElementById("breakdownTableBody").innerHTML = html;
    }

    // 🔴 RESTORED ORIGINAL CATEGORY DASHBOARD
    function renderStatsDashboard() {
        const statsBox = document.getElementById("statsDashboard");
        const statsContent = document.getElementById("statsContent");
        let html = "";
        const createTable = (title, dataObj, themeColor) => {
            if(Object.keys(dataObj).length === 0) return ''; 
            let colorCode = themeColor === 'success' ? '#10b981' : '#ef4444';
            let bgLight = themeColor === 'success' ? '#d1fae5' : '#fee2e2';
            let tHTML = `<div class="table-responsive" style="margin-bottom: 20px;">
                <div class="stats-title" style="border-bottom: 2px solid ${colorCode}; color: ${colorCode};"><span>${title}</span></div>
                <table class="stats-table">
                    <thead><tr style="background:#f8fafc;"><th style="text-align:left;">Category</th><th>M</th><th>F</th><th>WD</th><th>DV</th><th>EXM</th><th>LDCP</th><th>BLV</th><th>HI</th><th>SP</th><th>MIMD</th><th style="background:${bgLight}; color:${colorCode};">Total</th></tr></thead>
                    <tbody>`;
            for(let cat in dataObj) {
                let d = dataObj[cat];
                tHTML += `<tr><td style="text-align:left;"><b>${cat}</b></td><td>${d.M||'-'}</td><td>${d.F||'-'}</td><td>${d.WD||'-'}</td><td>${d.DV||'-'}</td><td>${d.EXM||'-'}</td><td>${d.LDCP||'-'}</td><td>${d.BLV||'-'}</td><td>${d.HI||'-'}</td><td>${d.SP||'-'}</td><td>${d.MIMD||'-'}</td><td style="font-weight:bold; background:#f8fafc;">${d.Total}</td></tr>`;
            }
            tHTML += `</tbody></table></div>`;
            return tHTML;
        };

        html += createTable('🟢 NON-TSP (Active Candidates)', rangeStats['NON-TSP'].Active, 'success');
        html += createTable('🔴 NON-TSP (Removed Candidates)', rangeStats['NON-TSP'].Removed, 'danger');
        html += createTable('🟢 TSP (Active Candidates)', rangeStats['TSP'].Active, 'success');
        html += createTable('🔴 TSP (Removed Candidates)', rangeStats['TSP'].Removed, 'danger');

        if(html === "") statsBox.style.display = "none";
        else { statsBox.style.display = "block"; statsContent.innerHTML = html; }
    }

    function filterAndRenderMasterTable() {
        if(listFilterMode === 'ALL') { displayList = currentMasterList; }
        else if(listFilterMode === 'HONEST') { displayList = currentMasterList.filter(s => s.hasOtherJob && s.isDvSkipped); }
        else if(listFilterMode === 'WASTER') { displayList = currentMasterList.filter(s => s.hasOtherJob && !s.isDvSkipped); }
        else if(listFilterMode === 'ABSENT') { displayList = currentMasterList.filter(s => !s.hasOtherJob && s.isDvSkipped); }

        currentPage = 1;
        renderMasterTable();
    }

    function renderMasterTable() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = displayList.slice(start, end);

        let html = "";
        pageData.forEach(s => {
            let rowCls = "row-active";
            if (s.isRemoved) {
                if(s.isDvSkipped && !s.hasOtherJob) rowCls = "row-skipped"; 
                else if(s.isWarningMatch) rowCls = "row-warning";
                else rowCls = "row-removed"; 
            }
            
            let statusHtml = "";
            if (s.isRemoved) {
                let alertHtml = "";
                if (s.hasOtherJob && !s.isDvSkipped) { alertHtml = `<div class="multi-alert">⚠️ SEAT WASTER (Attended DV)</div>`; } 
                else if (s.hasOtherJob && s.isDvSkipped) { alertHtml = `<div class="multi-alert" style="background: #059669; animation:none;">✅ HONEST (Job + DV Skipped)</div>`; }
                else if (!s.hasOtherJob && s.isDvSkipped) { alertHtml = `<div class="multi-alert" style="background: #7e22ce; animation:none;">🟣 ABSENT (No Job Match)</div>`; }

                let proofBoxesHtml = s.matchDetails.map(m => `
                    <div style="margin-bottom:6px;">
                        <span class="${m.type === 'dv' ? 'badge-skipped' : 'badge-exam'}">${m.exam}</span>
                        <div class="reason-box ${m.type}">${m.reason}</div>
                    </div>
                `).join("");
                statusHtml = alertHtml + proofBoxesHtml;
            } else {
                statusHtml = `<span class="badge badge-active">✔ Selected & Active</span>`;
            }

            let rankColor = s.isRemoved ? (s.isWarningMatch ? '#92400e' : '#ef4444') : 'var(--primary)';
            if(s.isDvSkipped && !s.hasOtherJob) { rankColor = 'var(--purple)'; }

            // Fixed nnRank -> nRank and ooRank -> oRank
            html += `
                <tr class="${rowCls}">
                    <td><b style="font-size:1.1rem; color:${rankColor};">${s.nRank === "-" ? "Removed" : "#" + s.nRank}</b></td>
                    <td>#${s.oRank}</td>
                    <td><b>${s.roll || 'N/A'}</b></td>
                    <td>
                        <div style="font-weight:700; color:var(--text-main); font-size:1rem;">${s.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">F: <b>${s.fName}</b> | M: <b>${s.mName}</b></div>
                    </td>
                    <td><b style="color:var(--primary);">${s.marks.toFixed(2)}</b></td>
                    <td>${statusHtml}</td>
                </tr>`;
        });

        document.getElementById("masterTableBody").innerHTML = html || `<tr><td colspan='6' style='text-align:center; padding:30px; font-weight:600; color:#64748b;'>No candidates match the selected filter (${listFilterMode}).</td></tr>`;
        document.getElementById("pageInfo").innerText = `Page ${currentPage} of ${Math.ceil(displayList.length / itemsPerPage) || 1} (Showing ${start + (pageData.length>0?1:0)} to ${Math.min(end, displayList.length)} of ${displayList.length})`;
        document.getElementById("btnPrev").disabled = currentPage === 1;
        document.getElementById("btnNext").disabled = end >= displayList.length;
    }

    function changePage(step) { currentPage += step; renderMasterTable(); }
  
  
  

    window.onload = init; // Start the loader and fetching immediately
</script>
