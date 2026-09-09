import { AudioManager } from "../../systems/AudioManager";
import { backIconSvg } from "../../ui/components/icons";
import { DialogueSystem, type DialogueLine } from "../dialogue/DialogueSystem";
import type { Screen } from "../../ui/UIManager";

export interface GameHud {
  screen: Screen;
  setObjective(text: string | null): void;
  showPrompt(label: string): void;
  hidePrompt(): void;
  onPromptActivate(cb: (() => void) | null): void;
  showDialogue(lines: DialogueLine[], onComplete?: () => void): void;
  requestDialogueAdvance(): void;
  isDialogueOpen(): boolean;
  showComplete(title: string, subtitle: string, continueLabel: string, onContinue: () => void): void;
  hideComplete(): void;
  onExit(cb: (() => void) | null): void;
  reset(): void;
}

export function createGameHud(): GameHud {
  const element = document.createElement("div");
  element.className = "game-hud";

  element.innerHTML = `
    <div class="game-topbar">
      <button type="button" class="icon-btn game-exit-btn" aria-label="Exit to Mission Select">${backIconSvg}</button>
      <div class="objective-pill" hidden></div>
    </div>
    <button type="button" class="interact-prompt panel" hidden>
      <span class="interact-key">E</span>
      <span class="interact-label"></span>
    </button>
    <div class="dialogue-box panel" hidden>
      <div class="dialogue-speaker"></div>
      <div class="dialogue-text"></div>
      <div class="dialogue-continue">▾</div>
    </div>
    <div class="mission-complete-backdrop" hidden>
      <div class="mission-complete-panel panel">
        <div class="mission-complete-title"></div>
        <div class="mission-complete-subtitle"></div>
        <button type="button" class="btn btn-primary mission-complete-btn"></button>
      </div>
    </div>
  `;

  const exitBtn = element.querySelector<HTMLButtonElement>(".game-exit-btn")!;
  const objectivePill = element.querySelector<HTMLDivElement>(".objective-pill")!;
  const prompt = element.querySelector<HTMLButtonElement>(".interact-prompt")!;
  const promptLabel = element.querySelector<HTMLSpanElement>(".interact-label")!;
  const dialogueBox = element.querySelector<HTMLDivElement>(".dialogue-box")!;
  const dialogueSpeaker = element.querySelector<HTMLDivElement>(".dialogue-speaker")!;
  const dialogueText = element.querySelector<HTMLDivElement>(".dialogue-text")!;
  const completeBackdrop = element.querySelector<HTMLDivElement>(".mission-complete-backdrop")!;
  const completeTitle = element.querySelector<HTMLDivElement>(".mission-complete-title")!;
  const completeSubtitle = element.querySelector<HTMLDivElement>(".mission-complete-subtitle")!;
  const completeBtn = element.querySelector<HTMLButtonElement>(".mission-complete-btn")!;

  const dialogue = new DialogueSystem();

  let promptActivate: (() => void) | null = null;
  prompt.addEventListener("click", () => {
    AudioManager.playClick();
    prompt.blur(); // so a following Space (jump) doesn't re-click this button
    promptActivate?.();
  });
  prompt.addEventListener("pointerenter", () => AudioManager.playHover());

  dialogueBox.addEventListener("click", () => {
    AudioManager.playClick();
    dialogue.advance();
  });

  let exitHandler: (() => void) | null = null;
  exitBtn.addEventListener("click", () => {
    AudioManager.playBack();
    exitHandler?.();
  });
  exitBtn.addEventListener("pointerenter", () => AudioManager.playHover());

  function renderLine(line: DialogueLine): void {
    dialogueSpeaker.textContent = line.speaker;
    dialogueText.textContent = line.text;
    dialogueBox.hidden = false;
  }

  return {
    screen: { element },

    setObjective(text) {
      if (!text) {
        objectivePill.hidden = true;
        return;
      }
      objectivePill.hidden = false;
      objectivePill.textContent = text;
    },

    showPrompt(label) {
      promptLabel.textContent = label;
      prompt.hidden = false;
    },
    hidePrompt() {
      prompt.hidden = true;
    },
    onPromptActivate(cb) {
      promptActivate = cb;
    },

    showDialogue(lines, onComplete) {
      dialogue.start(lines, {
        onLine: renderLine,
        onClose: () => {
          dialogueBox.hidden = true;
          onComplete?.();
        },
      });
    },
    requestDialogueAdvance() {
      dialogue.advance();
    },
    isDialogueOpen() {
      return dialogue.isOpen();
    },

    showComplete(title, subtitle, continueLabel, onContinue) {
      completeTitle.textContent = title;
      completeSubtitle.textContent = subtitle;
      completeBtn.textContent = continueLabel;
      completeBackdrop.hidden = false;
      requestAnimationFrame(() => completeBackdrop.classList.add("visible"));
      const handler = () => {
        AudioManager.playConfirm();
        completeBackdrop.classList.remove("visible");
        window.setTimeout(() => {
          completeBackdrop.hidden = true;
        }, 280);
        completeBtn.removeEventListener("click", handler);
        onContinue();
      };
      completeBtn.addEventListener("click", handler);
    },
    hideComplete() {
      completeBackdrop.classList.remove("visible");
      completeBackdrop.hidden = true;
    },

    onExit(cb) {
      exitHandler = cb;
    },

    reset() {
      this.hidePrompt();
      this.setObjective(null);
      dialogueBox.hidden = true;
      this.hideComplete();
    },
  };
}
