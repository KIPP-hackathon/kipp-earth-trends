import { useEffect, useLayoutEffect, useRef } from "react";
import { colorFrame } from "../lib/earthApi";
import type { EarthColorRange, EarthFrame } from "../lib/earthApi";
import type { MapLayer } from "../lib/layers";

// Orthographic ray-to-texture projection. SVG data layers use the same center.
const vertexSource = `attribute vec2 position; varying vec2 point;
void main(){point=position;gl_Position=vec4(position,0.,1.);}`;
const fragmentSource = `precision highp float;
varying vec2 point; uniform sampler2D earth; uniform sampler2D field;
uniform float showField; uniform vec2 center; uniform vec2 pointScale;
void main(){
  vec2 q=point*pointScale;
  float r2=dot(q,q); if(r2>1.) discard;
  float z=sqrt(max(0.,1.-r2));
  float lat=asin(clamp(z*sin(center.y)+q.y*cos(center.y),-1.,1.));
  float lon=center.x+atan(q.x,z*cos(center.y)-q.y*sin(center.y));
  vec2 uv=vec2(fract((lon+3.14159265)/6.2831853),(1.57079633-lat)/3.14159265);
  vec3 color=texture2D(earth,uv).rgb;
  float light=max(0.,dot(vec3(-.36,.30,.88),vec3(q,z)));
  vec4 layer=texture2D(field,uv)*showField;
  // The cached FBO contains premultiplied color from source-over blending.
  gl_FragColor=vec4(color*(.35+.65*light)*(1.-layer.a)+layer.rgb,1.);
}`;

// Compose the selected source grids once in geographic space. Camera movement
// then samples this single bounded texture, regardless of the layer count.
const compositeFragmentSource = `precision highp float;
varying vec2 point; uniform sampler2D source; uniform vec4 bounds;
uniform float opacity;
void main(){
  vec2 uv=point*.5+.5;
  float lon=uv.x*6.2831853-3.14159265;
  float lat=1.57079633-uv.y*3.14159265;
  vec2 sourceUv=vec2(mod(lon-bounds.x+12.5663706,6.2831853)/bounds.z,(bounds.y-lat)/bounds.w);
  if(sourceUv.x<0. || sourceUv.x>1. || sourceUv.y<0. || sourceUv.y>1.) discard;
  vec4 color=texture2D(source,sourceUv);
  gl_FragColor=vec4(color.rgb,color.a*opacity);
}`;

type LayerSnapshot = {
  id: string;
  frame?: EarthFrame;
  range: string;
  visible: boolean;
  opacity: number;
};

const rangeKey = (range?: EarthColorRange) =>
  range
    ? `${range.domain[0]}:${range.domain[1]}:${range.hideOutside}`
    : "default";

