import { IRawPositionRange } from '../position-range';

// takes a point and a length as the ranges in array form
export function intersect(range1: number[], range2: number[]) {
    const range2Start = range2[0];
    const range1Start = range1[0];
    const range1End = range1Start + range1[1] - 1;
    const range2End = range2Start + range2[1] - 1;
    if (range2Start > range1End || range2End < range1Start) {
        return null;
    }
    const resultStart = (range1Start > range2Start ? range1Start : range2Start);
    const resultEnd = (range1End < range2End ? range1End : range2End);
    return [
        resultStart,
        resultEnd - resultStart + 1
    ];
}
// takes a point and a length as the ranges in array form
export function union(range1: number[] | null, range2: number[] | null) {
    if (!range1) {
        return range2;
    }
    if (!range2) {
        return range1;
    }
    const range2Start = range2[0];
    const range2End = range2Start + range2[1] - 1;
    const range1Start = range1[0];
    const range1End = range1Start + range1[1] - 1;
    const resultStart = (range1Start < range2Start ? range1Start : range2Start);
    return [
        resultStart, (range1End > range2End ? range1End : range2End) - resultStart + 1
    ];
}

// takes two row, col points and creates a normal position range
export function createFromPoints(r1: number, c1: number, r2: number, c2: number) {
    const range: IRawPositionRange = {} as any;
    if (r1 < r2) {
        range.top = r1;
        range.height = r2 - r1 + 1;
    } else {
        range.top = r2;
        range.height = r1 - r2 + 1;
    }

    if (c1 < c2) {
        range.left = c1;
        range.width = c2 - c1 + 1;
    } else {
        range.left = c2;
        range.width = c1 - c2 + 1;
    }
    return range;
}
export function iterate(this: { getArgs: typeof getArgs }) {
    const args = this.getArgs(arguments);
    const range = args.range;
    const cellFn = args.cellFn;
    const rowFn = args.rowFn;
    for (let r = range.top; r < range.top + range.height; r++) {
        let rowResult;
        if (rowFn) {
            rowResult = rowFn(r);
        }
        for (let c = range.left; c < range.left + range.width; c++) {
            if (cellFn) {
                cellFn(r, c, rowResult);
            }
        }
    }
}

export type CellFn<T> = (r: number, c: number, result?: T) => (boolean | void);
export type RowFn<T> = (r: number) => T;
export function getArgs<T>(args: IArguments) {
    const range: IRawPositionRange = args[0];
    let cellFn: CellFn<T> = args[1];
    let rowFn: RowFn<T> | undefined;
    if (args.length === 3) {
        cellFn = args[2];
        rowFn = args[1];
    }
    return {
        range,
        cellFn,
        rowFn
    };
}
export function equal(r1: IRawPositionRange, r2: IRawPositionRange) {
    return r1.top === r2.top &&
        r1.left === r2.left &&
        r1.width === r2.width &&
        r1.height === r2.height;
}