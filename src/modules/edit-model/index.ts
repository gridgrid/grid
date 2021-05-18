import { Grid } from '../core';
import { IGridDataChange, IGridDataChangeBody } from '../data-model';
import { IDecorator } from '../decorators';
import { AnnotatedMouseOrKeyEventUnion, EventUnion, isAnnotatedMouseOrKeyEvent } from '../event-loop';
import { RawPositionRange } from '../position-range';

const key = require('key');
const clickOff = require('click-off');

export interface IEditDecorator extends IDecorator {
  typedText?(): string;
}

export interface IDefaultEditDecorator extends IEditDecorator {
  renderedElem?: HTMLTextAreaElement;
}

export type ClosePromise = Promise<void>;
export type SavePromise = Promise<IGridDataChangeBody<any> | undefined>;

export interface IEditor {
  closePromise?: ClosePromise;
  decorator?: false | IEditDecorator;
  save?(): SavePromise;
  isInMe?(e: MouseEvent): boolean;

  // added by the grid
  removeEscapeStackHandler?(): void;
  removeClickOffHandler?(): void;
}

export interface IEditOptions {
  headers: boolean;
  editTriggers: EditTrigger[];
  saveTriggers: SaveTrigger[];
  cancelTriggers: CancelTrigger[];
  action?(): ClosePromise | undefined;
  getEditor(r: number, originalEvent: AnnotatedMouseOrKeyEventUnion): IEditor;
}

export enum Trigger {
  Click = 'click',
  Space = 'space',
  Enter = 'enter',
  Dblclick = 'dblclick',
  Typing = 'typing',
  Tab = 'tab',
  Clickoff = 'clickoff',
  Escape = 'escape',
}

export type EditTrigger = Trigger.Click | Trigger.Dblclick | Trigger.Space | Trigger.Enter | Trigger.Typing;
export type SaveTrigger = Trigger.Tab | Trigger.Enter | Trigger.Escape | Trigger.Clickoff;
export type CancelTrigger = Trigger.Escape | Trigger.Clickoff;

export type EditEventUnion = 'moop';

export interface IEditModel {
  editing: boolean;
  savePromise?: SavePromise;
  currentEditor?: IEditor;
  _defaultDecorator: IDefaultEditDecorator;
  _hydrateOpts(opts?: Partial<IEditOptions>): IEditOptions;
  _interceptor(e: EventUnion): void;
  _closeEditor(): void;
  deleteSelection(): void;
  editCell(r: number, c: number, isTyping: boolean, originalEvent: AnnotatedMouseOrKeyEventUnion): void;
  cancelEdit(): void;
  saveEdit(): SavePromise;
}

