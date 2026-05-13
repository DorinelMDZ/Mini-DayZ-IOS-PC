(function() {
    // FIX: Pull saved zoom from Local Storage so it persists across reloads!
    var currentZOOM = parseFloat(localStorage.getItem('mdz_saved_zoom')) || 1.0;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3.1;
    const STEP = 0.2;

    window.applyGameZoom = function(delta) {
        var rt = window.runtSCRIPT;
        if (!rt && typeof cr_getC2Runtime !== "undefined") rt = cr_getC2Runtime();
        if (!rt) return;

        currentZOOM += delta;
        if (currentZOOM < MIN_ZOOM) currentZOOM = MIN_ZOOM;
        if (currentZOOM > MAX_ZOOM) currentZOOM = MAX_ZOOM;
        
        // FIX: Save the new zoom level to memory every time it changes
        localStorage.setItem('mdz_saved_zoom', currentZOOM);

        try {
            if (rt.wj && rt.wj.autozoom) rt.wj.autozoom.ci = false;
            if (rt.Fs && rt.Fs.Map && rt.Fs.Map.ua) {
                var layers = rt.Fs.Map.ua;
                for (var i = 0; i < 51; i++) if (layers[i]) layers[i].scale = currentZOOM;
                if (layers[61]) layers[61].scale = currentZOOM;
                rt.redraw = true;
            }
        } catch(err) { console.error(err); }
    };

    function createZoomButtons() {
        if (document.getElementById('custom-zoom-ui')) return;

        const ui = document.createElement("div");
        ui.id = 'custom-zoom-ui';
        // Hidden by default!
        // Changed to display:none by default so it doesn't show up on the main menu. default is translateY(-50%) //
        // Removed display:none, added opacity, visibility, and a smooth transition
        ui.style = "position:fixed; top:30%; left:50px; transform:translateY(-105%); z-index:999999; display:flex; flex-direction:column; gap:20px; opacity:0; visibility:hidden; transition: opacity 0.4s ease, visibility 0.4s ease;";
        
        // Removed pointer-events:auto so it inherits from the parent properly
        const btnStyle = "width:25px; height:25px; cursor:pointer; background:transparent; border:none; display:flex; align-items:center; justify-content:center; transition: transform 0.1s;";
        
        ui.innerHTML = 
            `<div id="zoom-in-btn" style="${btnStyle}">
                <img src="images/zoom_in-sheet0.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.innerText='+'">
            </div>
            <div id="zoom-out-btn" style="${btnStyle}">
                <img src="images/zoom_out-sheet0.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.innerText='-'">
            </div>`;
        document.body.appendChild(ui);

        var zoomInterval = null;
        const HOLD_SPEED = 50;

        function startZoom(delta) {
            window.applyGameZoom(delta);
            zoomInterval = setInterval(function() { window.applyGameZoom(delta); }, HOLD_SPEED);
        }

        function stopZoom() { if (zoomInterval) { clearInterval(zoomInterval); zoomInterval = null; } }

        var btnIn = document.getElementById('zoom-in-btn');
        btnIn.addEventListener('mousedown', function() { this.style.transform = 'scale(0.9)'; startZoom(STEP); });
        btnIn.addEventListener('mouseup', function() { this.style.transform = 'scale(1)'; stopZoom(); });
        btnIn.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; stopZoom(); });
        btnIn.addEventListener('touchstart', function(e) { e.preventDefault(); this.style.transform = 'scale(0.9)'; startZoom(STEP); });
        btnIn.addEventListener('touchend', function(e) { e.preventDefault(); this.style.transform = 'scale(1)'; stopZoom(); });

        var btnOut = document.getElementById('zoom-out-btn');
        btnOut.addEventListener('mousedown', function() { this.style.transform = 'scale(0.9)'; startZoom(-STEP); });
        btnOut.addEventListener('mouseup', function() { this.style.transform = 'scale(1)'; stopZoom(); });
        btnOut.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; stopZoom(); });
        btnOut.addEventListener('touchstart', function(e) { e.preventDefault(); this.style.transform = 'scale(0.9)'; startZoom(-STEP); });
        btnOut.addEventListener('touchend', function(e) { e.preventDefault(); this.style.transform = 'scale(1)'; stopZoom(); });

        // ==========================================
        // IN-GAME DETECTION LOGIC 
        //Зачем отображать кнопки масштабирования в главном меню?
        // ==========================================
        const _sTag = String.fromCharCode(83); 
        let wasActive = false; // FIX: Memory tracker to detect map entry
        
        setInterval(() => {
            let _sys = typeof cr_getC2Runtime !== "undefined" ? cr_getC2Runtime() : window.runtSCRIPT;
            if (!_sys || !_sys[_sTag]) return;

            let pType = _sys[_sTag].find(t => t.name === "t181");
            let isActive = false;
            
            if (pType) {
                let pArray = pType.instances || Object.values(pType).find(v => Array.isArray(v) && v[0] && typeof v[0].uid === 'number') || [];
                // CRITICAL FIX: Cross-reference against active UID Registry to filter out pooled "Ghosts"
                if (_sys.jg) pArray = pArray.filter(p => p && _sys.jg[p.uid.toString()]);
                if (pArray.length > 0) isActive = true;
            }

            // Toggle opacity and visibility for the fade effect
            if (isActive) {
                // FIX: If we just loaded in from the main menu, force the engine to apply the saved zoom!
                if (!wasActive) {
                    window.applyGameZoom(0);
                }
                ui.style.opacity = "1";
                ui.style.visibility = "visible";
            } else {
                ui.style.opacity = "0";
                ui.style.visibility = "hidden";
            }
            
            wasActive = isActive; // Update the memory tracker
        }, 500); 

        // ==========================================
        // NIGHT FILTER (t240) PERFECT SYNC OVERRIDE
        // ==========================================
        function nukeNightFilter() {
            // Ties the loop directly to the screen's 60fps render cycle (zero delay, zero CPU lag)
            requestAnimationFrame(nukeNightFilter); 
            
            if (currentZOOM >= 1.0) return; 

            let _sys = typeof cr_getC2Runtime !== "undefined" ? cr_getC2Runtime() : window.runtSCRIPT;
            if (!_sys || !_sys[_sTag]) return;

            let activeT240s = [];
            if (_sys.jg) {
                Object.values(_sys.jg).forEach(inst => {
                    if (inst && inst.type && inst.type.name === 't240') activeT240s.push(inst);
                });
            } else {
                let nightFilter = _sys[_sTag].find(t => t.name === 't240');
                if (nightFilter) {
                    let arr = nightFilter.instances || Object.values(nightFilter).find(v => Array.isArray(v) && v.length > 0 && typeof v[0].uid === 'number');
                    if (arr) activeT240s = arr;
                }
            }

            activeT240s.forEach(inst => {
                // THE HARD LOCK: We rewrite the object's DNA. 
                // If the engine tries to set the size, it ignores it. It ALWAYS returns 15000.
                if (!inst._mdz_locked) {
                    Object.defineProperty(inst, 'width', { get: () => 15000, set: () => {} });
                    Object.defineProperty(inst, 'height', { get: () => 15000, set: () => {} });
                    inst._mdz_locked = true;
                }
                
                // Force WebGL update
                if (typeof inst.set_bbox_changed === 'function') {
                    inst.set_bbox_changed();
                }
            });
        }
        
        // Start the optimized render loop
        requestAnimationFrame(nukeNightFilter);
    }

    if (document.readyState === "complete") createZoomButtons();
    else window.addEventListener("load", createZoomButtons);
})();
// I fixed this code, you might wanna add make this hard coded in-game .ru: Я немного подправил этот код, возможно, вам стоит добавить это в data.js в качестве жестко заданного значения.
