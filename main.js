// 1. Подключаем официальное SDK Owlbear Rodeo
import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.2.1/+esm";

console.log("TOH Timer: Скрипт успешно загружен!");

// 2. Настройки
const DEFAULT_TIME = 10 * 60; // 10 минут в секундах
const METADATA_KEY = "com.toh/chess-timer"; // Уникальный ключ для хранения данных в комнате

// 3. Переменные состояния
let timeWhite = DEFAULT_TIME;
let timeBlack = DEFAULT_TIME;
let isRunning = false;
let activePlayer = 'white'; // 'white' или 'black'
let timerInterval = null;
let isGM = false; // Является ли текущий пользователь Мастером

// 4. Получаем элементы со страницы HTML
const timeWhiteEl = document.getElementById('time-white');
const timeBlackEl = document.getElementById('time-black');
const panelWhite = document.getElementById('panel-white');
const panelBlack = document.getElementById('panel-black');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');

// 5. Функция форматирования времени (120 секунд -> "02:00")
function formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// 6. Функция обновления интерфейса
function updateUI() {
    timeWhiteEl.textContent = formatTime(timeWhite);
    timeBlackEl.textContent = formatTime(timeBlack);

    // Подсветка активного игрока
    if (activePlayer === 'white') {
        panelWhite.classList.add('active');
        panelBlack.classList.remove('active');
    } else {
        panelBlack.classList.add('active');
        panelWhite.classList.remove('active');
    }
    
    // Текст на кнопке Старт/Пауза
    btnStart.textContent = isRunning ? 'ПАУЗА' : 'СТАРТ';
}

// 7. Сохранение состояния в Owlbear (чтобы у всех игроков было одинаково)
function saveStateToOBR() {
    OBR.room.setMetadata({
        [METADATA_KEY]: {
            timeWhite,
            timeBlack,
            isRunning,
            activePlayer
        }
    }).catch(err => console.error("Ошибка сохранения состояния:", err));
}

// 8. Логика тика таймера (вызывается каждую секунду)
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
    saveStateToOBR(); // Отправляем данные другим игрокам
}

// 9. Обработчик кнопки СТАРТ/ПАУЗА
btnStart.addEventListener('click', () => {
    if (!isGM) return; // Если это не Мастер, кнопка не работает
    console.log("Нажата кнопка СТАРТ/ПАУЗА");

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

// 10. Обработчик кнопки СБРОС
btnReset.addEventListener('click', () => {
    if (!isGM) return;

    console.log("Нажата кнопка СБРОС");
    clearInterval(timerInterval);
    isRunning = false;
    timeWhite = DEFAULT_TIME;
    timeBlack = DEFAULT_TIME;
    activePlayer = 'white';
    updateUI();
    saveStateToOBR();
});

// 11. Клик по панели для смены хода
function switchTurn(player) {
    if (!isGM) return;
    if (activePlayer === player) return;

    activePlayer = player;
    updateUI();
    saveStateToOBR();
}

panelWhite.addEventListener('click', () => switchTurn('white'));
panelBlack.addEventListener('click', () => switchTurn('black'));


// 12. ИНИЦИАЛИЗАЦИЯ И СИНХРОНИЗАЦИЯ (Запускается при готовности Owlbear)
OBR.onReady(async () => {
    console.log("TOH Timer: Owlbear готов к работе!");
    
    // Проверяем, Мастер ли ты
    const role = await OBR.player.getRole();
    isGM = (role === 'GM');
    console.log("Статус пользователя: " + (isGM ? "Мастер (GM)" : "Игрок"));

    // Загружаем сохраненное время из комнаты
    const metadata = await OBR.room.getMetadata();
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
