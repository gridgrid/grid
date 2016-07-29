[![npm][npm-badge]][npm-badge-url]
[npm-badge]: https://img.shields.io/npm/v/grid.svg
[npm-badge-url]: https://www.npmjs.com/package/grid

Grid
===

A highly scalable grid component written in javscript [DEMO](http://relateiq.github.io/grid/ "Grid Demo")

Note: while Grid is fully functional it is still in beta. Use at your own risk and please file any issues on GitHub. 

Also the grid is currently packaged for use with browserify. If you need a build for a non browserify (or webpack) environment please open an issue on github.


Installation
===
`npm install --save grid`

if using angular the wrapping module can simply be accessed:


`angular.module('myGridApp', [require('grid')])`


the three srvcs currently exposed can be injected

`function(GridSrvc, GridBuilderSrvc, GridDecoratorSrvc){}`


if not using angular 

`var core = require('grid/src/modules/core')`


Example / Quick-Start
===

To run the sample app locally, run `npm start` and hit http://localhost:8082

##### Create a Grid Instance
`var grid = core();` or in angular `var grid = GridSrvc.core();`

The grid handles most complexity for you. There are only three user supplied requirements to a get a grid up and running

##### Row and Column Descriptors
Row and column descriptors are objects that tell the grid how wide or high to make your cells. They also control things like whether or not a column is hidden and describe the overall dimensions of the grid.

``` javascript
	// add some columns
    var colDescriptors = [];
    var colDescriptor;
    for (var c = 0; c < 20; c++) {
        // create a col descriptor
        colDescriptor = grid.colModel.create();
        colDescriptor.width = 78;
        colDescriptor.hidden = !!(c % 2); // hide every other column for fun and profit
    }
    grid.colModel.add(colDescriptors);

    // add some rows
    var rowDescriptors = [];
    var rowDescriptor;
    for (var r = 0; r < 20; r++) {
        // create a row descriptor
        rowDescriptor = grid.rowModel.create();
        rowDescriptor.height = 24;
        if(r === 0){
        	rowDescriptor.header = true;
        }
    }
    grid.rowModel.add(rowDescriptors);
```

##### The DataModel

The grid determines what to render for a given cell by calling the supplied data model. This gives the client massive flexbility to generate and return the data however they need to.

The datamodel can be a simple object that the user sets on the grid instance `dataModel` field and needs to implement at a minimum

`get`, `getHeader`, and `isDirty`, 

if you support user data entry and want paste to work you should also implement `set`

Here's a basic read only implementation:

``` javascript
// use the grid's default dirty clean implementation almost always
// (it will automatically be set clean on each draw by the grid)
var dataDirtyClean = grid.makeDirtyClean();

grid.dataModel = {

    get: function(dataRowIndex, dataColIndex, isCopy) {
        var rawValue = [dataRowIndex, dataColIndex];
        return {
            value: rawValue,
            formatted: 'r' + rawValue[0] + ', c' + rawValue[1]
        };
    },
    
    getHeader: function(headerRowIndex, headerColIndex) {
        var rawValue = [headerRowIndex, headerColIndex];
        return {
            value: rawValue,
            formatted: 'hr' + rawValue[0] + ', hc' + rawValue[1]
        };
    },
    
    isDirty: dataDirtyClean.isDirty
};
```

##### Call Build
Finally we just need to tell the grid to set itself up in a container of our choosing:

``` javascript
var container = document.createElement('div');
container.style.width = '800px';
container.style.height = '800px';
document.body.appendChild(container);
grid.build(container);
```

Concepts
===

Many of the apis in the grid utilize two concepts when referencing coordinates: spaces and units. It's good to understand these before using the more advanced features.

## Spaces
Coordinates in the grid exist in one of three spaces.

**virtual** - represents all of the data in your grid including the headers. for example, if you have a grid with one header row, then `(0, 20)` in the `'virtual'` space references the column 20 of the header. `(1, 20)` would reference column 20 of the first data row.

**data** - very similar to virtual but does not include the headers. so `(0,20)` references the first row of data at the 20th column and technically `(-1, 20)` would represent the 20th column in the header although negative indexes are rarely used

**view** - the view space represents the actual dom nodes that are rendered for the grid's virtualization. the grid's implementation renders enough cells to fill the entire viewport and no more (usually around 20-30 rows and 10 cols depending on sizes). in this space `(0,20)` would reference the dom cell at column 20 of the first row. even if you scroll the grid it will always point at that cell, so a view coordinate can be translated to different virtual coordinates depending on the scroll. you could think of view coordinates as a correlary for `position: fixed` in css

## Units
Units in the grid are straightforward. They are either

**px** - pixels, so `(0,0)` in the view space is the very top left pixel of the grid no matter the scroll, whereas `(0,0)` in the virtual space is the top left pixel only when the grid hasn't been scrolled, and would technically refer to a pixel out of view if the grid has been scrolled

or

**cell** - cells, so `(0,0)` in the view space represents the top left cell regardless of scroll, and `(0,0)` in the virtual space would represent an off screen cell if scrolled and top left if not scrolled

Using Custom HTML
===

There are two ways to get non text (read html) into a grid:

## Decorators
Decorators are great for adding a piece of one-off ui that doesn't relate directly to the content of a cell or doesn't need to be in every row of a column or vice versa. For example, the grid internally uses decorators to render the focus and selection highlight as well as resize handles.

**basic decorator**
``` javascript
	var top = 1,
    left = 2,
    height = 1,
    width = 1,
    unit = 'cell',
    space = 'view';
    var d = grid.decorators.create(top, left, height, width, unit, space);

    // return some element
    d.render = function() {
        var a = document.createElement('a')
        a.textContent = 'link Text!'
        return a;
    };
    grid.decorators.add(d);
```

Puts a link over the cell at row 1 col 2 that doesn’t move with the scroll (why you would do this is questionable but it's just an example).

You can do more complicated things like render 

**angular directive decorator**
``` javascript
angular.module('myCoolGrid', [require('grid')])

  .controller('MyGridCtrl', function($scope, GridSrvc, GridDecoratorSrvc) {
      var grid = GridSrvc.core();

      // do row col and datamodel setup...

      var top = 20,
          left = 10,
          height = 2,
          width = 2,
          unit = 'cell',
          space = 'virtual';
      var d = grid.decorators.create(top, left, height, width, unit, space);

      // return some element
      d.render = function() {
          var scope = $scope.$new();
          scope.interestingData = 'INTERESTING DATA!!!';
          return GridDecoratorSrvc.render({
              $scope: scope,
              template: '<my-directive data="interestingData"></my-directive>',
              events: true
          });
      };
      grid.decorators.add(d);
  });
```

This will put your compiled directive in a box that spans from `row 20-22` and `col 10-12`, and moves appropriately with the scroll. The `events` flag lets the grid know that this decorator is interactable and should receive mouse events. (Otherwise pointer events are set to none.) The GridDecoratorSrvc takes care of destroying the scope and properly removing elements to avoid memory leaks with angular. You definitely should use it for any angular decorators.


## Builders
Builders help you to get html into the actual cells of a given row or column instead of the text that would have been rendered.


**basic builders**
``` javascript
var builder = grid.colModel.createBuilder(function render() {
    return angular.element('<a href="#"></a>')[0];
}, function update(elem, ctx) {
    grid.viewLayer.setTextContent(elem, ctx.data.formatted);
    return elem;
});
var colDescriptor = grid.colModel.create(builder);
```

have `<a>` tags in your cells for all the rows in that column

**angular cell builder**

``` javascript
angular.module('myCoolGrid', [require('grid')])

.controller('MyGridCtrl', function($scope, GridSrvc, GridBuilderSrvc) {
    var grid = GridSrvc.core();

    // do row col and datamodel setup...

    grid.colModel.create(grid.colModel.createBuilder(function render(ctx) {
        return GridBuilderSrvc.render($scope, '<my-directive data="interestingData"></my-directive>');
    }, function update(elem, ctx) {
        var scope = angular.element(elem).scope();
        scope.interestingData = ctx.data.formatted;
        scope.$digest();
        return elem;
    }));
});
```

The GridBuilderSrvc handles destroying the scope and properly removing the elements to prevent memory leaks.

Note: it's important for the update function of a builder to be extremely fast. Call `scope.$digest` not `scope.$apply`, and  use `grid.viewLayer.setTextContent` not `elem.innerHTML` where possible

