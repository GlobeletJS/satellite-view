export function initFramebuffer(gl, width, height) {
  // 1. Create a texture of the desired size
  const target = gl.TEXTURE_2D;
  const level = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  const border = 0;

  const texture = gl.createTexture();
  gl.bindTexture(target, texture);

  gl.texImage2D(target, level, format, width, height, border,
    format, type, null);

  // Set up for no mipmaps
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

  // 2. Create a framebuffer and attach the texture
  const buffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
    target, texture, level);

  gl.bindTexture(target, null);

  return {
    buffer,
    size: { width, height },
    sampler: texture,
  };
}
