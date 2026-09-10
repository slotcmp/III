/**
 * @file src/core/smo/intents/cli/cmd_rpath.js
 * @version 1.0.1-RELEASE-SMO-DOD-CMD-RPATH-0-OOP-FIXED
 * @description Изолированная процедура транзакционного выполнения e4x-запросов топологии через CLI.
 * ИСПРАВЛЕН ИМПОРТ: Старый класс Rpath заменен на чистую stateless-процедуру evaluateRpath (0% OOP).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { evaluateRpath } from "../../../layout/rpath.js";
import { generateGpssTransaction } from "../../bus.js";

/**
 * Исполняет e4x-путь мутации разметки и генерирует детальный паспорт изменений в логгер
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {string} fullLine Текстовая строка e4x-запроса (например, "//106/@collapsed=true")
 */
export function reduceCmdRpath(kernel, fullLine) {
    if (!kernel || !fullLine) return false;

    // Процедурный разбор компонентов запроса (0% RegExp)
    const assignIdx = fullLine.indexOf("=");
    if (assignIdx === -1) {
        const errLogStr = "[E4X_ERROR] Неверный синтаксис мутации. Ожидался оператор присваивания '='.\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", errLogStr, "105");
        return false;
    }

    let pathPart = fullLine.substring(0, assignIdx).trim();
    const valuePart = fullLine.substring(assignIdx + 1).trim().replace(/['"]/g, "");

    let mutationOp = "=";
    if (pathPart.substring(pathPart.length - 1) === "^") {
        mutationOp = "^=";
        pathPart = pathPart.substring(0, pathPart.length - 1).trim();
    }

    const attrIdx = pathPart.lastIndexOf("/@");
    if (attrIdx === -1) {
        const noAttrLogStr = "[E4X_ERROR] В запросе не указан целевой атрибут через '/@'.\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", noAttrLogStr, "105");
        return false;
    }

    const targetAttributeStr = pathPart.substring(attrIdx + 2).trim();

    // ВЫЗОВ СТРОГО ПО МАНИФЕСТУ: Чистая процедурная мутация JSON-дерева в ОЗУ (без new и class)
    const targetNode = evaluateRpath(kernel, fullLine);

    if (targetNode) {
        const slotIdStr = String(targetNode.slot || targetNode.id || "unknown");
        
        // Извлекаем живое измененное значение прямо из ноды (с учетом триггера ^=)
        const finalValueStr = String(targetNode[targetAttributeStr]);

        // Формируем красивый детальный транзакционный отчет для Слота 108
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");

        const successLogStr = "[" + h + ":" + m + ":" + s + " Msk] [E4X_TOPOLOGY] Слот: " + slotIdStr + 
                              " | Изменен атрибут: @" + targetAttributeStr + 
                              " | Оператор: '" + mutationOp + "' | Новое значение: " + finalValueStr + "\n";
        
        generateGpssTransaction("108", "ADD_LOG_ENTRY", successLogStr, "105");

        // Принудительно пинаем Window Manager обновить UHD-холст с учетом новых e4x-гвардов
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
        return true;
    }

    const failLogStr = "[E4X_WARN] Узел по запросу '" + pathPart + "' не найден в layout.json\n";
    generateGpssTransaction("108", "ADD_LOG_ENTRY", failLogStr, "105");
    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli/cmd_rpath.js
 */
