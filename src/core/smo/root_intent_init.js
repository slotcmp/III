/**
 * @file src/core/smo/root_intent_init.js
 * @version 3.2.0-RELEASE-SMO-ROOT-INIT-AUTOMATIC
 * @description DOD-процессор фазы первичного холодного запуска (init) (Control-контур).
 * Полностью ликвидирован хардкод ручной сборки слотов. Внедрен автоматический линейный обход дерева layout.json.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { assembleSlot } from "../slot_maker.js";

/**
 * Осуществляет автоматический каскадный обход топологии для сборки и регистрации приборов в СМО
 * @param {Object} r Ссылка на ОЗУ-рантайм хоста ядра
 * @param {Object} node Текущий узел дерева разметки
 */
function _autoDiscoverAndAssembleSlots(r, node) {
    if (!node) return;

    // Если узел является легитимным слотом — атомарно специфицируем и ставим его на тактовый учет
    const nodeType = String(node.type || "").trim();
    if (nodeType === "slot" && node.id && node.component) {
        const slotIdStr = String(node.id).trim();
        const componentDomainStr = String(node.component).trim();
        
        if (typeof assembleSlot === "function") {
            assembleSlot(r, slotIdStr, componentDomainStr);
        }
    }

    // Рекурсивный безаллокационный спуск по контейнерам
    const children = node.children || [];
    const len = children.length;
    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (child) {
            _autoDiscoverAndAssembleSlots(r, child);
        }
    }
}

/**
 * Осуществляет бутстрап и детерминированную гидратацию системных СМО-компонентов
 * @param {Object} unitState Ссылка на состояние вызывающего прибора Канала 0
 * @param {Object} r Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {boolean} Флаг успешности проведения фазы инициализации
 */
export function processInitIntent(unitState, r) {
    if (!unitState || !r || typeof r.dispatch !== "function") return false;
    
    if (r.isSystemFullyBooted === true) return false;
    r.isSystemFullyBooted = true; 

    const rawCols = process.stdout ? Math.floor(process.stdout.columns || 120) : 120;
    const rawRows = process.stdout ? Math.floor(process.stdout.rows || 30) : 30;

    const cols = isNaN(rawCols) ? 120 : Math.max(1, rawCols);
    const rows = isNaN(rawRows) ? 30 : Math.max(1, rawRows);

    const resizePayload = { w: cols, h: rows };
    Object.preventExtensions(resizePayload);
    r.dispatch("9", "TRIGGER_RESIZE", resizePayload);

    // АВТОМАТИЧЕСКИЙ СБОРЩИК: Вместо хардкода сканируем дерево, загруженное из конфига layout.json!
    const topologyTree = r.layoutTopologyTree;
    if (topologyTree) {
        _autoDiscoverAndAssembleSlots(r, topologyTree);
    }

    r.isStageHydratedAndReady = true;
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_intent_init.js
 * Время модификации: 19.08.2026 00:52:00 MSK
 */
