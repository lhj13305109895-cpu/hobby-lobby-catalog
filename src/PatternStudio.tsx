"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./pattern-studio-source.css";

type Finish = "matte" | "satin" | "gloss";
type Backdrop = "warm" | "paper" | "charcoal";

type TextureSettings = {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

const INITIAL_SETTINGS: TextureSettings = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

const BACKGROUNDS: Record<Backdrop, string> = {
  warm: "#d9d2c5",
  paper: "#ececea",
  charcoal: "#222322",
};

const IVORY_COLOR = 0xf0ecd8;
const LOCKED_POLAR_ANGLE = Math.atan2(Math.hypot(3.2, 4.8), 1.35 - 0.15);
const BODY_TINTS: Record<Finish, number> = {
  matte: 0xe9e5d3,
  satin: IVORY_COLOR,
  gloss: 0xf8f5e8,
};
const FINISH_SURFACE: Record<Finish, { roughness: number; clearcoat: number; clearcoatRoughness: number }> = {
  matte: { roughness: 0.72, clearcoat: 0, clearcoatRoughness: 0.8 },
  satin: { roughness: 0.42, clearcoat: 0.08, clearcoatRoughness: 0.5 },
  gloss: { roughness: 0.22, clearcoat: 0.36, clearcoatRoughness: 0.2 },
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value.toFixed(step < 0.1 ? 2 : 0)}{suffix}</output>
    </label>
  );
}

