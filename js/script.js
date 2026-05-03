// Data loaded from data.js

const map = L.map('map', { zoomControl: false }).setView([39.0, 35.0], 6);
L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    subdomains: 'abc'
}).addTo(map);

// ===================== STATE =====================
let mode = 'circle';
let circles = [];
let points = [];
let currentResults = [];

// ===================== UTILS =====================
function toRad(x) { return x * Math.PI / 180; }
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===================== MODE =====================
function setMode(newMode) {
    mode = newMode;
    ['circle','point','pan'].forEach(m => {
        const btn = document.getElementById('btn-' + m);
        if (m === mode) {
            btn.style.background = '#3b82f6';
            btn.style.color = 'white';
        } else {
            btn.style.background = '#e5e7eb';
            btn.style.color = '#374151';
        }
    });
    if (mode === 'pan') map.dragging.enable(); else map.dragging.disable();
}

// ===================== COORDINATE INPUT =====================
function goToCoord() {
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    if (isNaN(lat) || isNaN(lng)) { alert('Geçerli koordinat girin!'); return; }
    map.setView([lat, lng], 13);
    L.marker([lat, lng]).addTo(map).bindPopup('Koordinat: ' + lat.toFixed(4) + ', ' + lng.toFixed(4)).openPopup();
}

function drawCircleAtCoord() {
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    if (isNaN(lat) || isNaN(lng)) { alert('Geçerli koordinat girin!'); return; }
    addCircle(L.latLng(lat, lng));
}

// ===================== MAP EVENTS =====================
map.on('click', function(e) {
    if (mode === 'circle') addCircle(e.latlng);
    else if (mode === 'point') addPoint(e.latlng);
});

map.on('mousemove', function(e) {
    document.getElementById('coordDisplay').textContent = e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4);
});

// ===================== CIRCLE / POINT =====================
function addCircle(latlng) {
    const rKm = parseFloat(document.getElementById('radiusInput').value) || 10;
    const circle = L.circle(latlng, { radius: rKm * 1000, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }).addTo(map);
    const marker = L.marker(latlng, { icon: L.divIcon({ className: 'custom-marker', iconSize: [12,12] }) }).addTo(map);
    marker.bindPopup('<b>Daire #' + (circles.length+1) + '</b><br>Merkez: ' + latlng.lat.toFixed(4) + ', ' + latlng.lng.toFixed(4) + '<br>Yarıçap: ' + rKm + ' km');

    const inside = [];
    districts.forEach(d => {
        const dist = haversine(latlng.lat, latlng.lng, d.center[0], d.center[1]);
        if (dist <= rKm) inside.push({ province: d.province, district: d.name, distance: dist.toFixed(2), lat: d.center[0], lng: d.center[1] });
    });
    inside.sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance));

    const data = { id: circles.length+1, latlng: latlng, radiusKm: rKm, circle: circle, marker: marker, districts: inside };
    circles.push(data);
    updateList();
    showResults(data);
}

function addPoint(latlng) {
    const marker = L.marker(latlng, { icon: L.divIcon({ className: 'custom-marker', iconSize: [12,12] }) }).addTo(map);
    marker.bindPopup('Nokta #' + (points.length+1) + '<br>' + latlng.lat.toFixed(4) + ', ' + latlng.lng.toFixed(4));
    points.push({ id: points.length+1, latlng: latlng, marker: marker });
}

