import { useEffect, useRef } from "react";

// Orthographic ray-to-texture projection. SVG data layers use the same center.
const vertexSource = `attribute vec2 position; varying vec2 point;
void main(){point=position;gl_Position=vec4(position,0.,1.);}`;
const fragmentSource = `precision highp float;
varying vec2 point; uniform sampler2D earth; uniform vec2 center;
void main(){
  float r2=dot(point,point); if(r2>1.) discard;
  float z=sqrt(max(0.,1.-r2));
  float lat=asin(clamp(z*sin(center.y)+point.y*cos(center.y),-1.,1.));
  float lon=center.x+atan(point.x,z*cos(center.y)-point.y*sin(center.y));
  vec2 uv=vec2(fract((lon+3.14159265)/6.2831853),(1.57079633-lat)/3.14159265);
  vec3 color=texture2D(earth,uv).rgb;
  float light=max(0.,dot(vec3(-.36,.30,.88),vec3(point,z)));
  gl_FragColor=vec4(color*(.35+.65*light),1.);
}`;

export function GlobeSurface({
  longitude,
  latitude,
}: {
  longitude: number;
  latitude: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(() => void) | null>(null);
  const center = useRef([longitude, latitude]);
  useEffect(() => {
    const gl = canvas.current?.getContext("webgl", {
      alpha: true,
      antialias: true,
    });
    if (!gl) return; // The geographic SVG underneath remains fully interactive.
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
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Clamp supports the non-power-of-two NASA texture on WebGL 1.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const location = gl.getUniformLocation(program, "center");
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Bound GPU memory even on devices with small maximum texture sizes.
      const bitmap = document.createElement("canvas");
      bitmap.width = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      bitmap.height = bitmap.width / 2;
      bitmap
        .getContext("2d")!
        .drawImage(image, 0, 0, bitmap.width, bitmap.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
      draw.current = () => {
        gl.useProgram(program);
        gl.uniform2f(
          location,
          (center.current[0] * Math.PI) / 180,
          (center.current[1] * Math.PI) / 180,
        );
        gl.viewport(0, 0, 768, 768);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      draw.current();
    };
    image.src = "/assets/earth-texture.jpg";
    return () => {
      disposed = true;
      image.onload = null;
      draw.current = null;
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteProgram(program);
    };
  }, []);
  useEffect(() => {
    center.current = [longitude, latitude];
    draw.current?.();
  }, [longitude, latitude]);
  return (
    <foreignObject x="50" y="50" width="540" height="540" pointerEvents="none">
      <canvas
        ref={canvas}
        width="768"
        height="768"
        className="earth-surface"
        aria-hidden="true"
      />
    </foreignObject>
  );
}
