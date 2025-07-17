// グローバル変数
let timetableData = {}; // 時間割データを保持
let sharedLessonDetails = {}; // 授業詳細の共有データを保持
let crowdData = {}; // 混雑具合データを保持

const days = ['月', '火', '水', '木', '金', '土'];
const periods = ['1限目', '2限目', '3限目', '4限目', '5限目', '6限目'];

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupTabs();
    renderTimetable();
    populateTimeSlots();
    renderCrowdStatus();
});

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
}

function saveAllData() {
    localStorage.setItem('timetableData', JSON.stringify(timetableData));
    localStorage.setItem('sharedLessonDetails', JSON.stringify(sharedLessonDetails));
    localStorage.setItem('crowdData', JSON.stringify(crowdData));
}

// --- タブ機能 ---
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
        });
    });
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
                cell.innerHTML = `<strong>${lesson.name || ''}</strong>`; // 授業名のみ表示
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
        document.getElementById('attendance').value = '未入力'; // デフォルト値を設定
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
        document.getElementById('attendance').value = lesson.attendance || '未入力';

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
    const attendance = document.getElementById('attendance').value;
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
        attendance: attendance,
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
    document.getElementById('displayClassroom').textContent = personalLesson ? personalLesson.classroom : '未入力';
    document.getElementById('displayAttendance').textContent = personalLesson ? personalLesson.attendance : '未入力';

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


// --- 混雑具合機能 ---

function populateTimeSlots() {
    const timeSlotSelect = document.getElementById('timeSlot');
    timeSlotSelect.innerHTML = '';
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

function openCrowdForm(location) {
    const modal = document.getElementById('crowdStatusModal');
    const closeButton = modal.querySelector('.close-button');
    modal.style.display = 'block';
    document.getElementById('locationName').value = location;

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

function saveCrowdStatus() {
    const location = document.getElementById('locationName').value;
    const weather = document.getElementById('weather').value;
    const dayOfWeek = document.getElementById('dayOfWeek').value;
    const timeSlot = document.getElementById('timeSlot').value;
    const crowdLevel = document.getElementById('crowdLevel').value;
    const suggestedMenu = document.getElementById('suggestedMenu').value;
    const timestamp = new Date().toISOString(); // 投稿日時

    if (!crowdData[location]) {
        crowdData[location] = [];
    }

    crowdData[location].push({
        weather: weather,
        dayOfWeek: dayOfWeek,
        timeSlot: timeSlot,
        crowdLevel: crowdLevel,
        suggestedMenu: location.includes('HALL') ? suggestedMenu : null, // 学食のみ
        timestamp: timestamp
    });

    saveAllData();
    renderCrowdStatus();
}

function renderCrowdStatus() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayIndex = now.getDay(); // 0: 日曜日, 1: 月曜日...
    const daysMap = { 0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土' };
    const currentDayOfWeek = daysMap[currentDayIndex];

    const getLatestCrowdStatus = (location) => {
        if (!crowdData[location] || crowdData[location].length === 0) {
            return { level: 'データなし', menu: '未入力' };
        }
        // 最新の投稿を取得
        const latestEntry = crowdData[location].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        return { level: latestEntry.crowdLevel, menu: latestEntry.suggestedMenu || '未入力' };
    };

    const updateStatusDisplay = (elementId, level) => {
        const element = document.getElementById(elementId);
        element.textContent = `現在の混雑状況: ${level}`;
        element.classList.remove('crowded', 'normal', 'empty'); // 既存クラスを削除
        if (level === '混雑') {
            element.classList.add('crowded');
        } else if (level === '普通') {
            element.classList.add('normal');
        } else if (level === '空') {
            element.classList.add('empty');
        }
    };

    // 学食
    const isEateryOpen = (currentHour >= 10 && currentHour < 14) || (currentHour === 14 && currentMinute === 0); // 10:00-14:00
    
    const davinchStatus = getLatestCrowdStatus('DA VINCH HALL');
    updateStatusDisplay('davinchHallStatus', isEateryOpen ? davinchStatus.level : '営業時間外');
    document.getElementById('davinchHallMenu').textContent = davinchStatus.menu;

    const pascalStatus = getLatestCrowdStatus('PASCAL HALL');
    updateStatusDisplay('pascalHallStatus', isEateryOpen ? pascalStatus.level : '営業時間外');
    document.getElementById('pascalHallMenu').textContent = pascalStatus.menu;

    // 図書館
    updateStatusDisplay('library2FStatus', getLatestCrowdStatus('図書館 2階閲覧室').level);
    updateStatusDisplay('library3FStatus', getLatestCrowdStatus('図書館 3階閲覧室').level);

    // 喫煙所
    updateStatusDisplay('structureTestCenterStatus', getLatestCrowdStatus('構造物試験センター裏').level);
    updateStatusDisplay('building10Status', getLatestCrowdStatus('10号館横').level);
}


// script.js (DOMContentLoadedイベントリスナーの後に追記)

// --- 混雑具合共有機能 ---
document.addEventListener('DOMContentLoaded', () => {
    // ... 既存の初期化処理 ...

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