import { Grid } from '../core';
import { EventUnion } from '../event-loop';
export interface IViewLayer {
    build(elem: HTMLElement): void;
    draw(): void;
    eventIsOnCells(e: EventUnion): boolean;
    setTextContent(elem: Node | undefined, text: string): void;
    getBorderWidth(): number;
    _drawCells(): void;
    _buildCells(): void;
    _buildCols(): void;
    _buildRows(): void;
    _drawDecorators(b: boolean): void;
    _drawCellClasses(): void;
}
export declare function create(grid: Grid): IViewLayer;
export default create;
