/**
 * @file src/core/smo/bootstrap.js
 * @version 1.0.6-RELEASE-SMO-CORE-BOOTSTRAP-FIXED
 * @description Инфраструктурный оркестратор холодного пуска ядра СМО (Control-контур).
 * ИСПРАВЛЕНА СИНХРОНИЗАЦИЯ: Пуск Лоадера перенесен в triggerPrimaryGpssPulse после наката дерева топологии.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { registerGpssFacility, generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { _globalRuntimeGeometryRegistry } from "../registry/geometry.js";
import { createHostState } from "../app_host_factory.js";
import { assembleKeyboardUnit } from "./keyboard_worker_unit.js";

// Импортируем 3-проходной каскад геометрии
import { pass1MeasureConstraints } from "../layout/measurer.js";
import { pass3CalculatePositions } from "../layout/calculator.js";
import { balanceGeometryMap } from "../layout/layout_balancer.js";

/**
 * Осуществляет мономорфную преаллокацию и запускает первичный импульс шины СМО
 * @param {Object} topologyTree Считанное из JSON дерево флекс-топологии окон
 * @param {Object} configData Настройки конфигурации app_config.json
 * @param {number} cols Физическая ширина консоли Windows
 * @param {number} rows Физическая высота консоли Windows
 * @returns {Object} Полностью готовый рантайм-хост ядра
 */
export function initializeCoreRuntime(topologyTree, configData, cols, rows) {
    _globalRuntimeGeometryRegistry["root"] = { x: 0, y: 0, w: cols, h: rows };

    // Передаем глобальный стейт движка в фабрику хоста
    const kernel = createHostState(_gpssEngineState);
    
    // НАКАТ ДАННЫХ В ОЗУ РЕГИСТРЫ СТРОГО ДО ПЕРВОГО ИМПУЛЬСА
    kernel.layoutTopologyTree = topologyTree;
    kernel.calculatedGeoMap = _globalRuntimeGeometryRegistry;
    kernel.model.logicalState.appSettings = configData;

    // Монтируем Канал 4 клавиатуры до общего пуска
    if (typeof assembleKeyboardUnit === "function") {
        registerGpssFacility("4", assembleKeyboardUnit(kernel));
    }

    // Первотактный каскадный прогресс флекс-матрицы знакомест
    pass1MeasureConstraints(topologyTree, cols, rows);
    pass3CalculatePositions(topologyTree, 0, 0, cols, rows, _globalRuntimeGeometryRegistry, null);
    balanceGeometryMap(_globalRuntimeGeometryRegistry, rows, cols);
    kernel.updateGeometryMap(_globalRuntimeGeometryRegistry);

    // Синхронный запуск базовых приборов
    if (kernel.boot) {
        kernel.boot();
    }

    return kernel;
}

/**
 * Атомарно выстреливает стартовый транзакт на полностью прогретую и налитую шину приборов
 * @param {Object} kernel Ссылка на рантайм хоста
 */
export function triggerPrimaryGpssPulse(kernel) {
    if (!kernel) return;
    
    // ПРЕЦИЗИОННЫЙ ВЗВОД ФОКУСА: CLI жестко фиксируется в ОЗУ как активное окно при старте
    kernel.model.logicalState.focusedSlotId = "105"; 
    
    if (kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    // ИСПРАВЛЕНИЕ: Выстреливаем тактовый импульс Лоадера СТРОГО здесь!
    // Дерево layoutTopologyTree гарантированно налито в память, гвард Канала 11 открыт.
    generateGpssTransaction("11", "BOOT_LAYOUT_TREE", null);
    
    // Выстреливаем первичный тактовый импульс СМО
    generateGpssTransaction("0", "init", null);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/bootstrap.js
 * Время модификации: 22.08.2026 08:06:00 MSK
 */
