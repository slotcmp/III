/**
 * @file src/core/smo/bootstrap.js
 * @version 1.2.1-RELEASE-SMO-CORE-BOOTSTRAP-PULSE-CONNECTED
 * @description Оркестратор холодного пуска ядра СМО. Исправлен пропуск такта геометрии при буте.
 */
import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { _globalRuntimeGeometryRegistry } from "../registry/geometry.js";
import { createHostState } from "../app_host_factory.js";
import { processSpecificLoaderLogic } from "./loader_unit.js";
import { pass1MeasureConstraints } from "../layout/measurer.js";
import { pass3CalculatePositions } from "../layout/calculator.js";

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

export function triggerPrimaryGpssPulse(kernel) {
    if (!kernel) return;
    
    kernel.model.logicalState.focusedSlotId = "105"; 
    
    if (kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    generateGpssTransaction("11", "BOOT_LAYOUT_TREE", null);
    generateGpssTransaction("0", "init", null);

    // =================================================================
    // ИСПРАВЛЕНО: Передаем ЖИВУЮ геометрию вместо null для активации Канала 9!
    // =================================================================
    generateGpssTransaction("9", "INJECT_GEO_MAP", _globalRuntimeGeometryRegistry, "0");

    generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");

    const configData = kernel.model?.logicalState?.appSettings;
    if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
        const path102 = String(configData?.s102_paths?.[0] || "C:/");
        const path103 = String(configData?.s103_paths?.[0] || "C:/");

        kernel.workerGateway.triggerDirectoryIndexing("102", path102, 0);
        kernel.workerGateway.triggerDirectoryIndexing("103", path103, 0);
    }
}