/**
 * @file src/modules/explorer/explorer_ctl.js
 * @version 6.4.2-RELEASE-SMO-EXPLORER-CTL-STRICT-DECOUPLED
 * @description Системный PAC-контроллер обслуживания Проводника (Канал 102/103).
 * ИСПРАВЛЕНО: Извлечение триады при SWITCH_SLOT_TAB переведено на целевой targetStackIdx из payload.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";
import { processGenericUiKinematics } from "../../core/smo/window_manager.js";
import { reduceCollectionInject } from "./intents/collection_inject.js";

/**
 * Главная мономорфная точка входа Control-слота Проводника
 */
export function processIntent(triad, intentStr, contextPayload, forcedSlotIdStr) {
    if (!intentStr) return false;

    const intent = String(intentStr || "");
    const slotIdStr = String(forcedSlotIdStr || "102");
    const facility = _gpssEngineState.facilitiesRegistry.get(slotIdStr);

    // =================================================================
    // 1. СПЕЦИФИЧЕСКИЙ ДОМЕННЫЙ ИНТЕНТ (БИЗНЕС-ЛОГИКА ПРОФИЛЯ VFS)
    // =================================================================
    if (intent === "INJECT_VFS_DATA" && triad) {
        const viewStack = facility ? facility.viewStack : null;
        return reduceCollectionInject(triad, contextPayload, slotIdStr, viewStack);
    } 

    // ИСПРАВЛЕНО: Реактивный перехват SWITCH_SLOT_TAB с динамическим выбором целевой триады
    if (intent === "SWITCH_SLOT_TAB" && facility && Array.isArray(facility.viewStack)) {
        const kernel = _gpssEngineState.runtime;
        const targetTabIdx = contextPayload && contextPayload.targetStackIdx !== undefined 
            ? (contextPayload.targetStackIdx | 0) 
            : 0;

        // Извлекаем строго ТУ триаду, на которую переключилось колесико мыши
        const targetTriad = facility.viewStack[targetTabIdx];
        if (targetTriad && targetTriad.mdl && kernel && kernel.workerGateway) {
            // Синхронизируем индекс в корне фасилити
            facility.activeStackIdx = targetTabIdx;
            
            // Проводник САМ взводит флаг грязи на своей суверенной модели таба
            targetTriad.mdl._isDirty = true;
            
            // Запускаем асинхронное побайтовое чтение папки для правильного таба
            kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, targetTriad.mdl.currentDirectoryPath, targetTabIdx);
            return true;
        }
        return false;
    }

    // =================================================================
    // 2. ДЕЛЕГИРОВАНИЕ НЕСПЕЦИФИЧЕСКИХ ИНТЕНТОВ В WINDOW_MANAGER
    // =================================================================
    if (!triad) return false;
    return processGenericUiKinematics(facility, intent, contextPayload);
}

/**
 * Адаптер обратной совместимости для тактового двигателя шины
 */
export function processSpecificExplorerLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;

    const intent = String(intentStr || "");
    const payload = contextPayload ? contextPayload : (currentTx ? currentTx.P3 : {});

    // ИСПРАВЛЕНО: Если пришел свитч таба, мы передаем null вместо жесткой триады,
    // так как processIntent извлечет целевую триаду самостоятельно из payload
    if (intent === "SWITCH_SLOT_TAB") {
        return processIntent(null, intent, payload, String(facilityState.slotId || "102"));
    }

    const activeIdx = Math.max(0, Math.floor(facilityState.activeStackIdx || 0));
    const triad = facilityState.viewStack ? facilityState.viewStack[activeIdx] : null;
    if (!triad) return false;

    const currentSlotIdStr = String(facilityState.slotId || "102");
    return processIntent(triad, intentStr, payload, currentSlotIdStr);
}