export function GlobeSurface({
  longitude,
  latitude,
  frame,
  layers,
  showField = false,
  onUnavailable,
  onReady,
  colorRange,
  viewportZoom,
  viewportAspect = 1,
}: {
  longitude: number;
  latitude: number;
  frame?: EarthFrame | null;
  /** Omitted retains the single-frame API; [] intentionally draws only Earth. */
  layers?: MapLayer[];
  showField?: boolean;
  onUnavailable?: () => void;
  onReady?: () => void;
  colorRange?: EarthColorRange;
  /** Render the visible 640-unit viewport directly; omitted for the legacy SVG zoom. */
  viewportZoom?: number;
  viewportAspect?: number;
}) {
  const viewportMode = viewportZoom !== undefined;
  const surfaceSize = viewportMode ? 1024 : 768;
  const zoom = Number.isFinite(viewportZoom)
    ? Math.min(8, Math.max(0.8, viewportZoom!))
    : 1;
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(() => void) | null>(null);
  const center = useRef([longitude, latitude]);
  const pointScale = useRef<[number, number]>(viewportMode ? [320 / 270 / zoom * Math.max(1, viewportAspect), 320 / 270 / zoom * Math.max(1, 1 / viewportAspect)] : [1, 1]);
  const updateField = useRef<(() => void) | null>(null);
  const currentField = useRef({ frame, layers, showField, colorRange });
  const failure = useRef(onUnavailable);
  failure.current = onUnavailable;
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    const gl = canvas.current?.getContext("webgl", {
      alpha: true,
      antialias: true,
    });
    if (!gl) {
      failure.current?.();
      return;
    }
    const shaders: WebGLShader[] = [];
    const programs: WebGLProgram[] = [];
    const sourceTextures = new Map<
      string,
      { texture: WebGLTexture; frame: EarthFrame; range: string }
    >();
    let disposed = false;
    const image = new Image();
    const earthTexture = gl.createTexture();
    const compositeTexture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    const buffer = gl.createBuffer();
    const dispose = () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      draw.current = null;
      updateField.current = null;
      sourceTextures.forEach(({ texture }) => gl.deleteTexture(texture));
      sourceTextures.clear();
      gl.deleteTexture(earthTexture);
      gl.deleteTexture(compositeTexture);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteBuffer(buffer);
      shaders.forEach((shader) => gl.deleteShader(shader));
      programs.forEach((program) => gl.deleteProgram(program));
    };
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const createProgram = (fragment: string) => {
      const program = gl.createProgram()!;
      programs.push(program);
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      return program;
    };
    const program = createProgram(fragmentSource);
    const compositeProgram = createProgram(compositeFragmentSource);
    if (
      !earthTexture ||
      !compositeTexture ||
      !framebuffer ||
      !buffer ||
      programs.some((item) => !gl.getProgramParameter(item, gl.LINK_STATUS))
    ) {
      dispose();
      failure.current?.();
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const bindQuad = (target: WebGLProgram) => {
      gl.useProgram(target);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const position = gl.getAttribLocation(target, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    };
    const configureTexture = (texture: WebGLTexture, filter: number) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Clamp also supports non-power-of-two source grids on WebGL 1.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    };
    gl.activeTexture(gl.TEXTURE0);
    configureTexture(earthTexture, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([31, 53, 47, 255]),
    );
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const compositeWidth = Math.min(2048, maxTextureSize);
    const compositeHeight = Math.max(1, Math.floor(compositeWidth / 2));
    gl.activeTexture(gl.TEXTURE1);
    configureTexture(compositeTexture, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      compositeWidth,
      compositeHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      compositeTexture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      dispose();
      failure.current?.();
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "earth"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "field"), 1);
    const location = gl.getUniformLocation(program, "center");
    const pointScaleLocation = gl.getUniformLocation(program, "pointScale");
    const showLocation = gl.getUniformLocation(program, "showField");
    gl.useProgram(compositeProgram);
    gl.uniform1i(gl.getUniformLocation(compositeProgram, "source"), 0);
    const boundsLocation = gl.getUniformLocation(compositeProgram, "bounds");
    const opacityLocation = gl.getUniformLocation(compositeProgram, "opacity");
    gl.clearColor(0, 0, 0, 0);
    draw.current = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.BLEND);
      bindQuad(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, earthTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, compositeTexture);
      gl.uniform2f(
        location,
        (center.current[0] * Math.PI) / 180,
        (center.current[1] * Math.PI) / 180,
      );
      gl.uniform2f(pointScaleLocation, ...pointScale.current);
      gl.uniform1f(showLocation, currentField.current.showField ? 1 : 0);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    let previous: LayerSnapshot[] | null = null;
    updateField.current = () => {
      const current = currentField.current;
      const selected: MapLayer[] = current.layers ?? [
        {
          id: "__primary",
          frame: current.frame ?? undefined,
          colorRange: current.colorRange,
          visible: true,
          opacity: 1,
        },
      ];
      const snapshot = selected.map((layer) => ({
        id: layer.id,
        frame: layer.frame,
        range: rangeKey(layer.colorRange),
        visible: layer.visible,
        opacity: Number.isFinite(layer.opacity)
          ? Math.max(0, Math.min(1, layer.opacity))
          : 0,
      }));
      const same =
        previous?.length === snapshot.length &&
        snapshot.every((entry, index) => {
          const old = previous![index];
          return (
            entry.id === old.id &&
            entry.frame === old.frame &&
            entry.range === old.range &&
            entry.visible === old.visible &&
            entry.opacity === old.opacity
          );
        });
      if (same) {
        draw.current?.();
        return;
      }
      const retained = new Set(selected.map(({ id }) => id));
      sourceTextures.forEach(({ texture }, id) => {
        if (!retained.has(id)) {
          gl.deleteTexture(texture);
          sourceTextures.delete(id);
        }
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, compositeWidth, compositeHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      bindQuad(compositeProgram);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      // RGB accumulates premultiplied color; alpha uses source-over coverage.
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
      for (let index = 0; index < selected.length; index++) {
        const layer = selected[index];
        const state = snapshot[index];
        if (!state.visible || !state.frame || state.opacity <= 0) continue;
        const frame = state.frame;
        const { width, height, bounds } = frame.grid;
        if (width > maxTextureSize || height > maxTextureSize) {
          failure.current?.();
          continue;
        }
        gl.activeTexture(gl.TEXTURE0);
        let cached = sourceTextures.get(state.id);
        if (!cached) {
          const texture = gl.createTexture();
          if (!texture) {
            failure.current?.();
            continue;
          }
          configureTexture(texture, gl.NEAREST);
          cached = { texture, frame, range: state.range };
          sourceTextures.set(state.id, cached);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            colorFrame(frame, layer.colorRange),
          );
        } else {
          gl.bindTexture(gl.TEXTURE_2D, cached.texture);
          if (cached.frame !== frame || cached.range !== state.range) {
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              width,
              height,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              colorFrame(frame, layer.colorRange),
            );
            cached.frame = frame;
            cached.range = state.range;
          }
        }
        const radians = Math.PI / 180;
        const longitudeSpan =
          bounds[2] >= bounds[0]
            ? bounds[2] - bounds[0]
            : bounds[2] + 360 - bounds[0];
        gl.uniform4f(
          boundsLocation,
          bounds[0] * radians,
          bounds[3] * radians,
          longitudeSpan * radians,
          (bounds[3] - bounds[1]) * radians,
        );
        gl.uniform1f(opacityLocation, state.opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      previous = snapshot;
      draw.current?.();
    };
    updateField.current();
    image.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, earthTexture);
      // Bound GPU memory even on devices with small maximum texture sizes.
      const bitmap = document.createElement("canvas");
      bitmap.width = Math.min(2048, maxTextureSize);
      bitmap.height = Math.max(1, Math.floor(bitmap.width / 2));
      bitmap
        .getContext("2d")!
        .drawImage(image, 0, 0, bitmap.width, bitmap.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
      draw.current?.();
      ready.current?.();
    };
    image.onerror = () => {
      if (!disposed) failure.current?.();
    };
    image.src = "/assets/earth-texture.jpg";
    return dispose;
  }, []);
  useLayoutEffect(() => {
    center.current = [longitude, latitude];
    // In viewport mode the 270-unit globe radius is projected into a 640-unit
    // window, keeping raster and SVG geometry aligned without magnifying a bitmap.
    pointScale.current = viewportMode ? [320 / 270 / zoom * Math.max(1, viewportAspect), 320 / 270 / zoom * Math.max(1, 1 / viewportAspect)] : [1, 1];
    draw.current?.();
  }, [longitude, latitude, viewportMode, zoom, viewportAspect]);
  useEffect(() => {
    currentField.current = { frame, layers, showField, colorRange };
    updateField.current?.();
  }, [frame, layers, showField, colorRange]);
  // Keep the live WebGL viewport in HTML. WebKit can composite a GPU canvas
  // inside SVG foreignObject at unscaled SVG coordinates on iOS, shifting and
  // enlarging the raster relative to the outlines and hit-testing geometry.
  if (viewportMode) {
    return (
      <canvas
        ref={canvas}
        width={Math.min(2048, Math.round(surfaceSize * viewportAspect))}
        height={surfaceSize}
        className="earth-surface globe-surface-viewport"
        aria-hidden="true"
      />
    );
  }
  return (
    <foreignObject
      x={50}
      y={50}
      width={540}
      height={540}
      pointerEvents="none"
    >
      <canvas
        ref={canvas}
        width={surfaceSize}
        height={surfaceSize}
        className="earth-surface"
        aria-hidden="true"
      />
    </foreignObject>
  );
}
