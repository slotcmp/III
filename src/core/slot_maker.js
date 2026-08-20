/**
 * @file src/core/slot_maker.js
 * @version 3.1.0-RELEASE-SMO-IOC-FACTORY-CLI-PROVEN
 * @description Статическая IoC-фабрика сборки слотов (PAC / Control-контур).
 * ИСПРАВЛЕН CLI-ВВОД: Внедрена прямая инжекция обработчиков очередей в обход блокировок V8.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { loadAppSettings } from "./app_config.js";
import { registerGpssFacility, _gpssEngineState } from "./smo/bus.js";
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

    // СИНХРОНИЗАЦИЯ УКАЗАТЕЛЕЙ ПАМЯТИ: Связываем регистры с описанием прибора СМО
    if (targetSlotBlank) {
        targetSlotBlank.viewStack = fatControllerInstance.viewStack || fatControllerInstance;
        targetSlotBlank.advanceFacility = abstractFacility.advanceFacility;
        
        abstractFacility.displayIndex = Math.max(0, Math.floor(targetSlotBlank.displayIndex || 0));
        abstractFacility.activeStackIdx = Math.max(0, Math.floor(targetSlotBlank.activeStackIdx || 0));
        abstractFacility.componentType = String(targetSlotBlank.componentType || "slot");
    }

    // 3. ПРЕЦИЗИОННОЕ РЕШЕНИЕ ДЛЯ CLI: Извлекаем уже созданный в бутстрапе запечатанный прибор
    // и напрямую заменяем ссылки на вью-стек и рабочую функцию продвижения очередей
    const activeRegistryFacility = _gpssEngineState.facilitiesRegistry.get(slotId);
    if (activeRegistryFacility) {
        activeRegistryFacility.viewStack = abstractFacility.viewStack;
        activeRegistryFacility.specificAdvanceWorker = specificWorkerFn;
        // Перенаправляем продвигатель на реальный конвейер обработки из facility_pipeline.js
        activeRegistryFacility.advanceFacility = abstractFacility.advanceFacility;
    } else {
        // Если прибора не было на шине — регистрируем его штатно
        if (typeof registerGpssFacility === "function") {
            registerGpssFacility(slotId, abstractFacility);
        }
    }

    return abstractFacility;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker.js
 * Время модификации: 20.08.2026 21:42:00 MSK
 */
