/**
 * @file src/core/smo/resize_unit.js
 * @version 3.2.2-RELEASE-SMO-RESIZE-PURE-TRANSACT-RESOLVED
 * @description Модуль обслуживания Фазы 1-3 СМО (Прибор Канала 9 / resize_unit).
 * Пассивный асинхронный маршаллер (ASYNC): исправлена гонка деструктуризации параметров ctx прерывания.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import { generateGpssTransaction, _kernelContext } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

/**
 * Превентивный гвард для безопасной записи метрик геометрии в лог
 * @param {string} messageStr Сформированная строка лога
 */
function appendGeoMetricsLogGuard(messageStr) {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return;
    fs.appendFileSync(targetLogPath, messageStr, "utf8");
}

/**
 * Фабрика сборки мономорфной структуры прибора обслуживания (Канал 9)
 * @param {Object} appGpssBusRef Ссылка на шину СМО
 * @returns {Object} Запечатанное состояние прибора
 */
export function assemble(appGpssBusRef) {
    const unitState = {
        hub: appGpssBusRef,
        localQueue: [],
        isProcessing: false,
        _head: 0,
        componentType: "resize_unit",
        displayIndex: 9,
        dispatch: (actionType, transaction) => {
            if (!transaction || typeof transaction !== "object") return false;
            if (typeof transaction.P2 === "undefined") {
                const normalizedTx = { P1: "9", P2: String(actionType || "UNKNOWN_ACTION"), P3: transaction };
                Object.preventExtensions(normalizedTx);
                unitState.localQueue.push(normalizedTx);
                return true;
            }
            unitState.localQueue.push(transaction);
            return true;
        },
        advanceFacility: () => advanceQueueFacility(unitState)
    };
    Object.preventExtensions(unitState);
    return unitState;
}

/**
 * Чистый транзакционный конвейер продвижения Канала 9
 * @param {Object} unitState Состояние прибора
 * @returns {boolean} Флаг наличия мутаций рантайма
 */
function advanceQueueFacility(unitState) {
    const r = unitState.hub;
    const q = unitState.localQueue;
    if (!r || unitState.isProcessing || q.length === unitState._head) return false;
    unitState.isProcessing = true;
    let hasMutations = false;

    while (unitState._head < q.length) {
        const tx = q[unitState._head++];
        if (!tx) continue;
        const intent = String(tx.P2 || "");
        const ctx = tx.P3;

        // ФАЗА А: ПРЕРЫВАНИЕ ТЕРМИНАЛА (РЕАКЦИЯ НА ИЗМЕНЕНИЕ ОКНА ОС)
        if (intent === "TRIGGER_RESIZE" && ctx) {
            // ПРЕЦИЗИОННОЕ ИСПРАВЛЕНИЕ: Вытягиваем динамические координаты ИЗ транзакта прерывания
            const targetW = Math.max(40, Math.floor(ctx.w || 120));
            const targetH = Math.max(10, Math.floor(ctx.h || 30));
            
            if (r.model) {
                r.model.width = targetW; 
                r.model.height = targetH;
            }
            
            // АСИНХРОННЫЙ ОТГРУЗ В ПОТОК: Передаем новые, изменившиеся пиксели консоли воркеру!
            if (r.workerGateway && typeof r.workerGateway.triggerGeometryCalculation === "function") {
                const layoutTree = r.model?.layoutTree || r.layoutTopologyTree;
                const settingsObj = r.model?.logicalState?.appSettings;
                r.workerGateway.triggerGeometryCalculation(layoutTree, targetW, targetH, settingsObj, tx.id);
            }
            hasMutations = true;
        } 
        
        // ФАЗА Б: ИНЖЕКЦИЯ СКОМПИЛИРОВАННОЙ КАРТЫ ОТ ВОРКЕРА
        else if (intent === "INJECT_GEO_MAP" && ctx) {
            if (typeof r.updateGeometryMap === "function") {
                r.updateGeometryMap(ctx);
            }
            
            if (typeof forceInvalidateShadowCanvas === "function") {
                forceInvalidateShadowCanvas();
            }

            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");
            const rootGeo = ctx["root"] || { w: 120, h: 30 };
            
            const geoMetricsLineStr = "[" + h + ":" + m + ":" + s + " Msk] [СМО_GEOMETRY_METRICS] Габариты TUI-матрицы рассчитаны: Ширина=" + 
                                      Math.floor(rootGeo.w) + " знакомест | Высота=" + Math.floor(rootGeo.h) + " строк\n";
            appendGeoMetricsLogGuard(geoMetricsLineStr);

            // Передаем эстафету Каналу 1 для перерисовки растра по новым, рассчитанным воркером координатам
            generateGpssTransaction("1", "EXECUTE_RENDER", null);
            hasMutations = true;
        }
    }

    if (unitState._head === q.length) { q.length = 0; unitState._head = 0; }
    unitState.isProcessing = false;
    return hasMutations;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/resize_unit.js
 * Время модификации: 18.08.2026 23:46:12 MSK
 */
