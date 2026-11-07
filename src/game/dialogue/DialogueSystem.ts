export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueHandlers {
  onLine: (line: DialogueLine, index: number, total: number) => void;
  onClose: () => void;
}

/**
 * Pure state for a short, linear line-by-line conversation — no DOM here.
 * `GameHud` renders whatever this reports and calls `advance()` on input.
 */
export class DialogueSystem {
  private lines: DialogueLine[] = [];
  private index = 0;
  private active = false;
  private handlers: DialogueHandlers | null = null;

  start(lines: DialogueLine[], handlers: DialogueHandlers): void {
    if (lines.length === 0) return;
    this.lines = lines;
    this.index = 0;
    this.active = true;
    this.handlers = handlers;
    this.handlers.onLine(this.lines[0], 0, this.lines.length);
  }

  advance(): void {
    if (!this.active || !this.handlers) return;
    this.index++;
    if (this.index >= this.lines.length) {
      this.active = false;
      const handlers = this.handlers;
      this.handlers = null;
      handlers.onClose();
      return;
    }
    this.handlers.onLine(this.lines[this.index], this.index, this.lines.length);
  }

  isOpen(): boolean {
    return this.active;
  }
}
