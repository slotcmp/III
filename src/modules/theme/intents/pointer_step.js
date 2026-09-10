/**
 * @file src/modules/theme/intents/pointer_step.js
 * @version 2.0.0-RELEASE-SMO-THEME-REDUCER-POINTER-STEP
 * @description Конкретный прикладной DOD-редьюсер дискретного циклического шага курсора тем (Слот 106).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Осуществляет относительный циклический сдвиг курсора выделения темы
 * @param {Object} triad Ссылка на абстрактную PAC-триаду Палитры тем
 * @param {string} intentStr Системное имя прерывания клавиатуры или колесика
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function reducePointerStep(triad, intentStr) {
    if (!triad || !triad.mdl) return false;

    const m = triad.mdl;
    const list = m.themesList || [];
    const totalThemesNum = list.length;
    if (totalThemesNum === 0) return false;

    const intent = String(intentStr || "");
    const oldIndex = Math.max(0, Math.floor(m.selectedIndex || 0));
    let nextIdx = oldIndex;

    // Исполняем циклический шаг по знаку прерывания
    if (intent === "MOVE_CURSOR_DOWN" || intent === "SCROLL_CONTENT_DOWN") {
        nextIdx = (oldIndex + 1) % totalThemesNum;
    } 
    else if (intent === "MOVE_CURSOR_UP" || intent === "SCROLL_CONTENT_UP") {
        nextIdx = (oldIndex - 1 + totalThemesNum) % totalThemesNum;
    }

    if (nextIdx !== oldIndex) {
        m.selectedIndex = nextIdx;
        m._isDirty = true;

        // При шаге стрелками клавиатуры сразу же транслируем перекраску рамок окон
        if (intent === "MOVE_CURSOR_DOWN" || intent === "MOVE_CURSOR_UP") {
            const targetThemeObj = list[nextIdx];
            if (targetThemeObj) {
                generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
                    colorMask: String(targetThemeObj.borderColorMsk || "gray"),
                    passiveMask: String(targetThemeObj.passiveColorMsk || "darkgray")
                }, "106");
            }
        }
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/intents/pointer_step.js
 * Время изменения: 10.09.2026 20:56:00 MSK
 */
