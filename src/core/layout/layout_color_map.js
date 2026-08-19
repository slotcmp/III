/**
 * @file src/core/layout/layout_color_map.js
 * @version 2.5.0-RELEASE-GOLDEN-MONOMORPHIC
 * @description Статическая DOD-таблица трансляции веб-алиасов в ANSI Xterm-256 (PAC / Abstraction).
 * Обеспечивает мгновенный резолвинг строк без аллокаций памяти и регулярных выражений.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

const WEB_COLOR_ALIASES = {
    "black":    "\x1b[38;5;16m",
    "red":      "\x1b[38;5;196m",
    "maroon":   "\x1b[38;5;88m",   
    "green":    "\x1b[38;5;28m",
    "lime":     "\x1b[38;5;46m",   
    "olive":    "\x1b[38;5;100m",
    "navy":     "\x1b[38;5;18m",
    "blue":     "\x1b[38;5;21m",
    "purple":   "\x1b[38;5;93m",
    "teal":     "\x1b[38;5;30m",
    "silver":   "\x1b[38;5;250m",
    "gray":     "\x1b[38;5;242m",  
    "grey":     "\x1b[38;5;242m",
    "yellow":   "\x1b[38;5;226m",
    "gold":     "\x1b[38;5;220m",  
    "white":    "\x1b[38;5;231m",
    "cyan":     "\x1b[38;5;51m",
    "aqua":     "\x1b[38;5;44m",   
    "orange":   "\x1b[38;5;214m",  
    "darkgray": "\x1b[38;5;236m"  
};
Object.preventExtensions(WEB_COLOR_ALIASES);

const SAFE_DEFAULT_WHITE = "\x1b[38;5;231m";

/**
 * Прецизионный резолвер цвета: транслирует строковый алиас в готовый ANSI Xterm-256 токен
 * @param {string|null|undefined} colorStr Входной строковый алиас цвета
 * @returns {string} Готовая ANSI-последовательность для терминала
 */
export function resolveWebColor(colorStr) {
    if (colorStr === undefined || colorStr === null) return SAFE_DEFAULT_WHITE;
    const cleanStr = String(colorStr).trim().toLowerCase();
    if (cleanStr.length === 0) return SAFE_DEFAULT_WHITE;
    if (WEB_COLOR_ALIASES[cleanStr] !== undefined) {
        return WEB_COLOR_ALIASES[cleanStr];
    }
    return String(colorStr);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/layout_color_map.js
 * Время модификации: 18.08.2026 18:03:10 MSK
 */
