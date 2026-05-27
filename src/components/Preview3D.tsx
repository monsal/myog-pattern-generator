import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Project } from "../types";
import { polygonArea } from "../lib/geometry";
import { buildAssembly, type PlacedPiece } from "../lib/assembly3d";

type Props = {
  project: Project;
  selectedPieceId?: string | null;
  selectedSeamId?: string | null;
};

export default function Preview3D({ project, selectedPieceId, selectedSeamId }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    pieceGroup: THREE.Group;
    seamGroup: THREE.Group;
    raf: number;
  } | null>(null);

  // Set up renderer / camera / controls once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    const initialW = mount.clientWidth || 400;
    const initialH = mount.clientHeight || 400;
    renderer.setSize(initialW, initialH, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      40,
      initialW / Math.max(1, initialH),
      1,
      10000
    );
    camera.position.set(900, 700, 900);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 200, 0);

    // Soft warm lighting to match the canvas aesthetic.
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(600, 1000, 400);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc0d0e0, 0.35);
    fill.position.set(-700, 400, -500);
    scene.add(fill);

    // Ground hint circle so the assembly reads as sitting on a surface.
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0xe2dbd0,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    scene.add(ground);

    const pieceGroup = new THREE.Group();
    const seamGroup = new THREE.Group();
    scene.add(pieceGroup);
    scene.add(seamGroup);

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    sceneRef.current = { renderer, scene, camera, controls, pieceGroup, seamGroup, raf };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  // Rebuild assembly whenever pieces, seams, or materials change.
  const assembly = useMemo(() => buildAssembly(project), [
    project.pieces,
    project.seams,
    project.materials,
  ]);

  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const { pieceGroup, seamGroup, camera, controls } = ctx;

    // Clear previous content.
    disposeGroup(pieceGroup);
    disposeGroup(seamGroup);

    for (const placed of assembly.placed) {
      pieceGroup.add(buildPanelMesh(placed, placed.piece.id === selectedPieceId));
    }
    for (const [seamId, line] of Object.entries(assembly.seamLines)) {
      seamGroup.add(buildSeamLine(line.a, line.b, seamId === selectedSeamId));
    }

    // Frame the camera around the assembly bounds.
    const box = new THREE.Box3().setFromObject(pieceGroup);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const centre = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(centre);
      const radius = Math.max(size.x, size.y, size.z) * 0.9 + 200;
      const dir = camera.position.clone().sub(controls.target).normalize();
      controls.target.copy(centre);
      camera.position.copy(centre.clone().add(dir.multiplyScalar(radius)));
      camera.near = Math.max(1, radius / 100);
      camera.far = radius * 20;
      camera.updateProjectionMatrix();
    }
  }, [assembly, selectedPieceId, selectedSeamId]);

  const totalAreaMm2 = project.pieces.reduce(
    (acc, p) => acc + polygonArea(p.points) * p.cutQuantity,
    0
  );
  const firstMaterial = project.materials.find(
    (m) => m.id === project.pieces[0]?.materialId
  );

  return (
    <div className="relative w-full h-full bg-[#F4EFE7] rounded-l-2xl overflow-hidden">
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
      />
      <div className="absolute bottom-3 left-3 glass rounded-2xl px-3 py-2 flex items-center gap-2 pointer-events-none">
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: firstMaterial?.color ?? "#999" }}
        />
        <div>
          <div className="text-[11px] mono">
            {firstMaterial ? `${firstMaterial.name} · ${firstMaterial.weight} g/m²` : "no material"}
          </div>
          <div className="text-[10px] text-[color:var(--color-ink-3)]">
            total {(totalAreaMm2 / 1_000_000).toFixed(2)} m² · {project.pieces.length} pieces
          </div>
        </div>
      </div>
      <div className="absolute top-3 right-3 text-[10px] label text-[color:var(--color-ink-3)] pointer-events-none">
        drag to orbit · scroll to zoom
      </div>
      {project.pieces.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[color:var(--color-ink-3)] text-sm">
          Add pattern pieces to see the 3D assembly
        </div>
      )}
    </div>
  );
}

function buildPanelMesh(placed: PlacedPiece, isSelected: boolean): THREE.Object3D {
  // Triangulate the polygon in the XY plane (local), then transform onto the
  // placed world points via a basis. Pieces are convex enough in practice for
  // a fan triangulation from vertex 0.
  const pts = placed.worldPoints;
  if (pts.length < 3) return new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  for (const p of pts) positions.push(p.x, p.y, p.z);
  for (let i = 1; i < pts.length - 1; i++) {
    indices.push(0, i, i + 1);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const color = new THREE.Color(placed.color);
  const material = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0.0,
    transparent: true,
    opacity: 0.92,
    emissive: isSelected ? color.clone().multiplyScalar(0.18) : new THREE.Color(0x000000),
  });
  const mesh = new THREE.Mesh(geometry, material);

  // Outline along the polygon edges so panels read as distinct.
  const edgeGeo = new THREE.BufferGeometry();
  const edgePos: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    edgePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({
    color: isSelected ? 0x3d6b8f : 0x1c1917,
    transparent: true,
    opacity: isSelected ? 1 : 0.55,
  });
  const lines = new THREE.LineSegments(edgeGeo, edgeMat);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(lines);
  return group;
}

function buildSeamLine(a: THREE.Vector3, b: THREE.Vector3, highlighted: boolean): THREE.Object3D {
  // Render a glowing tube so the seam reads even at oblique angles.
  const path = new THREE.LineCurve3(a, b);
  const radius = highlighted ? 4 : 1.6;
  const geom = new THREE.TubeGeometry(path, 1, radius, 8, false);
  const mat = new THREE.MeshBasicMaterial({
    color: highlighted ? 0x5b4fcf : 0x3d6b8f,
    transparent: true,
    opacity: highlighted ? 0.95 : 0.45,
  });
  return new THREE.Mesh(geom, mat);
}

function disposeGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((o) => {
      if ((o as THREE.Mesh).geometry) {
        (o as THREE.Mesh).geometry.dispose();
      }
      const mat = (o as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
  }
}
