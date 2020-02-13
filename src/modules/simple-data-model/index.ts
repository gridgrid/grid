import { Grid } from '../core';
import { IDataModel, IGridDataChange, IGridDataResult } from '../data-model';
import makeDirtyClean from '../dirty-clean';
import { ISimpleGrid } from '../simple-grid';

export interface ISimpleDataModel extends IDataModel {
  setHeader(virtualRow: number, virtualCol: number, datum: string[]): void;
}

export function create(_grid: Grid) {
  const grid = _grid as ISimpleGrid;
  type InternalData = Pick<IGridDataResult<string[]>, 'value'>;
  type DataRow = InternalData[];
  const cellData: DataRow[] = [];
  const headerData: DataRow[] = [];
  let sortedCol: number | undefined;
  let ascending = false;
  const dirtyClean = makeDirtyClean(grid);
  const internalSet = (data: DataRow[], r: number, c: number, datum: string[]) => {
    if (!data[r]) {
      data[r] = [];
    }
    data[r][c] = {
      value: datum
    };
    dirtyClean.setDirty();
  };

  const api: ISimpleDataModel = {
    isDirty: dirtyClean.isDirty,
    setDirty: dirtyClean.setDirty,
    handleCachedDataChange: dirtyClean.setDirty,
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
        internalSet(cellData, change.row, change.col, change.value);
      });
    },
    setHeader(r: number, c: number, datum: string[]) {
      internalSet(headerData, r, c, datum);
    },
    get(r: number, c: number, _isCopy?: boolean) {
      const rowDescriptor = grid.rowModel.row(r);
      if (!rowDescriptor) {
        return {
          value: undefined,
          formatted: ''
        };
      }
      const dataRow = cellData[rowDescriptor.dataRow];
      const datum = dataRow && dataRow[grid.colModel.col(c).dataCol];
      const value = datum && datum.value;
      const formatted = !Array.isArray(value) ?
        value :
        (rowDescriptor.dataLayer ? ' s' + rowDescriptor.dataLayer + ' ' : '') + 'r' + value[0] + ' c' + value[1]
        ;

      return {
        value,
        formatted: formatted || ''
      };
    },
    getHeader(r: number, c: number) {
      const dataRow = headerData[grid.rowModel.get(r).dataRow];

      const datum = dataRow && dataRow[grid.colModel.get(c).dataCol];
      const value = datum && datum.value;
      return {
        value,
        formatted: value && 'hr' + value[0] + ' hc' + value[1] || ''
      };
    },

    toggleSort(c: number) {
      let retVal = -1;
      const compareMethod = (val1: string, val2: string) => {
        return val1 < (val2) ? retVal : -1 * retVal;
      };
      if (c === sortedCol) {
        if (ascending) {
          retVal = 1;
        }
        ascending = !ascending;
      } else {
        sortedCol = c;
        ascending = true;
      }
      cellData.sort((dataRow1, dataRow2) => {
        if (!dataRow1 || !dataRow1[c]) {
          return retVal;
        }
        if (!dataRow2 || !dataRow2[c]) {
          return retVal * -1;
        }
        return compareMethod(dataRow1[c].value[1], dataRow2[c].value[1]);
      });
      dirtyClean.setDirty();
    }
  };

  return api;
}

export default create;