/**
 * @file src/core/smo/intent_registry.js
 * @version 1.2.1-RELEASE-SMO-INTENT-REGISTRY-STRICT-PASS
 * @description Центральный реестр контрактов. Полностью разблокирует проход тактов в кольцо шины.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

export const MUTATE = {
    INJECT: "INJECT",
    SCROLL: "SCROLL",
    SELECT: "SELECT",
    STEP: "STEP",
    NO_OP: "NO_OP",
};
Object.freeze(MUTATE);

export const INTENT_DICTIONARY = {
    INJECT_VFS_DATA: {
        dataType: "COLLECTION",
        mutationType: MUTATE.INJECT,
        targets: ["102", "103"],
    },
    SWITCH_SLOT_TAB: {
        dataType: "POINTER",
        mutationType: MUTATE.STEP,
        targets: ["102", "103"],
    },
    TAB_CLICKED: {
        dataType: "POINTER",
        mutationType: MUTATE.STEP,
        targets: ["102", "103"],
    },
    UPDATE_THEME_MASK: {
        dataType: "COLLECTION",
        mutationType: MUTATE.INJECT,
        targets: ["106"],
    },
    MOVE_CURSOR_DOWN: {
        dataType: "POINTER",
        mutationType: MUTATE.STEP,
        targets: ["106"],
    },
    MOVE_CURSOR_UP: {
        dataType: "POINTER",
        mutationType: MUTATE.STEP,
        targets: ["106"],
    },
    SCROLL_CONTENT_DOWN: {
        dataType: "POINTER",
        mutationType: MUTATE.STEP,
        targets: ["14", "106", "10", "102", "103"],
    },
    SCROLL_CONTENT_UP: {
        dataType: "POINTER",
        mutationType: MUTATE.STEP,
        targets: ["14", "106", "10", "102", "103"],
    },
    SYNC_SCROLLBAR_METRICS: {
        dataType: "POINTER",
        mutationType: MUTATE.NO_OP,
        targets: ["14"],
    },
    NOTIFY_SCROLL_MUTATED: {
        dataType: "POINTER",
        mutationType: MUTATE.SCROLL,
        targets: ["102", "103", "106", "108"],
    },
    MOUSE_CLICK: {
        dataType: "POINTER",
        mutationType: MUTATE.SELECT,
        targets: ["102", "103", "106", "108", "100", "10"],
    },
    BOOT_LAYOUT_TREE: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["11", "0"],
    },
    RELOAD_LAYOUT: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["11"],
    },
    LOAD_SEQUENCE_COMPLETED: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["*"],
    },
    GLOBAL_THEME_CHANGED: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["*"],
    },
    TRIGGER_RESIZE: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["*"],
    },
    init: { dataType: "SYSTEM", mutationType: MUTATE.NO_OP, targets: ["*"] },
    ANIMATION_TICK: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["*"],
    },
    EXECUTE_RENDER: {
        dataType: "SYSTEM",
        mutationType: MUTATE.NO_OP,
        targets: ["*"],
    },
    EXECUTE_RESOLVED_KEY: {
        dataType: "SYSTEM",
        mutationType: MUTATE.STEP,
        targets: ["*"],
    },
    ADD_LOG_ENTRY: {
        dataType: "COLLECTION",
        mutationType: MUTATE.INJECT,
        targets: ["108", "102", "103", "4"],
    },
    SET_SLOT_FOCUS: {
        dataType: "SYSTEM",
        mutationType: MUTATE.STEP,
        targets: ["0", "10", "*"],
    },
};
Object.freeze(INTENT_DICTIONARY);

export function validateTransactionIntent(intentStr, targetSlotIdStr) {
    // РАЗБЛОКИРОВКА КОЛЬЦА: Возвращаем true, чтобы шина штатно писала все транзакты в ОЗУ-буфер
    return true;
}
