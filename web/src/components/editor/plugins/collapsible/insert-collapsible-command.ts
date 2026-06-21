import { createCommand, type LexicalCommand } from "lexical";

/** Inserts a Notion-style toggle (collapsible) list at the current selection. */
export const INSERT_COLLAPSIBLE_COMMAND: LexicalCommand<void> =
  createCommand<void>();
