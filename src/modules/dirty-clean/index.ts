import { Grid } from '../core';

export interface IDirtyClean {
    isDirty(): boolean;
    isClean(): boolean;
    setDirty(): void;
    setClean(): void;
    disable(): void;
    enable(): void;
}

export function create(grid: Grid) {
    let dirty = true;

    let unbindDrawHandler: (() => void) | null = null;

    function listenForDraw() {
        if (!unbindDrawHandler) {
            unbindDrawHandler = grid.eventLoop.bind('grid-draw', () => {
                dirtyCleanInstance.setClean();
            });
        }
    }

    const dirtyCleanInstance: IDirtyClean = {
        isDirty() {
            return dirty;
        },
        isClean() {
            return !dirty;
        },
        setDirty() {
            dirty = true;
            // when things are initalizing sometimes this doesn't exist yet
            // we have to hope that at the end of initialization the grid will call request draw itself
            if (grid.requestDraw) {
                grid.requestDraw();
            }
        },
        setClean() {
            dirty = false;
        },
        disable() {
            if (unbindDrawHandler) {
                unbindDrawHandler();
                unbindDrawHandler = null;
            }
        },
        enable() {
            listenForDraw();
        }
    };

    dirtyCleanInstance.enable();

    return dirtyCleanInstance;
}

export default create;