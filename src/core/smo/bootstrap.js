/**
 * @file src/core/smo/bootstrap.js
 * @version 1.1.1-RELEASE-SMO-CORE-BOOTSTRAP-SLOT103-HYDRATED
 * @description Инфраструктурный оркестратор холодного пуска ядра СМО (Control-контур).
 * ИСПРАВЛЕНА ПУСТОТА 103: Инжектирован принудительный стартовый пинок VFS-индексации для обеих панелей.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { _globalRuntimeGeometryRegistry } from "../registry/geometry.js";
import { createHostState } from "../app_host_factory.js";
import { processSpecificLoaderLogic } from "./loader_unit.js";

import { pass1MeasureConstraints } from "../layout/measurer.js";
import { pass3CalculatePositions } from "../layout/calculator.js";

/**
 * Осуществляет мономорфную преаллокацию и запускает первичный импульс шины СМО
 */
export function initializeCoreRuntime(topologyTree, configData, cols, rows) {
    _globalRuntimeGeometryRegistry["root"] = { x: 0, y: 0, w: cols, h: rows };

    const kernel = createHostState(_gpssEngineState, processSpecificLoaderLogic);
    
    kernel.layoutTopologyTree = topologyTree;
    kernel.calculatedGeoMap = _globalRuntimeGeometryRegistry;
    kernel.model.logicalState.appSettings = configData;

    pass1MeasureConstraints(topologyTree, cols, rows);
    pass3CalculatePositions(topologyTree, 0, 0, cols, rows, _globalRuntimeGeometryRegistry, null);
    kernel.updateGeometryMap(_globalRuntimeGeometryRegistry);

    if (kernel.boot) {
        kernel.boot();
    }

    return kernel;
}

/**
 * Атомарно выстреливает стартовый транзакт на полностью прогретую и налитую шину приборов
 */
export function triggerPrimaryGpssPulse(kernel) {
    if (!kernel) return;
    
    kernel.model.logicalState.focusedSlotId = "105"; 
    
    if (kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    // 1. Выстреливаем тактовый импульс Лоадера. Гвард Канала 11 открыт.
    generateGpssTransaction("11", "BOOT_LAYOUT_TREE", null);
    
    // 2. Выстреливаем первичный тактовый импульс СМО
    generateGpssTransaction("0", "init", null);

    // =================================================================
    // ИСПРАВЛЕНИЕ ПУСТОТЫ 103: ИНЛАЙНОВЫЙ НАЧАЛЬНЫЙ ПИНОК ДЛЯ ОБЕИХ ПАНЕЛЕЙ
    // =================================================================
    // Считываем преаллоцированные DOD-настройки путей напрямую из логического состояния модели
    const configData = kernel.model?.logicalState?.appSettings;
    
    if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
        const path102 = String(configData?.s102_paths?.[0] || "C:/");
        const path103 = String(configData?.s103_paths?.[0] || "C:/");

        // Принудительно отправляем параллельные IPC-запросы воркеру VFS при буте
        kernel.workerGateway.triggerDirectoryIndexing("102", path102, 0);
        kernel.workerGateway.triggerDirectoryIndexing("103", path103, 0);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/bootstrap.js
 * Время модификации: 03.09.2026 16:34:00 MSK
 */
