import {LayerExtension} from '@deck.gl/core';
import {Texture2D} from '@luma.gl/core';
import GL from '@luma.gl/constants';

import {textureShaders} from './shaders.glsl';

const defaultProps = {
  pathTexture: null,
  getTexture: {type: 'accessor', value: d => d.texture},
};

const DEFAULT_TEXTURE_PARAMETERS = {
  [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
  // GL.LINEAR is the default value but explicitly set it here
  [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
  // for texture boundary artifact
  [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
  [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
};

export default class TextureStyleExtension extends LayerExtension {
  constructor() {
    super();
  }

  isEnabled(layer) {
    return layer.getAttributeManager() && !layer.state.pathTesselator;
  }

  getShaders(extension) {
    if (!extension.isEnabled(this)) {
      return null;
    }

    return {
      modules: [textureShaders]
    };
  }

  initializeState(context, extension) {
    if (!extension.isEnabled(this)) {
      return;
    }

    const attributeManager = this.getAttributeManager();

    if (extension.opts.pattern) {
      attributeManager.add({
        fillPatternFrames: {
          size: 4,
          accessor: 'getFillPattern',
          transform: extension.getPatternFrame.bind(this),
          shaderAttributes: {
            fillPatternFrames: {
              divisor: 0
            },
            instanceFillPatternFrames: {
              divisor: 1
            }
          }
        }
      });
    }
    this.setState({
      emptyTexture: new Texture2D(this.context.gl, {
        data: new Uint8Array(4),
        width: 1,
        height: 1
      })
    });
  }

  updateState({props, oldProps}, extension) {
    if (!extension.isEnabled(this)) {
      return;
    }

    if (props.fillPatternAtlas && props.fillPatternAtlas !== oldProps.fillPatternAtlas) {
      extension.loadPatternAtlas.call(this, props);
    }
  }

  draw(params, extension) {
    if (!extension.isEnabled(this)) {
      return;
    }

    const {pathTexture} = this.state;
    this.setModuleParameters({
      fillPatternTexture: patternTexture || this.state.emptyTexture
    });
  }

  finalizeState() {
    const {patternTexture, emptyTexture} = this.state;
    if (patternTexture) {
      patternTexture.delete();
    }
    if (emptyTexture) {
      emptyTexture.delete();
    }
  }

  async loadPatternAtlas({fillPatternAtlas, fetch}) {
    if (this.state.patternTexture) {
      this.state.patternTexture.delete();
    }
    this.setState({patternTexture: null});
    let image = fillPatternAtlas;
    if (typeof image === 'string') {
      image = await fetch(image, {propName: 'fillPatternAtlas', layer: this});
    }
    const patternTexture =
      image instanceof Texture2D
        ? image
        : new Texture2D(this.context.gl, {
            data: image,
            parameters: DEFAULT_TEXTURE_PARAMETERS
          });
    this.setState({patternTexture});
  }

  getPatternFrame(name) {
    const {patternMapping} = this.state;
    const def = patternMapping && patternMapping[name];
    return def ? [def.x, def.y, def.width, def.height] : [0, 0, 0, 0];
  }
}

TextureStyleExtension.extensionName = 'TextureStyleExtension';
TextureStyleExtension.defaultProps = defaultProps;