// ===================== UI =====================
function updateList() {
    const list = document.getElementById('circlesList');
    document.getElementById('circleCount').textContent = circles.length;
    if (circles.length === 0) { list.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">Henüz daire çizilmedi</div>'; return; }
    list.innerHTML = circles.map(c => '<div class="circle-item" onclick="showResultsById(' + c.id + ')"><div style="display:flex;justify-content:space-between;"><div><div style="font-weight:600;font-size:13px;">⭕ Daire #' + c.id + '</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">Yarıçap: ' + c.radiusKm + ' km</div><div style="font-size:11px;color:#6b7280;">Merkez: ' + c.latlng.lat.toFixed(4) + ', ' + c.latlng.lng.toFixed(4) + '</div></div><div style="background:#dbeafe;color:#1e40af;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;">' + c.districts.length + ' ilçe</div></div></div>').join('');
}

function showResultsById(id) { const c = circles.find(x => x.id === id); if (c) showResults(c); }

function showResults(circleData) {
    currentResults = circleData.districts.map(d => ({ ...d, circleId: circleData.id, circleRadius: circleData.radiusKm, circleCenterLat: circleData.latlng.lat, circleCenterLng: circleData.latlng.lng }));
    const tbody = document.getElementById('resultsTable');
    document.getElementById('resultCount').textContent = currentResults.length + ' ilçe bulundu (Daire #' + circleData.id + ')';
    if (currentResults.length === 0) tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:#9ca3af;">Bu daire içinde ilçe bulunamadı</td></tr>';
    else tbody.innerHTML = currentResults.map((d,i) => '<tr><td>' + (i+1) + '</td><td style="font-weight:500;">' + d.province + '</td><td>' + d.district + '</td><td>' + d.distance + ' km</td><td style="font-family:monospace;font-size:11px;">' + d.lat.toFixed(4) + '</td><td style="font-family:monospace;font-size:11px;">' + d.lng.toFixed(4) + '</td></tr>').join('');
    document.getElementById('resultsModal').classList.add('active');
}

function closeModal() { document.getElementById('resultsModal').classList.remove('active'); }

function clearAll() {
    circles.forEach(c => { map.removeLayer(c.circle); map.removeLayer(c.marker); });
    points.forEach(p => map.removeLayer(p.marker));
    circles = []; points = []; updateList(); closeModal();
}

function undoLast() {
    if (circles.length > 0) { const last = circles.pop(); map.removeLayer(last.circle); map.removeLayer(last.marker); updateList(); }
    else if (points.length > 0) { const last = points.pop(); map.removeLayer(last.marker); }
}

// ===================== EXPORTS =====================
function exportExcel() {
    if (currentResults.length === 0 && circles.length === 0) { alert('Önce daire çizmelisiniz!'); return; }
    let data = currentResults.length > 0 ? currentResults : [];
    if (data.length === 0) circles.forEach(c => c.districts.forEach(d => data.push({ ...d, circleId: c.id, circleRadius: c.radiusKm, circleCenterLat: c.latlng.lat, circleCenterLng: c.latlng.lng })));

    const rows = [['Sıra','İl','İlçe','Uzaklık (km)','İlçe Enlem','İlçe Boylam','Daire No','Daire Yarıçap (km)','Daire Merkez Enlem','Daire Merkez Boylam']];
    data.forEach((d,i) => rows.push([i+1, d.province, d.district, d.distance, d.lat, d.lng, d.circleId, d.circleRadius, d.circleCenterLat, d.circleCenterLng]));

    // Simple CSV export (no external lib needed)
    let csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'harita_ilceler.csv'; a.click(); URL.revokeObjectURL(url);
}

function exportTXT() {
    if (currentResults.length === 0 && circles.length === 0) { alert('Önce daire çizmelisiniz!'); return; }
    let data = currentResults.length > 0 ? currentResults : [];
    if (data.length === 0) circles.forEach(c => c.districts.forEach(d => data.push({ ...d, circleId: c.id, circleRadius: c.radiusKm })));
    let txt = 'TURKIYE HARITA - ILCE LISTESI\n================================\n\n';
    data.forEach((d,i) => txt += (i+1) + '. ' + d.province + ' - ' + d.district + ' (Uzaklik: ' + d.distance + ' km | Koordinat: ' + d.lat.toFixed(4) + ',' + d.lng.toFixed(4) + ') [Daire #' + d.circleId + ']\n');
    txt += '\nToplam: ' + data.length + ' ilçe\n';
    const blob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'harita_ilceler.txt'; a.click(); URL.revokeObjectURL(url);
}

function exportImage() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.innerHTML = '<div style="text-align:center;"><div style="font-size:24px;margin-bottom:8px;">📸</div><div>Harita görüntüsü oluşturuluyor...</div></div>';

    // Hide UI elements temporarily for clean capture
    const sidebar = document.querySelector('.sidebar');
    const coordDisplay = document.getElementById('coordDisplay').parentElement;
    const modal = document.getElementById('resultsModal');

    const originalSidebarDisplay = sidebar.style.display;
    const originalCoordDisplay = coordDisplay.style.display;

    sidebar.style.display = 'none';
    coordDisplay.style.display = 'none';
    if (modal.classList.contains('active')) modal.classList.remove('active');

    // Expand map to full screen temporarily
    const mapDiv = document.getElementById('map');
    const originalMapLeft = mapDiv.style.left;
    mapDiv.style.left = '0';
    mapDiv.style.width = '100%';

    // Force map redraw
    map.invalidateSize();

    setTimeout(() => {
        html2canvas(mapDiv, {
            useCORS: true,
            allowTaint: true,
            scale: 2,
            backgroundColor: null,
            logging: false,
            width: mapDiv.offsetWidth,
            height: mapDiv.offsetHeight
        }).then(canvas => {
            // Restore UI
            sidebar.style.display = originalSidebarDisplay;
            coordDisplay.style.display = originalCoordDisplay;
            mapDiv.style.left = originalMapLeft;
            mapDiv.style.width = '';
            map.invalidateSize();
            loading.style.display = 'none';

            // Download
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
            link.download = 'harita_goruntusu_' + timestamp + '.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.error('Export error:', err);
            loading.style.display = 'none';

            // Restore UI on error
            sidebar.style.display = originalSidebarDisplay;
            coordDisplay.style.display = originalCoordDisplay;
            mapDiv.style.left = originalMapLeft;
            mapDiv.style.width = '';
            map.invalidateSize();

            alert('Harita görüntüsü oluşturulamadı. Lütfen tekrar deneyin.\nHata: ' + err.message);
        });
    }, 500);
}

