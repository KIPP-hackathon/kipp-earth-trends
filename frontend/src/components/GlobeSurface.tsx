import { useEffect, useLayoutEffect, useRef } from "react";
import { colorFrame } from "../lib/earthApi";
import type { EarthColorRange, EarthFrame } from "../lib/earthApi";

// Orthographic ray-to-texture projection. SVG data layers use the same center.
const vertexSource = `attribute vec2 position; varying vec2 point;
void main(){point=position;gl_Position=vec4(position,0.,1.);}`;
const fragmentSource = `precision highp float;
varying vec2 point; uniform sampler2D earth; uniform sampler2D field;
uniform float showField; uniform vec2 center; uniform vec4 fieldBounds;
uniform float pointScale;
void main(){
  vec2 q=point*pointScale;
  float r2=dot(q,q); if(r2>1.) discard;
  float z=sqrt(max(0.,1.-r2));
  float lat=asin(clamp(z*sin(center.y)+q.y*cos(center.y),-1.,1.));
  float lon=center.x+atan(q.x,z*cos(center.y)-q.y*sin(center.y));
  vec2 uv=vec2(fract((lon+3.14159265)/6.2831853),(1.57079633-lat)/3.14159265);
  vec3 color=texture2D(earth,uv).rgb;
  float light=max(0.,dot(vec3(-.36,.30,.88),vec3(q,z)));
  vec2 fieldUv=vec2(mod(lon-fieldBounds.x+12.5663706,6.2831853)/fieldBounds.z,(fieldBounds.y-lat)/fieldBounds.w);
  vec4 layer=texture2D(field,fieldUv);
  if(fieldUv.x<0. || fieldUv.x>1. || fieldUv.y<0. || fieldUv.y>1.) layer=vec4(0.);
  gl_FragColor=vec4(mix(color*(.35+.65*light),layer.rgb,layer.a*showField),1.);
}`;

export function GlobeSurface({
  longitude,
  latitude,
  frame,
  showField = false,
  onUnavailable,
  colorRange,
  viewportZoom,
}: {
  longitude: number;
  latitude: number;
  frame?: EarthFrame | null;
  showField?: boolean;
  onUnavailable?: () => void;
  colorRange?: EarthColorRange;
  /** Render the visible 640-unit viewport directly; omitted for the legacy SVG zoom. */
  viewportZoom?: number;
}) {
  const viewportMode = viewportZoom !== undefined;
  const surfaceSize = viewportMode ? 1024 : 768;
  const zoom = Number.isFinite(viewportZoom)
    ? Math.min(8, Math.max(0.8, viewportZoom!))
    : 1;
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(() => void) | null>(null);
  const center = useRef([longitude, latitude]);
  const pointScale = useRef(viewportMode ? 320 / 270 / zoom : 1);
  const updateField = useRef<(() => void) | null>(null);
  const currentField = useRef({ frame, showField, colorRange });
  const failure = useRef(onUnavailable);
  failure.current = onUnavailable;
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
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteProgram(program);
      failure.current?.();
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Clamp supports the non-power-of-two NASA texture on WebGL 1.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
    gl.uniform1i(gl.getUniformLocation(program, "earth"), 0);
    const fieldTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(program, "field"), 1);
    const boundsLocation = gl.getUniformLocation(program, "fieldBounds");
    const showLocation = gl.getUniformLocation(program, "showField");
    updateField.current = () => {
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      const current = currentField.current;
      const bounds = current.frame?.grid.bounds ?? [-180, -90, 180, 90];
      const radians = Math.PI / 180;
      gl.uniform4f(
        boundsLocation,
        bounds[0] * radians,
        bounds[3] * radians,
        (bounds[2] - bounds[0]) * radians,
        (bounds[3] - bounds[1]) * radians,
      );
      if (current.frame) {
        const { width, height } = current.frame.grid;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          colorFrame(current.frame, current.colorRange),
        );
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array(4),
        );
      }
      gl.uniform1f(showLocation, current.showField && current.frame ? 1 : 0);
      draw.current?.();
    };
    const location = gl.getUniformLocation(program, "center");
    const pointScaleLocation = gl.getUniformLocation(program, "pointScale");
    let disposed = false;
    const image = new Image();
    draw.current = () => {
      gl.useProgram(program);
      gl.uniform2f(
        location,
        (center.current[0] * Math.PI) / 180,
        (center.current[1] * Math.PI) / 180,
      );
      gl.uniform1f(pointScaleLocation, pointScale.current);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    updateField.current();
    image.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Bound GPU memory even on devices with small maximum texture sizes.
      const bitmap = document.createElement("canvas");
      bitmap.width = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      bitmap.height = bitmap.width / 2;
      bitmap
        .getContext("2d")!
        .drawImage(image, 0, 0, bitmap.width, bitmap.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
      draw.current?.();
    };
    image.src = "/assets/earth-texture.jpg";
    return () => {
      disposed = true;
      image.onload = null;
      draw.current = null;
      updateField.current = null;
      gl.deleteTexture(texture);
      gl.deleteTexture(fieldTexture);
      gl.deleteBuffer(buffer);
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteProgram(program);
    };
  }, []);
  useLayoutEffect(() => {
    center.current = [longitude, latitude];
    // In viewport mode the 270-unit globe radius is projected into a 640-unit
    // window, keeping raster and SVG geometry aligned without magnifying a bitmap.
    pointScale.current = viewportMode ? 320 / 270 / zoom : 1;
    draw.current?.();
  }, [longitude, latitude, viewportMode, zoom]);
  useEffect(() => {
    currentField.current = { frame, showField, colorRange };
    updateField.current?.();
  }, [frame, showField, colorRange]);
  return (
    <foreignObject
      x={viewportMode ? 0 : 50}
      y={viewportMode ? 0 : 50}
      width={viewportMode ? 640 : 540}
      height={viewportMode ? 640 : 540}
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
