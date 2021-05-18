import { Grid } from '../core';
import { IGridDataChange, IGridDataResult } from '../data-model';
import debounce from '../debounce';
import { RawPositionRange } from '../position-range';
import * as tsv from '../tsv';

const innerText = require('inner-text-shim');

export interface ICopyPaste {
  _maybeSelectText(): void;
}

export function create(grid: Grid): ICopyPaste {
  function getCopyPasteRange(): RawPositionRange {
    let selectionRange = grid.navigationModel.selection;
    // valid selection range cannot go to -1
    if (selectionRange.top === -1) {
      selectionRange = {
        top: grid.navigationModel.focus.row,
        left: grid.navigationModel.focus.col,
        width: 1,
        height: 1,
      };
    }
    return selectionRange;
  }

  grid.eventLoop.bind('copy', (e) => {
    if (!grid.focused) {
      if (e.target === grid.textarea) {
        e.preventDefault();
      }
      return;
    }
    // prepare for copy
    const copyTable = document.createElement('table');
    const tableBody = document.createElement('tbody');
    copyTable.appendChild(tableBody);
    const tsvData: string[][] = [];
    const selectionRange = getCopyPasteRange();
    let gotNull = false;
    grid.data.iterate(
      selectionRange,
      () => {
        const row = document.createElement('tr');
        tableBody.appendChild(row);
        const array: string[] = [];
        tsvData.push(array);
        return {
          row,
          array,
        };
      },
      (r: number, c: number, rowResult: { row: HTMLTableRowElement; array: string[] }) => {
        const data = grid.dataModel.get(r, c, true);

        // intentional == checks null or undefined
        if (data == null) {
          return (gotNull = true); // this breaks the col loop
        }
        const td = document.createElement('td');
        if (data.value) {
          td.setAttribute('grid-data', JSON.stringify(data.value));
        }
        td.textContent = data.formatted || ' ';
        td.innerHTML = td.innerHTML.replace(/\n/g, '<br>') || ' ';
        rowResult.row.appendChild(td);
        rowResult.array.push(data.formatted);
        return undefined;
      },
    );
    if (!gotNull) {
      e.clipboardData?.setData('text/plain', tsv.stringify(tsvData));
      e.clipboardData?.setData('text/html', copyTable.outerHTML);
      e.preventDefault();
      setTimeout(() => {
        grid.eventLoop.fire('grid-copy');
      }, 1);
    }
  });

  function makePasteDataChange(r: number, c: number, data: IGridDataResult<any> | string): IGridDataChange<any> {
    let value;
    let formatted;
    if (typeof data === 'string') {
      formatted = data;
    } else {
      value = data.value;
      formatted = data.formatted;
    }
    return {
      row: r,
      col: c,
      value,
      formatted,
      paste: true,
    };
  }

  grid.eventLoop.bind('paste', (e) => {
    if (!grid.focused) {
      return;
    }
    const selectionRange = getCopyPasteRange();
    if (!e.clipboardData || !e.clipboardData.getData) {
      console.warn('no clipboard data on paste event');
      return;
    }
    const tsvPasteData = tsv.parse(e.clipboardData.getData('text/plain'));
    let pasteHtml = e.clipboardData.getData('text/html');
    e.preventDefault();

    setTimeout(() => {
      const tempDiv = document.createElement('div');

      // this nonsense is required so .innerText converts <br> to \n
      tempDiv.style.opacity = '0';
      tempDiv.style.pointerEvents = 'none';
      tempDiv.style.position = 'absolute';
      document.body.appendChild(tempDiv);
      //////

      tempDiv.innerHTML = pasteHtml;
      const table = tempDiv.querySelector('table');
      let pasteData: Array<Array<string | IGridDataResult<any>>> = tsvPasteData;
      if (table) {
        let tablePasteData: Array<Array<IGridDataResult<any>>>;
        table.style.whiteSpace = 'pre';
        tablePasteData = [];
        const trs = tempDiv.querySelectorAll('tr');
        [].forEach.call(trs, (tr: typeof trs[0]) => {
          const row: Array<IGridDataResult<any>> = [];
          tablePasteData.push(row);
          const tds = tr.querySelectorAll('td');
          [].forEach.call(tds, (td: typeof tds[0]) => {
            const text = innerText(td);
            const dataResult: IGridDataResult<any> = {
              formatted: text && text.trim(),
              value: undefined,
            };
            const gridData = td.getAttribute('grid-data');
            if (gridData) {
              try {
                dataResult.value = JSON.parse(gridData);
              } catch (error) {
                console.warn("somehow couldn't parse grid data");
              }
            }
            row.push(dataResult);
          });
        });
        pasteData = tablePasteData;
      }

      document.body.removeChild(tempDiv);
      const dataChanges: Array<IGridDataChange<any>> = [];
      let singlePasteValue: string | IGridDataResult<any> | undefined;
      if (pasteData.length === 1 && pasteData[0].length === 1) {
        singlePasteValue = pasteData[0][0];
      }

      if (singlePasteValue) {
        const singlePasteString = singlePasteValue;
        // this will do nothing if no other selections as it will be an empty array
        let ranges = [selectionRange];
        ranges = ranges.concat(grid.navigationModel.otherSelections);
        ranges.forEach((range) => {
          grid.data.iterate(range, (r, c) => {
            dataChanges.push(makePasteDataChange(r, c, singlePasteString));
          });
        });
      } else {
        const top = selectionRange.top;
        const left = selectionRange.left;

        pasteData.forEach((row, r) => {
          const dataRow = r + top;
          if (dataRow > grid.data.row.count() - 1) {
            return;
          }
          row.forEach((pasteValue, c) => {
            const dataCol = c + left;
            // intention == to match null and undefined
            if (pasteValue == undefined || dataCol > grid.data.col.count() - 1) {
              return;
            }
            dataChanges.push(makePasteDataChange(dataRow, dataCol, pasteValue));
          });
        });
        const newSelection = {
          top,
          left,
          height: pasteData.length,
          width: pasteData[0].length,
        };

        grid.navigationModel.clearSelection();
        grid.navigationModel.setSelection(newSelection);
      }

      grid.dataModel.set(dataChanges);
    }, 1);
  });

  const maybeSelectText = debounce(function maybeSelectTextInner() {
    if (!(grid.editModel && grid.editModel.editing) && grid.focused) {
      grid.textarea.value =
        grid.dataModel.get(grid.navigationModel.focus.row, grid.navigationModel.focus.col).formatted || '.';
      grid.textarea.select();
    }
  }, 1);

  grid.eventLoop.bind('keyup', (_e) => {
    maybeSelectText();
  });
  grid.eventLoop.bind('grid-focus', (_e) => {
    maybeSelectText();
  });
  grid.eventLoop.bind('mousedown', (e) => {
    if (e.target !== grid.textarea) {
      return;
    }
    maybeSelectText();
  });
  return {
    _maybeSelectText: maybeSelectText,
  };
}

export default create;
