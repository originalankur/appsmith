import { AppState } from "reducers";

/**
 * returns the pinned state of explorer
 *
 * @param state
 * @returns
 */
export const getExplorerPinned = (state: AppState) => {
  return state.ui.explorer.pinned;
};