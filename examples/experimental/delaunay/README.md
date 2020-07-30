This is an experimental example of a DelaunayLayer
on [deck.gl](http://deck.gl) website.

### Usage

Copy the content of this folder to your project.

```bash
# install dependencies
npm install
# or
yarn
# bundle and serve the app with webpack
npm start
```

### DelaunayLayer

This layer interpolates values smoothly between sample points by their geospatial approximity.

When this layer is pickable, the picking info's `object` field is always `null`, and a `value` field reflects the interpolated value at the picked position.

##### `getPosition` (Accessor)

Returns the sample position for each data object.

##### `getValue` (Accessor)

Returns the sample value for each data object. Invalid value (NaN) is interpreted as `0`.

##### `colorScale` (Function)

* Default: `x => [255, 0, 0]`

Given a value retrieved by `getValue`, returns the color that should be used to display it. Color is in the format of `[r, g, b, a]` where each channel is between 0-255. If alpha is not supplied, it defaults to `255`.

### Data format

A data sample for demo purpose is stored in [this directory](./2019-ushcn-prcp.csv). The columns are:

- Weather station name
- Longitude
- Latitude
- Altitude
- Precipitation in January, 2019
- Precipitation in February, 2019
...
- Precipitation in December, 2019

Data source: [The United States Historical Climatology Network monthly temperature data](https://www.ncdc.noaa.gov/ushcn/introduction), version 2.5.5.20200729
