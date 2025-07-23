// script.js

// --- グローバル変数と初期化 ---
let timetableData = {}; // 時間割データを保持
let sharedLessonDetails = {}; // 授業詳細の共有データを保持
let crowdData = {}; // 混雑具合データを保持
// 天気の選択肢を限定
const WEATHER_OPTIONS = ['晴れ', '曇り', '雨'];
let currentWeatherData = localStorage.getItem('currentWeather') || WEATHER_OPTIONS[0]; // 現在の天気データを保持

const days = ['月', '火', '水', '木', '金', '土', '日']; // 日曜日を追加
const periods = ['1時限', '2時限', '3時限', '4時限', '5時限', '6時限', '7時限', '8時限']; // 8時限まで拡張
const TOTAL_LESSONS = 15; // 全授業回数

// --- データ保存ヘルパー関数 ---
function loadAllData() {
    const storedTimetable = localStorage.getItem('timetableData');
    if (storedTimetable) {
        timetableData = JSON.parse(storedTimetable);
    }
    const storedSharedDetails = localStorage.getItem('sharedLessonDetails');
    if (storedSharedDetails) {
        sharedLessonDetails = JSON.parse(storedSharedDetails);
    }
    const storedCrowdData = localStorage.getItem('crowdData');
    if (storedCrowdData) {
        crowdData = JSON.parse(storedCrowdData);
    }
    // currentWeatherData はグローバル変数初期化時にLocalStorageから読み込まれる
    // 保存されている天気が限定された選択肢に含まれない場合、デフォルト値にリセット
    if (!WEATHER_OPTIONS.includes(currentWeatherData)) {
        currentWeatherData = WEATHER_OPTIONS[0];
    }
}

function saveAllData() {
    localStorage.setItem('timetableData', JSON.stringify(timetableData));
    localStorage.setItem('sharedLessonDetails', JSON.stringify(sharedLessonDetails));
    localStorage.setItem('crowdData', JSON.stringify(crowdData));
    localStorage.setItem('currentWeather', currentWeatherData);
}

// すべてのデータをクリアする機能
function clearAllData() {
    if (confirm('すべての時間割、混雑具合、授業詳細のデータを完全に削除してもよろしいですか？この操作は元に戻せません。')) {
        localStorage.clear(); // LocalStorageをすべてクリア
        timetableData = {};
        sharedLessonDetails = {};
        crowdData = {};
        currentWeatherData = WEATHER_OPTIONS[0]; // 初期値に戻す

        renderTimetable(); // 時間割を再描画
        renderCrowdStatus(); // 混雑具合を再描画
        setupCurrentWeather(); // 天気表示をリセット
        alert('すべてのデータが削除されました。');
        // 必要に応じて、初期タブに戻るなどの処理を追加
        document.querySelector('.tab-button.active').classList.remove('active');
        document.getElementById('timetable-tab').classList.add('active');
        document.querySelector('[data-tab="timetable-tab"]').classList.add('active');
    }
}


// --- タブ切り替え機能 ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // 混雑具合タブが選択されたら混雑状況を再描画
            if (tabId === 'crowd-status-tab') {
                renderCurrentDateTime(); // 現在時刻の表示を更新
                setupCurrentWeather(); // 天気表示の初期化とイベントリスナー設定
                renderCrowdStatus(); // 混雑状況の再描画
            }
        });
    });

    // 初期タブのアクティブ化
    document.querySelector('.tab-button.active').click();
}


// --- 時間割機能 ---

function renderTimetable() {
    const timetableBody = document.querySelector('#timetable-table tbody');
    timetableBody.innerHTML = ''; // 既存の行をクリア

    for (let i = 0; i < periods.length; i++) {
        const row = timetableBody.insertRow();
        const periodCell = row.insertCell();
        periodCell.textContent = periods[i];

        for (let j = 0; j < days.length; j++) {
            const cell = row.insertCell();
            const day = days[j];
            const period = periods[i];
            cell.dataset.day = day;
            cell.dataset.period = period;
            cell.classList.add('lesson-cell');

            if (timetableData[day] && timetableData[day][period]) {
                const lesson = timetableData[day][period];
                // 授業名と教室名を表示
                cell.innerHTML = `<strong>${lesson.name || ''}</strong><br><span>${lesson.classroom || ''}</span>`;
                if (lesson.hasAssignment) {
                    cell.classList.add('has-assignment'); // 課題がある場合は赤く表示
                }
            } else {
                cell.textContent = ''; // データがない場合は空にする
            }

            // セルクリックでモーダル表示
            cell.addEventListener('click', () => openLessonModal(day, period));
        }
    }
}

