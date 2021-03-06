export function setParams(userParams) {
  const {
    context,
    pixelRatio,
    globeRadius = 6371,
    map,
    flipY = false,
  } = userParams;

  const getPixelRatio = (pixelRatio)
    ? () => userParams.pixelRatio
    : () => window.devicePixelRatio;
  // NOTE: getPixelRatio() returns the result of an object getter,
  //       NOT the property value at the time of getPixelRatio definition
  //  Thus, getPixelRatio will mirror any changes in the parent object

  const maps = Array.isArray(map)
    ? map
    : [map];

  if (!context || !(context.gl instanceof WebGLRenderingContext)) {
    throw "satellite-view: no valid WebGLRenderingContext!";
  }

  return { context, getPixelRatio, globeRadius, maps, flipY };
}
