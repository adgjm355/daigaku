// script.js

// --- グローバル変数と初期化 ---
let timetableData = JSON.parse(localStorage.getItem('timetableData')) || {};
let crowdData = JSON.parse(localStorage.getItem('crowdData')) || {};
let currentWeatherData = localStorage.getItem('currentWeather') || '晴れ'; // 現在の天気データを保持

// --- タブ切り替え機能 ---
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    // 混雑具合タブが選択されたら混雑状況を再描画
    if (tabName === 'crowd-status-tab') {
        renderCurrentDateTime(); // 現在時刻の表示を更新
        renderCrowdStatus();
    }
}

// --- データ保存ヘルパー関数 ---
function saveAllData() {
    localStorage.setItem('timetableData', JSON.stringify(timetableData));
    localStorage.setItem('crowdData', JSON.stringify(crowdData));
    localStorage.setItem('currentWeather', currentWeatherData); // 現在の天気を保存
}

// --- 時間割機能 ---
// (変更なし、既存のコードをそのまま)
// populateSubjectSuggestions, openTimetableForm, saveTimetable, renderTimetable, clearAllTimetableData

// --- 混雑具合機能 ---

// 時間帯のドロップダウンを生成
function populateTimeSlots() {
    const timeSlotSelect = document.getElementById('timeSlot');
    timeSlotSelect.innerHTML = ''; // 既存のオプションをクリア

    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = String(h).padStart(2, '0');
            const minute = String(m).padStart(2, '0');
            const option = document.createElement('option');
            option.value = `${hour}:${minute}`;
            option.textContent = `${hour}:${minute}`;
            timeSlotSelect.appendChild(option);
        }
    }
}

