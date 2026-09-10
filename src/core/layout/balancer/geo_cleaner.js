/**
 * @file src/core/layout/balancer/geo_cleaner.js
 * @version 1.0.0-RELEASE-SMO-DOD-GEO-CLEANER
 * @description Безаллокационная зачистка призрачных TUI-координат в ОЗУ (Control-контур).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

// Статический неизменяемый массив всех возможных ID приборов СМО платформы
const _staticCleanKeysArray = [
    "root", "101", "102", "103", "105", "106", "108", 
    "main_workspace", "right_sidebar"
];
const _staticCleanKeysCount = _staticCleanKeysArray.length;

/**
 * Атомарно зануляет габариты старых окон в глобальном реестре геометрии ядра
 * @param {Object} globalGeoRegistry Ссылка на kernel.calculatedGeoMap или ctx
 */
export function clearDirtyGeometryRegistry(globalGeoRegistry) {
    if (!globalGeoRegistry) return;

    // Циклический сброс габаритов по фиксированной DOD-маске без генерации мусора в куче
    for (let i = 0; i < _staticCleanKeysCount; i++) {
        const item = globalGeoRegistry[_staticCleanKeysArray[i]];
        if (item) {
            item.x = 0;
            item.y = 0;
            item.w = 0;
            item.h = 0;
        }
    }
}
