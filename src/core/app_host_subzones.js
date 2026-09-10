/**
 * @file src/core/app_host_subzones.js
 * @version 1.0.0-RELEASE-SMO-HOST-SUBZONES-DOD
 * @description Безаллокационный рекурсивный сборщик интерактивных подзон разметки.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% GC.
 */

/**
 * Рекурсивно извлекает идентификаторы слотов и размечает их дефолтные активные зоны
 * @param {Object} registryRef Ссылка на плоский ОЗУ-реестр подзон модели хоста
 * @param {Object[]} childrenArr Массив дочерних узлов топологии
 */
export function extractTopologySubZones(registryRef, childrenArr) {
    if (!childrenArr || !Array.isArray(childrenArr)) return;
    
    const len = childrenArr.length;
    for (let i = 0; i < len; i++) {
        const node = childrenArr[i];
        if (!node) continue;
        
        if (node.type === "slot" && node.id) {
            registryRef[String(node.id)] = 1; // По умолчанию фокус на теле контента (1)
        }
        
        if (node.children && node.children.length > 0) {
            extractTopologySubZones(registryRef, node.children);
        }
    }
}
