/**
 * @file src/core/layout/layout_color_map.js
 * @version 2.6.0-RELEASE-GOLDEN-MONOMORPHIC-PASSIVE-SHADING-FIXED
 * @description Статическая DOD-таблица трансляции веб-алиасов в ANSI Xterm-256 (PAC / Abstraction).
 * ИСПРАВЛЕНО ЗАТУХАНИЕ: Добавлен безаллокационный маппер приглушенных тонов для пассивных рамок.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

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

export function resolveWebColor(colorStr) {
    if (colorStr === undefined || colorStr === null) return SAFE_DEFAULT_WHITE;
    if (typeof colorStr === "string" && colorStr.length > 0) {
        if (colorStr.charCodeAt(0) === 0x1B) return colorStr; 
    }
    const cleanStr = String(colorStr).trim().toLowerCase();
    if (cleanStr.length === 0) return SAFE_DEFAULT_WHITE;
    const resolvedAnsi = _COLOR_MAP_REGISTRY.get(cleanStr);
    if (resolvedAnsi !== undefined) return resolvedAnsi;
    return String(colorStr);
}

/**
 * ИСПРАВЛЕНИЕ: Безаллокационный транслятор активного цвета темы в приглушенный пассивный аналог.
 * Если прямого соответствия нет — возвращает низкоуровневую темную сталь (darkgray) во избежание выбивания глаз.
 * @param {string} activeAliasStr Исходный цвет активной темы
 * @returns {string} Алиас пассивного затухания
 */
export function getPassiveColorAlias(activeAliasStr) {
    const clean = String(activeAliasStr).trim().toLowerCase();
    if (clean === "blue" || clean === "cyan" || clean === "aqua") return "navy";
    if (clean === "red") return "maroon";
    if (clean === "lime") return "green";
    if (clean === "yellow" || clean === "gold") return "olive";
    if (clean === "purple") return "darkgray"; // Фирменный неоновый пассивный контраст
    return "gray";
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/layout_color_map.js
 * Время исправления: 03.09.2026 11:54:10 MSK
 */
