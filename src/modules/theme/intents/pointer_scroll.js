/**
 * @file src/modules/theme/intents/pointer_scroll.js
 * @version 2.0.0-RELEASE-SMO-THEME-REDUCER-POINTER-SCROLL
 * @description Конкретный прикладной DOD-редьюсер синхронизации темы при сдвиге ползунка прокрутки (Канал 106).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Атомарно мутирует выбранный индекс темы по нотификации скроллбара и обновляет TUI-маски
 * @param {Object} triad Ссылка на абстрактную PAC-триаду Палитры тем
 * @param {Object} payload Данные сдвига индекса от Канала 14
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function reducePointerScroll(triad, payload) {
    if (!triad || !triad.mdl || !payload) return false;

    const m = triad.mdl;
    const list = m.themesList || [];
    const totalThemesNum = list.length;
    if (totalThemesNum === 0) return false;

    // Считываем и жестко страхуем индекс в границах физического ОЗУ-массива тем
    m.selectedIndex = Math.max(0, Math.min(totalThemesNum - 1, Math.floor(payload.selectedIndex || 0)));
    m._isDirty = true;

    // Извлекаем целевой объект темы и выстреливаем широковещательный транзакт смены масок
    const targetThemeObj = list[m.selectedIndex];
    if (targetThemeObj) {
        generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
            colorMask: String(targetThemeObj.borderColorMsk || "gray"),
            passiveMask: String(targetThemeObj.passiveColorMsk || "darkgray")
        }, "106");
    }

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/intents/pointer_scroll.js
 * Время изменения: 10.09.2026 20:53:00 MSK
 */
