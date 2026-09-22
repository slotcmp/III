import { readFileSync, writeFileSync, existsSync } from "fs";

export class EditorModel {
    constructor(hub) {
        this.hub = hub;
        this.buffers = {}; 
        this.activeFile = null; 
        this.mods = { focused: false };

        this.createBuffer("scratchpad", [
            "// Reflexcmd Multi-Buffer Editor Ready",
        ]);
        this.activeFile = "scratchpad";
    }

    createBuffer(filePath, codeLines = [""]) {
        this.buffers[filePath] = {
            code: codeLines,
            cursor: { line: 0, col: 0 },
            foldedLines: new Set(),
            dirty: false,
        };
    }

    get current() {
        return this.buffers[this.activeFile] || this.buffers["scratchpad"];
    }

    getState() {
        return {
            code: this.current.code,
            visibleCode: this.getVisibleCode(),
            cursor: this.current.cursor,
            lastFile: this.activeFile === "scratchpad" ? null : this.activeFile,
            mods: { focused: this.mods.focused, dirty: this.current.dirty },
            tabs: Object.keys(this.buffers).filter((k) => k !== "scratchpad"),
        };
    }

    async openFile(filePath) {
        if (!filePath || !existsSync(filePath)) return;

        if (!this.buffers[filePath]) {
            try {
                const content = readFileSync(filePath, "utf-8");
                const lines = content.split(/\r?\n/);
                this.createBuffer(filePath, lines);

                if (this.buffers["scratchpad"] && Object.keys(this.buffers).length > 1) {
                    delete this.buffers["scratchpad"];
                }
            } catch (e) {
                this._log(`ERR: Load failed - ${e.message}`);
                return;
            }
        }
        this.activeFile = filePath;
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    closeBuffer(filePath) {
        if (!this.buffers[filePath]) return;
        delete this.buffers[filePath];

        const remaining = Object.keys(this.buffers);
        if (remaining.length === 0) {
            this.createBuffer("scratchpad", ["// Scratchpad"]);
            this.activeFile = "scratchpad";
        } else {
            this.activeFile = remaining[remaining.length - 1];
        }
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    nextTab() {
        const tabs = Object.keys(this.buffers);
        if (tabs.length <= 1) return;
        const currentIdx = tabs.indexOf(this.activeFile);
        this.activeFile = tabs[(currentIdx + 1) % tabs.length];
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    toggleFold() {
        const cur = this.current;
        const startLine = cur.cursor.line;
        const lineText = cur.code[startLine] || "";
        if (!lineText.includes("{")) return;

        let braceCount = 0;
        let endLine = -1;

        for (let i = startLine; i < cur.code.length; i++) {
            const text = cur.code[i];
            const opens = (text.match(/\{/g) || []).length;
            const closes = (text.match(/\}/g) || []).length;
            
            braceCount += opens - closes;

            if (braceCount === 0 && i > startLine) {
                endLine = i;
                break;
            }
        }

        if (endLine > startLine) {
            const isAlreadyFolded = cur.foldedLines.has(startLine + 1);
            for (let i = startLine + 1; i <= endLine; i++) {
                if (isAlreadyFolded) cur.foldedLines.delete(i);
                else cur.foldedLines.add(i);
            }
            if (this.hub && typeof this.hub.notify === 'function') {
                this.hub.notify();
            }
        }
    }

    getVisibleCode() {
        const cur = this.current;
        let inBlockComment = false;

        return cur.code
            .map((line, idx) => {
                const trimmed = line.trim();
                const startsComment = trimmed.includes("/*");
                const endsComment = trimmed.includes("*/");

                const stateBefore = inBlockComment;
                if (startsComment) inBlockComment = true;

                const resItem = {
                    text: line,
                    originalIdx: idx,
                    isFolded: cur.foldedLines.has(idx),
                    isCommentBlock: stateBefore || startsComment,
                };

                if (endsComment) inBlockComment = false;
                return resItem;
            })
            .filter((item) => !item.isFolded);
    }

    async saveToFile() {
        if (this.activeFile === "scratchpad" || !this.activeFile) return;
        try {
            writeFileSync(this.activeFile, this.current.code.join("\n"), "utf-8");
            this.current.dirty = false;
            this._log(`IO: Saved [${this.activeFile.split(/[\\/]/).pop()}]`);
            if (this.hub && typeof this.hub.notify === 'function') {
                this.hub.notify();
            }
        } catch (e) {
            this._log(`ERR: ${e.message}`);
        }
    }

    setFocused(val) {
        this.mods.focused = !!val;
    }

    move(dir, isHorizontal = false) {
        const cur = this.current;
        const visible = this.getVisibleCode();
        
        if (isHorizontal) {
            const line = cur.code[cur.cursor.line] || "";
            cur.cursor.col = Math.max(0, Math.min(line.length, cur.cursor.col + dir));
        } else {
            const currentVisIdx = visible.findIndex((v) => v.originalIdx === cur.cursor.line);
            const nextVisIdx = Math.max(0, Math.min(visible.length - 1, currentVisIdx + dir));
            
            if (visible[nextVisIdx]) {
                cur.cursor.line = visible[nextVisIdx].originalIdx;
                const nextLineLen = (cur.code[cur.cursor.line] || "").length;
                if (cur.cursor.col > nextLineLen) {
                    cur.cursor.col = nextLineLen;
                }
            }
        }
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    typeChar(char) {
        const cur = this.current;
        let line = cur.code[cur.cursor.line] || "";
        cur.code[cur.cursor.line] = line.slice(0, cur.cursor.col) + char + line.slice(cur.cursor.col);
        cur.cursor.col++;
        cur.dirty = true;
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    backspace() {
        const cur = this.current;
        if (cur.cursor.col > 0) {
            let line = cur.code[cur.cursor.line];
            cur.code[cur.cursor.line] = line.slice(0, cur.cursor.col - 1) + line.slice(cur.cursor.col);
            cur.cursor.col--;
        } else if (cur.cursor.line > 0) {
            const prevLine = cur.code[cur.cursor.line - 1];
            const oldCol = prevLine.length;
            cur.code[cur.cursor.line - 1] = prevLine + cur.code[cur.cursor.line];
            cur.code.splice(cur.cursor.line, 1);
            cur.cursor.line--;
            cur.cursor.col = oldCol;
        }
        cur.dirty = true;
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    handleNewLine() {
        const cur = this.current;
        const line = cur.code[cur.cursor.line] || "";
        cur.code[cur.cursor.line] = line.slice(0, cur.cursor.col);
        cur.code.splice(cur.cursor.line + 1, 0, line.slice(cur.cursor.col));
        cur.cursor.line++;
        cur.cursor.col = 0;
        cur.dirty = true; 
        if (this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }

    _log(msg) {
        if (this.hub && typeof this.hub.pushLog === 'function') {
            this.hub.pushLog(msg);
        }
    }
}
