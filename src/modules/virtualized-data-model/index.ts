import { Grid } from '../core';
import { create as createSimpleDataModel, IDataModel, IGridDataChange, IGridDataResult } from '../data-model';
import makeDirtyClean from '../dirty-clean';

// untested basic data model impl
const nullResult = { value: null, formatted: '' };
const loadingResult = { value: null, formatted: 'Loading...' };

export type DataRow = Array<IGridDataResult<any>>;
export type RowLoader = (dataRow: number[]) => Promise<{ [rowIndex: string]: DataRow }>;

export function create(grid: Grid, loadRows: RowLoader): IDataModel {
  const dirtyClean = makeDirtyClean(grid);
  const cachedData: DataRow[] = [];

  const getCachedRow = (vR: number) => cachedData[vR];

  const getData = (vR: number, vC: number): IGridDataResult<any> => {
    const cachedRow = getCachedRow(vR);
    if (cachedRow) {
      return cachedRow[vC];
    }

    return grid.cols.converters.virtual.toData(vC) === 0 ?
      loadingResult :
      nullResult;
  };

  async function maybeLoadRows() {
    const extras: number[] = [];
    const visibles = [];
    const numVisibleRows = grid.viewPort.rows;

    const currentTopRow = grid.cellScrollModel.row;
    const currentBottomRow = currentTopRow + numVisibleRows;
    for (let row = Math.max(0, currentTopRow - numVisibleRows);
      row < Math.min(currentBottomRow + 1 + numVisibleRows, grid.rows.converters.data.count());
      row++) {
      if (getCachedRow(grid.rows.converters.data.toVirtual(row))) {
        // already have it cached
        continue;
      }
      if (row >= currentBottomRow) {
        extras.push(row);
      } else {
        visibles.push(row);
      }
    }

    if (!extras.length && !visibles.length) {
      // everything has previously been fetched
      return;
    }

    // fetch if any visibles, or if extras > numVisibleRows / 2
    if (!visibles.length && extras.length < (numVisibleRows / 2)) {
      return;
    }
    const toFetchSet = new Set<number>(visibles);
    extras.forEach((r) => toFetchSet.add(r));
    const toFetch = Array.from(toFetchSet);
    if (!toFetch.length) {
      return;
    }
    const rows = await loadRows(toFetch);
    Object.keys(rows).forEach((r) => {
      cachedData[grid.rows.converters.data.toVirtual(parseInt(r, 10))] = rows[r];
    });
    if (!grid.destroyed) {
      dirtyClean.setDirty();
    }
  }

  grid.eventLoop.bind('grid-cell-scroll', () => {
    maybeLoadRows();
  });

  grid.eventLoop.bind('grid-viewport-change', () => {
    maybeLoadRows();
  });

  return {
    ...createSimpleDataModel(grid),
    isDirty: dirtyClean.isDirty,
    get(dataRow: number, dataCol: number) {
      return getData(grid.rows.converters.data.toVirtual(dataRow), grid.cols.converters.data.toVirtual(dataCol));
    },
    set(_rowOrData: number | Array<IGridDataChange<any>>, _c?: number, _datum?: string | string[]) {
      // currently this doesn't make sense
    }
  };
}

export default create;