// Берем SDK из глобальной переменной (его загрузил index.html)
const OBR = window.OBR;

console.log("TOH Timer: Скрипт успешно загружен!");

// Настройки
const DEFAULT_TIME = 10 * 60; // 10 минут
const METADATA_KEY = "com.toh/chess-timer"; 

// Переменные состояния
let timeWhite = DEFAULT_TIME;
let timeBlack = DEFAULT_TIME;
let isRunning = false;
let activePlayer = 'white'; 
let timerInterval = null;
let isGM = false; 

// Элементы DOM
const timeWhiteEl = document.getElementById('time-white');
const timeBlackEl = document.getElementById('time-black');
const panelWhite = document.getElementById('panel-white');
const panelBlack = document.getElementById('panel-black');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');

// Форматирование времени
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
    
    btnStart.textContent = isRunning ? 'ПАУЗА' : 'СТАРТ';
}

// Сохранение состояния в ОвлБир
function saveStateToOBR() {
    if (!OBR) return; // Защита, если SDK не загрузился
    OBR.room.setMetadata({
        [METADATA_KEY]: {
            timeWhite,
            timeBlack,
            isRunning,
            activePlayer
        }
    }).catch(err => console.error("Ошибка сохранения:", err));
}

// Логика таймера
function tick() {
    if (!isRunning) return;

    if (activePlayer === 'white') {
        timeWhite--;
        if (timeWhite <= 0) {
            timeWhite = 0;
            isRunning = false;
            clearInterval(timerInterval);
            alert("Время белых вышло!");
        }
    } else {
        timeBlack--;
        if (timeBlack <= 0) {
            timeBlack = 0;
            isRunning = false;
            clearInterval(timerInterval);
            alert("Время чёрных вышло!");
        }
    }
    
    updateUI();
    saveStateToOBR(); 
}

// Кнопка Старт/Пауза
btnStart.addEventListener('click', () => {
    if (!isGM) return;
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

// Кнопка Сброс
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

// Смена хода
function switchTurn(player) {
    if (!isGM) return;
    if (activePlayer === player) return;
    activePlayer = player;
    updateUI();
    saveStateToOBR();
}

panelWhite.addEventListener('click', () => switchTurn('white'));
panelBlack.addEventListener('click', () => switchTurn('black'));

// Инициализация при запуске (запускается чуть позже, чтобы SDK успело загрузиться)
setTimeout(() => {
    if (!window.OBR) {
        console.error("ОШИБКА: SDK ОвлБира не загрузилось!");
        return;
    }

    window.OBR.onReady(async () => {
        console.log("TOH Timer: Owlbear готов!");
        
        const role = await window.OBR.player.getRole();
        isGM = (role === 'GM');
        console.log("Твой статус: " + (isGM ? "Мастер" : "Игрок"));

        const metadata = await window.OBR.room.getMetadata();
        if (metadata[METADATA_KEY]) {
            const state = metadata[METADATA_KEY];
            timeWhite = state.timeWhite;
            timeBlack = state.timeBlack;
            isRunning = state.isRunning;
            activePlayer = state.activePlayer;
            
            if (isRunning) {
                timerInterval = setInterval(tick, 1000);
            }
        }
        updateUI();

        window.OBR.room.onMetadataChange((metadataUpdate) => {
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
}, 500); // Небольшая задержка, чтобы библиотека точно успела подгрузиться
