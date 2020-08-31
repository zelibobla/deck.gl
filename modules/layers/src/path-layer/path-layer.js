// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {Layer, project32, picking, log} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {Model, Geometry} from '@luma.gl/core';
import {Texture2D} from '@luma.gl/core';

import PathTesselator from './path-tesselator';

import vs from './path-layer-vertex.glsl';
import fs from './path-layer-fragment.glsl';

const DEFAULT_COLOR = [0, 0, 0, 255];

const DEFAULT_TEXTURE_PARAMETERS = {
  [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
  // GL.LINEAR is the default value but explicitly set it here
  [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
  // for texture boundary artifact
  [GL.TEXTURE_WRAP_S]: GL.REPEAT,
  [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
};

const defaultProps = {
  texture: null, // {type: 'object', value: null, async: true},
  widthUnits: 'meters',
  widthScale: {type: 'number', min: 0, value: 1}, // stroke width in meters
  widthMinPixels: {type: 'number', min: 0, value: 0}, //  min stroke width in pixels
  widthMaxPixels: {type: 'number', min: 0, value: Number.MAX_SAFE_INTEGER}, // max stroke width in pixels
  rounded: false,
  miterLimit: {type: 'number', min: 0, value: 4},
  billboard: false,
  // `loop` or `open`
  _pathType: null,

  getPath: {type: 'accessor', value: object => object.path},
  getColor: {type: 'accessor', value: DEFAULT_COLOR},
  getWidth: {type: 'accessor', value: 1}
};

const ATTRIBUTE_TRANSITION = {
  enter: (value, chunk) => {
    return chunk.length ? chunk.subarray(chunk.length - value.length) : value;
  }
};

export default class PathLayer extends Layer {
  getShaders() {
    return super.getShaders({vs, fs, modules: [project32, picking]}); // 'project' module added by default.
  }

  get wrapLongitude() {
    return false;
  }

  initializeState() {
    const noAlloc = true;
    const attributeManager = this.getAttributeManager();
    /* eslint-disable max-len */
    attributeManager.addInstanced({
      positions: {
        size: 3,
        // Start filling buffer from 1 vertex in
        vertexOffset: 1,
        type: GL.DOUBLE,
        fp64: this.use64bitPositions(),
        transition: ATTRIBUTE_TRANSITION,
        accessor: 'getPath',
        update: this.calculatePositions,
        noAlloc,
        shaderAttributes: {
          instanceLeftPositions: {
            vertexOffset: 0
          },
          instanceStartPositions: {
            vertexOffset: 1
          },
          instanceEndPositions: {
            vertexOffset: 2
          },
          instanceRightPositions: {
            vertexOffset: 3
          }
        }
      },
      instanceTypes: {
        size: 1,
        type: GL.UNSIGNED_BYTE,
        update: this.calculateSegmentTypes,
        noAlloc
      },
      instanceStrokeWidths: {
        size: 1,
        accessor: 'getWidth',
        transition: ATTRIBUTE_TRANSITION,
        defaultValue: 1
      },
      instanceColors: {
        size: this.props.colorFormat.length,
        type: GL.UNSIGNED_BYTE,
        normalized: true,
        accessor: 'getColor',
        transition: ATTRIBUTE_TRANSITION,
        defaultValue: DEFAULT_COLOR
      },
      instancePickingColors: {
        size: 3,
        type: GL.UNSIGNED_BYTE,
        accessor: (object, {index, target: value}) =>
          this.encodePickingColor(object && object.__source ? object.__source.index : index, value)
      },

    });
    /* eslint-enable max-len */

    this.setState({
      pathTesselator: new PathTesselator({
        fp64: this.use64bitPositions()
      })
    });

    if (this.props.getDashArray && !this.props.extensions.length) {
      log.removed('getDashArray', 'PathStyleExtension')();
    }
  }

  async loadTexture({texture, fetch}) {
    if (this.state.pathTexture) {
      this.state.pathTexture.delete();
    }
    this.setState({pathTexture: null});
    let image = texture;
    if (typeof image === 'string') {
      image = await fetch(image, {propName: 'texture', layer: this});
    }
    const pathTexture =
      image instanceof Texture2D
        ? image
        : new Texture2D(this.context.gl, {
            data: image,
            parameters: DEFAULT_TEXTURE_PARAMETERS
          });
    this.setState({pathTexture});
  }

  updateState({oldProps, props, changeFlags}) {
    super.updateState({props, oldProps, changeFlags});

    const attributeManager = this.getAttributeManager();

    const {texture} = props;

    if (texture && props.texture != oldProps.texture) {
      this.loadTexture.call(this, props);
    }

    const geometryChanged =
      changeFlags.dataChanged ||
      (changeFlags.updateTriggersChanged &&
        (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getPath));

    if (geometryChanged) {
      const {pathTesselator} = this.state;
      const buffers = props.data.attributes || {};

      pathTesselator.updateGeometry({
        data: props.data,
        geometryBuffer: buffers.getPath,
        buffers,
        normalize: !props._pathType,
        loop: props._pathType === 'loop',
        getGeometry: props.getPath,
        positionFormat: props.positionFormat,
        wrapLongitude: props.wrapLongitude,
        // TODO - move the flag out of the viewport
        resolution: this.context.viewport.resolution,
        dataChanged: changeFlags.dataChanged
      });
      this.setState({
        numInstances: pathTesselator.instanceCount,
        startIndices: pathTesselator.vertexStarts
      });
      if (!changeFlags.dataChanged) {
        // Base `layer.updateState` only invalidates all attributes on data change
        // Cover the rest of the scenarios here
        attributeManager.invalidateAll();
      }
    }

    if (changeFlags.extensionsChanged) {
      const {gl} = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({model: this._getModel(gl)});
      attributeManager.invalidateAll();
    }
  }

  getPickingInfo(params) {
    const info = super.getPickingInfo(params);
    const {index} = info;
    const {data} = this.props;

    if (data[0] && data[0].__source) {
      // data is wrapped
      info.object = data.find(d => d.__source.index === index);
    }
    return info;
  }

  draw({uniforms}) {
    const {viewport} = this.context;
    const {
      rounded,
      billboard,
      miterLimit,
      widthUnits,
      widthScale,
      widthMinPixels,
      widthMaxPixels
    } = this.props;

    const widthMultiplier = widthUnits === 'pixels' ? viewport.metersPerPixel : 1;

    const {pathTexture} = this.state;
    if (pathTexture) {
      this.state.model
        .setUniforms(
          Object.assign({}, uniforms, {
            jointType: Number(rounded),
            billboard,
            widthScale: widthScale * widthMultiplier,
            miterLimit,
            widthMinPixels,
            widthMaxPixels,
            pathTexture
          })
        )
        .draw();
    }
  }

  _getModel(gl) {
    /*
     *       _
     *        "-_ 1                   3                       5
     *     _     "o---------------------o-------------------_-o
     *       -   / ""--..__              '.             _.-' /
     *   _     "@- - - - - ""--..__- - - - x - - - -_.@'    /
     *    "-_  /                   ""--..__ '.  _,-` :     /
     *       "o----------------------------""-o'    :     /
     *      0,2                            4 / '.  :     /
     *                                      /   '.:     /
     *                                     /     :'.   /
     *                                    /     :  ', /
     *                                   /     :     o
     */

    // prettier-ignore
    const SEGMENT_INDICES = [
      // start corner
      0, 1, 2,
      // body
      1, 4, 2,
      1, 3, 4,
      // end corner
      3, 5, 4
    ];

    // [0] position on segment - 0: start, 1: end
    // [1] side of path - -1: left, 0: center (joint), 1: right
    // prettier-ignore
    const SEGMENT_POSITIONS = [
      // bevel start corner
      0, 0,
      // start inner corner
      0, -1,
      // start outer corner
      0, 1,
      // end inner corner
      1, -1,
      // end outer corner
      1, 1,
      // bevel end corner
      1, 0
    ];

    return new Model(
      gl,
      Object.assign({}, this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: GL.TRIANGLES,
          attributes: {
            indices: new Uint16Array(SEGMENT_INDICES),
            positions: {value: new Float32Array(SEGMENT_POSITIONS), size: 2}
          }
        }),
        isInstanced: true
      })
    );
  }

  calculatePositions(attribute) {
    const {pathTesselator} = this.state;

    attribute.startIndices = pathTesselator.vertexStarts;
    attribute.value = pathTesselator.get('positions');
  }

  calculateSegmentTypes(attribute) {
    const {pathTesselator} = this.state;

    attribute.startIndices = pathTesselator.vertexStarts;
    attribute.value = pathTesselator.get('segmentTypes');
  }

  finalizeState() {
    const {pathTexture, emptyTexture} = this.state;
    if (pathTexture) {
      pathTexture.delete();
    }
    if (emptyTexture) {
      emptyTexture.delete();
    }
  }


}

PathLayer.layerName = 'PathLayer';
PathLayer.defaultProps = defaultProps;