function openLessonModal(day, period) {
    const modal = document.getElementById('lessonDetailModal');
    const form = document.getElementById('lessonDetailForm');
    const displayArea = document.getElementById('lessonDisplayArea');
    const closeButton = modal.querySelector('.close-button');

    // モーダルに曜日と時限を表示
    document.getElementById('modalDay').textContent = day;
    document.getElementById('modalPeriod').textContent = period;

    // 既存のデータをフォームにロード
    const lesson = timetableData[day] && timetableData[day][period];

    // 出席回数入力フィールドのイベントリスナーを設定
    const attendanceCountInput = document.getElementById('attendanceCount');
    const attendanceRateFormSpan = document.getElementById('attendanceRateForm');

    const updateAttendanceRate = () => {
        const count = parseInt(attendanceCountInput.value) || 0;
        const rate = (count / TOTAL_LESSONS * 100).toFixed(1); // 小数点以下1桁
        attendanceRateFormSpan.textContent = `${rate}%`;
    };
    attendanceCountInput.removeEventListener('input', updateAttendanceRate); // 既存リスナーを削除
    attendanceCountInput.addEventListener('input', updateAttendanceRate);


    if (lesson && lesson.name) { // 授業名が入力されている場合は詳細表示エリアを表示
        form.style.display = 'none';
        displayArea.style.display = 'block';
        displayLessonDetails(lesson.name, day, period); // 授業名、曜日、時限を渡す
    } else { // 授業名が入力されていない場合は入力フォームを表示
        form.style.display = 'block';
        displayArea.style.display = 'none';
        form.reset(); // フォームをリセット
        document.getElementById('evaluationCriteria').innerHTML = '<button type="button" id="addCriteria">項目を追加</button>';
        document.getElementById('addCriteria').onclick = () => addEvaluationCriteriaInput();
        attendanceCountInput.value = 0; // デフォルト値
        updateAttendanceRate(); // 出席率を初期化
    }

    modal.style.display = 'block';

    // フォーム送信時の処理
    form.onsubmit = (e) => {
        e.preventDefault();
        saveLessonDetails(day, period);
        modal.style.display = 'none';
    };

    // 編集ボタンの処理
    document.getElementById('editLessonDetails').onclick = () => {
        form.style.display = 'block';
        displayArea.style.display = 'none';
        // 編集のためにフォームにデータをロード
        loadLessonDataToForm(day, period);
        updateAttendanceRate(); // ロード後に出席率を更新
    };

    // 削除ボタンの処理
    document.getElementById('deleteLessonDetails').onclick = () => {
        if (confirm(`${day} ${period}の授業情報を削除してもよろしいですか？`)) {
            delete timetableData[day][period];
            if (Object.keys(timetableData[day]).length === 0) {
                delete timetableData[day]; // その曜日に授業がなければ曜日データも削除
            }
            saveAllData();
            renderTimetable();
            modal.style.display = 'none';
            alert('授業情報が削除されました。');
        }
    };

    // モーダルを閉じる処理
    closeButton.onclick = () => {
        modal.style.display = 'none';
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function loadLessonDataToForm(day, period) {
    const lesson = timetableData[day] && timetableData[day][period];
    if (lesson) {
        document.getElementById('lessonName').value = lesson.name || '';
        document.getElementById('classroom').value = lesson.classroom || '';
        document.getElementById('teacherName').value = lesson.teacherName || '';
        document.getElementById('attendanceCount').value = lesson.attendanceCount !== undefined ? lesson.attendanceCount : 0; // 出席回数をロード

        const evaluationCriteriaDiv = document.getElementById('evaluationCriteria');
        evaluationCriteriaDiv.innerHTML = '<button type="button" id="addCriteria">項目を追加</button>'; // 既存をクリア
        if (lesson.evaluationCriteria) {
            lesson.evaluationCriteria.forEach(item => {
                addEvaluationCriteriaInput(item.item, item.percentage);
            });
        }
        document.getElementById('addCriteria').onclick = () => addEvaluationCriteriaInput();

        document.getElementById('lessonSite').value = lesson.lessonSite || '';
        document.getElementById('syllabusLink').value = lesson.syllabusLink || '';
        document.getElementById('hasAssignment').checked = lesson.hasAssignment || false;
    }
}

function addEvaluationCriteriaInput(item = '', percentage = '') {
    const evaluationCriteriaDiv = document.getElementById('evaluationCriteria');
    const div = document.createElement('div');
    div.classList.add('criteria-item');
    div.innerHTML = `
        <input type="text" class="criteria-item-input" value="${item}" placeholder="項目名 (例: 平常試験)">
        <input type="number" class="criteria-percentage-input" value="${percentage}" placeholder="パーセンテージ (%)">
        <button type="button" class="remove-criteria">削除</button>
    `;
    evaluationCriteriaDiv.insertBefore(div, document.getElementById('addCriteria'));
    div.querySelector('.remove-criteria').onclick = (e) => e.target.closest('.criteria-item').remove();
}

function saveLessonDetails(day, period) {
    const lessonName = document.getElementById('lessonName').value.trim(); // 空白をトリム

    // 授業名が空の場合は保存しない
    if (!lessonName) {
        alert('授業名は必須です。');
        return;
    }

    const classroom = document.getElementById('classroom').value;
    const teacherName = document.getElementById('teacherName').value;
    const attendanceCount = parseInt(document.getElementById('attendanceCount').value); // 出席回数を取得
    const lessonSite = document.getElementById('lessonSite').value;
    const syllabusLink = document.getElementById('syllabusLink').value;
    const hasAssignment = document.getElementById('hasAssignment').checked;

    const evaluationCriteria = [];
    document.querySelectorAll('.criteria-item').forEach(div => {
        const item = div.querySelector('.criteria-item-input').value;
        const percentage = div.querySelector('.criteria-percentage-input').value;
        if (item && percentage) {
            evaluationCriteria.push({ item: item, percentage: parseInt(percentage) });
        }
    });

    if (!timetableData[day]) {
        timetableData[day] = {};
    }

    timetableData[day][period] = {
        name: lessonName,
        classroom: classroom,
        teacherName: teacherName,
        attendanceCount: attendanceCount, // 出席回数を保存
        evaluationCriteria: evaluationCriteria,
        lessonSite: lessonSite,
        syllabusLink: syllabusLink,
        hasAssignment: hasAssignment
    };

    // 授業名が同じなら共有データに保存
    // 先生の名前、成績評価基準、授業サイト、シラバスリンクは共有
    sharedLessonDetails[lessonName] = {
        teacherName: teacherName,
        evaluationCriteria: evaluationCriteria,
        lessonSite: lessonSite,
        syllabusLink: syllabusLink
    };

    saveAllData();
    renderTimetable(); // 時間割を再描画
}

// 授業詳細の表示機能（共有データと個人データから取得）
function displayLessonDetails(lessonName, day, period) {
    const displayArea = document.getElementById('lessonDisplayArea');
    const form = document.getElementById('lessonDetailForm');
    form.style.display = 'none';
    displayArea.style.display = 'block';

    // 個人に依存する情報
    const personalLesson = timetableData[day] && timetableData[day][period];
    // 共有される可能性のある情報
    const sharedDetails = sharedLessonDetails[lessonName];

    document.getElementById('displayLessonName').textContent = lessonName;
    document.getElementById('displayClassroom').textContent = (personalLesson && personalLesson.classroom) || '未入力';
    
    // 出席回数と出席率を表示
    const attendanceCount = (personalLesson && personalLesson.attendanceCount !== undefined) ? personalLesson.attendanceCount : 0;
    const attendanceRate = (attendanceCount / TOTAL_LESSONS * 100).toFixed(1);
    document.getElementById('displayAttendanceCount').textContent = attendanceCount;
    document.getElementById('displayAttendanceRate').textContent = `${attendanceRate}%`;

    document.getElementById('displayHasAssignment').textContent = (personalLesson && personalLesson.hasAssignment) ? 'あり' : 'なし';


    if (sharedDetails) {
        document.getElementById('displayTeacherName').textContent = sharedDetails.teacherName || '未入力';

        const displayEvaluationCriteriaUl = document.getElementById('displayEvaluationCriteria');
        displayEvaluationCriteriaUl.innerHTML = '';
        if (sharedDetails.evaluationCriteria && sharedDetails.evaluationCriteria.length > 0) {
            sharedDetails.evaluationCriteria.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.item}: ${item.percentage}%`;
                displayEvaluationCriteriaUl.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = '未入力';
            displayEvaluationCriteriaUl.appendChild(li);
        }

        const lessonSiteLink = document.getElementById('displayLessonSite');
        if (sharedDetails.lessonSite) {
            lessonSiteLink.href = sharedDetails.lessonSite;
            lessonSiteLink.textContent = sharedDetails.lessonSite;
        } else {
            lessonSiteLink.href = '#';
            lessonSiteLink.textContent = '未入力';
        }

        const syllabusLink = document.getElementById('displaySyllabusLink');
        if (sharedDetails.syllabusLink) {
            syllabusLink.href = sharedDetails.syllabusLink;
            syllabusLink.textContent = sharedDetails.syllabusLink;
        } else {
            syllabusLink.href = '#';
            syllabusLink.textContent = '未入力';
        }
    } else {
        // 共有データがない場合
        document.getElementById('displayTeacherName').textContent = '未入力';
        document.getElementById('displayEvaluationCriteria').innerHTML = '<li>未入力</li>';
        document.getElementById('displayLessonSite').href = '#';
        document.getElementById('displayLessonSite').textContent = '未入力';
        document.getElementById('displaySyllabusLink').href = '#';
        document.getElementById('displaySyllabusLink').textContent = '未入力';
    }
}

// 時間割データエクスポート
document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('exportTimetableData');
    const importButton = document.getElementById('importTimetableData');
    const timetableDataOutput = document.getElementById('timetableDataOutput');
    const timetableDataInput = document.getElementById('timetableDataInput');

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const dataToExport = JSON.stringify(timetableData, null, 2); // 整形して表示
            timetableDataOutput.value = dataToExport;
            timetableDataOutput.style.display = 'block'; // テキストエリアを表示
            timetableDataOutput.select(); // 全選択してコピーしやすくする
            alert('時間割データがテキストエリアに表示されました。コピーして他の人と共有してください。');
        });
    }

    if (importButton) {
        importButton.addEventListener('click', () => {
            try {
                const dataToImport = JSON.parse(timetableDataInput.value);
                // 既存のデータとマージするロジック
                // 例: インポートされたデータを既存のデータに追加/上書き
                for (const day in dataToImport) {
                    if (dataToImport.hasOwnProperty(day)) {
                        if (!timetableData[day]) {
                            timetableData[day] = {};
                        }
                        for (const period in dataToImport[day]) {
                            if (dataToImport[day].hasOwnProperty(period)) {
                                timetableData[day][period] = dataToImport[day][period];
                            }
                        }
                    }
                }
                saveAllData(); // LocalStorageに保存
                renderTimetable(); // 表示を更新
                alert('時間割データをインポートしました！');
                timetableDataInput.value = ''; // 入力エリアをクリア
            } catch (e) {
                alert('インポートするデータが不正なJSON形式です。');
                console.error('Import error:', e);
            }
        });
    }
});


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
    document.getElementById('locationNameInput').value = location; // inputのIDを使用
    document.getElementById('modalLocationName').textContent = location; // モーダル内の表示用要素

    populateTimeSlots(); // 時間帯を生成
    populateWeatherOptions(); // 天気オプションを生成・更新

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0'); // 30分単位に丸める
    const currentDayIndex = now.getDay(); // 0: 日曜日, 1: 月曜日...
    const daysMap = { 0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土', 7: '日' }; // 曜日マップに日曜日(7)を追加
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

// 天気オプションを生成する関数
function populateWeatherOptions() {
    const weatherSelectElements = document.querySelectorAll('#currentWeather, #weather');
    
    weatherSelectElements.forEach(selectElement => {
        const selectedValue = selectElement.value; // 現在選択されている値を保持
        selectElement.innerHTML = ''; // 既存のオプションをクリア
        WEATHER_OPTIONS.forEach(weather => {
            const option = document.createElement('option');
            option.value = weather;
            option.textContent = weather;
            selectElement.appendChild(option);
        });
        // 以前選択されていた値があれば再設定、なければデフォルト値（WEATHER_OPTIONS[0]）
        if (WEATHER_OPTIONS.includes(selectedValue)) {
            selectElement.value = selectedValue;
        } else {
            selectElement.value = WEATHER_OPTIONS[0];
        }
    });
}

// 混雑状況を保存
function saveCrowdStatus() {
    const location = document.getElementById('locationNameInput').value; // inputのIDを使用
    const weather = document.getElementById('weather').value;
    const dayOfWeek = document.getElementById('dayOfWeek').value;
    const timeSlot = document.getElementById('timeSlot').value;
    const crowdLevel = document.getElementById('crowdLevel').value;
    const suggestedMenu = document.getElementById('suggestedMenu').value;
    const timestamp = new Date().toISOString(); // 投稿日時

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
            entry.timestamp = timestamp; // タイムスタンプを更新
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
            suggestedMenu: location.includes('HALL') ? suggestedMenu : null, // 学食のみ
            timestamp: timestamp
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
    const displayWeatherSpan = document.getElementById('displayCurrentWeather');

    // 天気オプションを動的に生成
    populateWeatherOptions();

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
    const daysMap = { 0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土', 7: '日' }; // 曜日マップに日曜日(7)を追加
    const currentDayOfWeek = daysMap[currentDayIndex];
    const currentTimeSlot = `${String(currentHour).padStart(2, '0')}:${String(Math.floor(currentMinute / 30) * 30).padStart(2, '0')}`;

    const getRelevantCrowdStatus = (location) => {
        if (!crowdData[location] || crowdData[location].length === 0) {
            return { level: 'データなし', menu: '未入力' };
        }

        let bestMatch = null;

        // 1. 現在の曜日、時間帯、天気に完全に一致する最新の投稿を探す
        const perfectMatches = crowdData[location].filter(entry =>
            entry.dayOfWeek === currentDayOfWeek &&
            entry.timeSlot === currentTimeSlot &&
            entry.weather === currentWeatherData // 現在の天気でフィルタリング
        );
        if (perfectMatches.length > 0) {
            bestMatch = perfectMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        }

        // 2. 完璧な一致がなければ、現在の曜日と時間帯に一致する最新の投稿を探す（天気は問わない）
        if (!bestMatch) {
            const timeDayMatches = crowdData[location].filter(entry =>
                entry.dayOfWeek === currentDayOfWeek && entry.timeSlot === currentTimeSlot
            );
            if (timeDayMatches.length > 0) {
                bestMatch = timeDayMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            }
        }

        // 3. それでもなければ、その場所の最も新しい投稿を表示（フォールバック、曜日・時間帯・天気は問わない）
        if (!bestMatch) {
            bestMatch = crowdData[location].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        }
        
        return { level: bestMatch ? bestMatch.crowdLevel : 'データなし', menu: bestMatch ? (bestMatch.suggestedMenu || '未入力') : '未入力' };
    };

    const updateStatusDisplay = (elementId, level, menuId = null, menuText = null) => {
        const element = document.getElementById(elementId);
        element.textContent = `現在の混雑状況: ${level}`;
        element.classList.remove('crowded', 'normal', 'empty', 'status-no-data'); // 既存クラスをすべて削除
        if (level === '混雑') {
            element.classList.add('crowded');
        } else if (level === '普通') {
            element.classList.add('normal');
        } else if (level === '空') {
            element.classList.add('empty');
        } else {
            element.classList.add('status-no-data'); // データなしの場合のスタイル
        }
        if (menuId && menuText !== null) {
            document.getElementById(menuId).textContent = menuText;
        }
    };

    // 学食の営業時間判定 (例: 10:00-14:00)
    // 営業時間外は、学食にのみ適用
    const isEateryOpen = (currentHour >= 10 && currentHour < 14) || (currentHour === 14 && currentMinute === 0);
    
    const davinchStatus = getRelevantCrowdStatus('DA VINCH HALL');
    updateStatusDisplay('davinchHallStatus', isEateryOpen ? davinchStatus.level : '営業時間外', 'davinchHallMenu', davinchStatus.menu);

    const pascalStatus = getRelevantCrowdStatus('PASCAL HALL');
    updateStatusDisplay('pascalHallStatus', isEateryOpen ? pascalStatus.level : '営業時間外', 'pascalHallMenu', pascalStatus.menu);

    // 図書館（営業時間が必要であればロジックを追加）
    updateStatusDisplay('library2FStatus', getRelevantCrowdStatus('図書館 2階閲覧室').level);
    updateStatusDisplay('library3FStatus', getRelevantCrowdStatus('図書館 3階閲覧室').level);

    // 喫煙所（営業時間が必要であればロジックを追加）
    updateStatusDisplay('structureTestCenterStatus', getRelevantCrowdStatus('構造物試験センター裏').level);
    updateStatusDisplay('building10Status', getRelevantCrowdStatus('10号館横').level);
}


// --- 混雑データ共有機能 ---
document.addEventListener('DOMContentLoaded', () => {
    // 混雑データのエクスポート
    const exportCrowdButton = document.getElementById('exportCrowdData');
    const importCrowdButton = document.getElementById('importCrowdData');
    const crowdDataOutput = document.getElementById('crowdDataOutput');
    const crowdDataInput = document.getElementById('crowdDataInput');

    if (exportCrowdButton) {
        exportCrowdButton.addEventListener('click', () => {
            const dataToExport = JSON.stringify(crowdData, null, 2); // 整形して表示
            crowdDataOutput.value = dataToExport;
            crowdDataOutput.style.display = 'block'; // テキストエリアを表示
            crowdDataOutput.select(); // 全選択してコピーしやすくする
            alert('混雑データがテキストエリアに表示されました。コピーして他の人と共有してください。');
        });
    }

    // 混雑データのインポート
    if (importCrowdButton) {
        importCrowdButton.addEventListener('click', () => {
            try {
                const dataToImport = JSON.parse(crowdDataInput.value);
                // 既存のデータとマージするロジック
                // 各場所のデータをマージ
                for (const location in dataToImport) {
                    if (dataToImport.hasOwnProperty(location)) {
                        if (!crowdData[location]) {
                            crowdData[location] = [];
                        }
                        // インポートされたデータが配列であることを確認
                        if (Array.isArray(dataToImport[location])) {
                            // 新しいデータを既存のデータに追加（重複はタイムスタンプで判断し、新しい方を優先）
                            dataToImport[location].forEach(newEntry => {
                                let found = false;
                                for (let i = 0; i < crowdData[location].length; i++) {
                                    const existingEntry = crowdData[location][i];
                                    // 曜日、時間帯、天気、場所が同じなら、タイムスタンプで新しい方を採用
                                    if (existingEntry.dayOfWeek === newEntry.dayOfWeek &&
                                        existingEntry.timeSlot === newEntry.timeSlot &&
                                        existingEntry.weather === newEntry.weather) {
                                        if (new Date(newEntry.timestamp) > new Date(existingEntry.timestamp)) {
                                            crowdData[location][i] = newEntry; // 新しいデータで上書き
                                        }
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    crowdData[location].push(newEntry); // 新しい投稿として追加
                                }
                            });
                        }
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
    loadAllData(); // 全てのデータをロード
    setupTabs(); // タブの初期設定
    renderTimetable(); // 時間割の初期描画
    // populateTimeSlots(); // 混雑具合の時間スロット初期化 (openCrowdForm内で呼び出すためここから削除)
    // setupCurrentWeather(); // 現在の天気の設定と表示 (setupTabs内で呼び出すためここから削除)
    // renderCrowdStatus(); // 混雑具合の初期描画 (setupTabs内で呼び出すためここから削除)
});