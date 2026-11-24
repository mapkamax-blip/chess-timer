

const DEFAULT_TIME = 10 * 60; // 10 минут
const METADATA_KEY = "com.toh/chess-timer"; // Уникальный ключ для хранения данных

let timeWhite = DEFAULT_TIME;
let timeBlack = DEFAULT_TIME;
let isRunning = false;
let activePlayer = 'white';
let timerInterval = null;
let isGM = false;

const timeWhiteEl = document.getElementById('time-white');
const timeBlackEl = document.getElementById('time-black');
const panelWhite = document.getElementById('panel-white');
const panelBlack = document.getElementById('panel-black');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');

// Форматирование времени (120 -> 02:00)
function formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Обновление интерфейса
function updateUI() {
    timeWhiteEl.textContent = formatTime(timeWhite);
    timeBlackEl.textContent = formatTime(timeBlack);

    if (activePlayer === 'white') {
        panelWhite.classList.add('active');
        panelBlack.classList.remove('active');
    } else {
        panelBlack.classList.add('active');
        panelWhite.classList.remove('active');
    }
    
    btnStart.textContent = isRunning ? 'ПАУЗА' : (timeWhite < DEFAULT_TIME || timeBlack < DEFAULT_TIME ? 'ПРОДОЛЖИТЬ' : 'СТАРТ');
}

// Сохранение состояния в Owlbear (синхронизация для всех)
function saveStateToOBR() {
    OBR.room.setMetadata({
        [METADATA_KEY]: {
            timeWhite,
            timeBlack,
            isRunning,
            activePlayer
        }
    }).catch(err => console.error("Ошибка синхронизации:", err));
}

// Логика тика (вызывается раз в секунду)
function tick() {
    if (!isRunning) return;

    if (activePlayer === 'white') {
        timeWhite--;
        if (timeWhite <= 0) {
            timeWhite = 0;
            isRunning = false;
            clearInterval(timerInterval);
            alert("Время белых вышло! Победа чёрных.");
        }
    } else {
        timeBlack--;
        if (timeBlack <= 0) {
            timeBlack = 0;
            isRunning = false;
            clearInterval(timerInterval);
            alert("Время чёрных вышло! Победа белых.");
        }
    }
    
    updateUI();
    saveStateToOBR(); // Отправляем обновление другим игрокам
}

// Запуск / Пауза
btnStart.addEventListener('click', () => {
    if (!isGM) return; // Только Мастер может управлять таймером

    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
    } else {
        isRunning = true;
        timerInterval = setInterval(tick, 1000);
    }
    updateUI();
    saveStateToOBR();
});

// Сброс
btnReset.addEventListener('click', () => {
    if (!isGM) return;

    clearInterval(timerInterval);
    isRunning = false;
    timeWhite = DEFAULT_TIME;
    timeBlack = DEFAULT_TIME;
    activePlayer = 'white';
    updateUI();
    saveStateToOBR();
});

// Клик по панели для переключения хода (только для Мастера)
function switchTurn(player) {
    if (!isGM) return;
    if (activePlayer === player) return;

    activePlayer = player;
    updateUI();
    saveStateToOBR();
}

panelWhite.addEventListener('click', () => switchTurn('white'));
panelBlack.addEventListener('click', () => switchTurn('black'));


// === ИНИЦИАЛИЗАЦИЯ И СИНХРОНИЗАЦИЯ OBR ===
OBR.onReady(async () => {
    // Проверяем, является ли текущий пользователь Мастером (GM)
    const role = await OBR.player.getRole();
    isGM = (role === 'GM');

    // Загружаем текущее состояние из комнаты
    const metadata = await OBR.room.getMetadata();
    if (metadata[METADATA_KEY]) {
        const state = metadata[METADATA_KEY];
        timeWhite = state.timeWhite;
        timeBlack = state.timeBlack;
        isRunning = state.isRunning;
        activePlayer = state.activePlayer;
        
        // Если таймер работал до этого, запускаем локальный интервал
        if (isRunning) {
            timerInterval = setInterval(tick, 1000);
        }
    }
    updateUI();

    // Слушаем изменения от Мастера (для игроков)
    OBR.room.onMetadataChange((metadataUpdate) => {
        if (!isGM && metadataUpdate[METADATA_KEY]) {
            const state = metadataUpdate[METADATA_KEY];
            timeWhite = state.timeWhite;
            timeBlack = state.timeBlack;
            isRunning = state.isRunning;
            activePlayer = state.activePlayer;
            
            if (isRunning && !timerInterval) {
                timerInterval = setInterval(tick, 1000);
            } else if (!isRunning && timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            updateUI();
        }
    });
});
