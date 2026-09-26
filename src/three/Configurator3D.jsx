import React, { useEffect, useRef, useState } from "react";
import { RotateCw, RefreshCw, Printer } from "lucide-react";
import PrintSheet from "./PrintSheet.jsx";

// ---------------------------------------------------------------------------
// NordBase 3D configurator, ported into the real site from the standalone
// prototype (https://claude.ai/artifact/FuUJrPAo8FEkDPPsDCHnGs). Same real
// STEP-derived CAD geometry, same measured mounting offsets, same materials
// and lighting rig as the prototype -- nothing re-measured or re-guessed
// here, just re-wired for React + real .glb assets (the prototype had to
// smuggle models in as base64 text because the artifact host doesn't serve
// .glb; the real site can just serve the binary files from /public/models).
//
// Scope for this first site pass: foundation + adapter plate + add-ons for
// the three product families that have real CAD converted (small/DCS,
// medium/DCM, bollard). Large and Power Block have no converted geometry yet
// so they keep the existing static photo gallery only.
// ---------------------------------------------------------------------------

const M_TO_IN = 39.37007874;
const DCM_FORMED_LEG_DROP = 2.3 * 0.0254; // meters -- measured by Simon, see project notes 2026-09-18
const SENSOR_POLE_Y_OFFSET = 0.31; // meters -- from Nordinfra's combined DCM+sensor-pole STEP export
const SENSOR_POLE_Z_EMBED_CONST = 0.03; // meters

const FOUNDATIONS = {
  dcs: {
    id: "dcs",
    title: "NordBase Small foundation",
    parts: "100200",
    glb: "/models/100200_foundation.glb",
    // 100200 is the generic/universal Small foundation; 100201 is the same
    // envelope with Kempower-specific top-face registration -- swap to it
    // only when the Kempower plate is selected (verified mesh-vs-mesh, not
    // assumed -- see project notes 2026-09-17 del 4).
    kempowerGlb: "/models/100201_foundation.glb",
    kempowerParts: "100201",
  },
  dcm: {
    id: "dcm",
    title: "NordBase Medium foundation",
    parts: "100300",
    glb: "/models/100300_medium.glb",
  },
  bollard: {
    id: "bollard",
    title: "NordBase Bollard foundation",
    parts: "100100",
    glb: "/models/100100_bollard.glb",
  },
};