// 混雑状況投稿モーダルを開く
function openCrowdForm(location) {
    const modal = document.getElementById('crowdStatusModal');
    const closeButton = modal.querySelector('.close-button');
    modal.style.display = 'block';
    document.getElementById('locationName').value = location;
    document.getElementById('modalLocationName').textContent = location; // モーダル内の場所名

    populateTimeSlots(); // 時間帯を生成

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0'); // 30分単位に丸める
    const currentDayIndex = now.getDay(); // 0: 日曜日, 1: 月曜日...
    const daysMap = { 0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土' };
    const currentDayOfWeek = daysMap[currentDayIndex];

    document.getElementById('dayOfWeek').value = currentDayOfWeek;
    document.getElementById('timeSlot').value = `${currentHour}:${currentMinute}`;
    document.getElementById('weather').value = currentWeatherData; // 現在の天気で初期化

    // 学食の場合のみおすすめメニューを表示
    const menuSuggestionDiv = document.getElementById('menuSuggestionDiv');
    if (location.includes('HALL')) {
        menuSuggestionDiv.style.display = 'block';
    } else {
        menuSuggestionDiv.style.display = 'none';
    }

    const form = document.getElementById('crowdStatusForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        saveCrowdStatus();
        modal.style.display = 'none';
    };

    closeButton.onclick = () => {
        modal.style.display = 'none';
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// 混雑状況を保存
function saveCrowdStatus() {
    const location = document.getElementById('locationName').value;
    const dayOfWeek = document.getElementById('dayOfWeek').value;
    const timeSlot = document.getElementById('timeSlot').value;
    const weather = document.getElementById('weather').value;
    const crowdLevel = document.getElementById('crowdLevel').value;
    const suggestedMenu = document.getElementById('suggestedMenu').value;

    if (!crowdData[location]) {
        crowdData[location] = [];
    }

    // 既存の同じ曜日・時間帯・天気の投稿を更新、なければ追加
    let updated = false;
    for (let i = 0; i < crowdData[location].length; i++) {
        const entry = crowdData[location][i];
        if (entry.dayOfWeek === dayOfWeek && entry.timeSlot === timeSlot && entry.weather === weather) {
            entry.crowdLevel = crowdLevel;
            entry.suggestedMenu = suggestedMenu;
            entry.timestamp = new Date().toISOString(); // タイムスタンプを更新
            updated = true;
            break;
        }
    }
    if (!updated) {
        crowdData[location].push({
            dayOfWeek: dayOfWeek,
            timeSlot: timeSlot,
            weather: weather,
            crowdLevel: crowdLevel,
            suggestedMenu: suggestedMenu,
            timestamp: new Date().toISOString()
        });
    }

    saveAllData();
    renderCrowdStatus();
}

// 現在の時刻を表示する関数
function renderCurrentDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('ja-JP', options);
}

// 現在の天気を表示・保存する関数
function setupCurrentWeather() {
    const currentWeatherSelect = document.getElementById('currentWeather');
    const displayWeatherSpan = document.getElementById('displayWeather');

    // 初期表示
    currentWeatherSelect.value = currentWeatherData;
    displayWeatherSpan.textContent = currentWeatherSelect.value;

    // 変更時に保存と表示を更新
    currentWeatherSelect.addEventListener('change', () => {
        currentWeatherData = currentWeatherSelect.value;
        displayWeatherSpan.textContent = currentWeatherData;
        saveAllData();
        renderCrowdStatus(); // 天気が変わったら混雑状況も再描画
    });
}


// 混雑状況を表示
function renderCrowdStatus() {
    renderCurrentDateTime(); // 常に最新の時刻を表示

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayIndex = now.getDay(); // 0: 日曜日, 1: 月曜日...
    const daysMap = { 0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土' };
    const currentDayOfWeek = daysMap[currentDayIndex];
    const currentTimeSlot = `${String(currentHour).padStart(2, '0')}:${String(Math.floor(currentMinute / 30) * 30).padStart(2, '0')}`;

    const getRelevantCrowdStatus = (location) => {
        if (!crowdData[location] || crowdData[location].length === 0) {
            return { level: 'データなし', menu: '未入力' };
        }

        let bestMatch = null;
        let latestPostInCurrentSlot = null;
        let latestPostOverall = null;

        // 現在の曜日、時間帯、天気に完全に一致する最新の投稿を探す
        const perfectMatches = crowdData[location].filter(entry =>
            entry.dayOfWeek === currentDayOfWeek &&
            entry.timeSlot === currentTimeSlot &&
            entry.weather === currentWeatherData // 現在の天気も考慮
        );
        if (perfectMatches.length > 0) {
            bestMatch = perfectMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        }

        // 完全に一致するものがなければ、現在の曜日と時間帯に一致する最新の投稿を探す
        if (!bestMatch) {
            const timeDayMatches = crowdData[location].filter(entry =>
                entry.dayOfWeek === currentDayOfWeek && entry.timeSlot === currentTimeSlot
            );
            if (timeDayMatches.length > 0) {
                latestPostInCurrentSlot = timeDayMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                bestMatch = latestPostInCurrentSlot;
            }
        }

        // それでもなければ、その場所の最も新しい投稿を表示（フォールバック）
        if (!bestMatch) {
            latestPostOverall = crowdData[location].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            bestMatch = latestPostOverall;
        }
        
        return { level: bestMatch.crowdLevel, menu: bestMatch.suggestedMenu || '未入力' };
    };

    const updateStatusDisplay = (elementId, level, menuId = null, menuText = null) => {
        const element = document.getElementById(elementId);
        element.textContent = `現在の混雑状況: ${level}`;
        element.classList.remove('crowded', 'normal', 'empty', 'status-no-data'); // 既存クラスを削除
        if (level === '混雑') {
            element.classList.add('crowded');
        } else if (level === '普通') {
            element.classList.add('normal');
        } else if (level === '空') {
            element.classList.add('empty');
        } else {
            element.classList.add('status-no-data');
        }
        if (menuId && menuText !== null) {
            document.getElementById(menuId).textContent = menuText;
        }
    };

    // 学食の営業時間判定 (例: 10:00-14:00)
    const isEateryOpen = (currentHour >= 10 && currentHour < 14) || (currentHour === 14 && currentMinute === 0);
    
    const davinchStatus = getRelevantCrowdStatus('DA VINCH HALL');
    updateStatusDisplay('davinchHallStatus', isEateryOpen ? davinchStatus.level : '営業時間外', 'davinchHallMenu', davinchStatus.menu);

    const pascalStatus = getRelevantCrowdStatus('PASCAL HALL');
    updateStatusDisplay('pascalHallStatus', isEateryOpen ? pascalStatus.level : '営業時間外', 'pascalHallMenu', pascalStatus.menu);

    // 図書館 (営業時間判定は別途必要なら追加)
    updateStatusDisplay('library2FStatus', getRelevantCrowdStatus('図書館 2階閲覧室').level);
    updateStatusDisplay('library3FStatus', getRelevantCrowdStatus('図書館 3階閲覧室').level);

    // 喫煙所 (営業時間判定は別途必要なら追加)
    updateStatusDisplay('structureTestCenterStatus', getRelevantCrowdStatus('構造物試験センター裏').level);
    updateStatusDisplay('building10Status', getRelevantCrowdStatus('10号館横').level);
}


// --- 混雑データ共有ツール ---
document.addEventListener('DOMContentLoaded', () => {
    // ... 既存の時間割共有機能の初期化 ...

    const exportButton = document.getElementById('exportCrowdData');
    const importButton = document.getElementById('importCrowdData');
    const crowdDataOutput = document.getElementById('crowdDataOutput');
    const crowdDataInput = document.getElementById('crowdDataInput');

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const dataToExport = JSON.stringify(crowdData, null, 2); // 整形して表示
            crowdDataOutput.value = dataToExport;
            crowdDataOutput.style.display = 'block'; // テキストエリアを表示
            crowdDataOutput.select(); // 全選択してコピーしやすくする
            alert('混雑データがテキストエリアに表示されました。コピーして他の人と共有してください。');
        });
    }

    if (importButton) {
        importButton.addEventListener('click', () => {
            try {
                const dataToImport = JSON.parse(crowdDataInput.value);
                // 既存のデータとマージするロジック
                for (const location in dataToImport) {
                    if (dataToImport.hasOwnProperty(location)) {
                        if (!crowdData[location]) {
                            crowdData[location] = [];
                        }
                        // 新しいデータは既存のデータに追加（重複は考慮しない簡易版）
                        // より高度なマージロジック（例: タイムスタンプが新しい方を優先など）が必要な場合はここを修正
                        crowdData[location] = crowdData[location].concat(dataToImport[location]);
                    }
                }
                saveAllData(); // LocalStorageに保存
                renderCrowdStatus(); // 表示を更新
                alert('混雑データをインポートしました！');
                crowdDataInput.value = ''; // 入力エリアをクリア
            } catch (e) {
                alert('インポートするデータが不正なJSON形式です。');
                console.error('Import error:', e);
            }
        });
    }
});


// --- DOMContentLoadedイベントリスナー ---
document.addEventListener('DOMContentLoaded', () => {
    // 初期タブの表示
    document.getElementById('timetable-tab').style.display = 'block';

    // 時間割の初期描画
    renderTimetable();
    populateSubjectSuggestions();

    // 混雑具合の初期描画
    setupCurrentWeather(); // 現在の天気の設定と表示
    renderCrowdStatus();

    // 他の初期化処理
    // ...
});