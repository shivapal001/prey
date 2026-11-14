/* ============================================================================
   PREY: THE ESCAPE — interactive 3D archive
   Uses the actual Unity meshes exported to GLB. One renderer per viewer, only
   created when the viewer approaches the viewport; only the selected character
   or zombie variant is loaded. Three.js + GLTFLoader + OrbitControls are
   vendored locally so the page has no CDN dependency.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const gltfLoader = new GLTFLoader();

const CHARACTERS = {
  zara: {
    file: 'FILE PTE-001',
    status: 'STATUS: ACTIVE',
    name: 'ZARA',
    role: "THE SURVIVOR · DUKE'S SISTER",
    model: 'assets/models/zara-arms.glb',
    modelLabel: 'ArmFlashlight.fbx · first-person arms',
    viewerNote: 'ACTUAL FIRST-PERSON ARMS · NO FULL-BODY MODEL EXISTS',
    targetSize: 2.15,
    rotationY: 0,
    focusY: 0,
    fitMargin: 1.9,
    fields: [
      ['Name', 'Zara <span>established in the intro crawl</span>'],
      ['Age', 'Undisclosed'],
      ['Background', "Lives in the town with her brother and bunkmate, Duke. Wakes to find him gone from the house."],
      ['Personality', 'Not narrated. She is characterised by action: she searches, unlocks and keeps moving.'],
      ['Role', 'The player character. The camera is her eyes; she is never shown on screen.'],
      ['Why she is out there', 'To find Duke. The game does not explain why he left.'],
      ['Model', 'ArmFlashlight.fbx <span>actual first-person arm rig · ZaraArmV2.png</span>'],
      ['Animation', 'None embedded in the arm rig'],
    ],
    quote: '“Zara sleeps restlessly in her bed, interrupted by the yelps of the townfolk. She will wake in the hours to come, to find her brother and bunkmate Duke gone from the house.”',
    cite: 'In-game intro crawl',
    note: "No full-body Zara model exists in the Unity project. Her appearance is never revealed in-game; this viewer shows her actual first-person arms.",
  },
  duke: {
    file: 'FILE PTE-002',
    status: 'STATUS: FOUND — INJURED',
    name: 'DUKE',
    role: 'BROTHER · BUNKMATE · MISSING',
    model: 'assets/models/duke.glb',
    modelLabel: 'NPCO.fbx · injured NPC mesh',
    viewerNote: 'ACTUAL INJURED NPC MESH · NPCO.png',
    targetSize: 2.3,
    rotationY: Math.PI / 2,
    fitMargin: 1.16,
    fields: [
      ['Name', 'Duke <span>named in the intro crawl and dialogue</span>'],
      ['Relationship', "Zara's brother and bunkmate"],
      ['Status', 'Missing for most of the game; found injured in Level 4'],
      ['Condition', 'Leg injury. He recognises Zara immediately.'],
      ['Role', 'The reason Zara leaves the house.'],
      ['Model', 'NPCO.fbx <span>the injured NPC mesh used in-game · NPCO.png</span>'],
      ['Animation', 'None embedded in the source FBX'],
    ],
    quote: '“… Zara? Is that you? Ouch! My leg hurts so bad… Let\'s get out of here…”',
    cite: 'Spoken in-game · Level 4',
    note: 'Actual in-game NPC model and texture. The source FBX has no animation takes; the game animates NPCs through separate humanoid clips.',
  },
  townsfolk: {
    file: 'FILE PTE-003',
    status: 'STATUS: WITNESSES',
    name: 'ARNOLD & JOHNNY',
    role: 'NEIGHBOURS · WITNESSES',
    model: 'assets/models/townsfolk.glb',
    modelLabel: 'NPCM.fbx · shared townsfolk mesh',
    viewerNote: 'ACTUAL TOWNSFOLK MESH · NPCM.png',
    targetSize: 2.3,
    rotationY: Math.PI / 2,
    fitMargin: 1.16,
    fields: [
      ['Names', 'Arnold and Johnny <span>two neighbours who know Zara by name</span>'],
      ['Shared model', 'NPCM.fbx <span>actual townsfolk mesh · NPCM.png</span>'],
      ['Arnold', '“There\'s odd things happening in this neighbourhood… you best be watching your step.”'],
      ['Johnny', '“Don\'t come close! … Oh, it\'s just you, Zara.”'],
      ['Knowledge', 'Neither claims to have seen Duke.'],
      ['Role', 'Witnesses encountered in the neighbourhood.'],
      ['Animation', 'Idle and Cower <span>real takes from NPCIdle.fbx and NPCCower.fbx</span>'],
    ],
    quote: '“There\'s odd things happening in this neighbourhood… you best be watching your step.”',
    cite: 'Arnold · in-game dialogue',
    note: 'One shared townsfolk model is used for Arnold and Johnny. Idle and Cower are the real animation takes from the NPC source files.',
  },
};

class ModelViewer {
  constructor(element) {
    this.el = element;
    this.host = element.querySelector('[data-viewer-canvas]');
    this.loading = element.querySelector('[data-viewer-loading]');
    this.loadingMessage = element.querySelector('[data-viewer-loadmsg]');
    this.fallback = element.querySelector('[data-viewer-fallback]');
    this.fallbackMessage = element.querySelector('[data-viewer-fallback-msg]');
    this.modelLabel = element.querySelector('[data-viewer-model]');
    this.noteLabel = element.querySelector('[data-viewer-note]');
    this.resetButton = element.querySelector('[data-viewer-reset]');
    this.fullscreenButton = element.querySelector('[data-viewer-fullscreen]');
    this.retryButton = element.querySelector('[data-viewer-retry]');
    this.label = element.dataset.label || '3D subject';

    this.token = 0;
    this.pending = null;
    this.sceneReady = false;
    this.visible = false;
    this.running = false;
    this.currentModel = null;
    this.currentURL = '';
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.animations = [];
    this.onAnimations = null;
    this.homePosition = new THREE.Vector3(0, 1.4, 4.2);
    this.homeTarget = new THREE.Vector3(0, 1.1, 0);
    this.ignoreResize = false;
    this.loadTimer = null;
    this.lastRequest = null;

    this.el.dataset.viewerStatus = 'idle';
    this.el.setAttribute('aria-busy', 'false');
    this.bindControls();
    this.observeVisibility();
  }

  observeVisibility() {
    if (!('IntersectionObserver' in window)) {
      this.visible = true;
      this.initScene();
      if (this.pending) this.loadNow(this.pending.url, this.pending.opts);
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this.visible = entry.isIntersecting;
        if (this.visible) {
          if (!this.sceneReady) this.initScene();
          if (this.pending && this.el.dataset.viewerStatus !== 'error' && this.currentURL !== this.pending.url) {
            this.loadNow(this.pending.url, this.pending.opts);
          }
          this.startLoop();
        } else {
          this.stopLoop();
        }
      }
    }, { rootMargin: '140px 0px', threshold: 0.01 });
    this.observer.observe(this.el);
  }

  bindControls() {
    if (this.resetButton) {
      this.resetButton.addEventListener('click', () => this.resetCamera());
    }
    if (this.fullscreenButton) {
      this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
    }
    if (this.retryButton) {
      this.retryButton.addEventListener('click', () => this.retry());
    }
    this.onFullscreenChange = () => {
      if (this.fullscreenButton) {
        this.fullscreenButton.textContent = this.isFullscreen() ? 'EXIT FULL SCREEN' : 'FULL SCREEN';
      }
      setTimeout(() => this.resize(), 80);
    };
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.el.classList.contains('is-expanded')) {
        this.toggleExpanded(false);
      }
    });
  }

  initScene() {
    if (this.sceneReady) return true;
    if (!this.host) return false;

    try {
      const canvas = document.createElement('canvas');
      canvas.className = 'viewer__canvas';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${this.label} — interactive 3D model. Drag to rotate, scroll to zoom.`);
      this.host.appendChild(canvas);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 1.75));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.22;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x07070b, 0.045);

      this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
      this.camera.position.copy(this.homePosition);

      this.clock = new THREE.Clock();

      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.enablePan = false;
      this.controls.autoRotate = !reduceMotion.matches;
      this.controls.autoRotateSpeed = 0.5;
      this.controls.minPolarAngle = Math.PI * 0.22;
      this.controls.maxPolarAngle = Math.PI * 0.52;
      this.controls.minDistance = 0.55;
      this.controls.maxDistance = 12;
      this.controls.target.copy(this.homeTarget);
      this.controls.touches.ONE = THREE.TOUCH.ROTATE;
      this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

      let idleTimer = null;
      this.controls.addEventListener('start', () => {
        this.controls.autoRotate = false;
        this.el.classList.add('is-interacting');
        if (idleTimer) clearTimeout(idleTimer);
      });
      this.controls.addEventListener('end', () => {
        this.el.classList.remove('is-interacting');
        if (idleTimer) clearTimeout(idleTimer);
        if (!reduceMotion.matches) {
          idleTimer = setTimeout(() => {
            if (this.visible) this.controls.autoRotate = true;
          }, 3200);
        }
      });

      this.buildLighting();
      this.buildStage();

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.el);
      this.resize();
      this.sceneReady = true;
      this.el.classList.add('has-scene');

      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.stopLoop();
        this.showFallback('The 3D context was lost. Reload the page to restart the scan.', false);
      });

      return true;
    } catch (error) {
      console.error('PREY 3D viewer could not start:', error);
      this.showFallback('WebGL is unavailable in this browser. The dossier is still available.', false);
      return false;
    }
  }

  buildLighting() {
    const ambient = new THREE.HemisphereLight(0x7b8796, 0x0a0809, 0.9);
    this.scene.add(ambient);

    const key = new THREE.SpotLight(0xffd9c2, 65, 16, Math.PI * 0.25, 0.55, 1.3);
    key.position.set(2.6, 4.2, 3.6);
    key.target.position.set(0, 1.15, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(window.innerWidth < 700 ? 512 : 1024, window.innerWidth < 700 ? 512 : 1024);
    key.shadow.bias = -0.0005;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 14;
    this.scene.add(key, key.target);

    const rim = new THREE.SpotLight(0xd51d24, 68, 13, Math.PI * 0.26, 0.6, 1.2);
    rim.position.set(-2.8, 3.1, -3.2);
    rim.target.position.set(0, 1.2, 0);
    this.scene.add(rim, rim.target);

    const fill = new THREE.PointLight(0x7c8ea8, 7, 8, 1.8);
    fill.position.set(-2.2, 1.7, 1.6);
    this.scene.add(fill);

    const low = new THREE.PointLight(0x8e0c16, 9, 6, 1.8);
    low.position.set(2.1, 0.65, -1.8);
    this.scene.add(low);
  }

  buildStage() {
    const shadowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.52 })
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0.004;
    shadowFloor.receiveShadow = true;
    this.scene.add(shadowFloor);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const context = glowCanvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(179,18,26,0.28)');
    gradient.addColorStop(0.45, 'rgba(109,10,16,0.13)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false, opacity: 0.95 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.002;
    this.scene.add(glow);
  }

  load(url, opts = {}) {
    const request = { url, opts };
    this.lastRequest = request;
    this.pending = request;
    this.el.dataset.model = url;
    if (!this.sceneReady) return;
    if (!this.visible) return;
    this.loadNow(url, opts);
  }

  async loadNow(url, opts = {}) {
    if (this.currentURL === url && this.currentModel) {
      this.hideLoading();
      return;
    }
    if (!this.sceneReady && !this.initScene()) return;

    const token = ++this.token;
    const started = performance.now();
    this.lastRequest = { url, opts };
    clearTimeout(this.loadTimer);
    this.showLoading(opts.loadingLabel || 'Loading subject mesh…');
    this.el.dataset.viewerStatus = 'loading';
    this.el.dataset.viewerError = '';
    this.el.setAttribute('aria-busy', 'true');
    console.info(`[PREY 3D] Loading ${url}`);

    /* A failed or stalled fetch must never leave the scan overlay running forever. */
    this.loadTimer = setTimeout(() => {
      if (token !== this.token) return;
      this.token++;
      this.pending = null;
      this.el.dataset.viewerStatus = 'error';
      this.el.dataset.viewerError = `timeout: ${url}`;
      this.el.setAttribute('aria-busy', 'false');
      console.error(`[PREY 3D] Timed out loading ${url} after 20 seconds`);
      this.showFallback(`Timed out loading ${url}. Check that the model file is being served and try again.`);
    }, 20000);

    try {
      const gltf = await gltfLoader.loadAsync(url, (event) => {
        if (!event || !event.total) return;
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        if (this.loadingMessage) this.loadingMessage.textContent = `Decoding game asset · ${percent}%`;
      });

      if (token !== this.token) {
        this.disposeObject(gltf.scene);
        return;
      }

      this.showModel(gltf, opts);
      this.currentURL = url;
      this.pending = null;
      this.el.dataset.viewerStatus = 'ready';
      this.el.dataset.viewerError = '';
      this.el.setAttribute('aria-busy', 'false');
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
      this.hideLoading();
      this.startLoop();
      console.info(`[PREY 3D] Ready ${url} in ${Math.round(performance.now() - started)} ms`);
    } catch (error) {
      if (token !== this.token) return;
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
      const detail = error && error.message ? error.message : String(error);
      console.error(`[PREY 3D] Failed to load ${url}`, error);
      this.el.dataset.viewerStatus = 'error';
      this.el.dataset.viewerError = `${url}: ${detail}`;
      this.el.setAttribute('aria-busy', 'false');
      this.currentURL = '';
      this.pending = null;
      this.showFallback(`Could not load ${url}. ${detail}`);
    }
  }

  retry() {
    if (!this.lastRequest) return;
    if (!this.sceneReady && !this.initScene()) return;
    const { url, opts } = this.lastRequest;
    this.currentURL = '';
    this.pending = null;
    this.token++;
    this.loadNow(url, opts);
  }

  showModel(gltf, opts) {
    this.clearModel();

    const model = gltf.scene;
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.isSkinnedMesh) object.frustumCulled = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        if (material.map) {
          material.map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
          material.map.needsUpdate = true;
        }
        material.needsUpdate = true;
      }
    });

    this.scene.add(model);
    model.updateMatrixWorld(true);

    const rawBox = this.measureModel(model);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const largest = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.0001);
    const target = opts.targetSize || 2.3;
    const scale = target / largest;
    model.scale.multiplyScalar(scale);
    model.rotation.y += opts.rotationY || 0;
    model.updateMatrixWorld(true);

    const box = this.measureModel(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);

    const fitted = this.measureModel(model);
    const fittedSize = fitted.getSize(new THREE.Vector3());
    const targetY = Math.max(fittedSize.y * 0.5 + (opts.focusY || 0), 0.05);
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const distanceByHeight = (fittedSize.y * 0.5) / Math.tan(halfFov);
    const distanceByWidth = (fittedSize.x * 0.5) / (Math.tan(halfFov) * Math.max(this.camera.aspect, 0.2));
    const margin = opts.fitMargin || 1.16;
    const distance = Math.max(distanceByHeight, distanceByWidth) * margin;
    const azimuth = opts.azimuth ?? 0.36;

    this.homeTarget.set(0, targetY, 0);
    this.homePosition.set(
      Math.sin(azimuth) * distance,
      targetY + fittedSize.y * 0.08,
      Math.cos(azimuth) * distance
    );
    this.controls.minDistance = distance * 0.42;
    this.controls.maxDistance = distance * 2.2;
    this.camera.position.copy(this.homePosition);
    this.controls.target.copy(this.homeTarget);
    this.controls.update();

    this.currentModel = model;
    this.animations = gltf.animations.map((clip) => clip.name);
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;

    if (gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        const action = this.mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        this.actions[clip.name] = action;
      }
      this.setAnimation(gltf.animations[0].name);
    }

    if (this.onAnimations) this.onAnimations(this.animations);
    this.resize();
  }

  measureModel(root) {
    const box = new THREE.Box3().setFromObject(root);
    const skinnedBox = new THREE.Box3();
    const point = new THREE.Vector3();
    let measured = false;
    root.updateMatrixWorld(true);

    root.traverse((object) => {
      if (!object.isMesh || !object.geometry || !object.geometry.attributes.position) return;
      const position = object.geometry.attributes.position;
      const skinned = object.isSkinnedMesh && object.skeleton &&
        object.geometry.attributes.skinIndex && object.geometry.attributes.skinWeight;

      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        if (skinned) object.applyBoneTransform(i, point);
        point.applyMatrix4(object.matrixWorld);
        skinnedBox.expandByPoint(point);
        measured = true;
      }
    });

    /* Union the rest-pose bounds with the actual skinned pose. Either can be the
       larger extent for a Unity rig, and fitting both prevents cropped limbs. */
    if (measured && !skinnedBox.isEmpty()) box.union(skinnedBox);
    return box;
  }

  setAnimation(name) {
    if (!this.mixer || !this.actions[name]) return;
    const next = this.actions[name];
    if (this.activeAction === next) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(0.35);
      next.reset().setEffectiveWeight(1).fadeIn(0.35).play();
    } else {
      next.reset().play();
    }
    this.activeAction = next;
    this.el.dataset.animation = name;
  }

  clearModel() {
    this.stopLoop();
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.disposeObject(this.currentModel);
      this.currentModel = null;
    }
    this.actions = {};
    this.activeAction = null;
    this.currentURL = '';
  }

  disposeObject(root) {
    root.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value && value.isTexture) value.dispose();
        }
        material.dispose();
      }
    });
  }

  showLoading(message) {
    if (this.fallback) this.fallback.hidden = true;
    if (this.loading) this.loading.hidden = false;
    if (this.loadingMessage) this.loadingMessage.textContent = message;
    if (this.retryButton) this.retryButton.hidden = true;
    this.el.classList.remove('is-ready', 'has-error');
  }

  hideLoading() {
    if (this.loading) this.loading.hidden = true;
    this.el.classList.remove('has-error');
    this.el.classList.add('is-ready');
  }

  showFallback(message, retry = true) {
    this.stopLoop();
    if (this.loading) this.loading.hidden = true;
    if (this.fallback) this.fallback.hidden = false;
    if (this.fallbackMessage && message) this.fallbackMessage.textContent = message;
    if (this.retryButton) this.retryButton.hidden = !retry;
    this.el.classList.remove('is-ready');
    this.el.classList.add('has-error');
  }

  resetCamera() {
    if (!this.sceneReady) return;
    this.camera.position.copy(this.homePosition);
    this.controls.target.copy(this.homeTarget);
    this.controls.update();
    this.controls.autoRotate = !reduceMotion.matches;
    this.el.classList.remove('is-interacting');
  }

  isFullscreen() {
    return document.fullscreenElement === this.el || document.webkitFullscreenElement === this.el;
  }

  toggleFullscreen() {
    if (this.isFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    if (this.el.classList.contains('is-expanded')) {
      this.toggleExpanded(false);
      return;
    }
    const request = this.el.requestFullscreen || this.el.webkitRequestFullscreen;
    if (request) {
      const result = request.call(this.el);
      if (result && result.catch) {
        result.catch(() => this.toggleExpanded(true));
      }
    } else {
      this.toggleExpanded(true);
    }
  }

  toggleExpanded(open) {
    this.el.classList.toggle('is-expanded', open);
    document.body.classList.toggle('viewer-locked', open);
    if (this.fullscreenButton) this.fullscreenButton.textContent = open ? 'CLOSE VIEWER' : 'FULL SCREEN';
    setTimeout(() => this.resize(), 60);
  }

  resize() {
    if (!this.renderer || !this.camera || this.ignoreResize) return;
    const width = this.el.clientWidth || this.host.clientWidth || 1;
    const height = this.el.clientHeight || this.host.clientHeight || 1;
    if (width < 2 || height < 2) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  startLoop() {
    if (!this.renderer || this.running) return;
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      const delta = Math.min(this.clock.getDelta(), 0.05);
      this.controls.update();
      if (this.mixer) this.mixer.update(delta);
      this.renderer.render(this.scene, this.camera);
    });
    this.running = true;
  }

  stopLoop() {
    if (!this.renderer || !this.running) return;
    this.renderer.setAnimationLoop(null);
    this.running = false;
  }

  setModelLabel(text) {
    if (this.modelLabel && text) this.modelLabel.textContent = text;
  }

  setNote(text) {
    if (this.noteLabel && text) this.noteLabel.textContent = text;
  }
}