const ADAPTERS = {
  dcs: [
    { id: "none", label: "No adapter plate", glb: null },
    { id: "kempower", label: "Kempower — 200117", glb: "/models/200117_kempower.glb", parts: "200117" },
    { id: "universal", label: "Universal Pedestal — 200118", glb: "/models/200118_universal_pedestal.glb", parts: "200118" },
    { id: "leviton1", label: "Leviton EPED1-1/EPED2-2 — 200119", glb: "/models/200119_leviton_eped.glb", parts: "200119" },
    { id: "leviton2", label: "Leviton EPED1/EPED2 — 200120", glb: "/models/200120_leviton_eped.glb", parts: "200120" },
  ],
  dcm: [
    { id: "none", label: "No adapter plate", glb: null },
    { id: "abb-c50", label: "ABB C50 — 200100", glb: "/models/200100_abb_c50.glb", parts: "200100" },
    { id: "abb-a200-300-400", label: "ABB A200/300/400 — 200101", glb: "/models/200101_abb_a200_300_400.glb", parts: "200101" },
    { id: "abb-om-solo-duo", label: "ABB OM Solo/Duo — 200102", glb: "/models/200102_abb_om_solo_duo.glb", parts: "200102" },
    { id: "alpitronic-hyc200", label: "Alpitronic HYC200 — 200103", glb: "/models/200103_alpitronic_hyc200.glb", parts: "200103" },
    { id: "alpitronic-hyc400", label: "Alpitronic HYC400 — 200104", glb: "/models/200104_alpitronic_hyc400.glb", parts: "200104" },
    { id: "alpitronic-hyc1000-dispenser", label: "Alpitronic HYC1000 – Dispenser — 200105", glb: "/models/200105_alpitronic_hyc1000_dispenser.glb", parts: "200105" },
    { id: "alpitronic-hyc1000-mcs", label: "Alpitronic HYC1000 MCS — 200106", glb: "/models/200106_alpitronic_hyc1000_mcs.glb", parts: "200106" },
    { id: "autel-dc-compact", label: "Autel DC Compact — 200107", glb: "/models/200107_autel_dc_compact.glb", parts: "200107" },
    { id: "autel-dh480", label: "Autel DH480 — 200108", glb: "/models/200108_autel_dh480.glb", parts: "200108" },
    { id: "autel-maxicharger-df240", label: "Autel Maxicharger DF240 — 200109", glb: "/models/200109_autel_maxicharger_df240.glb", parts: "200109" },
    { id: "blink-charging-dcfc", label: "Blink Charging DCFC 60-300kW — 200110", glb: "/models/200110_blink_charging_dcfc.glb", parts: "200110" },
    { id: "chargepoint-express-250-280", label: "Chargepoint Express 250/280 — 200111", glb: "/models/200111_chargepoint_express_250_280.glb", parts: "200111" },
    { id: "chargepoint-express-powerlink2000", label: "Chargepoint Express PowerLink 2000 — 200112", glb: "/models/200112_chargepoint_express_powerlink2000.glb", parts: "200112" },
    { id: "siemens-sicharge-d-dispenser", label: "Siemens SICHARGE D – Dispenser — 200113", glb: "/models/200113_siemens_sicharge_d_dispenser.glb", parts: "200113" },
    { id: "siemens-sicharge-d", label: "Siemens SICHARGE D — 200114", glb: "/models/200114_siemens_sicharge_d.glb", parts: "200114" },
    { id: "siemens-sicharge-flex-big", label: "Siemens SICHARGE FLEX – Dispenser Big — 200115", glb: "/models/200115_siemens_sicharge_flex_big.glb", parts: "200115" },
    {
      id: "siemens-sicharge-flex-small",
      label: "Siemens SICHARGE FLEX – Dispenser Small — 200116",
      glb: "/models/200116_siemens_sicharge_flex_small.glb",
      parts: "200116",
      rotateFix: true,
      stillFlat: true,
    },
  ].map((a) => (a.id === "none" || a.stillFlat ? a : { ...a, legDrop: DCM_FORMED_LEG_DROP })),
  bollard: [],
};

const ADDONS = {
  dcs: [
    { id: "sensor-pole", label: "Sensor pole", glb: "/models/sensor_pole_frame.glb", mount: "side-approx" },
    { id: "postlane-premium", label: "Postlane Premium charger (visual only)", glb: "/models/postlane_premium.glb", mount: "top", centerMode: "native" },
  ],
  dcm: [{ id: "sensor-pole", label: "Sensor pole", glb: "/models/sensor_pole_frame.glb", mount: "side-verified" }],
  bollard: [{ id: "collision-protection", label: "Collision protection (Schedule 10-40)", glb: "/models/collision_protection.glb", mount: "top" }],
};

function fmtIN(m) {
  return (m * M_TO_IN).toFixed(2) + '"';
}