export function PotStudio() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const modelMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const originalMapsRef = useRef<(THREE.Texture | null)[]>([]);
  const uploadedTextureRef = useRef<THREE.Texture | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [textureName, setTextureName] = useState("");
  const [texturePreview, setTexturePreview] = useState("");
  const [textureError, setTextureError] = useState("");
  const [settings, setSettings] = useState<TextureSettings>(INITIAL_SETTINGS);
  const [finish, setFinish] = useState<Finish>("gloss");
  const [backdrop, setBackdrop] = useState<Backdrop>("warm");
  const [isDragging, setIsDragging] = useState(false);

  const resetView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(3.2, 1.35, 4.8);
    controls.target.set(0, 0.15, 0);
    controls.update();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUNDS.warm);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(3.2, 1.35, 4.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "可旋转的壶体 3D 预览");
    viewport.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minPolarAngle = LOCKED_POLAR_ANGLE;
    controls.maxPolarAngle = LOCKED_POLAR_ANGLE;
    controls.minDistance = 2.2;
    controls.maxDistance = 9;
    controls.target.set(0, 0.15, 0);
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xfffbef, 0x74796f, 2.2));
    const key = new THREE.DirectionalLight(0xfff4dc, 4.2);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9ddff, 2.1);
    fill.position.set(-5, 2, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2.4);
    rim.position.set(0, 3, -5);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 96),
      new THREE.MeshStandardMaterial({ color: 0xbeb7a9, roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.24;
    floor.receiveShadow = true;
    scene.add(floor);

    let disposed = false;
    let dracoLoader: { dispose: () => void } | null = null;
    const loadModel = async () => {
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      if (disposed) return;
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(
        "/pot.glb",
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const scale = 2.55 / Math.max(size.x, size.y, size.z);
          model.scale.setScalar(scale);
          model.position.copy(center.multiplyScalar(-scale));
          model.updateMatrixWorld(true);
          const scaledBox = new THREE.Box3().setFromObject(model);
          model.position.y += -1.16 - scaledBox.min.y;

          const materials: THREE.MeshPhysicalMaterial[] = [];
          const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: IVORY_COLOR,
            roughness: FINISH_SURFACE.gloss.roughness,
            metalness: 0,
            clearcoat: FINISH_SURFACE.gloss.clearcoat,
            clearcoatRoughness: FINISH_SURFACE.gloss.clearcoatRoughness,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });
          const fixtureMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xf3f1e9,
            roughness: 0.34,
            metalness: 0,
            clearcoat: 0.18,
            clearcoatRoughness: 0.3,
            side: THREE.DoubleSide,
          });
          let bodyFound = false;
          model.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            child.castShadow = true;
            child.receiveShadow = true;
            const isPrintSurface = child.name === "BODY_PRINT_365_99x183";
            if (isPrintSurface) {
              child.material = bodyMaterial;
              child.renderOrder = 1;
              bodyFound = true;
              materials.push(bodyMaterial);
            } else {
              child.material = fixtureMaterial;
            }
          });
          if (!bodyFound) {
            setLoadError(true);
            return;
          }
          modelMaterialsRef.current = materials;
          originalMapsRef.current = materials.map(() => null);
          modelRef.current = model;
          scene.add(model);
          setReady(true);
        },
        (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
        () => setLoadError(true)
      );
    };
    void loadModel();

    const resize = () => {
      const { clientWidth, clientHeight } = viewport;
      camera.aspect = Math.max(clientWidth, 1) / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      dracoLoader?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
    };
  }, []);

  useEffect(() => {
    const texture = uploadedTextureRef.current;
    if (!texture) return;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(settings.scaleX, settings.scaleY);
    texture.offset.set(settings.offsetX, settings.offsetY);
    texture.center.set(0.5, 0.5);
    texture.rotation = THREE.MathUtils.degToRad(settings.rotation);
    texture.needsUpdate = true;
  }, [settings]);

  useEffect(() => {
    modelMaterialsRef.current.forEach((material) => {
      const surface = FINISH_SURFACE[finish];
      material.color.set(material.map ? 0xffffff : BODY_TINTS[finish]);
      material.roughness = surface.roughness;
      material.clearcoat = surface.clearcoat;
      material.clearcoatRoughness = surface.clearcoatRoughness;
      material.needsUpdate = true;
    });
  }, [finish, ready]);

  useEffect(() => {
    const scene = rendererRef.current;
    if (scene) {
      // The renderer is intentionally referenced here so backdrop changes stay synchronous with UI.
    }
    const model = modelRef.current;
    if (!model) return;
    let root: THREE.Object3D = model;
    while (root.parent) root = root.parent;
    if (root instanceof THREE.Scene) root.background = new THREE.Color(BACKGROUNDS[backdrop]);
  }, [backdrop, ready]);

  const applyFile = useCallback((file?: File) => {
    if (!file) return;
    setTextureError("");
    if (!file.type.startsWith("image/")) {
      setTextureError("文件格式不支持，请上传 JPG、PNG 或 WEBP 图片。");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      if (uploadedTextureRef.current) uploadedTextureRef.current.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      // The Blender-authored print surface is exported through glTF, whose UV
      // convention requires runtime replacement textures to remain unflipped.
      texture.flipY = false;
      texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(settings.scaleX, settings.scaleY);
      texture.offset.set(settings.offsetX, settings.offsetY);
      texture.center.set(0.5, 0.5);
      texture.rotation = THREE.MathUtils.degToRad(settings.rotation);
      uploadedTextureRef.current = texture;
      modelMaterialsRef.current.forEach((material) => {
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
      });
      setTextureName(file.name);
      setTexturePreview(url);
    }, undefined, () => setTextureError("图案读取失败，请重新导出图片后再试。"));
  }, [settings, finish]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void applyFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void applyFile(event.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    const pasteImage = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.kind === "file" && entry.type.startsWith("image/"));
      const pastedFile = item?.getAsFile();
      if (!pastedFile) return;
      event.preventDefault();
      const extension = pastedFile.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const namedFile = new File([pastedFile], `粘贴图案-${Date.now()}.${extension}`, { type: pastedFile.type });
      applyFile(namedFile);
    };
    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, [applyFile]);

  const restoreOriginal = () => {
    modelMaterialsRef.current.forEach((material, index) => {
      material.map = originalMapsRef.current[index] ?? null;
      material.color.set(BODY_TINTS[finish]);
      material.needsUpdate = true;
    });
    setTextureName("");
    setTexturePreview("");
    setTextureError("");
    setSettings(INITIAL_SETTINGS);
  };

  const exportImage = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `壶身图案预览-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const downloadTemplate = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1464;
    canvas.height = 732;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f5f2ea";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(33, 35, 31, .18)";
    context.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += 146.4) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 146.4) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke();
    }
    context.strokeStyle = "#c45d36";
    context.setLineDash([16, 12]);
    context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
    context.font = "600 30px sans-serif";
    context.fillStyle = "#3a3c36";
    context.fillText("展开图 365.99 × 183 mm · 4 px/mm", 58, 82);
    context.font = "22px sans-serif";
    context.fillStyle = "#6f7169";
    context.fillText("虚线内为建议安全区 · 左右边缘为接缝", 58, 120);
    const link = document.createElement("a");
    link.download = "壶身展开图模板-365.99x183mm.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const updateSetting = (key: keyof TextureSettings, value: number) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand-mark">器</div>
        <div>
          <h1>壶身图案试样台</h1>
          <p>展开图即时上样 · 365.99 × 183 mm</p>
        </div>
        <div className="top-actions">
          <a className="studio-back-link" href="/">返回花色目录</a>
          <button className="ghost-button" onClick={downloadTemplate}>下载展开图模板</button>
          <button className="primary-button" onClick={exportImage} disabled={!ready}>导出当前视图</button>
        </div>
      </header>

      <section className="workspace">
        <div className="viewer-panel">
          <div ref={viewportRef} className={`viewport viewport-${backdrop}`}>
            {!ready && !loadError && (
              <div className="loading-card">
                <span className="loading-ring" />
                <strong>正在加载壶体</strong>
                <p>{progress ? `${progress}%` : "准备 3D 场景…"}</p>
                <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            {loadError && <div className="loading-card error-card"><strong>模型加载失败</strong><p>请刷新页面后重试。</p></div>}
            <div className="viewer-hints">
              <span>拖动左右旋转</span><span>滚轮缩放</span>
            </div>
            <button className="reset-view" onClick={resetView} aria-label="重置模型视角">↺ 重置视角</button>
          </div>
          <div className="viewer-footer">
            <div><b>MODEL</b><span>壶体 GLB · UV 已识别</span></div>
            <div className="backdrop-picker" aria-label="背景颜色">
              {(Object.keys(BACKGROUNDS) as Backdrop[]).map((item) => (
                <button
                  key={item}
                  className={backdrop === item ? "active" : ""}
                  style={{ background: BACKGROUNDS[item] }}
                  onClick={() => setBackdrop(item)}
                  aria-label={`切换为${item}背景`}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="control-panel">
          <section className="control-section upload-section">
            <div className="section-title"><span>01</span><h2>上传展开图</h2></div>
            <div
              className={`dropzone ${isDragging ? "dragging" : ""} ${texturePreview ? "has-image" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
            >
              {texturePreview ? (
                <img src={texturePreview} alt="已上传的展开图预览" />
              ) : (
                <><b>＋</b><strong>点击、拖入或 Ctrl+V 粘贴图案</strong><span>JPG / PNG / WEBP</span></>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
            </div>
            <div className="dimension-strip">
              <div><small>展开宽度</small><strong>365.99 <em>mm</em></strong></div>
              <i>×</i>
              <div><small>展开高度</small><strong>183 <em>mm</em></strong></div>
            </div>
            {textureName && <p className="file-name" title={textureName}>已上样 · {textureName}</p>}
            {textureError && <p className="file-name" role="alert">{textureError}</p>}
          </section>

          <section className="control-section">
            <div className="section-title"><span>02</span><h2>图案位置</h2></div>
            <div className="slider-stack">
              <Slider label="横向缩放" value={settings.scaleX} min={0.25} max={3} step={0.01} onChange={(value) => updateSetting("scaleX", value)} />
              <Slider label="纵向缩放" value={settings.scaleY} min={0.25} max={3} step={0.01} onChange={(value) => updateSetting("scaleY", value)} />
              <Slider label="左右位移" value={settings.offsetX} min={-1} max={1} step={0.01} onChange={(value) => updateSetting("offsetX", value)} />
              <Slider label="上下位移" value={settings.offsetY} min={-1} max={1} step={0.01} onChange={(value) => updateSetting("offsetY", value)} />
              <Slider label="旋转" value={settings.rotation} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateSetting("rotation", value)} />
            </div>
            <button className="text-button" onClick={() => setSettings(INITIAL_SETTINGS)}>恢复图案位置</button>
          </section>

          <section className="control-section finish-section">
            <div className="section-title"><span>03</span><h2>表面质感</h2></div>
            <div className="segmented">
              {(["matte", "satin", "gloss"] as Finish[]).map((item) => (
                <button key={item} onClick={() => setFinish(item)} className={finish === item ? "active" : ""}>
                  {{ matte: "哑光", satin: "半哑", gloss: "亮光" }[item]}
                </button>
              ))}
            </div>
          </section>

          <div className="panel-footer">
            <button className="secondary-button" onClick={restoreOriginal} disabled={!textureName}>查看原始模型</button>
            <p>提示：图案接缝通常位于展开图左右边缘。</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