/* ============================ CHARACTER ARCHIVE ========================== */
function setupCharacterArchive() {
  const archive = document.querySelector('[data-character-archive]');
  if (!archive) return;

  const viewerElement = archive.querySelector('.model-viewer');
  if (!viewerElement) return;
  const viewer = new ModelViewer(viewerElement);
  const viewerFile = archive.querySelector('[data-viewer-file]');
  const ui = {
    file: archive.querySelector('[data-profile-file]'),
    status: archive.querySelector('[data-profile-status]'),
    name: archive.querySelector('[data-profile-name]'),
    role: archive.querySelector('[data-profile-role]'),
    fields: archive.querySelector('[data-profile-fields]'),
    quote: archive.querySelector('[data-profile-quote]'),
    cite: archive.querySelector('[data-profile-cite]'),
    animationBox: archive.querySelector('[data-profile-anim]'),
    animationButtons: archive.querySelector('[data-anim-buttons]'),
    note: archive.querySelector('[data-profile-note]'),
  };

  const tabs = [...archive.parentElement.querySelectorAll('.archive__tab[data-profile]')];
  let currentKey = 'zara';

  function renderAnimationButtons(names) {
    if (!ui.animationBox || !ui.animationButtons) return;
    ui.animationButtons.replaceChildren();
    ui.animationBox.hidden = names.length === 0;
    archive.dataset.animations = names.join(',');
    names.forEach((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'profile-anim__btn' + (index === 0 ? ' is-active' : '');
      button.textContent = name.toUpperCase();
      button.setAttribute('aria-pressed', String(index === 0));
      button.addEventListener('click', () => {
        viewer.setAnimation(name);
        for (const item of ui.animationButtons.children) {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        }
      });
      ui.animationButtons.appendChild(button);
    });
  }

  function renderProfile(key) {
    const profile = CHARACTERS[key];
    if (!profile) return;
    currentKey = key;
    archive.dataset.profile = key;

    for (const tab of tabs) {
      const selected = tab.dataset.profile === key;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    if (ui.file) ui.file.textContent = profile.file;
    if (viewerFile) viewerFile.textContent = profile.file;
    if (ui.status) ui.status.textContent = profile.status;
    if (ui.name) ui.name.textContent = profile.name;
    if (ui.role) ui.role.textContent = profile.role;
    if (ui.fields) {
      ui.fields.innerHTML = profile.fields
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
        .join('');
    }
    if (ui.quote) ui.quote.textContent = profile.quote;
    if (ui.cite) ui.cite.textContent = profile.cite;
    if (ui.note) ui.note.textContent = profile.note;
    if (ui.animationBox) ui.animationBox.hidden = true;
    viewer.setModelLabel(profile.modelLabel);
    viewer.setNote(profile.viewerNote);
    viewer.onAnimations = renderAnimationButtons;
    viewer.load(profile.model, {
      targetSize: profile.targetSize,
      rotationY: profile.rotationY,
      fitMargin: profile.fitMargin,
      focusY: profile.focusY,
    });
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      renderProfile(tab.dataset.profile);
    });
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);
      let next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        event.preventDefault();
        next.focus();
        renderProfile(next.dataset.profile);
      }
    });
  }

  renderProfile(currentKey);
}

