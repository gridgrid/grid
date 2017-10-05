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
  get(dataRow: number, dataCol: number, isCopy?: boolean): IGridDataResult<any>;
  getHeader(virtualRow: number, virtualCol: number): IGridDataResult<any>;
  set(dataRow: number, dataCol: number, value: any): void;
  set(changes: Array<IGridDataChange<any>>): void;
  toggleSort?(c: number): void;
}

// untested basic data model impl
const nullResult = { value: null, formatted: '' };
const resultObj = { value: null, formatted: '' };

export function create(grid: Grid): IDataModel {
  const dirtyClean = makeDirtyClean(grid);

  const getData = (vR: number, vC: number) => {
    const rowDescriptor = grid.rowModel.get(vR);
    const rowData = rowDescriptor && rowDescriptor.data;
    const result = rowData && rowData[vC] || nullResult;
    resultObj.value = result.value;
    resultObj.formatted = result.formatted || result.value;
    return resultObj;
  };

  return {
    isDirty: dirtyClean.isDirty,
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
        const rowDescriptor = grid.rowModel.get(change.row);
        let rowData = rowDescriptor.data;
        if (!rowData) {
          rowData = rowDescriptor.data = [];
        }
        rowData[grid.cols.converters.data.toVirtual(change.col)] = { value: change.value, formatted: change.formatted || change.value };
      });
    }
  };
}

export default create;