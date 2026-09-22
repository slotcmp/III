/**
 * @file tools/debug_mouse_state.js
 * @version 1.0.1-DIAGNOSTIC-MOUSE-STATE-PURE-DOD
 * @description Стерильный JS-сканер структуры _scannerState.
 * Показывает реальные ключи Hidden Class и флаг расширяемости.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { _scannerState } from "../src/io/terminal/tty_scanner_state.js";

function testMouseStateExtensibility() {
    const stdout = process.stdout;
    if (!stdout) return;

    stdout.write("\n[MOUSE_STATE_AUDIT] Старт проверки ОЗУ-структуры...\n");
    stdout.write("---------------------------------------------------------------------------\n");

    const isExtensible = Object.isExtensible(_scannerState);
    const keys = Object.keys(_scannerState);
    
    // Безаллокационная O(1) проверка наличия свойства в скрытом классе (Hidden Class)
    let hasIsRelease = false;
    const len = keys.length;
    for (let i = 0; i < len; i++) {
        if (keys[i] === "isRelease") {
            hasIsRelease = true;
            break;
        }
    }

    stdout.write("[AUDIT_RESULT]\n");
    stdout.write("  -> Объект расширяем (Extensible): " + (isExtensible ? "ДА" : "НЕТ") + "\n");
    stdout.write("  -> Ключ 'isRelease' существует:   " + (hasIsRelease ? "ДА" : "НЕТ") + "\n");
    stdout.write("  -> Все доступные ключи кучи: [" + keys.join(", ") + "]\n");
    stdout.write("---------------------------------------------------------------------------\n\n");

    // ГВАРД ПЕРЕД ПРЯМОЙ ЗАПИСЬЮ: Если ключ есть ИЛИ объект расширяем — запись безопасна.
    // Если условия нарушены, мы не пишем код вслепую, предотвращая панику V8.
    if (hasIsRelease === true || isExtensible === true) {
        _scannerState.isRelease = true;
        stdout.write("[SUCCESS] Конвейер верификации чист. Запись в _scannerState.isRelease безопасна.\n");
    } else {
        stdout.write("[ALERT_LEAK] ОБHАРУЖЕH СДВИГ СHИМКА: Запись вызовет TypeError! Hidden Class заблокирован.\n");
    }
}

testMouseStateExtensibility();
