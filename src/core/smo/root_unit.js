    /**
 * @file src/core/smo/root_unit.js
 * @version 5.4.0-RELEASE-SMO-ROOT-UNIT-DASHBOARD-CLICK-HYDRATED
 * @description Системный СМО-прибор Слота 0 (Инициализатор/Гидратор).
 * ИСПРАВЛЕН КЛИК ДАШБОРДА: Добавлен выстрел REGISTRATION_TAB_SPACE для Слота 101 на Канал 12.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeViewportBlit } from "../../io/terminal/blit.js";
import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { writeCoreLogMessageInline } from "./logger_io.js";
import { listenHardwareInterrupts, enterAlternativeHardwareBuffer } from "../../io/terminal/tty_hardware_gate.js";
import { processSpecificRootLogic as handleExtendedIntents } from "./root_intent_handler.js";

export async function processSpecificRootLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr);

    if (intent === "init") {
        return true; 
    }

    if (intent === "SYNCHRONIZE_DYNAMIC_SLOT" && contextPayload) {
        const slotMakerUrlStr = new URL("../slot_maker.js", import.meta.url).href;
        const { executeDeferredSynchronization } = await import(slotMakerUrlStr);
        
        if (typeof executeDeferredSynchronization === "function") {
            const success = executeDeferredSynchronization(kernel, contextPayload);
            if (success === true) {
                _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());
                if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
                return true;
            }
        }
    }

    if (intent === "LOAD_SEQUENCE_COMPLETED") {
        writeCoreLogMessageInline("[KERNEL_CLOCK] Финализация загрузки модулей. Считывание путей вкладок.\n");

        _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());

        let totalThemesCount = 12;

        const themeFacility = _gpssEngineState.facilitiesRegistry.get("106");
        if (themeFacility && Array.isArray(themeFacility.viewStack) && themeFacility.viewStack.length > 0) {
            const themeMdl = themeFacility.viewStack[0].mdl;
            if (themeMdl) {
                const currentDir = path.dirname(fileURLToPath(import.meta.url));
                const themesJsonPath = path.resolve(currentDir, "../../../config/themes.json");
                
                if (fs.existsSync(themesJsonPath)) {
                    const rawData = JSON.parse(fs.readFileSync(themesJsonPath, "utf8").trim());
                    for (let i = 0; i < rawData.length; i++) {
                        if (rawData[i]) Object.preventExtensions(rawData[i]);
                    }
                    themeMdl.themesList = rawData;
                    themeMdl.totalThemes = rawData.length;
                    totalThemesCount = rawData.length;
                    themeMdl._isDirty = true;
                }
            }
        }

// =================================================================
// ДОБАВЛЕНО: РЕГИСТРАЦИЯ КООРДИНАТ ТАБОВ ДЛЯ СЛOТА 200 И ОСТАЛЬНЫХ
// =================================================================
const tabMenuFacility = _gpssEngineState.facilitiesRegistry.get("12");
if (tabMenuFacility) {
    // Регистрируем вкладки Глобального Модификатора (Слот 200)
    // " DEFAULT " (2..10), " CTRL " (12..19), " SHIFT " (21..29), " ALT " (31..37)
    generateGpssTransaction("12", "REGISTRATION_TAB_SPACE", {
        slotIdNum: 200, tabsCount: 4,
        coords: [ 
            { start: 2, end: 10 }, 
            { start: 12, end: 19 }, 
            { start: 21, end: 29 }, 
            { start: 31, end: 37 } 
        ]
    }, "0");

    // Регистрируем вкладки Дашборда (Слот 101)
    generateGpssTransaction("12", "REGISTRATION_TAB_SPACE", {
        slotIdNum: 101, tabsCount: 2,
        coords: [ { start: 2, end: 8 }, { start: 9, end: 17 } ]
    }, "0");

    // Регистрируем вкладки Левого Проводника (Слот 102)
    generateGpssTransaction("12", "REGISTRATION_TAB_SPACE", {
        slotIdNum: 102, tabsCount: 4,
        coords: [ { start: 2, end: 7 }, { start: 8, end: 13 }, { start: 14, end: 19 }, { start: 20, end: 25 } ]
    }, "0");

    // Регистрируем вкладки Правого Проводника (Слот 103)
    generateGpssTransaction("12", "REGISTRATION_TAB_SPACE", {
        slotIdNum: 103, tabsCount: 3,
        coords: [ { start: 2, end: 8 }, { start: 9, end: 15 }, { start: 16, end: 22 } ]
    }, "0");
}

        const gateway = kernel.workerGateway;
        if (gateway && typeof gateway.triggerDirectoryIndexing === "function") {
            const f102 = _gpssEngineState.facilitiesRegistry.get("102");
            const f103 = _gpssEngineState.facilitiesRegistry.get("103");
            
            const activeIdx102 = Math.floor(f102?.activeStackIdx || 0);
            const activeIdx103 = Math.floor(f103?.activeStackIdx || 0);

            const path102 = f102?.viewStack[activeIdx102]?.mdl?.currentDirectoryPath || "C:/Windows";
            const path103 = f103?.viewStack[activeIdx103]?.mdl?.currentDirectoryPath || "C:/";

            gateway.triggerDirectoryIndexing("102", path102, activeIdx102);
            gateway.triggerDirectoryIndexing("103", path103, activeIdx103);
        }

        Object.preventExtensions(kernel.model.logicalState.panelRegistry);
        Object.preventExtensions(kernel.model.logicalState);
        Object.preventExtensions(kernel.model);
        Object.preventExtensions(kernel.virtualCanvasState);
        Object.preventExtensions(kernel);
        
        if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
        return true;
    }

    if (typeof handleExtendedIntents === "function") {
        return handleExtendedIntents(kernel, intent, contextPayload, currentTx);
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_unit.js
 * Время изменения: 04.09.2026 23:58:15 MSK
 */
