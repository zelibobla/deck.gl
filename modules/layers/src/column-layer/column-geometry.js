import {log} from '@deck.gl/core';
import {Geometry, uid} from '@luma.gl/core';
import {modifyPolygonWindingDirection, WINDING} from '@math.gl/polygon';

export default class ColumnGeometry extends Geometry {
  constructor(props = {}) {
    const {id = uid('column-geometry')} = props;
    const {indices, attributes, indexRanges} = tesselateColumn(props);
    super({
      ...props,
      id,
      indices,
      attributes
    });
    this.indexRanges = indexRanges;
  }
}

/* eslint-disable max-statements, max-depth, complexity */
function tesselateColumn(props) {
  const {radius, height = 1, nradial = 10, flat} = props;
  let {vertices} = props;

  if (vertices) {
    log.assert(vertices.length >= nradial); // `vertices` must contain at least `diskResolution` points
    vertices = vertices.flatMap(v => [v[0], v[1]]);
    modifyPolygonWindingDirection(vertices, WINDING.COUNTER_CLOCKWISE);
  } else {
    const stepAngle = (Math.PI * 2) / nradial;
    vertices = [];
    for (let j = 0; j < nradial; j++) {
      const a = j * stepAngle;
      vertices[j * 2] = Math.cos(a) * radius;
      vertices[j * 2 + 1] = Math.sin(a) * radius;
    }
  }

  const isExtruded = height > 0;
  const numVertices = flat
    ? nradial * 5 // top, side top edge * 2, side bottom edge * 2
    : isExtruded
      ? nradial * 3 // top, side top edge, side bottom edge
      : nradial; // top

  // wireframe: top loop, side vertical, bottom loop
  const wireframeIndicesCount = isExtruded ? nradial * 2 * 3 : 0;
  const topFillIndicesCount = (nradial - 2) * 3; // n-2 trianges
  const sideFillIndicesCount = isExtruded ? nradial * 2 * 3 : 0; // n quads
  const indices = new Uint16Array(
    wireframeIndicesCount + sideFillIndicesCount + topFillIndicesCount
  );

  const positions = new Float32Array(numVertices * 3);
  const normals = new Float32Array(numVertices * 3);

  let pi = 0; // position array index
  let ii = 0; // indices array index

  if (isExtruded) {
    /* Smooth shading:

       - 0 - 2 - 4 -  ... top
       / | / | / | /
       - 1 - 3 - 5 - ... bottom

       Flat shading:

      - 02 - 46 - 8A -  ... top
      / || / || / || /
      - 13 - 57 - 9B -  ... bottom
    */
    const verticesPerLocation = flat ? 4 : 2;
    let nextJ;

    // wireframe
    for (let j = 0; j < nradial; j++) {
      nextJ = (j + 1) % nradial;
      // top loop
      indices[ii++] = j * verticesPerLocation;
      indices[ii++] = nextJ * verticesPerLocation;
      // side vertical
      indices[ii++] = j * verticesPerLocation;
      indices[ii++] = j * verticesPerLocation + 1;
      // bottom loop
      indices[ii++] = j * verticesPerLocation + 1;
      indices[ii++] = nextJ * verticesPerLocation + 1;
    }

    // side tesselation
    let prevJ = nradial - 1;
    for (let j = 0; j < nradial; j++) {
      nextJ = (j + 1) % nradial;

      for (let k = 0; k < verticesPerLocation; k++) {
        positions[pi + 0] = vertices[j * 2];
        positions[pi + 1] = vertices[j * 2 + 1];
        positions[pi + 2] = (1 / 2 - (k % 2)) * height;

        if (flat) {
          const leftJ = k < 2 ? prevJ : j;
          const rightJ = k < 2 ? j : nextJ;
          normals[pi + 0] = vertices[rightJ * 2 + 1] - vertices[leftJ * 2 + 1]; // dy
          normals[pi + 1] = vertices[leftJ * 2] - vertices[rightJ * 2]; // -dx
        } else {
          normals[pi + 0] = vertices[j * 2];
          normals[pi + 1] = vertices[j * 2 + 1];
        }
        pi += 3;
      }
      // triangle1
      indices[ii++] = (j + 1) * verticesPerLocation - 2;
      indices[ii++] = (j + 1) * verticesPerLocation - 1;
      indices[ii++] = nextJ * verticesPerLocation;
      // triangle2
      indices[ii++] = (j + 1) * verticesPerLocation - 1;
      indices[ii++] = nextJ * verticesPerLocation + 1;
      indices[ii++] = nextJ * verticesPerLocation;

      prevJ = j;
    }
  }

  // top tesselation
  for (let j = 0; j < nradial; j++) {
    const vertexIndex = pi / 3;

    positions[pi + 0] = vertices[j * 2];
    positions[pi + 1] = vertices[j * 2 + 1];
    positions[pi + 2] = height / 2;

    normals[pi + 2] = 1;

    pi += 3;

    if (j >= 2) {
      indices[ii++] = vertexIndex - j;
      indices[ii++] = vertexIndex - 1;
      indices[ii++] = vertexIndex;
    }
  }

  return {
    indices,
    attributes: {
      POSITION: {size: 3, value: positions},
      NORMAL: {size: 3, value: normals}
    },
    // range: [start, length]
    indexRanges: {
      wireframe: [0, wireframeIndicesCount],
      side: [wireframeIndicesCount, sideFillIndicesCount],
      top: [wireframeIndicesCount + sideFillIndicesCount, topFillIndicesCount]
    }
  };
}
