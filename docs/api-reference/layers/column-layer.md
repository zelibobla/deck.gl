import {ColumnLayerDemo} from 'website-components/doc-demos/layers';

<ColumnLayerDemo />

<p class="badges">
  <img src="https://img.shields.io/badge/lighting-yes-blue.svg?style=flat-square" alt="lighting" />
</p>

# ColumnLayer

> This is the primitive layer rendered by [HexagonLayer](/docs/api-reference/aggregation-layers/hexagon-layer.md) after aggregation. Unlike the HexagonLayer, it renders one column for each data object.

The ColumnLayer can be used to render a heatmap of vertical cylinders. It renders a tessellated regular polygon centered at each given position (a "disk"), and extrude it in 3d.

```js
import DeckGL from '@deck.gl/react';
import {ColumnLayer} from '@deck.gl/layers';

function App({data, viewState}) {
  /**
   * Data format:
   * [
   *   {centroid: [-122.4, 37.7], value: 0.2},
   *   ...
   * ]
   */
  const layer = new ColumnLayer({
    id: 'column-layer',
    data,
    diskResolution: 12,
    radius: 250,
    extruded: true,
    pickable: true,
    elevationScale: 5000,
    getPosition: d => d.centroid,
    getFillColor: d => [48, 128, d.value * 255, 255],
    getLineColor: [0, 0, 0],
    getElevation: d => d.value
  });

  return <DeckGL viewState={viewState}
    layers={[layer]}
    getTooltip={({object}) => object && `height: ${object.value * 5000}m`} />;
}
```


## Installation

To install the dependencies from NPM:

```bash
npm install deck.gl
# or
npm install @deck.gl/core @deck.gl/layers
```

```js
import {ColumnLayer} from '@deck.gl/layers';
new ColumnLayer({});
```

To use pre-bundled scripts:

```html
<script src="https://unpkg.com/deck.gl@^8.0.0/dist.min.js"></script>
<!-- or -->
<script src="https://unpkg.com/@deck.gl/core@^8.0.0/dist.min.js"></script>
<script src="https://unpkg.com/@deck.gl/layers@^8.0.0/dist.min.js"></script>
```

```js
new deck.ColumnLayer({});
```


## Properties

Inherits from all [Base Layer](/docs/api-reference/core/layer.md) properties.

### Render Options

##### `diskResolution` (Number, optional)

* Default: `20`

The number of sides to render the disk as. The disk is a regular polygon that fits inside the given radius. A higher resolution will yield a smoother look close-up, but also need more resources to render.

##### `radius` (Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `1000`

Disk size in units specified by `radiusUnits` (default meters).

##### `angle` (Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `0`

Disk rotation, counter-clockwise in degrees.

##### `vertices` (Array, optional)

Replace the default geometry (regular polygon that fits inside the unit circle) with a custom one. The length of the array must be at least `diskResolution`. Each vertex is a point `[x, y]` that is the offset from the instance position, relative to the radius.

##### `offset` ([Number, Number], optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `[0, 0]`

Disk offset from the position, relative to the radius. By default, the disk is centered at each position.

##### `coverage` (Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `1`

Radius multiplier, between 0 - 1. The radius of the disk is calculated by
`coverage * radius`

##### `elevationScale` (Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `1`

Column elevation multiplier. The elevation of column is calculated by
`elevationScale * getElevation(d)`. `elevationScale` is a handy property
to scale all column elevations without updating the data.

##### `filled` (Boolean, optional)

* Default: `true`

Whether to draw a filled column (solid fill).

##### `stroked` (Boolean, optional)

* Default: `false`

Whether to draw an outline around the disks. Only applies if `extruded: false`.

##### `extruded` (Boolean, optional)

* Default: `true`

Whether to extrude the columns. If set to `false`, all columns will be rendered as flat polygons.

##### `wireframe` (Boolean, optional)

* Default: `false`

Whether to generate a line wireframe of the column. The outline will have
"horizontal" lines closing the top and bottom polygons and a vertical line
(a "strut") for each vertex around the disk. Only applies if `extruded: true`.

##### `radiusUnits` (String, optional)

* Default: `'meters'`

The units of the radius, one of `'meters'`, `'common'`, and `'pixels'`. See [unit system](/docs/developer-guide/coordinate-system.md#supported-units).

##### `lineWidthUnits` (String, optional)

* Default: `'meters'`

The units of the line width, one of `'meters'`, `'common'`, and `'pixels'`. See [unit system](/docs/developer-guide/coordinate-system.md#supported-units).

##### `lineWidthScale` (Boolean, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `1`

The line width multiplier that multiplied to all outlines if the `stroked` attribute is `true`.

##### `lineWidthMinPixels` (Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `0`

The minimum outline width in pixels.

##### `lineWidthMaxPixels` (Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: Number.MAX_SAFE_INTEGER

The maximum outline width in pixels.


##### `material` (Object, optional)

* Default: `true`

This is an object that contains material props for [lighting effect](/docs/api-reference/core/lighting-effect.md) applied on extruded polygons. Check [the lighting guide](/docs/developer-guide/using-lighting.md#constructing-a-material-instance) for configurable settings.


### Data Accessors

##### `getPosition` ([Function](/docs/developer-guide/using-layers.md#accessors), optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `object => object.position`

Method called to retrieve the position of each column, in `[x, y]`. An optional third component can be used to set the elevation of the bottom.

##### `getFillColor` ([Function](/docs/developer-guide/using-layers.md#accessors)|Array, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `[0, 0, 0, 255]`

The rgba color is in the format of `[r, g, b, [a]]`. Each channel is a number between 0-255 and `a` is 255 if not supplied.

* If an array is provided, it is used as the color for all objects.
* If a function is provided, it is called on each object to retrieve its color.
* If not provided, it falls back to `getColor`.

##### `getLineColor` ([Function](/docs/developer-guide/using-layers.md#accessors)|Array, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `[0, 0, 0, 255]`

The rgba color is in the format of `[r, g, b, [a]]`. Each channel is a number between 0-255 and `a` is 255 if not supplied.

* If an array is provided, it is used as the outline color for all columns.
* If a function is provided, it is called on each object to retrieve its outline color.
* If not provided, it falls back to `getColor`.

##### `getElevation` ([Function](/docs/developer-guide/using-layers.md#accessors)|Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `1000`

The elevation of each cell in meters.

* If a number is provided, it is used as the elevation for all objects.
* If a function is provided, it is called on each object to retrieve its elevation.


##### `getLineWidth` ([Function](/docs/developer-guide/using-layers.md#accessors)|Number, optional) ![transition-enabled](https://img.shields.io/badge/transition-enabled-green.svg?style=flat-square")

* Default: `1`

The width of the outline of the column, in units specified by `lineWidthUnits` (default meters). Only applies if `extruded: false` and `stroked: true`.

* If a number is provided, it is used as the outline width for all columns.
* If a function is provided, it is called on each object to retrieve its outline width.

## Source

[modules/layers/src/column-layer](https://github.com/visgl/deck.gl/tree/master/modules/layers/src/column-layer)