/* ============================== ENEMY VIEWERS ============================ */
function setupEnemyViewers() {
  const ghoulSection = document.querySelector('[data-subject="ghoul"]');
  if (ghoulSection) {
    const viewerElement = ghoulSection.querySelector('.model-viewer');
    if (viewerElement) {
      const viewer = new ModelViewer(viewerElement);
      viewer.setModelLabel('GhoulJ.prefab · ZombieJ.fbx mesh');
      viewer.setNote('VERIFIED GHOULJ PREFAB · GHOULJ.PNG TEXTURE');
      viewer.load('assets/models/ghoul.glb', { targetSize: 2.25, rotationY: Math.PI / 2, fitMargin: 1.16 });
    }
  }

  const zombieSection = document.querySelector('[data-subject="zombie"]');
  if (!zombieSection) return;
  const viewerElement = zombieSection.querySelector('.model-viewer');
  if (!viewerElement) return;

  const viewer = new ModelViewer(viewerElement);
  const variants = {
    c: { file: 'zombieC.fbx', texture: 'Zombie C.png', model: 'assets/models/zombie-c.glb' },
    d: { file: 'ZombieD.fbx', texture: 'Zombie D.png', model: 'assets/models/zombie-d.glb' },
    t: { file: 'ZombieT.fbx', texture: 'ZombieT.png', model: 'assets/models/zombie-t.glb' },
  };
  const buttons = [...zombieSection.querySelectorAll('[data-zombie-variant]')];

  function selectVariant(key) {
    const variant = variants[key];
    if (!variant) return;
    for (const button of buttons) {
      const active = button.dataset.zombieVariant === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    viewer.setModelLabel(`${variant.file} · ${variant.texture}`);
    viewer.load(variant.model, { targetSize: 2.25, rotationY: Math.PI / 2, fitMargin: 1.16 });
    zombieSection.dataset.variant = key;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => selectVariant(button.dataset.zombieVariant));
  }
  selectVariant('c');
}

setupCharacterArchive();
setupEnemyViewers();
