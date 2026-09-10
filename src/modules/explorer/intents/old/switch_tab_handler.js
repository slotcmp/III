/**
 * @file src/modules/explorer/intents/switch_tab_handler.js
 * @version 1.0.0-RELEASE-SMO-EXPLORER-INTENT-SWITCH-TAB
 * @description Изолированная DOD-процедура переключения активных вкладок Проводника.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { _gpssEngineState } from "../../../core/smo/bus.js";

/**
 * Переключает активный таб прибора и пинает шлюз воркера для индексации каталога
 * @param {Object} payload Полезная нагрузка транзакта (индекс целевой вкладки)
 * @param {string} slotIdStr Идентификатор физического слота (102/103)
 * @param {Array} viewStack Весь массив вкладок прибора
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function handleSwitchSlotTab(payload, slotIdStr, viewStack) {
    if (!payload || !Array.isArray(viewStack)) return false;

    // Поддерживаем оба формата именования полей payload для обратной совместимости
    const rawIdx = payload.targetStackIdx !== undefined ? payload.targetStackIdx :
                   (payload.tabIdx !== undefined ? payload.tabIdx : undefined);

    if (rawIdx === undefined) return false;

    const targetTabIdxNum = Math.max(0, Math.floor(rawIdx || 0));
    if (targetTabIdxNum >= viewStack.length) return false;

    // Извлекаем инфраструктурный facility прибора напрямую из глобального реестра
    const facility = _gpssEngineState.facilitiesRegistry.get(slotIdStr);
    if (!facility) return false;

    const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    if (targetTabIdxNum === activeIdx) return false;

    // Фиксируем мутацию индекса
    facility.activeStackIdx = targetTabIdxNum;
    
    const nextActiveNode = viewStack[targetTabIdxNum];
    if (nextActiveNode && nextActiveNode.mdl) {
        nextActiveNode.mdl._isDirty = true;
        
        // Передаем управление воркеру VFS для асинхронного сканирования новой директории
        const kernel = _gpssEngineState.runtime;
        if (kernel && kernel.workerGateway) {
            const currentPath = String(nextActiveNode.mdl.currentDirectoryPath || "C:/");
            kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, currentPath, targetTabIdxNum);
        }
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/intents/switch_tab_handler.js
 * Время изменения: 10.09.2026 19:30:00 MSK
 */
