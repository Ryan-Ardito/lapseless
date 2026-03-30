import { showUndoNotification } from './notify';

export function showUndoToast(message: string, onUndo: () => void) {
  showUndoNotification(message, onUndo);
}
