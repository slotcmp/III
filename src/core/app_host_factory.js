/**
 * @file src/core/app_host_factory.js
 * @version 3.4.6-RELEASE-SMO-HOST-FACTORY-STABLE-FINAL
 * @description Фабрика сборки мономорфной структуры хоста приложения ( PAC / Control-контур ).
 * ИСПРАВЛЕН CLI-ВВОД: Свойства buffer и cursor жестко внедрены в Hidden Class mockMdl до запечатывания.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { registerGpssFacility } from "./smo/bus.js";
import { createWorkerGateway } from "./smo/worker_gateway.js";
import { executeViewportBlit } from "../io/terminal/blit.js";
import { assemble as assembleResizeUnit } from "./smo/resize_unit.js";
import { assemble as assembleRootUnit } from "./smo/root_unit.js";
import { assemble as assembleRenderUnit } from "./smo/render_unit.js";

// Импортируем сборщик системного прибора мыши Слота 10
import { assembleMouseUnit } from "./smo/mouse_worker_unit.js";

/**
 * Выделение плоской мономорфной TUI-матрицы знакомест фиксированного размера в ОЗУ хоста
 * @returns {Object} Запечатанный контейнер матрицы
 */
function allocateMonomorphicTuiMatrix() {
    const m = new Array(64);
    for (let y = 0; y < 64; y++) {
        m[y] = new Array(512);
        for (let x = 0; x < 512; x++) {
            m[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
            Object.preventExtensions(m[y][x]);
        }
        Object.preventExtensions(m[y]);
    }
    const bufferState = { matrix: m };
    Object.preventExtensions(bufferState);
    return bufferState;
}

/**
 * Сборка и глубинное запечатывание мономорфного состояния хоста
 * @param {Object} gpssEngineRef Ссылка на движок СМО
 * @returns {Object} Полностью мономорфный объект хоста
 */
export function createHostState(gpssEngineRef) {
    const hostState = {
        model: {
            width: 120, 
            height: 30, 
            layoutTree: null,
            logicalState: {
                focusedSlotId: "105", 
                appSettings: null,
                panelRegistry: {
                    "101": { displayIndex: 1, componentType: "dashboard", activeStackIdx: 0 },
                    "102": { displayIndex: 2, componentType: "explorer", activeStackIdx: 0 },
                    "103": { displayIndex: 3, componentType: "explorer", activeStackIdx: 0 },
                    "105": { displayIndex: 5, componentType: "command", activeStackIdx: 0 },
                    "106": { displayIndex: 4, componentType: "theme", activeStackIdx: 0 },
                    "108": { displayIndex: 6, componentType: "logger", activeStackIdx: 0 }
                }
            },
            geometryState: { currentGeoMap: Object.create(null), globalResizeTriggered: false }
        },
        virtualCanvasState: { isDirty: true, virtualMatrix: null },
        calculatedGeoMap: Object.create(null), 
        layoutTopologyTree: null, 
        workerGateway: null,
        updateGeometryMap: (newGeoMap) => { 
            if (newGeoMap) hostState.calculatedGeoMap = newGeoMap; 
        },
        
        boot: async () => {
            hostState.workerGateway = createWorkerGateway(hostState);
            if (hostState.workerGateway && typeof hostState.workerGateway.initWorkers === "function") {
                hostState.workerGateway.initWorkers();
            }
            
            // 1. АППАРАТНАЯ РЕГИСТРАЦИЯ ИНФРАСТРУКТУРНЫХ ПРИБОРОВ СМО (Системный диапазон 0-99)
            registerGpssFacility("0", assembleRootUnit(hostState));
            registerGpssFacility("1", assembleRenderUnit(hostState));
            registerGpssFacility("9", assembleResizeUnit(hostState));

            // АТОМАРНЫЙ ИНЖЕКТ: Бутстрап системного Слота 10 (Шлюз прерываний мыши)
            if (typeof assembleMouseUnit === "function") {
                registerGpssFacility("10", assembleMouseUnit(hostState));
            }

            // 2. ДИНАМИЧЕСКИЙ ДЕХАРДКОД: Налив бизнес-приборов (100+) строго по ОЗУ-реестру панелей
            const activeSlots = Object.keys(hostState.model.logicalState.panelRegistry);
            
            for (let i = 0; i < activeSlots.length; i++) {
                const id = activeSlots[i];
                const blank = hostState.model.logicalState.panelRegistry[id];
                
                const mockFacility = {
                    slotId: id, 
                    componentType: blank.componentType, 
                    activeStackIdx: 0, 
                    displayIndex: blank.displayIndex,
                    viewStack: null, 
                    advanceFacility: () => true, 
                    dispatch: () => false
                };
                
                // ПРОГРЕВ ФОРМЫ ХЭША: Поля объявлены на фазе аллокации для common_input_engine.js
                const mockMdl = { 
                    _isDirty: true, 
                    itemsList: [], 
                    lines: [], 
                    
                    // Решение для CLI-ввода: инжектируем свойства Hidden Class до запечатывания
                    buffer: "", 
                    cursor: 0, 
                    textLength: 0,
                    cursorX: 0,
                    
                    charBuffer: new Array(256) 
                };
                for (let k = 0; k < 256; k++) mockMdl.charBuffer[k] = " ";
                
                const mockView = { 
                    slotId: id, 
                    width: 40, 
                    height: 5, 
                    _isFocused: (id === "105"), // По умолчанию активируем каретку для CLI
                    localBuffer: allocateMonomorphicTuiMatrix() 
                };
                
                Object.preventExtensions(mockView); 
                Object.preventExtensions(mockMdl);
                
                if (blank.componentType === "explorer") {
                    mockFacility.viewStack = [
                        { mdl: mockMdl, view: mockView },
                        { mdl: mockMdl, view: mockView },
                        { mdl: mockMdl, view: mockView },
                        { mdl: mockMdl, view: mockView }
                    ];
                } else {
                    mockFacility.viewStack = { mdl: mockMdl, view: mockView };
                }
                
                Object.preventExtensions(mockFacility);
                registerGpssFacility(id, mockFacility);
            }
            return true;
        },
        executeViewportBlit: () => {
            executeViewportBlit(hostState.virtualCanvasState, hostState, hostState.calculatedGeoMap);
        }
    };
    
    hostState.virtualCanvasState.virtualMatrix = allocateMonomorphicTuiMatrix();
    
    Object.preventExtensions(hostState.virtualCanvasState); 
    Object.preventExtensions(hostState.model.geometryState);
    Object.preventExtensions(hostState.model.logicalState.panelRegistry); 
    Object.preventExtensions(hostState.model.logicalState);
    Object.preventExtensions(hostState.model); 
    Object.preventExtensions(hostState);
    
    return hostState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/app_host_factory.js
 * Время модификации: 20.08.2026 21:35:40 MSK
 * Номер для отката: #0820-STABLE-SYSTEM-MOUSE-CLASSIFIER
 */
