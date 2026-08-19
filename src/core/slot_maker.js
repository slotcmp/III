/**
 * @file src/core/slot_maker.js
 * @version 3.0.2-RELEASE-DOD-FORK-CTL-FIXED
 * @description Статическая IoC-фабрика сборки слотов (PAC / Control-контур).
 * Пути импортов прецизионно перенаправлены на физические файлы *_ctl.js для устранения крашей.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { loadAppSettings } from "./app_config.js";
import { registerGpssFacility } from "./smo/bus.js";
import { createAbstractFacility } from "./smo/facility_pipeline.js";

import { createCommandController, processSpecificCommandLogic } from "../modules/command/command_ctl.js";
import { createDashboardController, processSpecificDashboardLogic } from "../modules/dashboard/dashboard_ctl.js";
import { createLoggerController, processSpecificLoggerLogic } from "../modules/logger/logger_ctl.js";
import { createExplorerController, processSpecificExplorerLogic } from "../modules/explorer/explorer_ctl.js";
import { createThemeController, processSpecificThemeLogic } from "../modules/theme/theme_ctl.js";

/**
 * Специфицирует абстрактный прибор, инжектирует триаду памяти и регистрирует в СМО
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {string} slotIdStr Идентификатор целевого слота
 * @param {string} domainNameStr Наименование системного домена компонента
 * @returns {Object|null} Скомпилированный запечатанный прибор обслуживания
 */
export function assembleSlot(kernel, slotIdStr, domainNameStr) {
    if (!kernel || !slotIdStr || !domainNameStr) return null;

    const cleanDomain = String(domainNameStr).trim();
    const slotId = String(slotIdStr).trim(); 

    const registry = kernel.model?.logicalState?.panelRegistry;
    const targetSlotBlank = registry ? registry[slotId] : null;

    let specificWorkerFn = null;
    let createControllerFn = null;

    if (cleanDomain === "command") {
        specificWorkerFn = processSpecificCommandLogic;
        createControllerFn = createCommandController;
    } else if (cleanDomain === "dashboard") {
        specificWorkerFn = processSpecificDashboardLogic;
        createControllerFn = createDashboardController;
    } else if (cleanDomain === "logger") {
        specificWorkerFn = processSpecificLoggerLogic;
        createControllerFn = createLoggerController;
    } else if (cleanDomain === "explorer") {
        specificWorkerFn = processSpecificExplorerLogic;
        createControllerFn = createExplorerController;
    } else if (cleanDomain === "theme") {
        specificWorkerFn = processSpecificThemeLogic;
        createControllerFn = createThemeController;
    }

    if (typeof specificWorkerFn !== "function" || typeof createControllerFn !== "function") return null;

    // 1. СБОРКА АБСТРАКТНОГО ПРИБОРА ОБСЛУЖИВАНИЯ СМО
    const abstractFacility = createAbstractFacility(kernel, slotId, specificWorkerFn);
    if (!abstractFacility) return null;

    // 2. ИНЖЕКЦИЯ ПРИКЛАДНОЙ DOD-ТРИАДЫ ПАМЯТИ
    const fatControllerInstance = createControllerFn(kernel, slotId);
    if (!fatControllerInstance) return null;

    abstractFacility.viewStack = fatControllerInstance.viewStack || fatControllerInstance;

    // СИНХРОНИЗАЦИЯ УКАЗАТЕЛЕЙ ПАМЯТИ: Наливаем регистры строго в форму прибора СМО
    if (targetSlotBlank) {
        targetSlotBlank.viewStack = fatControllerInstance.viewStack || fatControllerInstance;
        targetSlotBlank.advanceFacility = abstractFacility.advanceFacility;
        
        abstractFacility.displayIndex = Math.max(0, Math.floor(targetSlotBlank.displayIndex || 0));
        abstractFacility.activeStackIdx = Math.max(0, Math.floor(targetSlotBlank.activeStackIdx || 0));
        abstractFacility.componentType = String(targetSlotBlank.componentType || "slot");
    }

    // 3. ЖЕСТКАЯ РЕГИСТРАЦИЯ ПРИБОРА НА ТАКТОВОЙ ШИНЕ СМО ЯДРА
    if (typeof registerGpssFacility === "function") {
        registerGpssFacility(slotId, abstractFacility);
    }

    return abstractFacility;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker.js
 * Время модификации: 18.08.2026 19:36:10 MSK
 */
