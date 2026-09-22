/**
 * @file src/core/smo/debug/vscrollbar_tact_test.js
 * @version 1.0.2-RELEASE-SMO-DIAG-VSCROLL-TACT-FINAL-PUSH
 * @description Автономный DOD-стенд пошагового аудита прохождения импульса скролла Канала 14.
 * ИСПРАВЛЕНО: Ликвидированы синтаксические ошибки обращения к ячейкам Uint8Array.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import fs from "node:fs";
import path from "node:path";
import { _gpssEngineState } from "../bus.js";
import { processSystemVScrollbarLogic } from "../vscrollbar_ctl.js";
import { createSystemTabMenuMdlInstance } from "../../../system/tab_menu/tab_menu_mdl.js";

export function runVScrollbarTactValidationTest() {
    const logsDir = path.resolve(process.cwd(), "./logs");
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFilePath = path.resolve(logsDir, "vscrollbar_debug.txt");

    let outStr = "======================================================================\n" +
                 "[DOD_TEST_BENCH] ЗАПУСК ТОТАЛЬНОГО АУДИТА ТАКТОВ КАНАЛА 14 И СЛОТА 12\n" +
                 "======================================================================\n";

    // 1. СТЕРЕОТИПИЗАЦИЯ И ГИДРАТАЦИЯ ТЕСТОВОЙ СРЕДЫ В ОЗУ ШИНЫ СМО
    const registry = _gpssEngineState.facilitiesRegistry;

    // Подменяем или гарантируем наличие модели Канала 12
    if (!registry.has("12")) {
        registry.set("12", {
            id: "12",
            componentType: "tab_menu",
            mdl: createSystemTabMenuMdlInstance()
        });
    }
    
    // Имитируем реальное состояние прибора 104 (FnBar)
    if (!registry.has("104")) {
        registry.set("104", {
            id: "104",
            slotId: "104",
            componentType: "fnbar",
            activeStackIdx: 0,
            viewStack: [
                { mdl: { _activeSubZone: 0 } },
                { mdl: { _activeSubZone: 0 } },
                { mdl: { _activeSubZone: 0 } },
                { mdl: { _activeSubZone: 0 } }
            ]
        });
    }

    // Имитируем реальное состояние прокси-слота 200 (Tabsbar)
    if (!registry.has("200")) {
        registry.set("200", {
            id: "200",
            slotId: "200",
            componentType: "tabsbar",
            activeStackIdx: 0,
            viewStack: [{ mdl: {} }]
        });
    }

    const f12 = registry.get("12");
    const f104 = registry.get("104");
    const f200 = registry.get("200");

    outStr += "СТАРТОВЫЙ СТEЙТ РЕГИСТРОВ ПЕРЕД СИМУЛЯЦИЕЙ:\n" +
              "   -> f104.activeStackIdx: " + f104.activeStackIdx + "\n" +
              "   -> f200.activeStackIdx: " + f200.activeStackIdx + "\n" +
              "   -> activeTabRegistry[104]: " + f12.mdl.activeTabRegistry[104] + "\n" +
              "   -> activeTabRegistry[200]: " + f12.mdl.activeTabRegistry[200] + "\n" +
              "----------------------------------------------------------------------\n";

    // 2. ИМИТАЦИЯ ИМПУЛЬСА КОЛЕСИКА МЫШИ ОТ MOUSE_FRAME_HANDLER (ROTATING DOWN)
    outStr += ">>> СИМУЛЯЦИЯ: Вращение колесика мыши (WHEEL_DOWN) над ушками -> ROTATE_STACK_DOWN >>>\n";
    
    const mockShuttlePayload = {
        targetSlotId: "200", // Луч мыши зафиксировал попадание в Слот 200
        localX: 30,          
        localY: 0
    };
    Object.preventExtensions(mockShuttlePayload);

    // Вызываем системный контроллер Канала 14 (Stateless Shuttle)
    const mockFacility14State = { id: "14", componentType: "vscrollbar", mdl: {} };
    
    // Запускаем сквозной такт!
    const isProcessed = processSystemVScrollbarLogic(mockFacility14State, "ROTATE_STACK_DOWN", mockShuttlePayload, null);

    outStr += "----------------------------------------------------------------------\n" +
              "РЕЗУЛЬТАТ ВЫПОЛНЕНИЯ processSystemVScrollbarLogic: " + isProcessed + "\n" +
              "----------------------------------------------------------------------\n";

    // 3. СЪЕМ И ИНСПЕКЦИЯ МУТИРОВАВШИХ СОСТОЯНИЙ В ОЗУ ПОСЛЕ ШЛЮЗА
    outStr += "ФИНИШНЫЙ СТEЙТ РЕГИСТРОВ ПОСЛЕ ПРОХОЖДЕНИЯ КОНВЕЙЕРА Window Manager:\n" +
              "   -> f104.activeStackIdx: " + f104.activeStackIdx + " (Ожидается: 1)\n" +
              "   -> f200.activeStackIdx: " + f200.activeStackIdx + " (Ожидается: 1)\n" +
              "   -> activeTabRegistry[104]: " + f12.mdl.activeTabRegistry[104] + " (Ожидается: 1)\n" +
              "   -> activeTabRegistry[200]: " + f12.mdl.activeTabRegistry[200] + " (Ожидается: 1)\n" +
              "----------------------------------------------------------------------\n";

    // Прецизионный гвард-анализ утечки типов
    if (f12.mdl.activeTabRegistry[104] === 0 && f104.activeStackIdx === 1) {
        outStr += "[КРИТИЧЕСКИЙ ДЕФЕКТ ОБНАРУЖЕН]: Физический индекс в фасилити 104 изменился,\n" +
                  "но бинарный массив activeTabRegistry[104] остался равен 0!\n" +
                  "Блайтер drawWindowTabsOverlay считывает 0 и принудительно гасит визуальное выделение ушек.\n";
    } else {
        outStr += "[СТАТУС КОНТУРА]: Синхронизация типов данных ОЗУ прошла успешно.\n";
    }
    
    outStr += "======================================================================\n";

    // Синхронный выжиг лога на накопитель
    const fd = fs.openSync(logFilePath, "w");
    fs.writeSync(fd, Buffer.from(outStr), 0, outStr.length, null);
    fs.closeSync(fd);
}