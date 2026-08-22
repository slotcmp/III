/**
 * @file src/workers/layout_worker.js
 * @version 3.1.0-RELEASE-SMO-LAYOUT-WORKER-PURE-DOD
 * @description Фоновый изолят асинхронного расчета 3-проходной флекс-разметки (VFS / Layout).
 * УНИФИКАЦИЯ: Габариты считываются строго из параметров IPC-задачи, ОЗУ-зеркало зачищается in-place.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { parentPort } from "node:worker_threads";
import { pass1MeasureConstraints } from "../core/layout/measurer.js";
import { pass3CalculatePositions } from "../core/layout/calculator.js";
import { balanceGeometryMap } from "../core/layout/layout_balancer.js";

// Абсолютно чистый плоский ОЗУ-регистр для вычисления координат внутри изолята
const _localThreadGeometryRegistry = Object.create(null);

if (parentPort) {
    parentPort.on("message", (taskPack) => {
        if (!taskPack || !taskPack.layoutTree) return;

        const topologyTree = taskPack.layoutTree;
        
        // Прецизионно вытягиваем динамические координаты из входящего СМО-пакета
        const currentW = Math.max(40, Math.floor(taskPack.width || 120));
        const currentH = Math.max(10, Math.floor(taskPack.height || 30));

        // Очищаем локальное ОЗУ-зеркало перед новым проходом калькулятора
        const keys = Object.keys(_localThreadGeometryRegistry);
        const lenKeys = keys.length;
        for (let i = 0; i < lenKeys; i++) {
            delete _localThreadGeometryRegistry[keys[i]];
        }

        // Задаем корень плоской карты
        _localThreadGeometryRegistry["root"] = { x: 0, y: 0, w: currentW, h: currentH };

        // 1. Проход 1: Разворачиваем флекс-проценты в абсолютные ограничения знакомест
        pass1MeasureConstraints(topologyTree, currentW, currentH);

        // 2. Проход 3: Расчет финальных экранных координат и налив в ОЗУ-реестр
        pass3CalculatePositions(topologyTree, 0, 0, currentW, currentH, _localThreadGeometryRegistry, null);

        // 3. Балансировка швов (калибровка вертикальной стопки CLI и Логгера)
        balanceGeometryMap(_localThreadGeometryRegistry, currentH, currentW);

        // Запечатываем элементы перед отправкой через межпоточный мост Windows
        const calculatedKeys = Object.keys(_localThreadGeometryRegistry);
        const lenCalc = calculatedKeys.length;
        for (let i = 0; i < lenCalc; i++) {
            Object.preventExtensions(_localThreadGeometryRegistry[calculatedKeys[i]]);
        }

        // Возвращаем СМО-транзакт Фазы Б в главное ядро хоста через IPC-мост
        parentPort.postMessage({
            type: "GEO_MAP_COMPUTED",
            geoMap: _localThreadGeometryRegistry,
            txId: taskPack.txId
        });
    });
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/workers/layout_worker.js
 * Время модификации: 21.08.2026 16:34:05 MSK
 */
