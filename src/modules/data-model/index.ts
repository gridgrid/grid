import { Grid } from '../core';
import makeDirtyClean from '../dirty-clean';

export interface IGridDataResult<T> {
  value: T;
  formatted: string;
}

export interface IGridDataChangeBody<T> {
  value: T;
  formatted?: string;
}

export interface IGridDataChange<T> extends IGridDataChangeBody<T> {
  row: number;
  col: number;
  paste?: boolean;
}

export interface IDataModel {
  isDirty(): boolean;
  setDirty(): void;
  handleCachedDataChange(): void;
  get(dataRow: number, dataCol: number, isCopy?: boolean): IGridDataResult<any>;
  getHeader(virtualRow: number, virtualCol: number): IGridDataResult<any>;
  set(dataRow: number, dataCol: number, value: any): void;
  set(changes: Array<IGridDataChange<any>>): void;
  toggleSort?(c: number): void;
}

export type RowLoader = (dataRow: number[]) => void;

// untested basic data model impl
const nullResult = { value: null, formatted: '' };
const loadingResult = { value: null, formatted: 'Loading...' };

export function create(grid: Grid, loadRows?: RowLoader): IDataModel {
  const dirtyClean = makeDirtyClean(grid);

  const getData = (vR: number, vC: number) => {
    const cachedRow = getCachedRow(vR);
    if (cachedRow) {
      return {
        formatted: '',
        ...cachedRow[vC]
      };
    }
    if (loadRows) {
      return grid.cols.converters.virtual.toData(vC) === 0 ?
        loadingResult :
        nullResult;
    }
    return nullResult;
  };

  const getCachedRow = (vR: number) => {
    const rowDescriptor = grid.rowModel.get(vR);
    return rowDescriptor && rowDescriptor.data;
  };

  async function maybeLoadRows() {
    if (!loadRows) {
      return;
    }
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
    loadRows(toFetch);
  }

  grid.eventLoop.bind('grid-cell-scroll', () => {
    maybeLoadRows();
  });

  grid.eventLoop.bind('grid-viewport-change', () => {
    maybeLoadRows();
  });

  return {
    isDirty: dirtyClean.isDirty,
    setDirty: dirtyClean.setDirty,
    handleCachedDataChange() {
      dirtyClean.setDirty();
      // new data could include clearing rows that are in view
      maybeLoadRows();
    },
    get(dataRow: number, dataCol: number) {
      return getData(grid.rows.converters.data.toVirtual(dataRow), grid.cols.converters.data.toVirtual(dataCol));
    },
    getHeader(virtualRow: number, virtualCol: number) {
      return getData(virtualRow, virtualCol);
    },
    set(rowOrData: number | Array<IGridDataChange<any>>, c?: number, datum?: string | string[]) {
      let data: Array<IGridDataChange<any>>;
      if (!Array.isArray(rowOrData)) {
        if (typeof datum === 'string') {
          datum = datum.replace('[rR]', '').replace('[cC]', '').split(' ');
        }
        data = [{
          row: rowOrData,
          col: c as number,
          value: datum

        }];
      } else {
        data = rowOrData;
      }
      data.forEach((change) => {
        const rowDescriptor = grid.rowModel.get(grid.rows.converters.data.toVirtual(change.row));
        let rowData = rowDescriptor.data;
        if (!rowData) {
          rowData = rowDescriptor.data = [];
        }
        rowData[grid.cols.converters.data.toVirtual(change.col)] = {
          value: change.value,
          formatted: change.formatted != undefined ? change.formatted : change.value,
        };
      });
    }
  };
}

export default create;