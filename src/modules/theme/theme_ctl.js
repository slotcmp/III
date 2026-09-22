/**
 * @file src/modules/theme/theme_ctl.js
 * @version 5.2.0-RELEASE-SMO-THEME-CTL-COMPACT-CLEAN
 * @description Системный PAC-контроллер обслуживания Палитры Тем (Канал 106).
 * ИСПРАВЛЕНО: Полная декомпозиция и тотальная зачистка неспецифических Ui-интентов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";
import { loadAppSettings } from "../../core/app_config.js";
import { processGenericUiKinematics } from "../../core/smo/window_manager.js";
import { reduceCollectionInject } from "./intents/collection_inject.js";

/**
 * Главная мономорфная точка входа Control-слота Палитры Тем
 */
export function processIntent(triad, intentStr, contextPayload) {
    if (!triad || !intentStr) return false;

    const intent = String(intentStr || "");

    // =================================================================
    // 1. СПЕЦИФИЧЕСКИЙ ДОМЕННЫЙ ИНТЕНТ (СМО-CLOCK ХОЛОДНЫЙ НАЛИВ)
    // =================================================================
    if (intent === "LOAD_SEQUENCE_COMPLETED") {
        const config = loadAppSettings();
        
        const defaultThemes = [
            { id: "classic",    name: "Classic Grey", borderColorMsk: "gray",      passiveColorMsk: "darkgray" },
            { id: "matrix",     name: "Matrix Green", borderColorMsk: "green",     passiveColorMsk: "black" },
            { id: "cyberpunk",  name: "Cyber Neon",   borderColorMsk: "magenta",   passiveColorMsk: "blue" },
            { id: "dracula",    name: "Dracula Vamp", borderColorMsk: "purple",    passiveColorMsk: "darkgray" },
            { id: "nordic",     name: "Nordic Frost", borderColorMsk: "cyan",      passiveColorMsk: "darkgray" }
        ];

        const appThemesPayload = (config && Array.isArray(config.themesList)) ? config.themesList : defaultThemes;
        return reduceCollectionInject(triad, appThemesPayload);
    }

    // =================================================================
    // 2. ДЕЛЕГИРОВАНИЕ КИНЕМАТИКИ (СТРЕЛКИ, КОЛЕСО, КЛИКИ) В WINDOW_MANAGER
    // =================================================================
    const facility = _gpssEngineState.facilitiesRegistry.get("106");
    return processGenericUiKinematics(facility, intent, contextPayload);
}

/**
 * Адаптер обратной совместимости для старого загрузчика рантайма
 */
export function processSpecificThemeLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;

    const pack = facilityState.viewStack;
    if (!Array.isArray(pack)) return false;

    const activeIdx = Math.max(0, Math.floor(facilityState.activeStackIdx || 0));
    const triad = pack[activeIdx];
    if (!triad) return false;

    return processIntent(triad, intentStr, contextPayload);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_ctl.js
 * Время изменения: 19.09.2026 01:06:12 MSK
 */
