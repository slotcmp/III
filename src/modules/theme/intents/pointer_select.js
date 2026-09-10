/**
 * @file src/modules/theme/intents/pointer_select.js
 * @version 2.0.0-RELEASE-SMO-THEME-REDUCER-POINTER-SELECT
 * @description Конкретный прикладной DOD-редьюсер абсолютного выбора темы по клику мыши (Слот 106).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";

/**
 * Рассчитывает строку попадания клика, меняет тему и обновляет глобальные TUI-маски
 * @param {Object} triad Ссылка на абстрактную PAC-триаду Палитры тем
 * @param {Object} payload Данные физических координат клика мыши
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function reducePointerSelect(triad, payload) {
    if (!triad || !triad.mdl || !triad.view || !payload || payload.localY === undefined) return false;

    const m = triad.mdl;
    const v = triad.view;
    const clickY = Math.floor(payload.localY);

    const list = m.themesList || [];
    const totalThemesNum = list.length;
    if (totalThemesNum === 0) return false;

    // Контент начинается строго с Y = 3 (строки 0, 1, 2 заняты рамкой и ушками)
    if (clickY >= 3) {
        const clickOffset = clickY - 3;
        
        // Безаллокационно считываем живое смещение прокрутки Палитры из модели Канала 14
        const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
        const currentOffset = vScrollMdl ? Math.max(0, Math.floor(vScrollMdl.viewportOffsetRegistry[106] || 0)) : 0;
        
        // Вычисляем абсолютный индекс темы в ОЗУ
        const targetThemeIdx = currentOffset + clickOffset;
        
        if (targetThemeIdx >= 0 && targetThemeIdx < totalThemesNum) {
            m.selectedIndex = targetThemeIdx;
            m._isDirty = true;

            const targetThemeObj = list[targetThemeIdx];
            if (targetThemeObj) {
                // Выстреливаем команду реактивной перекраски рамок окон на глобальную шину
                generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
                    colorMask: String(targetThemeObj.borderColorMsk || "gray"),
                    passiveMask: String(targetThemeObj.passiveColorMsk || "darkgray")
                }, "106");
            }
            
            // Заново синхронизируем ползунок прокрутки под новую позицию курсора
            const maxVisibleRows = Math.max(1, Math.floor((v.height || 16) - 5));
            generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
                targetSlotId: "106", 
                totalItems: totalThemesNum, 
                maxVisibleRows: maxVisibleRows
            }, "106");

            return true;
        }
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/intents/pointer_select.js
 * Время изменения: 10.09.2026 20:55:00 MSK
 */
