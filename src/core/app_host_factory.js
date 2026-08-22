/**
 * @file src/core/app_host_factory.js
 * @version 7.1.3-RELEASE-SMO-HOST-FACTORY-STRICT-DOD-CLEAN
 * @description Фабрика сборки ОЗУ-состояния ядра (PAC / Abstraction).
 * ИСПРАВЛЕН БУТСТРАП: Пинок лоадера вынесен из фабрики для защиты от гонки пустых регистров layout.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createAbstractFacility } from "./smo/facility_pipeline.js";
import { processSpecificRootLogic } from "./smo/root_unit.js";
import { processSpecificRenderLogic } from "./smo/render_unit.js";
import { processSpecificResizeLogic } from "./smo/resize_unit.js";
import { processSpecificLoaderLogic } from "./smo/loader_unit.js";
import { assembleMouseUnit } from "./smo/mouse_worker_unit.js";
import { createWorkerGateway } from "./smo/worker_gateway.js";
import { registerGpssFacility } from "./smo/bus.js";

/**
 * Создает мономорфную структуру главного рантайма ядра хоста
 * @param {Object} busEngineState Ссылка на глобальный стейт СМО-движка
 * @returns {Object} Запечатанное состояние ядра приложения
 */
export function createHostState(busEngineState) {
    const hostState = {
        width: 120,
        height: 30,
        layoutTopologyTree: null,
        calculatedGeoMap: Object.create(null),
        workerGateway: null,
        
        virtualCanvasState: {
            isDirty: true,
            virtualMatrix: { matrix: null }
        },
        
        model: {
            width: 120,
            height: 30,
            logicalState: {
                focusedSlotId: "105",
                appSettings: null,
                panelRegistry: Object.create(null)
            }
        },
        
        boot: () => {
            hostState.workerGateway = createWorkerGateway(hostState);
            
            // Монтируем базовые инфраструктурные приборы ядра на шину СМО
            registerGpssFacility("0", createAbstractFacility(hostState, "0", processSpecificRootLogic, "root_unit", 0));
            registerGpssFacility("1", createAbstractFacility(hostState, "1", processSpecificRenderLogic, "render_unit", 1));
            registerGpssFacility("9", createAbstractFacility(hostState, "9", processSpecificResizeLogic, "resize_unit", 9));
            
            if (typeof assembleMouseUnit === "function") {
                registerGpssFacility("10", assembleMouseUnit(hostState));
            }
            
            // Регистрируем Канал 11 Лоадера
            registerGpssFacility("11", createAbstractFacility(hostState, "11", processSpecificLoaderLogic, "loader_unit", 11));
            return true;
        },
        
        updateGeometryMap: (newGeoMap) => {
            if (newGeoMap) hostState.calculatedGeoMap = newGeoMap;
        },
        
        executeViewportBlit: () => {
            if (busEngineState) {
                const renderUnit = busEngineState.facilitiesRegistry.get("1");
                if (renderUnit && typeof renderUnit.advanceFacility === "function") {
                    renderUnit.advanceFacility();
                }
            }
        }
    };
    
    // Преаллокация UHD-матрицы кадра для виртуального холста ConPTY
    const m = new Array(64);
    for (let y = 0; y < 64; y++) {
        m[y] = new Array(512);
        for (let x = 0; x < 512; x++) {
            m[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
            Object.preventExtensions(m[y][x]);
        }
        Object.preventExtensions(m[y]);
    }
    hostState.virtualCanvasState.virtualMatrix.matrix = m;
    
    return hostState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/app_host_factory.js
 * Время модификации: 22.08.2026 08:05:00 MSK
 */
