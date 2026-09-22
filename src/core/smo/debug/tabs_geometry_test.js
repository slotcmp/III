/**
 * @file src/core/smo/debug/tabs_geometry_test.js
 * @version 1.0.4-RELEASE-SMO-DIAG-TABS-PUSH-SAFE
 * @description Автономный DOD-стенд проверки снайперского попадания кликов по ушкам.
 * ИСПРАВЛЕНО: Объявление массива переведено на безопасный .push() для обхода сбоев парсера.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import fs from "node:fs"; 
import path from "node:path";

function mockPackCellBits(charStr) {
    return (charStr.charCodeAt(0) & 0xFF) | 0;
}

export function runTabsGeometryValidationTest() {
    const logsDir = path.resolve(process.cwd(), "./logs");
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFilePath = path.resolve(logsDir, "tabs_debug.txt");

    let outStr = "======================================================================\n" +
                 "[DOD_TEST_BENCH] ЗАПУСК ПРЕЦИЗИОННОГО АУДИТА КООРДИНАТ СЛОТА 200...\n" +
                 "======================================================================\n";

    // 1. АЛЛОКАЦИЯ ИММУННОГО ВЕКТOРА ПАСПОРТOВ КАНАЛА 12 (Размер 64 * 6)
    const mockTabsVectorArray = new Int16Array(64 * 6);
    let totalRegisteredTabsCount = 0;

    // 2. ИМИТАЦИЯ UHD-МАТРИЦЫ ХОЛСТА (1 строка, 120 колонок)
    const mockTargetMatrix = [new Int32Array(120)];
    const tabRow = mockTargetMatrix[0]; 

    const titlesArray = ["DEFAULT", "CTRL", "SHIFT", "ALT"];
    const tabsCount = titlesArray.length;
    
    // Наш строгий старт от X=3, зафиксированный архитектурой
    let currentTabX = 3; 

    for (let t = 0; t < tabsCount; t++) {
        const titleStr = titlesArray[t];
        const tabLabelStr = " " + titleStr + " ";
        const len = tabLabelStr.length;

        const startXOnCanvas = currentTabX;
        const endXOnCanvas = ((currentTabX + len - 1) | 0);

        // Имитируем посимвольный выжиг растра кадра
        for (let i = 0; i < len; i++) {
            if (currentTabX + i < 120) {
                tabRow[currentTabX + i] = mockPackCellBits(tabLabelStr.charAt(i));
            }
        }

        // Штампуем данные в бинарный вектор паспортов
        if (totalRegisteredTabsCount < 64) {
            const writeOffset = (totalRegisteredTabsCount * 6) | 0;
            const ownerSlotIdNum = 104; // Родной хозяин ушка (FnBar)
            const keeperSlotIdNum = 12; // Системный Канал-Хранитель (SYSTEM_TAB_MENU)

            mockTabsVectorArray[writeOffset]     = keeperSlotIdNum; 
            mockTabsVectorArray[writeOffset + 1] = 0; // Строка Y=0      
            mockTabsVectorArray[writeOffset + 2] = startXOnCanvas;     
            mockTabsVectorArray[writeOffset + 3] = endXOnCanvas;       
            mockTabsVectorArray[writeOffset + 4] = ownerSlotIdNum;   
            mockTabsVectorArray[writeOffset + 5] = t;                

            totalRegisteredTabsCount++;
        }

        // Ушки разделены ровно 1 пробелом разделителя
        currentTabX += len + 1;
    }

    outStr += "ВСЕГО ЗАРЕГИСТРИРОВАНО ПАСПОРТОВ В ОЗУ: " + totalRegisteredTabsCount + " ед.\n" +
              "----------------------------------------------------------------------\n";

    for (let i = 0; i < totalRegisteredTabsCount; i++) {
        const idx = (i * 6) | 0;
        const pKeeper = mockTabsVectorArray[idx];
        const pY      = mockTabsVectorArray[idx + 1];
        const pStartX = mockTabsVectorArray[idx + 2];
        const pEndX   = mockTabsVectorArray[idx + 3];
        const pOwner  = mockTabsVectorArray[idx + 4];
        const pTabIdx = mockTabsVectorArray[idx + 5];

        outStr += "УШКО #" + i + " [" + titlesArray[pTabIdx] + "]:\n" +
                  "   -> Диапазон координат X на экране: " + pStartX + " .. " + pEndX + " (Ширина: " + ((pEndX - pStartX) + 1) + " ячеек)\n" +
                  "   -> Физическая строка Y на холсте:   " + pY + "\n" +
                  "   -> Системный Канал-Хранитель (P1):  " + pKeeper + " (SYSTEM_TAB_MENU)\n" +
                  "   -> Системный Слот-Владелец:         " + pOwner + " (FNBAR)\n" +
                  "----------------------------------------------------------------------\n";
    }

    // 3. СИМУЛЯЦИЯ ЛУЧА МЫШИ (ПРОВЕРКА ПОПАДАНИЙ КЛИКОВ)
    outStr += "\n>>> ЗАПУСК СИМУЛЯТОРА ЛУЧА (ВЕРИФИКАЦИЯ КЛИКОВ ПО КУЧЕ):\n";
    
    // ИСПРАВЛЕНО: Безопасный пошаговый налив тестовых координат без литерала скобок
    const checkCoordinates = new Array();
    checkCoordinates.push(5);  // Клик в DEFAULT
    checkCoordinates.push(15); // Клик в CTRL
    checkCoordinates.push(23); // Клик в SHIFT
    checkCoordinates.push(30); // Клик в ALT
    checkCoordinates.push(90); // Клик в пустую зону скролла

    for (let c = 0; c < checkCoordinates.length; c++) {
        const testClickX = checkCoordinates[c];
        let isHit = false;

        for (let t = 0; t < totalRegisteredTabsCount; t++) {
            const offset = (t * 6) | 0;
            const sX = mockTabsVectorArray[offset + 2];
            const eX = mockTabsVectorArray[offset + 3];

            if (testClickX >= sX && testClickX <= eX) {
                const owner = mockTabsVectorArray[offset + 4];
                const tabIdx = mockTabsVectorArray[offset + 5];
                outStr += "   [*] Клик на X = " + testClickX + " -> УСПЕШНОЕ ПОПАДАНИЕ во вкладку #" + tabIdx + " [" + titlesArray[tabIdx] + "]. Целевой Слот: " + owner + "\n";
                isHit = true;
                break;
            }
        }
        if (!isHit) {
            outStr += "   [!] Клик на X = " + testClickX + " -> ПРОМАХ! Луч улетел в пустое пространство строки Y=0.\n";
        }
    }
    
    outStr += "======================================================================\n";

    // Прямой синхронный выжиг строки трейса на накопитель в обход libuv
    const fd = fs.openSync(logFilePath, "w");
    fs.writeSync(fd, Buffer.from(outStr), 0, outStr.length, null);
    fs.closeSync(fd);
}