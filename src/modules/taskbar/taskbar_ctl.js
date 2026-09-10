/**
 * @file src/modules/taskbar/taskbar_ctl.js
 * @version 1.0.0-RELEASE-SMO-DOD-TASKBAR-CTL
 * @description Контроллер и фазовый фильтр СМО-прибора Панели задач (Control-контур, Слот 100).
 * ИСПРАВЛЕНА МЫШЬ: Реализовано реактивное разворачивание (enabled=true / collapsed=false) по клику на TUI-плашки окон.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { evaluateRpath } from "../../core/layout/rpath.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";

/**
 * Фабрика преаллокации анемичного состояния Панели задач (0% OOP)
 */
export function createTaskbarController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "100");
    
    // Преаллоцируем фиксированный буфер под 16 интерактивных иконок для исключения GC
    const tracksRegistry = new Array(16);
    for (let i = 0; i < 16; i++) {
        tracksRegistry[i] = {
            startX: 0,
            endX: 0,
            targetSlotId: ""
        };
        Object.preventExtensions(tracksRegistry[i]);
    }

    const ctlState = {
        mdl: {
            _clickTracksRegistry: tracksRegistry,
            _tracksCount: 0,
            _isDirty: true
        },
        view: null,
        host: appHostRef,
        slotId: id
    };

    Object.preventExtensions(ctlState.mdl);
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Единое ядро обслуживания прерываний мыши и тактов для Слота 100
 */
export function processSpecificTaskbarLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState || !facilityState.mdl) return false;

    const m = facilityState.mdl;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr || "");
    let isMutated = false;

    switch (intent) {
        // =================================================================
        // РЕАКТИВНЫЙ ХИТ-ТЕСТ КЛИКА МЫШИ ПО ТУИ-ПЛАШКАМ ИКОНОК ОКOН
        // =================================================================
        case "MOUSE_CLICK":
            if (contextPayload && contextPayload.localX !== undefined && contextPayload.localY !== undefined) {
                const clickX = Math.floor(contextPayload.localX);
                const clickY = Math.floor(contextPayload.localY);

                // Иконки выводятся строго на строке контента (Y === 1) внутри 4-строчных границ
                if (clickY === 1) {
                    const totalTracks = Math.min(16, Math.floor(m._tracksCount || 0));
                    
                    // Безаллокационный плоский обход преаллоцированных треков
                    for (let i = 0; i < totalTracks; i++) {
                        const track = m._clickTracksRegistry[i];
                        
                        if (track && clickX >= track.startX && clickX < track.endX) {
                            const targetSlotIdStr = String(track.targetSlotId);

                            if (targetSlotIdStr.length > 0) {
                                // Выстреливаем E4X-запросы через rpath.js на реактивное разворачивание окна
                                evaluateRpath(kernel, "goto(" + targetSlotIdStr + ")/@enabled=true");
                                evaluateRpath(kernel, "goto(" + targetSlotIdStr + ")/@collapsed=false");
                                evaluateRpath(kernel, "goto(" + targetSlotIdStr + ")/@isActiveFocus=true");

                                // Логируем успешное извлечение прибора из Панели задач в Слот 108
                                const logStr = "[TASKBAR] Окно " + targetSlotIdStr + " реактивно развернуто на экран по клику мыши.\n";
                                generateGpssTransaction("108", "ADD_LOG_ENTRY", logStr, "100");

                                m._isDirty = true;
                                isMutated = true;
                                break; // Цель поражена, прерываем цикл
                            }
                        }
                    }
                }
            }
            break;

        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }

    if (isMutated && kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/taskbar/taskbar_ctl.js
 * Время изменения: 05.09.2026 16:32:10 MSK
 */
