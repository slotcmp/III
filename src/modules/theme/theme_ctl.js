/**
 * @file src/modules/theme/theme_ctl.js
 * @version 3.1.1-RELEASE-SMO-THEME-CTL-STERILE
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 106 (Theme Selector).
 * ИСПРАВЛЕНА АДРЕСАЦИЯ: Имена регистров синхронизированы со статической DOD-фабрикой slot_maker.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";

/**
 * Старая фабрика сборки контроллера сохранена для совместимости автоскана V8, 
 * но рантайм GEN III использует ленивый монтаж через slot_maker.js.
 */
export function createThemeController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "106");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Чистая процедура редукции прерываний Слота 106
 */
export function processSpecificThemeLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const m = pack.mdl; 
    const intent = String(intentStr || "");
    let isMutated = false;

    // Ветвление по кодам системных и прикладных интентов
    switch (intent) {
        case "MOVE_CURSOR_DOWN":
        case "SELECT_NEXT_THEME":
            // ИСПРАВЛЕНИЕ: Читаем мономорфный регистр themesList, задекларированный в slot_maker.js
            if (m.themesList && m.themesList.length > 0) {
                // Извлекаем текущий индекс селектора из регистра модели
                const currentIdx = Math.max(0, Math.floor(m.selectedIndex || 0));
                const totalThemesNum = Math.floor(m.totalThemes || m.themesList.length);
                
                // Сдвигаем каретку выбора по кольцевому буферу
                const nextIdx = (currentIdx + 1) % totalThemesNum;
                m.selectedIndex = nextIdx;
                
                const targetThemeObj = m.themesList[nextIdx];
                if (targetThemeObj && facilityState.host) {
                    const nextColorMaskStr = String(targetThemeObj.borderColorMsk || "gray");
                    
                    // Бросаем транзакцию прерывания ядра на смену глобальной палитры рамок
                    generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
                        colorMask: nextColorMaskStr 
                    });
                }
                
                m._isDirty = true;
                isMutated = true;
            }
            break;
            
        case "UPDATE_THEME_MASK":
            // Прерывание от Канала 0 при изменении глобальной палитры
            m._isDirty = true;
            isMutated = true;
            break;
    }
    
    return isMutated;
}