// Calculator-only extension (2026-09-26, see NordBaseCalculator.jsx's
// "Configuration drawing" Documents-list entry): this is a COPY of the
// site's Configurator3D.jsx (site/src/components/Configurator3D.jsx),
// duplicated rather than shared via ../../shared/ like chargerData.js,
// because this environment can't run a real `vite build` of the site app
// to verify a cross-app import wouldn't regress the live, already-working
// site (see project notes on the win32/linux node_modules mismatch) --
// safer to extend an isolated copy than to edit the site's shipped file
// blind. If you fix a geometry/mounting bug here, apply the same fix to
// the site's copy by hand, and vice versa.
//
// New optional props, all additive (every existing prop/behavior above is
// unchanged):
//   hidden          - render off-screen, no visible controls/dimension
//                     panel; used to generate a drawing without showing
//                     the customer any 3D UI (Simon, 2026-09-26: "Kund ska
//                     inte se 3D I kalkylator").
//   initialAdapterId / initialAddonIds - drive the selection from outside
//                     instead of defaulting to adapters[0]/empty, so the
//                     drawing matches what the customer already picked in
//                     the calculator, with no second selection step.
//   autoPrint       - once the initial selection's geometry has loaded,
//                     call handlePrint() automatically (no manual button
//                     click) -- per Simon: "inte ... ytterligare ett steg
//                     där kund måste göra val igen för att print."
//   onPrinted(ok)   - called right after the print is triggered (ok=false
//                     if the load failed instead), so the caller can
//                     unmount this hidden instance.
export default function Configurator3D({
  family,
  theme = "light",
  hidden = false,
  initialAdapterId,
  initialAddonIds,
  autoPrint = false,
  onPrinted,
}) {
  const dark = theme === "dark";
  const mountRef = useRef(null);
  const threeRef = useRef({});
  const loadTokenRef = useRef(0);
  const [ready, setReady] = useState(false);

  const adapters = ADAPTERS[family] || [];
  const addonList = ADDONS[family] || [];

  const [adapterId, setAdapterId] = useState(initialAdapterId ?? adapters[0]?.id ?? "none");
  const [addonIds, setAddonIds] = useState(() => new Set(initialAddonIds || []));
  const [dims, setDims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [printData, setPrintData] = useState(null);

  // ---- one-time scene setup (mount) ----
  useEffect(() => {
    let disposed = false;

    (async () => {
      const [THREE, { OrbitControls }, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (disposed) return;

      const el = mountRef.current;
      const width = el.clientWidth || 600;
      const height = el.clientHeight || 440;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.01, 100);
      camera.position.set(0.98, 0.98, 1.18);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.42, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.1;
      controls.maxDistance = 12;
      controls.maxPolarAngle = Math.PI * 0.5;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.1;
      controls.update();
      controls.addEventListener("start", () => {
        setAutoRotate((prev) => {
          if (prev) controls.autoRotate = false;
          return false;
        });
      });

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(2.2, 3.2, 1.6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 12;
      key.shadow.camera.left = -2.2;
      key.shadow.camera.right = 2.2;
      key.shadow.camera.top = 2.2;
      key.shadow.camera.bottom = -2.2;
      key.shadow.bias = -0.0015;
      key.shadow.radius = 3;
      scene.add(key);

      const rim = new THREE.DirectionalLight(0x9fc4e0, 0.5);
      rim.position.set(-2.4, 1.6, -1.8);
      scene.add(rim);

      const fillLight = new THREE.AmbientLight(0xffffff, 0.35);
      scene.add(fillLight);

      // Soft contact shadow, no visible ground plane color -- the page's own
      // background shows through (alpha:true renderer), per Simon's ask that
      // the viewer sit directly in the page design rather than a dark studio box.
      const ground = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.ShadowMaterial({ opacity: 0.16 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const FOUNDATION_MAT = new THREE.MeshStandardMaterial({ color: 0x6f757c, metalness: 0.35, roughness: 0.58 });
      const PLATE_MAT = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.68, roughness: 0.28 });
      const ADDON_MAT = new THREE.MeshStandardMaterial({ color: 0x8f96a0, metalness: 0.5, roughness: 0.42 });

      const loader = new GLTFLoader();
      const group = new THREE.Group();
      scene.add(group);

      function animate() {
        controls.update();
        renderer.render(scene, camera);
      }
      renderer.setAnimationLoop(animate);

      const ro = new ResizeObserver(() => {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      ro.observe(el);

      function disposeObject3D(root) {
        if (!root) return;
        root.traverse((o) => {
          if (o.isMesh && o.geometry) o.geometry.dispose();
        });
      }

      function applyMaterial(root, mat) {
        root.traverse((o) => {
          if (o.isMesh) {
            o.material = mat;
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
      }

      function centerRestOnGround(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        obj.position.x -= (box.min.x + box.max.x) / 2;
        obj.position.z -= (box.min.z + box.max.z) / 2;
        obj.position.y -= box.min.y;
        return new THREE.Box3().setFromObject(obj);
      }

      function centerRestOnTop(obj, topY) {
        const box = new THREE.Box3().setFromObject(obj);
        obj.position.x -= (box.min.x + box.max.x) / 2;
        obj.position.z -= (box.min.z + box.max.z) / 2;
        obj.position.y -= box.min.y;
        obj.position.y += topY;
        return new THREE.Box3().setFromObject(obj);
      }

      function centerRestOnTopKeepXZ(obj, topY) {
        const box = new THREE.Box3().setFromObject(obj);
        obj.position.y -= box.min.y;
        obj.position.y += topY;
        return new THREE.Box3().setFromObject(obj);
      }

      function frameCamera(box) {
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(size.length() / 2, 0.05);
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const fitFov = Math.min(vFov, hFov);
        const distance = (radius / Math.sin(fitFov / 2)) * 1.2;
        const dir = new THREE.Vector3(0.62, 0.62, 0.75).normalize();
        const camPos = center.clone().addScaledVector(dir, distance);
        camera.position.copy(camPos);
        controls.target.copy(center);
        controls.minDistance = Math.max(radius * 0.25, 0.05);
        controls.maxDistance = Math.max(radius * 8, 4.5);
        controls.update();
      }

      function loadGLB(url) {
        return fetch(url)
          .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status + " loading " + url);
            return r.arrayBuffer();
          })
          .then(
            (buf) =>
              new Promise((resolve, reject) => {
                loader.parse(buf, "", (gltf) => resolve(gltf.scene), reject);
              })
          );
      }

      async function rebuild(targetAdapterId, targetAddonIds) {
        const myToken = ++loadTokenRef.current;
        const fnd = FOUNDATIONS[family];
        const adapter = (ADAPTERS[family] || []).find((a) => a.id === targetAdapterId) || null;
        const addonsToLoad = (ADDONS[family] || []).filter((a) => targetAddonIds.has(a.id));

        const useKempowerFnd = family === "dcs" && adapter && adapter.id === "kempower" && fnd.kempowerGlb;
        const fndGlb = useKempowerFnd ? fnd.kempowerGlb : fnd.glb;

        setLoading(true);
        setFailed(false);

        try {
          const jobs = [loadGLB(fndGlb)];
          jobs.push(adapter && adapter.glb ? loadGLB(adapter.glb) : Promise.resolve(null));
          addonsToLoad.forEach((a) => jobs.push(loadGLB(a.glb)));

          const [fObj, aObj, ...addonObjsLoaded] = await Promise.all(jobs);
          if (myToken !== loadTokenRef.current) return;

          disposeObject3D(threeRef.current.foundationObj);
          disposeObject3D(threeRef.current.adapterObj);
          (threeRef.current.addonObjs || []).forEach(disposeObject3D);
          group.clear();

          threeRef.current.foundationObj = fObj;
          threeRef.current.adapterObj = aObj;
          threeRef.current.addonObjs = addonObjsLoaded;

          applyMaterial(fObj, FOUNDATION_MAT);
          const fBox = centerRestOnGround(fObj);
          group.add(fObj);
          const fSize = fBox.getSize(new THREE.Vector3());

          let stackTopY = fBox.max.y;

          if (aObj) {
            applyMaterial(aObj, PLATE_MAT);
            if (adapter && adapter.rotateFix) {
              aObj.rotation.x = -Math.PI / 2;
            }
            const aBox = centerRestOnTop(aObj, fBox.max.y);
            if (adapter && adapter.legDrop) {
              aObj.position.y -= adapter.legDrop;
              aBox.min.y -= adapter.legDrop;
              aBox.max.y -= adapter.legDrop;
            }
            group.add(aObj);
            stackTopY = aBox.max.y;
          }

          addonsToLoad.forEach((addon, i) => {
            const obj = addonObjsLoaded[i];
            if (!obj) return;
            applyMaterial(obj, ADDON_MAT);
            if (addon.mount === "top") {
              const box = addon.centerMode === "native" ? centerRestOnTopKeepXZ(obj, stackTopY) : centerRestOnTop(obj, stackTopY);
              stackTopY = box.max.y;
            } else {
              const halfDepth = fSize.z / 2;
              obj.position.set(0, SENSOR_POLE_Y_OFFSET, halfDepth + SENSOR_POLE_Z_EMBED_CONST);
            }
            group.add(obj);
          });

          const full = new THREE.Box3().setFromObject(group);
          const fullSize = full.getSize(new THREE.Vector3());
          setDims({ w: fullSize.x, d: fullSize.z, h: fullSize.y });
          frameCamera(full);

          // Title / parts string for the print sheet's header + title block --
          // same composition as the prototype (see project notes 2026-09-18).
          const titleParts = [fnd.title];
          if (adapter && adapter.id !== "none") titleParts.push(adapter.label.replace(/\s*—.*$/, ""));
          addonsToLoad.forEach((addon) => titleParts.push(addon.label));

          const partNos = [useKempowerFnd ? fnd.kempowerParts : fnd.parts];
          if (adapter && adapter.parts) partNos.push(adapter.parts);
          addonsToLoad.forEach((addon) => partNos.push(addon.label));

          threeRef.current.meta = { title: titleParts.join(" + "), parts: partNos.join(" · ") };

          setLoading(false);
        } catch (err) {
          if (myToken !== loadTokenRef.current) return;
          console.error("Configurator3D load failed:", err);
          setFailed(true);
          setLoading(false);
        }
      }

      // ---- 2D print / PDF export: Front, Top, Side orthographic captures ----
      // Ported from the standalone prototype's captureOrthoView -- same
      // VIEW_PAD framing (kept in sync with PrintSheet.jsx's DimStrip, which
      // uses the same constant to place the dimension-line arrows), same
      // offscreen 1000px-wide opaque render, same restore-afterward behavior.
      const VIEW_PAD = 1.18;
      function captureOrthoView(direction, size, center) {
        const maxDim = Math.max(size.x, size.y, size.z);
        const pad = VIEW_PAD;
        let viewW, viewH, camPos, upVec;
        if (direction === "front") {
          viewW = size.x;
          viewH = size.y;
          camPos = center.clone().add(new THREE.Vector3(0, 0, maxDim * 3));
          upVec = new THREE.Vector3(0, 1, 0);
        } else if (direction === "side") {
          viewW = size.z;
          viewH = size.y;
          camPos = center.clone().add(new THREE.Vector3(maxDim * 3, 0, 0));
          upVec = new THREE.Vector3(0, 1, 0);
        } else {
          viewW = size.x;
          viewH = size.z;
          camPos = center.clone().add(new THREE.Vector3(0, maxDim * 3, 0));
          upVec = new THREE.Vector3(0, 0, -1);
        }
        const halfW = (viewW / 2) * pad,
          halfH = (viewH / 2) * pad;
        const ortho = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, maxDim * 8);
        ortho.position.copy(camPos);
        ortho.up.copy(upVec);
        ortho.lookAt(center);
        ortho.updateProjectionMatrix();

        const outW = 1000,
          outH = Math.max(1, Math.round(1000 * (viewH / viewW)));
        const prevW = renderer.domElement.width,
          prevH = renderer.domElement.height;
        renderer.setSize(outW, outH, false);
        renderer.setClearColor(0xf4f4f4, 1);
        renderer.render(scene, ortho);
        const dataURL = renderer.domElement.toDataURL("image/png");
        renderer.setSize(prevW, prevH, false);
        renderer.setClearColor(0x000000, 0);
        return dataURL;
      }

      threeRef.current = {
        ...threeRef.current,
        THREE,
        renderer,
        scene,
        camera,
        controls,
        group,
        ground,
        loader,
        ro,
        el,
        rebuild,
        captureOrthoView,
      };
      setReady(true);
      const initialLoad = rebuild(adapterId, addonIds);
      if (autoPrint) {
        initialLoad.then(() => {
          if (disposed) return;
          const ok = !!threeRef.current.meta;
          if (ok) handlePrint();
          onPrinted && onPrinted(ok);
        });
      }
    })();

    return () => {
      disposed = true;
      const t = threeRef.current;
      if (t.ro) t.ro.disconnect();
      if (t.renderer) {
        t.renderer.setAnimationLoop(null);
        t.renderer.dispose();
        if (t.el && t.renderer.domElement && t.renderer.domElement.parentNode === t.el) {
          t.el.removeChild(t.renderer.domElement);
        }
      }
      threeRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family]);

  // ---- react to selection changes ----
  useEffect(() => {
    if (!ready || !threeRef.current.rebuild) return;
    threeRef.current.rebuild(adapterId, addonIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, adapterId, addonIds]);

  function toggleAddon(id) {
    setAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetView() {
    const t = threeRef.current;
    if (!t.group || !t.THREE) return;
    const full = new t.THREE.Box3().setFromObject(t.group);
    // frameCamera isn't exposed outside rebuild -- cheapest correct reset is
    // just re-running rebuild with the current selection, which reframes.
    t.rebuild && t.rebuild(adapterId, addonIds);
  }

  function toggleAutoRotate() {
    setAutoRotate((prev) => {
      const next = !prev;
      if (threeRef.current.controls) threeRef.current.controls.autoRotate = next;
      return next;
    });
  }

  function handlePrint() {
    const t = threeRef.current;
    if (!t.group || !t.THREE || !t.renderer || !t.scene || !t.captureOrthoView || !t.meta) return;

    const { THREE, renderer, scene, camera, group, ground, captureOrthoView, meta } = t;
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // A tall pole's cast shadow across a top-down view reads as a dark blob,
    // not useful on a line drawing -- hide ground + shadows for the capture,
    // same as the prototype's btnPrint handler.
    const prevGroundVisible = ground.visible;
    const prevShadowMap = renderer.shadowMap.enabled;
    ground.visible = false;
    renderer.shadowMap.enabled = false;

    const front = captureOrthoView("front", size, center);
    const top = captureOrthoView("top", size, center);
    const side = captureOrthoView("side", size, center);

    ground.visible = prevGroundVisible;
    renderer.shadowMap.enabled = prevShadowMap;
    renderer.render(scene, camera);

    setPrintData({
      title: meta.title,
      parts: meta.parts,
      size: { wLabel: fmtIN(size.x), dLabel: fmtIN(size.z), hLabel: fmtIN(size.y) },
      views: { front, top, side },
      todayISO: new Date().toISOString().slice(0, 10),
    });

    document.body.classList.add("printing-foundation");
    requestAnimationFrame(() => {
      window.print();
    });
  }

  useEffect(() => {
    function onAfterPrint() {
      document.body.classList.remove("printing-foundation");
    }
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  if (hidden) {
    return (
      <>
        <div
          ref={mountRef}
          aria-hidden="true"
          style={{ position: "fixed", left: "-9999px", top: 0, width: 640, height: 480, opacity: 0, pointerEvents: "none" }}
        />
        <PrintSheet data={printData} />
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl border sm:aspect-[16/10] ${
          dark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-gradient-to-b from-bgSoft to-white"
        }`}
      >
        <div ref={mountRef} className="h-full w-full" />
        {loading && (
          <div
            className={`absolute inset-0 flex items-center justify-center text-sm font-medium ${
              dark ? "bg-dark/70 text-white/70" : "bg-white/70 text-steel"
            }`}
          >
            Loading 3D model…
          </div>
        )}
        {failed && (
          <div
            className={`absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium ${
              dark ? "bg-dark/90 text-white/70" : "bg-white/90 text-steel"
            }`}
          >
            Couldn't load the 3D model right now. Try a different selection, or reload the page.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {adapters.length > 0 && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gold">Adapter plate</label>
            <select
              value={adapterId}
              onChange={(e) => setAdapterId(e.target.value)}
              className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                dark ? "border-white/15 bg-white/5 text-white" : "border-black/15 bg-white text-dark"
              }`}
            >
              {adapters.map((a) => (
                <option key={a.id} value={a.id} className="text-dark">
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {addonList.length > 0 && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gold">Add-on</label>
            <div className="mt-2 flex flex-col gap-2">
              {addonList.map((a) => (
                <label key={a.id} className={`flex items-center gap-2 text-sm ${dark ? "text-white" : "text-dark"}`}>
                  <input
                    type="checkbox"
                    checked={addonIds.has(a.id)}
                    onChange={() => toggleAddon(a.id)}
                    className={`h-4 w-4 rounded ${dark ? "border-white/25" : "border-black/25"}`}
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {dims && (
          <div className={`rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-white"}`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-gold">Overall dimensions</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className={`text-[11px] ${dark ? "text-white/50" : "text-steel"}`}>Width</div>
                <div className={`text-sm font-bold ${dark ? "text-white" : "text-dark"}`}>{fmtIN(dims.w)}</div>
              </div>
              <div>
                <div className={`text-[11px] ${dark ? "text-white/50" : "text-steel"}`}>Depth</div>
                <div className={`text-sm font-bold ${dark ? "text-white" : "text-dark"}`}>{fmtIN(dims.d)}</div>
              </div>
              <div>
                <div className={`text-[11px] ${dark ? "text-white/50" : "text-steel"}`}>Height</div>
                <div className={`text-sm font-bold ${dark ? "text-white" : "text-dark"}`}>{fmtIN(dims.h)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleAutoRotate}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold ${
              autoRotate
                ? "border-gold bg-gold/15 " + (dark ? "text-white" : "text-dark")
                : dark
                ? "border-white/15 text-white/60 hover:bg-white/[0.06]"
                : "border-black/15 text-steel hover:bg-black/[0.03]"
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" /> Auto-rotate
          </button>
          <button
            type="button"
            onClick={resetView}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold ${
              dark ? "border-white/15 text-white/60 hover:bg-white/[0.06]" : "border-black/15 text-steel hover:bg-black/[0.03]"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset view
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={!ready || loading || failed}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
            dark ? "border-white/15 text-white/60 hover:bg-white/[0.06]" : "border-black/15 text-steel hover:bg-black/[0.03]"
          }`}
        >
          <Printer className="h-3.5 w-3.5" /> Print 2D drawing (PDF)
        </button>

        <p className={`text-xs ${dark ? "text-white/40" : "text-steel"}`}>
          Real STEP-derived CAD geometry. Adapter plate position is centered from bounding-box measurement, not verified against exact hole
          registration. Surface finish shown is a neutral placeholder, not Nordinfra's final coating spec.
        </p>
      </div>

      <PrintSheet data={printData} />
    </div>
  );
}


// ---- Exports for NordBaseCalculator.jsx's headless drawing trigger ----
// (calculator-only addition, not present in the site's original file).
export { FOUNDATIONS, ADAPTERS, ADDONS };

// Maps a charger's adapter-plate part number (e.g. presetModelData.partNo,
// a string like "200117") to this component's own adapter `id` for the
// given family. Returns null if the family has no adapters or no match --
// callers should fall back to "no adapter plate" (or skip the drawing) in
// that case rather than guessing.
export function findAdapterIdByPartNo(family, partNo) {
  if (!partNo) return null;
  const match = (ADAPTERS[family] || []).find((a) => a.parts === String(partNo));
  return match ? match.id : null;
}