function setPrintSize(w, h) {
    document.getElementById('printWidth').value = w;
    document.getElementById('printHeight').value = h;
}

function previewPrint() {
    printMapArcGIS(true);
}

// ===================== ARCGIS STYLE PRINT =====================
function printMapArcGIS(isPreview) {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.innerHTML = '<div style="text-align:center;"><div style="font-size:32px;margin-bottom:12px;">' + (isPreview ? '👁️' : '🖨️') + '</div><div style="font-size:16px;font-weight:bold;">' + (isPreview ? 'Önizleme hazırlanıyor...' : 'Harita çıktısı hazırlanıyor...') + '</div><div style="font-size:12px;color:#6b7280;margin-top:8px;">Lütfen bekleyin</div></div>';

    // Get all user settings
    const title = document.getElementById('printTitle').value || 'Harita';
    const subtitle = document.getElementById('printSubtitle').value || '';
    const pageW = parseInt(document.getElementById('printWidth').value) || 1200;
    const pageH = parseInt(document.getElementById('printHeight').value) || 800;
    const dpi = parseInt(document.getElementById('printDpi').value) || 300;
    const format = document.getElementById('printFormat').value;
    const margin = parseInt(document.getElementById('printMargin').value) || 30;
    const headerH = parseInt(document.getElementById('printHeaderH').value) || 60;

    const showScaleBar = document.getElementById('printScaleBar').checked;
    const showLegend = document.getElementById('printLegend').checked;
    const showCoords = document.getElementById('printCoords').checked;
    const showDate = document.getElementById('printDate').checked;
    const showNorth = document.getElementById('printNorthArrow').checked;
    const showBorder = document.getElementById('printBorder').checked;

    // Element positions (relative to map area)
    const scaleX = parseInt(document.getElementById('scaleX').value) || 30;
    const scaleY = parseInt(document.getElementById('scaleY').value) || -50;
    const legendX = parseInt(document.getElementById('legendX').value) || -150;
    const legendY = parseInt(document.getElementById('legendY').value) || -80;
    const northX = parseInt(document.getElementById('northX').value) || -40;
    const northY = parseInt(document.getElementById('northY').value) || 30;

    // Calculate
    const scale = dpi / 96;
    const mapW = pageW - (margin * 2);
    const mapH = pageH - headerH - (margin * 2);

    setTimeout(() => {
        const mapDiv = document.getElementById('map');

        html2canvas(mapDiv, {
            useCORS: true,
            allowTaint: true,
            scale: scale,
            backgroundColor: '#e8e8e8',
            logging: false,
            width: mapDiv.offsetWidth,
            height: mapDiv.offsetHeight
        }).then(mapCanvas => {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = pageW * scale;
            finalCanvas.height = pageH * scale;
            const ctx = finalCanvas.getContext('2d');

            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

            ctx.scale(scale, scale);

            // === HEADER ===
            let currentY = margin;

            ctx.fillStyle = '#1e3a8a';
            ctx.font = 'bold ' + Math.min(28, pageW/40) + 'px Arial';
            ctx.fillText(title, margin, currentY + 25);

            if (subtitle) {
                ctx.fillStyle = '#6b7280';
                ctx.font = '13px Arial';
                ctx.fillText(subtitle, margin, currentY + 45);
            }

            if (showDate) {
                const now = new Date();
                ctx.fillStyle = '#9ca3af';
                ctx.font = '11px Arial';
                ctx.fillText(now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR'), margin, currentY + 62);
            }

            // Blue line under header
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margin, currentY + headerH - 10);
            ctx.lineTo(pageW - margin, currentY + headerH - 10);
            ctx.stroke();

            // === MAP ===
            const mapAreaY = margin + headerH;
            const mapAspect = mapCanvas.width / mapCanvas.height;
            const targetAspect = mapW / mapH;
            let drawW, drawH, drawX, drawY;

            if (mapAspect > targetAspect) {
                drawW = mapW;
                drawH = mapW / mapAspect;
                drawX = margin;
                drawY = mapAreaY + (mapH - drawH) / 2;
            } else {
                drawH = mapH;
                drawW = mapH * mapAspect;
                drawX = margin + (mapW - drawW) / 2;
                drawY = mapAreaY;
            }

            // Map border
            if (showBorder) {
                ctx.strokeStyle = '#9ca3af';
                ctx.lineWidth = 1;
                ctx.strokeRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2);
            }

            ctx.drawImage(mapCanvas, drawX, drawY, drawW, drawH);

            // === OVERLAY ELEMENTS (user positioned) ===

            // Scale Bar
            if (showScaleBar) {
                const sx = scaleX < 0 ? drawX + drawW + scaleX : drawX + scaleX;
                const sy = scaleY < 0 ? drawY + drawH + scaleY : drawY + scaleY;
                const scaleText = getScaleText(map.getZoom());
                const barW = Math.min(120, drawW / 4);

                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(sx - 5, sy - 18, barW + 30, 28);
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx - 5, sy - 18, barW + 30, 28);

                ctx.strokeStyle = '#374151';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + barW, sy);
                ctx.lineTo(sx + barW, sy - 6);
                ctx.lineTo(sx, sy - 6);
                ctx.stroke();

                // Ticks
                for (let i = 0; i <= 4; i++) {
                    const tx = sx + (barW * i / 4);
                    ctx.beginPath();
                    ctx.moveTo(tx, sy);
                    ctx.lineTo(tx, sy - 8);
                    ctx.stroke();
                }

                ctx.fillStyle = '#374151';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('0', sx, sy + 10);
                ctx.fillText(scaleText, sx + barW, sy + 10);
                ctx.fillText('km', sx + barW/2, sy + 10);
                ctx.textAlign = 'left';
            }

            // Legend
            if (showLegend) {
                const lx = legendX < 0 ? drawX + drawW + legendX : drawX + legendX;
                const ly = legendY < 0 ? drawY + drawH + legendY : drawY + legendY;
                const lw = 110;
                const lh = 55;

                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fillRect(lx, ly, lw, lh);
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.strokeRect(lx, ly, lw, lh);

                ctx.fillStyle = '#374151';
                ctx.font = 'bold 10px Arial';
                ctx.fillText('Lejant', lx + 6, ly + 14);

                // Circle symbol
                ctx.fillStyle = 'rgba(59,130,246,0.3)';
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(lx + 15, ly + 28, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#374151';
                ctx.font = '10px Arial';
                ctx.fillText('Daire', lx + 26, ly + 31);

                // Point symbol
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(lx + 15, ly + 44, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#374151';
                ctx.fillText('Nokta', lx + 26, ly + 47);
            }

            // North Arrow
            if (showNorth) {
                const nx = northX < 0 ? drawX + drawW + northX : drawX + northX;
                const ny = northY < 0 ? drawY + drawH + northY : drawY + northY;

                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fillRect(nx - 5, ny - 5, 30, 35);
                ctx.strokeStyle = '#d1d5db';
                ctx.strokeRect(nx - 5, ny - 5, 30, 35);

                ctx.fillStyle = '#374151';
                ctx.font = '18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('⬆️', nx + 10, ny + 15);
                ctx.font = 'bold 9px Arial';
                ctx.fillText('N', nx + 10, ny + 28);
                ctx.textAlign = 'left';
            }

            // Coordinates (bottom center)
            if (showCoords) {
                const center = map.getCenter();
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                const coordText = 'Merkez: ' + center.lat.toFixed(4) + '°N, ' + center.lng.toFixed(4) + '°E  |  Zoom: ' + map.getZoom();
                const textW = ctx.measureText(coordText).width + 20;
                ctx.fillRect((pageW - textW) / 2, pageH - margin - 18, textW, 20);
                ctx.strokeStyle = '#e5e7eb';
                ctx.strokeRect((pageW - textW) / 2, pageH - margin - 18, textW, 20);

                ctx.fillStyle = '#6b7280';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(coordText, pageW / 2, pageH - margin - 5);
                ctx.textAlign = 'left';
            }

            // === OUTPUT ===
            if (isPreview) {
                // Show in new window
                loading.style.display = 'none';
                const previewWin = window.open('', '_blank', 'width=' + (pageW + 100) + ',height=' + (pageH + 100));
                previewWin.document.write('<html><head><title>Harita Önizleme</title></head><body style="margin:0;padding:20px;background:#374151;text-align:center;"><img src="' + finalCanvas.toDataURL() + '" style="max-width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.5);border:4px solid white;"><div style="color:white;margin-top:10px;font-family:Arial;">' + pageW + '×' + pageH + 'px | ' + dpi + ' DPI</div></body></html>');
            } else {
                // Download
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                link.download = 'harita_raporu_' + timestamp + '.' + format;
                link.href = finalCanvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                loading.style.display = 'none';
            }

        }).catch(err => {
            console.error('Print error:', err);
            loading.style.display = 'none';
            alert('Çıktı oluşturulamadı: ' + err.message);
        });
    }, 800);
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getScaleText(zoom) {
    const scales = {
        4: '100 km', 5: '50 km', 6: '20 km', 7: '10 km', 8: '5 km',
        9: '2 km', 10: '1 km', 11: '500 m', 12: '200 m', 13: '100 m',
        14: '50 m', 15: '20 m', 16: '10 m', 17: '5 m', 18: '2 m'
    };
    return scales[zoom] || '1 km';
}

// ===================== INIT =====================
setMode('circle');