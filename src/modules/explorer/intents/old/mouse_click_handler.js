/**
 * @file src/modules/explorer/intents/mouse_click_handler.js
 * @version 1.0.0-RELEASE-SMO-EXPLORER-INTENT-MOUSE-CLICK
 * @description Изолированная DOD-процедура обработки кликов мыши и перехода по VFS.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import path from "node:path";
import { _gpssEngineState } from "../../../core/smo/bus.js";

// Бинарный ОЗУ-реестр таймстампов двойных кликов [time, idx, time, idx...]
const _clicksRegistry = new Float64Array(256);

/**
 * Вычисляет строку попадания клика, двигает курсор или выполняет вход в директорию
 */
export function handleExplorerMouseClick(triad, payload, slotIdStr, activeIdx) {
    if (!triad || !triad.mdl || !payload || payload.localY === undefined) return false;

    const m = triad.mdl;
    const localY = Math.floor(payload.localY);
    
    // Строки 0, 1, 2 заняты рамками и табами. Контент начинается с Y = 3.
    if (localY < 3) return false;

    const totalItems = m.itemsList ? m.itemsList.length : 0;
    const targetItemIdx = Math.floor((m.viewportOffset || 0) + (localY - 3));
    
    if (targetItemIdx < 0 || targetItemIdx >= totalItems) return false;

    const targetItemObj = m.itemsList[targetItemIdx];
    if (!targetItemObj) return false;

    const nowTimeNum = Date.now();
    const slotIdNum = parseInt(slotIdStr, 10) & 127;
    
    // Вычисляем смещения внутри бинарного Float64Array реестра меток клика
    const timeRegistryIdx = slotIdNum * 2;
    const idxRegistryIdx = slotIdNum * 2 + 1;

    const lastClickTimeNum = _clicksRegistry[timeRegistryIdx];
    const lastClickIdxNum = _clicksRegistry[idxRegistryIdx] - 1; // Убираем защитное смещение +1

    // =================================================================
    // ПРОВЕРКА НА БЫСТРЫЙ ДВOЙНОЙ КЛИК (< 300мс НА ТОЙ ЖЕ СТРОКЕ) (0% OOP)
    // =================================================================
    if (targetItemIdx === lastClickIdxNum && (nowTimeNum - lastClickTimeNum) < 300) {
        const isDir = targetItemObj.isDir === true || targetItemObj.isDirectory === true;
        const itemNameStr = String(targetItemObj.name || "");

        if (isDir === true) {
            let nextDirectoryPath = "";

            if (itemNameStr === "..") {
                nextDirectoryPath = path.dirname(String(m.currentDirectoryPath || "C:/"));
            } else {
                nextDirectoryPath = path.resolve(String(m.currentDirectoryPath || "C:/"), itemNameStr);
            }

            m.currentDirectoryPath = nextDirectoryPath;
            m.selectedIndex = 0; 
            
            // Превентивно сбрасываем метки времени в Float64Array
            _clicksRegistry[timeRegistryIdx] = 0;
            _clicksRegistry[idxRegistryIdx] = 0;

            // Отправляем транзакт асинхронного переиндексирования воркеру VFS
            const kernel = _gpssEngineState.runtime;
            if (kernel && kernel.workerGateway) {
                kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, nextDirectoryPath, activeIdx);
            }
            
            m._isDirty = true;
            return true;
        }
    } else {
        // =================================================================
        // ОДИНОЧНЫЙ КЛИК: ПЕРЕМЕЩЕНИЕ КУРСOРА ВЫДЕЛЕНИЯ ФАЙЛА
        // =================================================================
        m.selectedIndex = targetItemIdx;
        
        // Регистрируем метки текущего клика без аллокаций в куче
        _clicksRegistry[timeRegistryIdx] = nowTimeNum;
        _clicksRegistry[idxRegistryIdx] = targetItemIdx + 1; // Защитное смещение +1 от дефолтного нуля
        
        m._isDirty = true;
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/intents/mouse_click_handler.js
 * Время изменения: 10.09.2026 19:32:00 MSK
 */
