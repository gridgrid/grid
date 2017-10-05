import { Grid, IGridDimension } from '../core';
import makeDirtyClean from '../dirty-clean';
import * as util from '../util';

export interface ICellScrollDimension {
    position: number;
    scrollTo(position: number, dontFire?: boolean): boolean;
    getPixelScroll(): number;
    getScrollIntoViewCell(dataCell: number): number;
}

export interface ICellScrollModel {
    col: number;
    row: number;
    rowInfo: ICellScrollDimension;
    colInfo: ICellScrollDimension;
    isDirty(): void;
    scrollTo(r: number, c: number, dontFire?: boolean, dontNotifyPixelModel?: boolean): void;
    scrollIntoView(dataRow: number, dataCol: number): void;
}

export function create(grid: Grid) {
    const dirtyClean = makeDirtyClean(grid);

    function makeDimension(gridDimension: IGridDimension) {
        function convertVirtualToScroll(virtualCoord: number) {
            return virtualCoord - gridDimension.rowColModel.numFixed();
        }

        function getScrollToRowOrCol(virtualCoord: number) {
            const currentScroll = cellScrollDimension.position;
            let scrollTo = currentScroll;
            if (gridDimension.viewPort.isInView(virtualCoord)) {
                return scrollTo;
            }

            const targetScroll = convertVirtualToScroll(virtualCoord);
            if (targetScroll < currentScroll) {
                scrollTo = targetScroll;
            } else if (targetScroll > currentScroll) {
                let lengthToCell = gridDimension.virtualPixelCell.sizeOf(0, virtualCoord);
                const numFixed = gridDimension.rowColModel.numFixed();
                scrollTo = 0;
                for (let i = numFixed; i < virtualCoord && lengthToCell > gridDimension.viewPort.size; i++) {
                    lengthToCell -= gridDimension.virtualPixelCell.sizeOf(i);
                    scrollTo = i - (numFixed - 1);
                }
            }

            return scrollTo;
        }
        const cellScrollDimension: ICellScrollDimension = {
            position: 0,
            scrollTo(position: number, dontFire?: boolean): boolean {
                const maxPosition = (gridDimension.rowColModel.length() || 1) - 1;
                const lastPosition = cellScrollDimension.position;
                cellScrollDimension.position = util.clamp(position, 0, maxPosition);
                if (lastPosition !== cellScrollDimension.position) {
                    dirtyClean.setDirty();

                    if (!dontFire) {
                        notifyListeners();
                    }
                    return true;
                }
                return false;
            },
            getPixelScroll() {
                return gridDimension.virtualPixelCell.sizeOf(
                    gridDimension.rowColModel.numFixed(),
                    cellScrollDimension.position + gridDimension.rowColModel.numFixed() - 1
                );
            },
            getScrollIntoViewCell(dataCell: number) {
                const virtualCell = gridDimension.converters.virtual.clamp(gridDimension.converters.data.toVirtual(dataCell));
                return getScrollToRowOrCol(virtualCell);
            }
        };
        return cellScrollDimension;
    }

    const model: ICellScrollModel = {
        get col() {
            return model.colInfo.position;
        },
        get row() {
            return model.rowInfo.position;
        },
        isDirty: dirtyClean.isDirty,
        rowInfo: makeDimension(grid.rows),
        colInfo: makeDimension(grid.cols),
        scrollTo(r: number, c: number, dontFire?: boolean, dontNotifyPixelModel?: boolean) {
            if (isNaN(r) || isNaN(c)) {
                return;
            }

            const rowScrollChange = model.rowInfo.scrollTo(r, true);
            const colScrollChange = model.colInfo.scrollTo(c, true);
            if (rowScrollChange || colScrollChange) {
                if (!dontFire) {
                    notifyListeners(dontNotifyPixelModel);
                }
            }
        },
        scrollIntoView(dataRow: number, dataCol: number) {
            const newRow = model.rowInfo.getScrollIntoViewCell(dataRow);
            const newCol = model.colInfo.getScrollIntoViewCell(dataCol);
            model.scrollTo(newRow, newCol);
        }
    };

    function notifyListeners(dontNotifyPixelModel?: boolean) {
        grid.eventLoop.fire('grid-cell-scroll');

        if (!dontNotifyPixelModel) {
            grid.pixelScrollModel.scrollTo(model.rowInfo.getPixelScroll(), model.colInfo.getPixelScroll(), true);
        }
    }

    grid.eventLoop.bind('grid-row-change', (e) => {
        switch (e.action) {
            case 'remove':
                model.scrollTo(0, model.col);
                break;
        }
    });

    return model;
}

export default create;