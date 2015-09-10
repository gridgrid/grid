grid
===

A highly scaleable grid component written in javscript

Note: while Grid is fully functional it is still in beta. Use at your own risk and please file any issues on GitHub. 

Also the grid is currently packaged for use with browserify. If you need a build for a non browserify (or webpack) environment please open an issue on github.


installation
===
`npm install --save grid`

if using angular the wrapping module can simply be accessed:


`angular.module('myGridApp', [require('grid')])`


the three srvcs currently exposed can be injected

`function(GridSrvc, GridBuilderSrvc, GridDecoratorSrvc){}`


if not using angular 

`var core = require('grid/src/modules/core')`


example / quick start
===

##### create a grid instance
`var grid = core();` or in angular `var grid = GridSrvc.core();`

The grid handles most complexity for you. There are only three user supplied requirements to a get a grid up and running

##### row and column descriptors
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

`get`, `getHeader`, `getCopyData`, and `isDirty`, 

if you support user data entry and want paste to work you should also implement `set`

Here's a basic read only implementation:

``` javascript
// use the grid's default dirty clean implementation almost always
// (it will automatically be set clean on each draw by the grid)
var dataDirtyClean = grid.makeDirtyClean();

grid.dataModel = {

    get: function(dataRowIndex, dataColIndex) {
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
    
    // copy data is the same as normal data but it expects the result to only be a string 
    // (and gives the client a chance to return more interesting data for the copy)
    getCopyData: function(dataRowIndex, dataColIndex) {
        return grid.dataModel.get(dataRowIndex, dataColIndex).formatted;
    },
    
    isDirty: dataDirtyClean.isDirty
};
```

##### call build
Finally we just need to tell the grid to set itself up in a container of our choosing:

``` javascript
var container = document.createElement('div');
container.style.width = '800px';
container.style.height = '800px';
document.body.appendChild(container);
grid.build(container);
```

concepts
===

Many of the apis in the grid utilize two concepts when referencing coordinates: spaces and units. It's good to understand these before using the more advanced features.

## spaces
Coordinates in the grid exist in one of three spaces.

**virtual** - represents all of the data in your grid including the headers. for example, if you have a grid with one header row, then `(0, 20)` in the `'virtual'` space references the column 20 of the header. `(1, 20)` would reference column 20 of the first data row.

**data** - very similar to virtual but does not include the headers. so `(0,20)` references the first row of data at the 20th column and technically `(-1, 20)` would represent the 20th column in the header although negative indexes are rarely used

**view** - the view space represents the actual dom nodes that are rendered for the grid's virtualization. the grid's implementation renders enough cells to fill the entire viewport and no more (usually around 20-30 rows and 10 cols depending on sizes). in this space `(0,20)` would reference the dom cell at column 20 of the first row. even if you scroll the grid it will always point at that cell, so a view coordinate can be translated to different virtual coordinates depending on the scroll. you could think of view coordinates as a correlary for `position: fixed` in css

## units
Units in the grid are straightforward. They are either

**px** - pixels, so `(0,0)` in the view space is the very top left pixel of the grid no matter the scroll, whereas `(0,0)` in the virtual space is the top left pixel only when the grid hasn't been scrolled, and would technically refer to a pixel out of view if the grid has been scrolled

or

**cell** - cells, so `(0,0)` in the view space represents the top left cell regardless of scroll, and `(0,0)` in the virtual space would represent an off screen cell if scrolled and top left if not scrolled

