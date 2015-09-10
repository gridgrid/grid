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

```
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

```
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

```
var container = document.createElement('div');
container.style.width = '800px';
container.style.height = '800px';
document.body.appendChild(container);
grid.build(container);
```
