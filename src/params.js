import * as yawgl from 'yawgl';

export function setParams(userParams) {
  const params = {};

  params.getPixelRatio = (userParams.pixelRatio)
    ? () => userParams.pixelRatio
    : () => window.devicePixelRatio;
  // NOTE: getPixelRatio() returns the result of an object getter,
  //       NOT the property value at the time of getPixelRatio definition
  //  Thus, getPixelRatio will mirror any changes in the parent object

  params.globeRadius = userParams.globeRadius || 6371;

  params.maps = Array.isArray(userParams.map)
    ? userParams.map
    : [userParams.map];
  params.nMaps = params.maps.length;

  if (userParams.gl instanceof WebGLRenderingContext) {
    params.gl = userParams.gl;
  } else {
    throw("satellite-view: no valid WebGLRenderingContext!");
  }

  return params;
}
