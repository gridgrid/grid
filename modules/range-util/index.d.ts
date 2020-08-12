import { IRawPositionRange } from '../position-range';
export declare function intersect(range1: number[], range2: number[]): number[] | null;
export declare function union(range1: number[] | null, range2: number[] | null): number[] | null;
export declare function createFromPoints(r1: number, c1: number, r2: number, c2: number): IRawPositionRange;
export declare function iterate(this: {
    getArgs: typeof getArgs;
}): void;
export declare type CellFn<T> = (r: number, c: number, result?: T) => (boolean | void);
export declare type RowFn<T> = (r: number) => T;
export declare function getArgs<T>(args: IArguments): {
    range: IRawPositionRange;
    cellFn: CellFn<T>;
    rowFn: RowFn<T> | undefined;
};
export declare function equal(r1: IRawPositionRange, r2: IRawPositionRange): boolean;
