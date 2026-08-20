/**
 * @file src/core/slot_maker.js
 * @version 6.0.0-RELEASE-SMO-IOC-ULTRA-DYNAMIC
 * @description Абсолютно динамическая IoC-фабрика сборки слотов (PAC / Control-контур).
 * СВЕРХДИНАМИКА: Имена файлов, фабрик и воркеров полностью собираются и вычисляются в рантайме.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { registerGpssFacility, _gpssEngineState, generateGpssTransaction } from "./smo/bus.js";
import { createAbstractFacility } from "./smo/facility_pipeline.js";

/**
 * ФАЗА 1: Асинхронный триггер сборки слота. Динамически вычисляет пути на основе layout.json.
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {string} slotIdStr Идентификатор целевого слота (например, "105")
 * @param {string} domainNameStr Наименование компонента (например, "command")
 */
export function assembleSlot(kernel, slotIdStr, domainNameStr) {
    if (!kernel || !slotIdStr || !domainNameStr) return;

    const cleanDomain = String(domainNameStr).trim().toLowerCase();
    const slotId = String(slotIdStr).trim();

    // Парадигма соглашения путей: src/modules/[domain]/[domain]_ctl.js
    const targetModulePathStr = "../modules/" + cleanDomain + "/" + cleanDomain + "_ctl.js";

    // Запускаем асинхронный импорт файла триады
    import(targetModulePathStr)
        .then((resolvedModule) => {
            if (!resolvedModule) return;

            let foundWorkerFn = null;
            let foundFactoryFn = null;

            // БЕЗМУСОРНЫЙ СБОР ИМЕН И ССЫЛОК (0% RegExp): Сканируем ключи экспорта модуля
            const moduleKeys = Object.keys(resolvedModule);
            const keysLen = moduleKeys.length;

            for (let i = 0; i < keysLen; i++) {
                const keyStr = String(moduleKeys[i]);
                
                // Ищем воркер прерываний: имя функции обязано начинаться с "process"
                if (keyStr.substring(0, 7) === "process") {
                    foundWorkerFn = resolvedModule[keyStr];
                }
                // Ищем фабрику контроллера: имя функции обязано начинаться с "create"
                else if (keyStr.substring(0, 6) === "create") {
                    foundFactoryFn = resolvedModule[keyStr];
                }
            }

            if (!foundWorkerFn || !foundFactoryFn) return;

            // Упаковываем полностью вычисленные ссылки в транспортный контейнер
            const asyncPayload = {
                slotId: slotId,
                cleanDomain: cleanDomain,
                workerFn: foundWorkerFn,
                factoryFn: foundFactoryFn
            };
            Object.preventExtensions(asyncPayload);

            // Выстреливаем тактовый транзакт. Синхронизация и впекание — на СЛЕДУЮЩЕМ такте СМО!
            generateGpssTransaction("0", "SYNCHRONIZE_DYNAMIC_SLOT", asyncPayload);
        })
        .catch((err) => {
            if (_gpssEngineState.runtime) {
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[IOC_DYNAMIC_ERROR] Сбой сборки " + targetModulePathStr + " | Стек: " + String(err.message));
            }
        });
}

/**
 * ФАЗА 2: Синхронная финализация и атомарное впекание триады на шину (Вызывается на следующем такте СМО)
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {Object} payload Контекст подгруженных функций из транзакта Фазы 1
 * @returns {boolean} Флаг успешности проведения мутации
 */
export function executeDeferredSynchronization(kernel, payload) {
    if (!kernel || !payload || !payload.slotId || !payload.cleanDomain) return false;

    const slotId = payload.slotId;
    const cleanDomain = payload.cleanDomain;
    const specificWorkerFn = payload.workerFn;
    const createControllerFn = payload.factoryFn;

    if (typeof specificWorkerFn !== "function" || typeof createControllerFn !== "function") return false;

    const registry = kernel.model?.logicalState?.panelRegistry;
    const targetSlotBlank = registry ? registry[slotId] : null;

    // 1. СИНХРОННАЯ СБОРКА АБСТРАКТНОГО ПРИБОРА ОБСЛУЖИВАНИЯ СМО
    const abstractFacility = createAbstractFacility(kernel, slotId, specificWorkerFn);
    if (!abstractFacility) return false;

    // 2. ИНЖЕКЦИЯ СТАНДАРТИЗИРОВАННОЙ ТРИАДЫ ИЗ ПОДГРУЖЕННОГО КОНТРОЛЛЕРА
    const fatControllerInstance = createControllerFn(kernel, slotId);
    if (!fatControllerInstance) return false;

    abstractFacility.viewStack = fatControllerInstance;

    // 3. СИНХРОНИЗАЦИЯ УКАЗАТЕЛЕЙ ПАМЯТИ: Связываем регистры с описанием прибора СМО
    if (targetSlotBlank) {
        targetSlotBlank.viewStack = fatControllerInstance;
        targetSlotBlank.advanceFacility = abstractFacility.advanceFacility;
        
        abstractFacility.displayIndex = Math.max(0, Math.floor(targetSlotBlank.displayIndex || 0));
        abstractFacility.activeStackIdx = Math.max(0, Math.floor(targetSlotBlank.activeStackIdx || 0));
        abstractFacility.componentType = String(targetSlotBlank.componentType || "slot");
    }

    // 4. ЖЕСТКАЯ РЕГИСТРАЦИЯ ПРИБОРА НА ТАКТОВОЙ ШИНЕ СМО ЯДРА
    const activeRegistryFacility = _gpssEngineState.facilitiesRegistry.get(slotId);
    if (activeRegistryFacility) {
        activeRegistryFacility.viewStack = abstractFacility.viewStack;
        activeRegistryFacility.specificAdvanceWorker = specificWorkerFn;
        activeRegistryFacility.advanceFacility = abstractFacility.advanceFacility;
        activeRegistryFacility.componentType = String(cleanDomain);
    } else {
        if (typeof registerGpssFacility === "function") {
            registerGpssFacility(slotId, abstractFacility);
        }
    }

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker.js
 * Время модификации: 20.08.2026 23:35:10 MSK
 * Номер для отката: #0820-STABLE-SYSTEM-MOUSE-CLASSIFIER
 */
