import React, {useState} from 'react';
import {render} from 'react-dom';

import DeckGL from '@deck.gl/react';
import {ScatterplotLayer} from '@deck.gl/layers';
import {load} from '@loaders.gl/core';
import {CSVLoader} from '@loaders.gl/csv';
import {interpolateYlOrRd} from 'd3-scale-chromatic';
import {color} from 'd3-color';

import DelaunayLayer from './delaunay-layer';

const INITIAL_VIEW_STATE = {
  longitude: -100,
  latitude: 42,
  zoom: 4
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function hexToRGB(hex) {
  const c = color(hex);
  return [c.r, c.g, c.b];
}

function getTooltip(info, month) {
  if (info.layer.id === 'stations') {
    const value = info.object[month + 4];
    return `${info.object[0]}
    Precipitation in ${MONTHS[month]}: ${Number.isFinite(value) ? `${value / 10}mm` : 'N/A'}`;
  }
  if (info.layer.id === 'prcp') {
    return `Estimated precipitation in ${MONTHS[month]}: ${info.value.toFixed(1)}mm`;
  }
  return null;
}

export default function App({data}) {
  const [month, setMonth] = useState(0);

  const layers = [
    new DelaunayLayer({
      id: 'prcp',
      data,
      getPosition: d => d.slice(1, 4),
      getValue: d => d[month + 4] / 10,
      colorScale: x => hexToRGB(interpolateYlOrRd(x / 500)),
      pickable: true,
      updateTriggers: {
        getValue: [month]
      }
    }),
    new ScatterplotLayer({
      id: 'stations',
      data,
      getPosition: d => d.slice(1, 4),
      pickable: true,
      radiusMinPixels: 2
    })
  ];

  return (
    <>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getTooltip={info => (info.picked ? getTooltip(info, month) : null)}
      />
      <div id="control-panel">
        <div>{MONTHS[month]}, 2019</div>
        <input
          type="range"
          min="0"
          max="11"
          step="1"
          value={month}
          onChange={evt => setMonth(Number(evt.target.value))}
        />
      </div>
    </>
  );
}

export function renderToDOM(container) {
  const data = load('./2019-ushcn-prcp.csv', CSVLoader, {header: false});
  render(<App data={data} />, container);
}
