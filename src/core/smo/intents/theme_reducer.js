
/**
 * @file src/core/smo/intents/theme_reducer.js
 * @version 2.3.0-RELEASE-SMO-THEME-REDUCER-FLAT-REGISTER-COMPLIANT
 * @description Глобальный редьюсер смены цветовых масок темы оформления (Control-контур).
 * ИСПРАВЛЕНО МИГАНИЕ И ОТСУТСТВИЕ ЛОГА: Запись переведена на шинные регистры _activeThemeState с принудительным логированием.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState, _activeThemeState } from "../../smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../../io/terminal/flusher.js";

/**
 * Переключает глобальные ANSI-маски цвета в ОЗУ ядра и пинает все приборы на перерисовку рамы
 */
export function reduceGlobalThemeChange(kernel, payloadObj, currentTx) {
    if (!kernel || !payloadObj) return false;

    // Атомарно перезаписываем строковые алиасы в открытом плоском буфере шины СМО
    const nextActive = String(payloadObj.colorMask || "gray");
    const nextPassive = String(payloadObj.passiveMask || "darkgray");

    _activeThemeState.currentBorderAnsiMask = nextActive;
    _activeThemeState.currentPassiveAnsiMask = nextPassive;

    // Сбрасываем кэш блайтера, уничтожая старые битовые растры рамок в памяти
    if (typeof forceInvalidateShadowCanvas === "function") {
        forceInvalidateShadowCanvas();
    }

    if (kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    // ФОРСИРОВАННЫЙ ВЫВОД ПАСПОРТА ИНТЕНТА В СИСТЕМНЫЙ ЖУРНАЛ (СЛОТ 108) ВОСПРЕКИ МАСКАМ
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const forceLogStr = "[" + h + ":" + m + ":" + s + " Msk] [CORE_THEME] Успешная активация палитры: '" + nextActive + "' | Пассивные окна: '" + nextPassive + "'\n";
    generateGpssTransaction("108", "ADD_LOG_ENTRY", forceLogStr, "106");

    // ВЕЕРНАЯ ШИРОКОВЕЩАТЕЛЬНАЯ РАССЫЛКА (BROADCAST PULSE) НА ШИНУ СМО
    const keys = _gpssEngineState.facilitiesKeysCached;
    const len = keys.length;

    for (let i = 0; i < len; i++) {
        const slotIdStr = keys[i];
        if (slotIdStr !== "0" && slotIdStr !== "1" && slotIdStr !== "4" && slotIdStr !== "9" && slotIdStr !== "14") {
            generateGpssTransaction(slotIdStr, "UPDATE_THEME_MASK", payloadObj, "0");
        }
    }

    generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/theme_reducer.js
 * Время изменения: 06.09.2026 18:01:45 MSK
 */