export function create(grid: Grid) {
  const editModel: IEditModel = {
    editing: false,
    _defaultDecorator: grid.decorators.create(-1, -1, 1, 1),
    _hydrateOpts(optsCreator: Partial<IEditOptions> = {}) {
      const isActionMode = !!(optsCreator && optsCreator.action);
      const opts: IEditOptions = {
        getEditor() {
          return {};
        },
        headers: !!optsCreator.headers,
        editTriggers: isActionMode
          ? [Trigger.Click, Trigger.Space, Trigger.Enter]
          : [Trigger.Dblclick, Trigger.Enter, Trigger.Typing],
        saveTriggers: isActionMode ? [] : [Trigger.Tab, Trigger.Enter, Trigger.Clickoff],
        cancelTriggers: isActionMode ? [] : [Trigger.Escape],
        ...optsCreator,
      };
      if (isActionMode) {
        // tslint:disable-next-line:only-arrow-functions
        opts.getEditor = function () {
          return {
            decorator: false,
            save: undefined,
            closePromise: opts.action && opts.action.apply(opts, arguments),
          };
        };
      } else if (!opts.getEditor) {
        opts.getEditor = () => {
          return {};
        };
      }

      return opts;
    },
    _interceptor(e: EventUnion) {
      if (!isAnnotatedMouseOrKeyEvent(e)) {
        return;
      }
      const col = e.col;
      const row = e.row;
      const opts = getOptsForCol(col);
      if (!opts) {
        return;
      }
      if (!editModel.editing) {
        // check editTriggers if not editing
        switch (e.type) {
          case 'click':
            if (optsHasEditTrigger(opts, Trigger.Click) && grid.eventIsOnCells(e)) {
              editModel.editCell(row, col, false, e);
            }
            break;
          case 'dblclick':
            if (optsHasEditTrigger(opts, Trigger.Dblclick) && grid.eventIsOnCells(e)) {
              editModel.editCell(row, col, false, e);
            }
            break;
          case 'keydown':
            if (optsHasEditTrigger(opts, Trigger.Space) && key.is(key.code.special.space, e.which)) {
              editModel.editCell(row, col, false, e);
            }

            if (optsHasEditTrigger(opts, Trigger.Enter) && key.is(key.code.special.enter, e.which)) {
              editModel.editCell(row, col, false, e);
            }

            // delete trigger can also happen only when not editing
            // also have to hardcode 46 until key library merges change
            if (key.is(key.code.special.backspace, e.which) || e.which === 46) {
              editModel.deleteSelection();
            }
            break;
          case 'keypress':
            if (
              optsHasEditTrigger(opts, Trigger.Typing) &&
              e.which >= 32 &&
              e.which <= 122 &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.altKey
            ) {
              editModel.editCell(row, col, true, e);
            }
            break;
        }
      } else {
        // check save triggers if editing
        switch (e.type) {
          case 'keydown':
            if (optsHasSaveTrigger(opts, Trigger.Tab) && key.is(key.code.special.tab, e.which)) {
              editModel.saveEdit().then(() => {
                grid.navigationModel.handleTabEvent(e);
              });
              e.preventDefault();
            }

            if (optsHasSaveTrigger(opts, Trigger.Enter) && key.is(key.code.special.enter, e.which) && !e.shiftKey) {
              editModel.saveEdit().then(() => {
                grid.navigationModel.setFocus(
                  grid.data.down(grid.navigationModel.focus.row),
                  grid.navigationModel.focus.col,
                );
              });
              e.preventDefault();
            }
            break;
        }
      }
    },
    deleteSelection() {
      const ranges: RawPositionRange[] = grid.navigationModel.getAllSelectedRanges();
      const dataChanges: Array<IGridDataChange<any>> = [];
      ranges.forEach((range) => {
        grid.data.iterate(range, (r, c) => {
          dataChanges.push({
            row: r,
            col: c,
            value: undefined,
          });
        });
      });
      grid.dataModel.set(dataChanges);
    },
    editCell(r: number, c: number, isTyping: boolean, originalEvent: AnnotatedMouseOrKeyEventUnion) {
      if (editModel.editing) {
        editModel.saveEdit();
      }
      editModel.savePromise = undefined;

      if (isNaN(r) || isNaN(c)) {
        return;
      }
      const opts = getOptsForCol(c);
      if (!opts) {
        return;
      }
      if ((r < 0 || c < 0) && !opts.headers) {
        return;
      }

      const editor = opts.getEditor(r, originalEvent);
      // if they have no editor or not closePromise,
      // it's just a simple action and there's no need to wait on them in edit mode
      if (!editor || (!editor.closePromise && editor.decorator === false)) {
        return;
      }
      setEditing(true);
      if (editor.decorator === undefined) {
        editor.decorator = editModel._defaultDecorator;
        if (editor.save === undefined) {
          editor.save = () => {
            const text = editModel._defaultDecorator.renderedElem && editModel._defaultDecorator.renderedElem.value;
            return Promise.resolve({
              value: text,
              formatted: text,
            });
          };
        }
      }
      editModel.currentEditor = editor;
      if (editor.decorator) {
        editor.decorator.typedText = () => {
          return isTyping ? grid.textarea.value && grid.textarea.value.trim() : '';
        };
        editor.decorator.top = r;
        editor.decorator.left = c;
        grid.decorators.add(editor.decorator);
        editor.removeEscapeStackHandler = grid.escapeStack.add(() => {
          if (optsHasCancelTrigger(opts, Trigger.Escape)) {
            editModel.cancelEdit();
          } else if (optsHasSaveTrigger(opts, Trigger.Escape)) {
            editModel.saveEdit();
          }
        });

        editor.removeClickOffHandler = clickOff.listen(
          function getClickOffElement() {
            return editor.decorator && editor.decorator.boundingBox;
          },
          (e: MouseEvent) => {
            if (editor.isInMe && editor.isInMe(e)) {
              return;
            }
            if (optsHasCancelTrigger(opts, Trigger.Clickoff)) {
              editModel.cancelEdit();
            } else if (optsHasSaveTrigger(opts, Trigger.Clickoff)) {
              editModel.saveEdit();
            }
          },
          {},
        );
      }

      if (editor.closePromise) {
        editor.closePromise.then(
          function resolved() {
            return editModel.saveEdit();
          },
          function rejected() {
            return editModel.cancelEdit();
          },
        );
      }
    },
    _closeEditor() {
      if (!editModel.editing) {
        return;
      }
      setEditing(false);
      const currentEditor = editModel.currentEditor;
      if (currentEditor) {
        if (currentEditor.removeEscapeStackHandler) {
          currentEditor.removeEscapeStackHandler();
        }
        if (currentEditor.removeClickOffHandler) {
          currentEditor.removeClickOffHandler();
        }
        if (currentEditor.decorator) {
          grid.decorators.remove(currentEditor.decorator);
        }
      }

      grid.viewLayer.draw();
      grid.eventLoop.bindOnce('grid-draw', () => {
        if (grid.container) {
          grid.container.focus();
        }
      });
    },
    cancelEdit() {
      editModel._closeEditor();
    },
    saveEdit() {
      if (!editModel.savePromise) {
        const currentEditor = editModel.currentEditor;
        const savePromise = currentEditor && currentEditor.save && currentEditor.save();

        const maybeSetPromise =
          (savePromise &&
            savePromise.then((dataResult: IGridDataChange<any> | undefined) => {
              if (dataResult) {
                if (editModel.currentEditor && editModel.currentEditor.decorator) {
                  const { top, left } = editModel.currentEditor.decorator;
                  if (top !== undefined && left !== undefined) {
                    dataResult.row = top;
                    dataResult.col = left;
                    grid.dataModel.set([dataResult]);
                  }
                }
              }
              return dataResult;
            })) ||
          Promise.resolve();

        editModel.savePromise = (maybeSetPromise as Promise<any>).then((result: any) => {
          editModel._closeEditor();
          return result;
        });
      }
      return editModel.savePromise;
    },
  };

  editModel._defaultDecorator.render = () => {
    const element = document.createElement('textarea');
    element.style.pointerEvents = 'all';
    element.style.zIndex = '1';
    element.style.position = 'relative';
    grid.eventLoop.bindOnce('grid-draw', () => {
      const top = editModel._defaultDecorator.top;
      const left = editModel._defaultDecorator.left;
      element.value =
        (editModel._defaultDecorator.typedText && editModel._defaultDecorator.typedText()) ||
        (top != undefined && left != undefined && grid.dataModel.get(top, left).formatted) ||
        '';
      element.focus();
    });
    editModel._defaultDecorator.renderedElem = element;
    return element;
  };

  function hasTrigger(trigger: Trigger, triggers: Trigger[]) {
    return triggers.indexOf(trigger) !== -1;
  }

  function optsHasEditTrigger(opts: IEditOptions, trigger: EditTrigger) {
    return hasTrigger(trigger, opts.editTriggers);
  }

  function optsHasCancelTrigger(opts: IEditOptions, trigger: CancelTrigger) {
    return hasTrigger(trigger, opts.cancelTriggers);
  }

  function optsHasSaveTrigger(opts: IEditOptions, trigger: SaveTrigger) {
    return hasTrigger(trigger, opts.saveTriggers);
  }

  function getOptsForCol(col: number) {
    const colDescriptor = grid.data.col.get(col);
    if (!colDescriptor) {
      return;
    }
    return editModel._hydrateOpts(colDescriptor.editOptions);
  }

  function setEditing(editing: boolean) {
    const prevEditing = editModel.editing;
    editModel.editing = editing;
    if (prevEditing !== editing) {
      grid.eventLoop.fire('grid-edit');
    }
  }

  grid.eventLoop.bind('grid-destroy', () => {
    editModel.cancelEdit();
  });

  grid.eventLoop.addInterceptor(editModel._interceptor);

  return editModel;
}

export default create;
