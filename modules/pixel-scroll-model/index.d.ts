import { Grid } from '../core';
import { IDecorator } from '../decorators';
import { IGridCustomMouseEvent } from '../event-loop';
export interface IPixelScrollModel {
    x: IPixelScrollDimensionInfo;
    y: IPixelScrollDimensionInfo;
    top: number;
    left: number;
    height: number;
    width: number;
    offsetTop: number;
    offsetLeft: number;
    vertScrollBar: IScrollBarDecorator;
    horzScrollBar: IScrollBarDecorator;
    maxScroll: {
        height?: number;
        width?: number;
    };
    maxIsAllTheWayFor: {
        height: boolean;
        width: boolean;
    };
    isDirty(): boolean;
    isOffsetDirty(): boolean;
    scrollTo(x: number, y: number, dontNotify?: boolean): void;
    setScrollSize(h: number, w: number): void;
    _getMaxScroll(heightOrWidth: 'height' | 'width'): number;
}
export interface IScrollBarDecorator extends IDecorator {
    _onDragStart?(e: IGridCustomMouseEvent): void;
    _unbindDrag?(): void;
    _unbindDragEnd?(): void;
}
export interface IPixelScrollDimensionInfo {
    position: number;
    offset: number;
    scrollSize: number;
    maxScroll: number;
    maxIsAllTheWay: boolean;
    scrollBar: IScrollBarDecorator;
    scrollTo(px: number, dontNotify?: boolean): void;
    positionScrollBar(): void;
    updatePixelOffset(): void;
    calcCellScrollPosition(): number;
    sizeScrollBar(): void;
    cacheMaxScroll(): void;
    cacheScrollSize(): void;
    _getMaxScroll(): number;
}
export declare function create(grid: Grid): IPixelScrollModel;
export default create;
