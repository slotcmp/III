/**
 * @file src/modules/theme/theme_controller.js
 * @version 3.0.1-RELEASE-SMO-THEME-CONTROLLER-SYNCHRONOUS
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 106 (Theme).
 * Управляет селектором цветовых схем TUI-матрицы ядра без разрыва такта Event Loop.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createThemeMdlInstance } from "./theme_mdl.js";
import { createThemeViewInstance, renderThemeContent } from "./theme_view.js";

/**
 * Фабрика сборки мономорфного состояния PAC-контроллера тем оформления
 * @param {Object} appHostRef Ссылка на ядро хоста приложения
 * @param {string} slotIdStr Идентификатор целевого слота
 * @returns {Object} Запечатанная структура контроллера
 */
export function createThemeController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "106");
    const ctlState = { mdl: createThemeMdlInstance(), view: createThemeViewInstance(id), host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 106
 * @param {Object} facilityState Состояние активного прибора СМО
 * @param {string} intentStr Идентификатор прерывания
 * @param {Object} contextPayload Контекст транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций
 */
export function processSpecificThemeLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const mdl = pack.mdl; 
    const view = pack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    // СМО-ФАЗА ОТРЕСОВКИ: Полностью СИНХРОННЫЙ вызов отрисовщика из статического импорта
    if (intent === "SMO_PHASE_CONTENT") {
        renderThemeContent(view, mdl);
        return true;
    }

    switch (intent) {
        case "MOVE_CURSOR_DOWN":
            if (mdl.selectedIndex < mdl.themesList.length - 1) {
                mdl.selectedIndex++; 
                mdl._isDirty = true; 
                isMutated = true;
                _notifyKernelAboutThemeChange(facilityState, mdl);
            }
            break;
            
        case "MOVE_CURSOR_UP":
            if (mdl.selectedIndex > 0) {
                mdl.selectedIndex--; 
                mdl._isDirty = true; 
                isMutated = true;
                _notifyKernelAboutThemeChange(facilityState, mdl);
            }
            break;
            
        case "MOUSE_CLICK":
            if (contextPayload && contextPayload.localY !== undefined) {
                const targetIdx = Math.floor(contextPayload.localY) - 2;
                if (targetIdx >= 0 && targetIdx < mdl.themesList.length) {
                    mdl.selectedIndex = targetIdx; 
                    mdl._isDirty = true; 
                    isMutated = true;
                    _notifyKernelAboutThemeChange(facilityState, mdl);
                }
            }
            break;
            
        case "ROTATE_SLOT_STACK":
            mdl.selectedIndex = (mdl.selectedIndex + 1) % mdl.themesList.length;
            mdl._isDirty = true; 
            isMutated = true;
            _notifyKernelAboutThemeChange(facilityState, mdl);
            break;
    }
    return isMutated;
}

/**
 * Внутреннее уведомление верховного прибора 0 об аппаратной смене ANSI-маски границ
 */
function _notifyKernelAboutThemeChange(facilityState, mdl) {
    const host = facilityState.host;
    if (!host || typeof host.dispatch !== "function") return;
    const selectedTheme = mdl.themesList[mdl.selectedIndex];
    if (selectedTheme) {
        host.dispatch("0", "GLOBAL_THEME_CHANGED", { colorMask: selectedTheme.borderColorMsk });
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_controller.js
 * Время модификации: 18.08.2026 17:05:40 MSK
 */
