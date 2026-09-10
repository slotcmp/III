/**
 * @file src/system/tab_menu/intents/toggle_collapse_handler.js
 * @version 1.0.0-RELEASE-SMO-INTENT-TOGGLE-COLLAPSE-HANDLER
 * @description Изолированная DOD-процедура тумблирования флага свернутости окон (Канал 12).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../../io/terminal/flusher.js";

// Преаллоцированный статический стек для безаллокационного обхода дерева топологии (0% GC)
const _staticToggleCollapseNodesStack = new Array(64);

/**
 * Инвертирует состояние свернутости целевого слота на основе клика по Панели задач
 */
export function handleToggleSlotCollapse(kernel, contextPayload) {
    if (!kernel || !kernel.layoutTopologyTree || !contextPayload) return false;

    const targetIdStr = String(contextPayload.slotId || "");
    if (targetIdStr === "") return false;

    let layoutNodeRef = null;
    let stackPtr = 0;
    _staticToggleCollapseNodesStack[stackPtr++] = kernel.layoutTopologyTree;

    // Плоский безаллокационный поиск целевого слота в дереве разметки хоста
    while (stackPtr > 0) {
        const currNode = _staticToggleCollapseNodesStack[--stackPtr];
        if (!currNode) continue;

        if (String(currNode.slot || currNode.id || "") === targetIdStr) {
            layoutNodeRef = currNode;
            break;
        }

        const children = currNode.children;
        if (children && children.length > 0) {
            const cLen = children.length;
            for (let k = 0; k < cLen; k++) {
                if (stackPtr < 64) _staticToggleCollapseNodesStack[stackPtr++] = children[k];
            }
        }
    }

    // Очищаем ОЗУ-указатели преаллоцированного буфера для защиты от утечек
    while (stackPtr > 0) {
        _staticToggleCollapseNodesStack[--stackPtr] = null;
    }

    if (layoutNodeRef) {
        // Инвертируем состояние свернутости прибора в оперативной памяти разметки
        layoutNodeRef.collapsed = !layoutNodeRef.collapsed;

        // Инвалидируем холст и заставляем калькулятор пересчитать флекс-доли кадра
        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        if (typeof forceInvalidateShadowCanvas === "function") {
            forceInvalidateShadowCanvas();
        }

        // Выстреливаем уведомления на шину и пинаем UHD-отрисовщик кадра
        generateGpssTransaction(targetIdStr, "NOTIFY_SLOT_COLLAPSED", { collapsed: layoutNodeRef.collapsed }, "12");
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/system/tab_menu/intents/toggle_collapse_handler.js
 * Время изменения: 10.09.2026 18:05:00 MSK
 */
