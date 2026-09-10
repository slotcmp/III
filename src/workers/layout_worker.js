/**
 * @file src/workers/layout_worker.js
 * @version 3.2.0-RELEASE-SMO-LAYOUT-WORKER-3-PASSES-CONVERGED
 * @description Фоновый изолят асинхронного расчета разметки. Сборка полного канонического 3-проходного каскада.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { parentPort } from "node:worker_threads";
import { pass1MeasureConstraints } from "../core/layout/measurer.js";
import { pass2AdjustFlexLimits } from "../core/layout/flex_expander.js"; // Инжектирован Pass 2
import { pass3CalculatePositions } from "../core/layout/calculator.js";

const _localThreadGeometryRegistry = Object.create(null);
const _staticSlotIdsArray = ["100", "101", "102", "103", "105", "106", "108", "main_workspace", "right_sidebar"];
const _staticIdsCount = _staticSlotIdsArray.length;

if (parentPort) {
    parentPort.on("message", (taskPack) => {
        if (!taskPack || !taskPack.layoutTree) return;

        const topologyTree = taskPack.layoutTree;
        const currentW = Math.max(40, Math.floor(taskPack.width || 120));
        const currentH = Math.max(10, Math.floor(taskPack.height || 30));

        for (let i = 0; i < _staticIdsCount; i++) {
            const geoItem = _localThreadGeometryRegistry[_staticSlotIdsArray[i]];
            if (geoItem) {
                geoItem.x = 0; geoItem.y = 0; geoItem.w = 0; geoItem.h = 0;
            }
        }

        if (!_localThreadGeometryRegistry["root"]) {
            _localThreadGeometryRegistry["root"] = { x: 0, y: 0, w: currentW, h: currentH };
        } else {
            _localThreadGeometryRegistry["root"].w = currentW;
            _localThreadGeometryRegistry["root"].h = currentH;
        }

        // ТРЕХПРОХОДНЫЙ ЦИКЛ ПЛАТФОРМЫ SLOTCMP III
        
        // Проход 1: Сбор декларативных ограничений из JSON
        pass1MeasureConstraints(topologyTree, currentW, currentH);

        // Проход 2: Вычитание фиксированных и динамический расчет флекс/процентных долей
        pass2AdjustFlexLimits(topologyTree, currentW, currentH);

        // Проход 3: Финальная трансляция скорректированных лимитов в абсолютные координаты
        pass3CalculatePositions(topologyTree, 0, 0, currentW, currentH, _localThreadGeometryRegistry, null);

        parentPort.postMessage({
            type: "GEO_MAP_COMPUTED",
            geoMap: _localThreadGeometryRegistry,
            txId: taskPack.txId
        });
    });
}
