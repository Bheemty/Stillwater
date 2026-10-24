import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  Mesh,
  MeshBasicMaterial,
  Texture,
  VideoTexture,
  SRGBColorSpace,
  NoToneMapping,
  LinearFilter,
  REVISION,
} from "three";

// Match the existing film crop and portrait composition in CSS-pixel coordinates.
export function filmRect(width, height) {
  if (width < 700 || width / height < 1.05)
    return {
      x: 0,
      y: Math.round(height * 0.32),
      width,
      height: (width * 9) / 16,
    };
  const wide = width / height > 16 / 9;
  const w = wide ? width : (height * 16) / 9;
  const h = wide ? (width * 9) / 16 : height;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

export function createFilmRenderer(
  initialCanvas,
  { forceCanvas = false } = {},
) {
  let canvas = initialCanvas,
    gl,
    scene,
    camera,
    geometry,
    material,
    plane,
    texture,
    ctx,
    width = 1,
    height = 1,
    pixelRatio = 1,
    lastImage = null,
    disposed = false;
  const ink = "#20251f";
  function releaseWebGL() {
    canvas.removeEventListener("webglcontextlost", contextLost);
    texture?.dispose();
    geometry?.dispose();
    material?.dispose();
    gl?.dispose();
    texture = null;
    gl = null;
  }
  function fallback() {
    releaseWebGL();
    // A canvas that already owned WebGL cannot acquire a 2D context.
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
    ctx = canvas.getContext("2d", { alpha: false });
    canvas.dataset.renderer = "canvas-fallback";
    canvas.dataset.threeRevision = REVISION;
    canvas.dataset.gpuTextures = "0";
    canvas.dataset.drawCalls = "0";
    resize(width, height, pixelRatio);
    if (lastImage) draw(lastImage);
  }
  function contextLost(event) {
    event.preventDefault();
    if (!disposed) fallback();
  }
  try {
    if (forceCanvas)
      throw new Error("Canvas fallback requested for verification");
    gl = new WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "default",
    });
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = NoToneMapping; // The footage already contains its approved lighting/grade.
    gl.setClearColor(ink, 1);
    scene = new Scene();
    camera = new OrthographicCamera(0, 1, 1, 0, 0.1, 10);
    camera.position.z = 1;
    geometry = new PlaneGeometry(1, 1);
    material = new MeshBasicMaterial({
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });
    plane = new Mesh(geometry, material);
    plane.frustumCulled = false;
    scene.add(plane);
    canvas.dataset.renderer = "three-webgl";
    canvas.dataset.threeRevision = REVISION;
    canvas.addEventListener("webglcontextlost", contextLost);
  } catch {
    fallback();
  }

  function resize(w, h, dpr) {
    width = w;
    height = h;
    pixelRatio = dpr;
    if (gl) {
      gl.setPixelRatio(dpr);
      gl.setSize(w, h, false);
      camera.left = 0;
      camera.right = w;
      camera.top = h;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
    } else {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  function draw(image) {
    if (disposed) return;
    lastImage = image;
    const rect = filmRect(width, height);
    if (gl) {
      const isVideo = image.tagName === 'VIDEO';
      const isBitmap = typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap;
      const w = image.videoWidth || image.naturalWidth || image.displayWidth || image.width,
        h = image.videoHeight || image.naturalHeight || image.displayHeight || image.height;
      if (
        !texture ||
        texture.userData.width !== w ||
        texture.userData.height !== h ||
        Boolean(texture.isVideoTexture) !== isVideo ||
        (isVideo && texture.image !== image) || Boolean(texture.userData.bitmap) !== isBitmap
      ) {
        texture?.dispose();
        texture = isVideo ? new VideoTexture(image) : new Texture(image);
        texture.colorSpace = SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.userData = { width: w, height: h, bitmap: isBitmap };
        if(isBitmap){texture.repeat.y=-1;texture.offset.y=1;}
        material.map = texture;
        material.needsUpdate = true;
        texture.needsUpdate = true;
      } else if (texture.image !== image) {
        texture.image = image;texture.needsUpdate = true;
      }
      plane.position.set(
        rect.x + rect.width / 2,
        height - rect.y - rect.height / 2,
        0,
      );
      plane.scale.set(rect.width, rect.height, 1);
      gl.render(scene, camera);
      canvas.dataset.gpuTextures = String(gl.info.memory.textures);
      canvas.dataset.drawCalls = String(gl.info.render.calls);
    } else {
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    }
  }
  return {
    resize,
    draw,
    stats: () => ({
      renderer: canvas.dataset.renderer,
      threeRevision: REVISION,
      gpuTextures: gl?.info.memory.textures || 0,
      drawCalls: gl?.info.render.calls || 0,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      releaseWebGL();
      lastImage = null;
    },
  };
}
