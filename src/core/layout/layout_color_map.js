/**
 * @file src/core/layout/layout_color_map.js
 * @version 2.5.1-RELEASE-GOLDEN-MONOMORPHIC
 * @description Статическая DOD-таблица трансляции веб-алиасов в ANSI Xterm-256 (PAC / Abstraction).
 * ИСПРАВЛЕНЫ АЛЛОКАЦИИ: Поиск переведен на мономорфный Map для сохранения оптимизации TurboFan.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

// ИСПРАВЛЕНИЕ: Переводим словарь на Map для мгновенной JIT-оптимизации хэш-поиска
const _COLOR_MAP_REGISTRY = new Map([
    ["black",    "\x1b[38;5;16m"],
    ["red",      "\x1b[38;5;196m"],
    ["maroon",   "\x1b[38;5;88m"],   
    ["green",    "\x1b[38;5;28m"],
    ["lime",     "\x1b[38;5;46m"],   
    ["olive",    "\x1b[38;5;100m"],
    ["navy",     "\x1b[38;5;18m"],
    ["blue",     "\x1b[38;5;21m"],
    ["purple",   "\x1b[38;5;93m"],
    ["teal",     "\x1b[38;5;30m"],
    ["silver",   "\x1b[38;5;250m"],
    ["gray",     "\x1b[38;5;242m"],  
    ["grey",     "\x1b[38;5;242m"],
    ["yellow",   "\x1b[38;5;226m"],
    ["gold",     "\x1b[38;5;220m"],  
    ["white",    "\x1b[38;5;231m"],
    ["cyan",     "\x1b[38;5;51m"],
    ["aqua",     "\x1b[38;5;44m"],   
    ["orange",   "\x1b[38;5;214m"],  
    ["darkgray", "\x1b[38;5;236m"]
]);

const SAFE_DEFAULT_WHITE = "\x1b[38;5;231m";

/**
 * Прецизионный резолвер цвета: транслирует строковый алиас в готовый ANSI Xterm-256 токен
 * @param {string|null|undefined} colorStr Входной строковый алиас цвета
 * @returns {string} Готовая ANSI-последовательность для терминала
 */
export function resolveWebColor(colorStr) {
    if (colorStr === undefined || colorStr === null) return SAFE_DEFAULT_WHITE;
    
    // Быстрый примитивный гвард для строк-последовательностей, начинающихся с ESC
    if (typeof colorStr === "string" && colorStr.length > 0) {
        if (colorStr.charCodeAt(0) === 0x1B) {
            return colorStr; // Это уже готовая ANSI маска, пропускаем аллокации
        }
    }

    const cleanStr = String(colorStr).trim().toLowerCase();
    if (cleanStr.length === 0) return SAFE_DEFAULT_WHITE;
    
    // ИСПРАВЛЕНИЕ: Безопасный мономорфный поиск через внутренние скомпилированные хэш-индексы V8 Map
    const resolvedAnsi = _COLOR_MAP_REGISTRY.get(cleanStr);
    if (resolvedAnsi !== undefined) {
        return resolvedAnsi;
    }
    
    return String(colorStr);
}
