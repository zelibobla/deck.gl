import {applyPropOverrides} from '../lib/seer-integration';
import log from '../utils/log';

export const EMPTY_ARRAY = Object.freeze([]);

// Create a property object
export function createProps(layer, props) {
  // Get default prop object (a prototype chain for now)
  const {defaultProps} = getDefaultProps(layer.constructor);

  // Create a new prop object with the default props as prototype
  const newProps = Object.create(defaultProps, {
    _layer: {
      enumerable: false,
      value: layer
    },
    _asyncProps: {
      enumerable: false,
      value: {}
    }
  });

  // Extract any async props
  // props = setAsyncProps(newProps, props, ASYNC_PROPS);

  // "Copy" all sync props
  Object.assign(newProps, props);
  newProps.data = props.data || EMPTY_ARRAY;

  // SEER: Apply any overrides from the seer debug extension if it is active
  applyPropOverrides(props);

  // Props must be immutable
  Object.freeze(newProps);

  return newProps;
}

// Helper methods

// Constructors have their super class constructors as prototypes
function getOwnProperty(object, prop) {
  return Object.prototype.hasOwnProperty.call(object, prop) && object[prop];
}

function getLayerName(layerClass) {
  const layerName = getOwnProperty(layerClass, 'layerName');
  if (!layerName) {
    log.once(0, `Layer ${layerClass.name} does not specify a ${layerName}`);
  }
  return layerName || layerClass.name;
}

// ALT 1: Layer Prop Object Implementation

// Create a new Prop object if needed
function getDefaultProps(layerClass) {
  const props = getOwnProperty(layerClass, '_props');
  if (props) {
    return props;
  }

  const parent = layerClass.prototype;
  const parentClass = Object.getPrototypeOf(layerClass);
  const parentProps = (parent && getDefaultProps(parentClass)) || null;

  // Parse propTypes from Layer.defaultProps
  const defaultProps = getOwnProperty(layerClass, 'defaultProps') || {};

  // Create any necessary property descriptors and create the default prop object
  // Assign merged default props
  const myDefaultProps = Object.create(null);
  Object.assign(myDefaultProps, parentProps && parentProps.defaultProps, defaultProps);

  createPropDescriptors(myDefaultProps, layerClass);

  // Store the props
  layerClass._props = {
    defaultProps: myDefaultProps
  };

  return layerClass._props;
}

function createPropDescriptors(props, layerClass) {
  const descriptors = {};

  delete props.id;
  Object.assign(descriptors, {
    id: {
      configurable: false,
      writable: true,
      value: getLayerName(layerClass)
    }
  });
  Object.defineProperties(props, descriptors);
}
