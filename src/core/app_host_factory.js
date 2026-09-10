/**
 * @file src/core/app_host_factory.js
 * @version 8.2.1-RELEASE-SMO-HOST-FACTORY-DYNAMIC-FOCUS-FIXED
 * @description Фабрика сборки ОЗУ-состояния ядра (PAC / Abstraction).
 * ИСПРАВЛЕН СБРОС ФОКУСА: Удален хардкод автоматического увода фокуса на Слот 102 при тактах мутаций.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createAbstractFacility } from "./smo/facility_pipeline.js";
import { processSpecificRootLogic } from "./smo/root_unit.js";
import { processSpecificRenderLogic } from "./smo/render_unit.js";
import { processSpecificResizeLogic } from "./smo/resize_unit.js";
import { processSpecificKeyboardLogic } from "./smo/keyboard_worker_unit.js";
import { assembleMouseUnit } from "./smo/mouse_worker_unit.js";
import { createWorkerGateway } from "./smo/worker_gateway.js";
import { registerGpssFacility } from "./smo/bus.js";
import { executeViewportBlit as pureBlitFn } from "../io/terminal/blit.js";

// РАЗМОНОЛИЧЕННЫЕ СИСТЕМНЫЕ УТИЛИТЫ АЛЛОКАЦИИ И ГЕОМЕТРИИ ХОСТА
import { extractTopologySubZones } from "./app_host_subzones.js";
import { preallocateVirtualDisplayMatrix } from "./app_host_canvas.js";

// ИМПОРТ ИЗ КОРНЕВОЙ ПАПКИ SYSTEM (СИСТЕМНЫЕ WM-ПРИБОРЫ ОБСЛУЖИВАНИЯ)
import { createSystemTabMenuMdlInstance } from "../system/tab_menu/tab_menu_mdl.js";
import { processSystemTabLogic } from "../system/tab_menu/tab_menu_ctl.js";
import { createSystemVScrollbarMdlInstance } from "../system/vscrollbar/vscrollbar_mdl.js";
import { processSystemVScrollbarLogic } from "../system/vscrollbar/vscrollbar_ctl.js";

/**
 * Создает мономорфную структуру главного рантайма ядра хоста
 */
export function createHostState(busEngineState, loaderPlugin, topologyTree) {
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
                focusedSlotId: "105", // Будет синхронизировано динамически из app_config
                appSettings: null,
                panelRegistry: Object.create(null),
                activeSubZonesRegistry: Object.create(null)
            }
        },
        
        boot: () => {
            hostState.workerGateway = createWorkerGateway(hostState);
            
            registerGpssFacility("0", createAbstractFacility(hostState, "0", processSpecificRootLogic, "root_unit", 0));
            registerGpssFacility("1", createAbstractFacility(hostState, "1", processSpecificRenderLogic, "render_unit", 1));
            
            const strictKeyboardFacility = {
                host: hostState,
                slotId: "4",
                localQueue: [],
                _head: 0,
                isProcessing: false,
                viewStack: null,
                activeStackIdx: 0,
                displayIndex: 4,
                componentType: "keyboard_unit",
                specificAdvanceWorker: processSpecificKeyboardLogic,
                dispatch: (actionStr, gpssTx) => {
                    if (!gpssTx) return false;
                    strictKeyboardFacility.localQueue.push(gpssTx);
                    return true;
                },
                advanceFacility: () => {
                    if (strictKeyboardFacility.isProcessing) return false;
                    const q = strictKeyboardFacility.localQueue;
                    if (q.length === strictKeyboardFacility._head) return false;

                    strictKeyboardFacility.isProcessing = true;
                    let isStateMutated = false;

                    while (strictKeyboardFacility._head < q.length) {
                        const tx = q[strictKeyboardFacility._head++];
                        if (!tx) continue;

                        const currentIntentStr = String(tx.P2 || "");
                        const payload = tx.P3;

                        let resolvedIntent = currentIntentStr;
                        let resolvedPayload = payload;
                        
                        if (currentIntentStr === "EXECUTE_RESOLVED_KEY" && payload) {
                            resolvedIntent = String(payload.action || "");
                            resolvedPayload = payload.payload;
                        }

                        if (strictKeyboardFacility.specificAdvanceWorker) {
                            const hasMutations = strictKeyboardFacility.specificAdvanceWorker(
                                strictKeyboardFacility, 
                                resolvedIntent, 
                                resolvedPayload, 
                                tx
                            );
                            if (hasMutations === true) isStateMutated = true;
                        }
                    }

                    if (strictKeyboardFacility._head === q.length) {
                        q.length = 0;
                        strictKeyboardFacility._head = 0;
                    }

                    strictKeyboardFacility.isProcessing = false;
                    return isStateMutated;
                }
            };
            Object.preventExtensions(strictKeyboardFacility);
            registerGpssFacility("4", strictKeyboardFacility);
            
            registerGpssFacility("9", createAbstractFacility(hostState, "9", processSpecificResizeLogic, "resize_unit", 9));
            
            if (typeof assembleMouseUnit === "function") {
                registerGpssFacility("10", assembleMouseUnit(hostState));
            }
            
            const safeLoaderFn = typeof loaderPlugin === "function" ? loaderPlugin : (f, i, p, tx) => false;
            registerGpssFacility("11", createAbstractFacility(hostState, "11", safeLoaderFn, "loader_unit", 11));
            
            // МОНТАЖ СИСТЕМНЫХ WM-ПРИБОРОВ (КАНАЛЫ 12 И 14)
            const tabMenuFacility = createAbstractFacility(hostState, "12", processSystemTabLogic, "system_tab_menu", 12);
            tabMenuFacility.mdl = createSystemTabMenuMdlInstance();
            registerGpssFacility("12", tabMenuFacility);

            const vScrollbarFacility = createAbstractFacility(hostState, "14", processSystemVScrollbarLogic, "system_vscrollbar", 14);
            vScrollbarFacility.mdl = createSystemVScrollbarMdlInstance();
            registerGpssFacility("14", vScrollbarFacility);
            
            return true;
        },
        
        updateGeometryMap: (newGeoMap) => {
            if (newGeoMap) hostState.calculatedGeoMap = newGeoMap;
        },
        
        executeViewportBlit: () => {
            if (hostState.virtualCanvasState && hostState.calculatedGeoMap) {
                pureBlitFn(hostState.virtualCanvasState, hostState, hostState.calculatedGeoMap);
            }
        }
    };
    
    if (topologyTree) {
        const rootChildren = topologyTree.children || [];
        extractTopologySubZones(hostState.model.logicalState.activeSubZonesRegistry, rootChildren);
    }
    
    Object.preventExtensions(hostState.model.logicalState.activeSubZonesRegistry);

    hostState.virtualCanvasState.virtualMatrix.matrix = preallocateVirtualDisplayMatrix();
    
    return hostState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/app_host_factory.js
 * Время изменения: 06.09.2026 17:53:10 MSK
 */