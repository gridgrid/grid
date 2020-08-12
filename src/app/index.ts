import makeSimpleGrid from "../modules/simple-grid";
import "../scss/grid-custom.scss";

const container = document.getElementsByClassName(
  "grid-app-container"
)[0] as HTMLElement;

const numRows = 1000;
const numCols = 100;

const grid = makeSimpleGrid(
  numRows,
  numCols,
  [30],
  [50, 100, 400, 90],
  1,
  3,
  undefined,
  1,
  1,
  {
    allowEdit: true,
    snapToCell: false,
  }
);
grid.colModel.get(0).width = 60;
grid.colModel.get(2).width = 60;
grid.build(container);
grid.pixelScrollModel.maxIsAllTheWayFor.height = true;
// grid.fps.logging = true;

// hide column for testing
for (let c = 0; c < grid.colModel.length(); c++) {
  if (c > 4 && c % 5 === 0) {
    grid.colModel.get(c).hidden = true;
  }
}

for (let r = 0; r < grid.rowModel.length(); r++) {
  const row = grid.rowModel.get(r);
  row.children = [];
  for (let s = 0; s < Math.floor(Math.random() * 5) + 1; s++) {
    const subRow = grid.rowModel.create();
    subRow.dataRow = s;
    subRow.dataLayer = 1;
    row.children.push(subRow);
  }
}

const builder = grid.colModel.createBuilder(
  () => {
    return document.createElement("a");
  },
  (elem, ctx) => {
    grid.viewLayer.setTextContent(elem, ctx.data.formatted);
    return elem;
  }
);

const expansionColDescriptor = grid.colModel.get(0);
expansionColDescriptor.builder = grid.colModel.createBuilder(
  (ctx) => {
    const a = document.createElement("a");
    a.style.cursor = "pointer";
    a.style.color = "#aaa";
    grid.eventLoop.bind(a, "click", () => {
      const row = grid.rowModel.get(grid.view.row.toVirtual(ctx.viewRow));
      row.expanded = !row.expanded;
    });
    return a;
  },
  (elem, ctx) => {
    if (elem) {
      const row = grid.rowModel.get(ctx.virtualRow);
      elem.textContent = !row.children ? "" : "▸";
    }
    return elem;
  }
);
grid.colModel.get(0).width = 30;
// grid.colModel.get(1).builder = builder;
grid.colModel.get(2).builder = builder;

const headerRow = grid.rowModel.get(0);
headerRow.isBuiltActionable = false;
headerRow.builder = grid.rowModel.createBuilder(
  () => {
    const div = document.createElement("div");
    div.innerHTML =
      '<div><div></div><div style="color:#777;text-transform: capitalize;"></div></div>';
    return div.firstChild as HTMLElement;
  },
  (builtElem, ctx) => {
    if (ctx.virtualCol === 0) {
      return builtElem;
    }
    if (builtElem) {
      builtElem.children[0].textContent = ctx.data.formatted;
      builtElem.children[1].textContent = "header" + ctx.virtualCol;
    }
    return builtElem;
  },
  true
);

headerRow.height = 40;
