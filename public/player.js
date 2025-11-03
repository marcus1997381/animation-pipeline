(() => {
  "use strict";

  const VIEW_W = 1080,
    VIEW_H = 1920;

  // -------------------- CONFIG --------------------
  const INPUT_ZONE_RATIO = 0.3;
  const INPUT_ZONE_Y = Math.round(VIEW_H * (1 - INPUT_ZONE_RATIO));

  // Controls manual offsets
  const CTRL_Y_ADJUST_PX = 0; // Vertical adjustment (0 = align to bottom of input zone)
  const CTRL_SPACING = 0.3; // Distance from center as ratio of VIEW_W

  // Physics constants
  const GRAVITY = 1800;
  const JUMP_VY = -850;
  const MAX_FALL_VY = 1500;
  const MOVE_VX = 480;
  const AX_GROUND = 3200;
  const AX_AIR = 1800;
  const GROUND_Y = Math.floor(VIEW_H * 0.97);

  // Animation mapping based on speed/state
  const ANIM = {
    idle: ["idle", "sleepStanding"],
    walk: ["walk", "run"],
    run: ["run", "walk"],
    jump: ["jumpInplace", "backFlip2"],
    fall: ["fallPose", "backFlip2"],
  };

  function hasAnim(obj, name) {
    if (
      !(
        obj &&
        obj.skeleton &&
        obj.skeleton.data &&
        obj.skeleton.data.animations
      )
    )
      return false;
    for (var i = 0; i < obj.skeleton.data.animations.length; i++) {
      if (obj.skeleton.data.animations[i].name === name) return true;
    }
    return false;
  }

  function setAnim(obj, name, loop, minPlaySec = 0) {
    if (!hasAnim(obj, name) || !obj.animationState) return false;
    const st = obj.animationState;
    const cur = st.getCurrent(0);
    const curName = cur && cur.animation ? cur.animation.name : "";
    if (cur && cur.animation && curName !== name) {
      const played = cur.trackTime != null ? cur.trackTime : 0;
      if (played < minPlaySec) return false;
    }
    if (curName !== name) st.setAnimation(0, name, !!loop);
    const entry = st.getCurrent(0);
    if (entry) entry.timeScale = 1;
    return true;
  }

  function playFromList(spineGO, names, loop) {
    const arr = Array.isArray(names) ? names : [names];
    for (const n of arr) {
      if (hasAnim(spineGO, n)) {
        setAnim(spineGO, n, loop);
        return true;
      }
    }
    return false;
  }

  function applyCrossfades(spineGO, mix) {
    mix = typeof mix === "number" ? mix : 0.5;
    const data = spineGO && spineGO.animationStateData;
    const skel = spineGO && spineGO.skeleton && spineGO.skeleton.data;
    if (!data || !skel || !skel.animations) return;
    data.defaultMix = mix;
    var names = [];
    for (var i = 0; i < skel.animations.length; i++)
      names.push(skel.animations[i].name);
    for (var a = 0; a < names.length; a++)
      for (var b = 0; b < names.length; b++)
        if (a !== b) data.setMix(names[a], names[b], mix);
  }

  function resolveAnimationName(spineGO, name) {
    if (!name) return null;
    if (hasAnim(spineGO, name)) return name;
    const norm = String(name).replace(/\s+/g, " ").trim();
    const candidates = [
      norm,
      `indianDances/${norm}`,
      `faceAnimation/${norm}`,
      `memeBeats/${norm}`,
      `UpperBodyBits/${norm}`,
      `general/${norm}`,
      norm.replace(/\s+/g, ""),
      `indianDances/${norm.replace(/\s+/g, "")}`,
    ];
    for (const c of candidates) {
      if (hasAnim(spineGO, c)) return c;
    }
    return null;
  }

  function playSequenceWithDuration(
    scene,
    spineGO,
    names,
    perActionSec = 10,
    controller = null
  ) {
    const valid = names
      .map((n) => resolveAnimationName(spineGO, n))
      .filter(Boolean);
    if (valid.length === 0) {
      setAnim(spineGO, "idle", true, 0);
      if (controller) controller.sequenceActive = false;
      return;
    }
    // Very short crossfades for snappy animation transitions
    applyCrossfades(spineGO, 0.1);
    let idx = 0;

    if (controller) {
      controller.sequenceActive = true;
      controller.currentSequenceIndex = 0;
      controller.sequenceNames = valid;
    }

    function playCurrent() {
      const name = valid[idx];
      if (!name) {
        if (controller) {
          controller.sequenceActive = false;
          controller.setSequenceAnimation(null);
        }
        return;
      }

      // Determine duration based on animation type
      let holdMs;
      const isMovement = isMovementAnimation(name);

      if (isMovement) {
        // Movement animations (walk, run, jump, fall) - longer for player control
        const jitter = Math.random() * 1.6 - 0.8;
        holdMs = Math.max(3000, (perActionSec + jitter) * 1000);
      } else {
        // Auto-play animations (dance, attack, emote, idle, etc.) - play once
        // Get animation duration from Spine or use default
        const animDuration =
          spineGO.skeleton?.data?.findAnimation(name)?.duration || 2;
        holdMs = Math.max(1500, animDuration * 1000 + 500); // Animation length + 0.5s buffer
      }

      if (controller) {
        controller.currentSequenceIndex = idx;
        // Tell controller which animation to use (controller will play it based on movement)
        controller.setSequenceAnimation(name);
      }

      console.log(
        `[Sequence ${idx + 1}/${
          valid.length
        }] Playing: ${name} for ${Math.round(holdMs / 1000)}s (${
          isMovement ? "movement" : "auto-play"
        })`
      );

      scene.time.delayedCall(holdMs, () => {
        idx++;
        if (idx >= valid.length) {
          if (controller) {
            controller.sequenceActive = false;
            controller.setSequenceAnimation(null);
          }
          console.log("[Sequence] Complete - returning to manual control");
          return;
        }
        playCurrent();
      });
    }

    playCurrent();
  }

  // -------------------- INPUT CONTROLS --------------------
  class KBController {
    constructor(scene, map) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      const add = (code) => scene.input.keyboard.addKey(K[code]);
      this.left = add(map.left);
      this.right = add(map.right);
      this.up = add(map.up);
      scene.input.keyboard.addCapture([K[map.left], K[map.right], K[map.up]]);
    }
  }

  function readInputs(ctrl) {
    const wasDown = (k) => Phaser.Input.Keyboard.JustDown(k);
    return {
      left: ctrl.left.isDown,
      right: ctrl.right.isDown,
      jumpPressed: wasDown(ctrl.up),
      jumpHeld: ctrl.up.isDown,
    };
  }

  class TouchTriControls {
    constructor(scene) {
      this.scene = scene;
      this.state = { left: false, right: false, up: false };
      this._jumpEdge = false;
      this._leftTouchId = null;

      // Screen-anchored UI root
      this.ui = scene.add.container(0, 0).setScrollFactor(0).setDepth(995);

      // Visual construction
      this.PAD = 24;
      this.BTN = Math.round(VIEW_W * 0.12);

      // Joystick for movement (left side)
      this.cJoystick = this._makeJoystick();
      // Jump button (right side)
      this.cJump = this._makeButton();
      this.ui.add([this.cJoystick.node, this.cJump.node]);

      this._layout();
      scene.time.delayedCall(0, () => this._layout());
      scene.scale.on("resize", () => this._layout());

      // Pointer wiring
      scene.input.on("pointerdown", this._onDown, this);
      scene.input.on("pointermove", this._onMove, this);
      scene.input.on("pointerup", this._onUp, this);
      scene.input.on("gameout", this._onCancel, this);
    }

    _makeJoystick() {
      const s = this.scene;
      const size = this.BTN;
      const node = s.add.container(0, 0).setScrollFactor(0).setDepth(995);

      const outerRing = s.add
        .circle(0, 0, Math.round(size * 1.2), 0x000000, 0.15)
        .setStrokeStyle(3, 0x1f2937, 0.8)
        .setDepth(1)
        .setScrollFactor(0);

      const innerRing = s.add
        .circle(0, 0, Math.round(size * 0.9), 0x000000, 0.25)
        .setStrokeStyle(2, 0x374151, 0.9)
        .setDepth(2)
        .setScrollFactor(0);

      const knob = s.add
        .circle(0, 0, Math.round(size * 0.4), 0xffffff, 0.8)
        .setStrokeStyle(3, 0xe5e7eb, 0.95)
        .setDepth(3)
        .setScrollFactor(0);

      const knobShadow = s.add
        .circle(2, 2, Math.round(size * 0.4), 0x000000, 0.2)
        .setDepth(2.5)
        .setScrollFactor(0);

      node.add([outerRing, innerRing, knobShadow, knob]);
      return { node, outerRing, innerRing, knob, knobShadow };
    }

    _makeButton() {
      const s = this.scene;
      const size = this.BTN;
      const node = s.add.container(0, 0).setScrollFactor(0).setDepth(995);

      const bg = s.add
        .circle(0, 0, Math.round(size * 0.8), 0x000000, 0.22)
        .setStrokeStyle(2, 0x1f2937, 0.9)
        .setDepth(1)
        .setScrollFactor(0);

      const c60 = Math.cos(Math.PI / 3);
      const s60 = Math.sin(Math.PI / 3);

      const sh = s.add
        .triangle(
          110,
          100,
          0,
          -size,
          -s60 * size,
          c60 * size,
          s60 * size,
          c60 * size,
          0x000000
        )
        .setOrigin(0.5)
        .setAlpha(0.18)
        .setRotation(0)
        .setDepth(0)
        .setScrollFactor(0);

      const tri = s.add
        .triangle(
          110,
          100,
          0,
          -size,
          -s60 * size,
          c60 * size,
          s60 * size,
          c60 * size,
          0xffffff
        )
        .setOrigin(0.5)
        .setAlpha(0.38)
        .setRotation(0)
        .setDepth(2)
        .setScrollFactor(0);
      tri.setStrokeStyle(4, 0xffffff, 0.95);

      node.add([sh, bg, tri]);
      return { node, bg, sh, tri };
    }

    _setActive(ctrl, on) {
      if (!ctrl) return;
      if (ctrl.knob) {
        ctrl.knob.setAlpha(on ? 0.95 : 0.8);
        ctrl.outerRing.setAlpha(on ? 0.25 : 0.15);
        if (ctrl.knobShadow) ctrl.knobShadow.setAlpha(on ? 0.35 : 0.2);
      } else {
        ctrl.tri.setAlpha(on ? 0.95 : 0.38);
        ctrl.bg.setAlpha(on ? 0.35 : 0.22);
        if (ctrl.sh) ctrl.sh.setAlpha(on ? 0.3 : 0.18);
      }
    }

    _layout() {
      const padTop = INPUT_ZONE_Y;
      const padH = VIEW_H - INPUT_ZONE_Y;
      const PAD = this.PAD;
      const BTN = this.BTN;

      const baseAlignY = Math.round(
        padTop + padH - PAD - BTN + CTRL_Y_ADJUST_PX
      );

      const screenCenterX = VIEW_W / 2;
      const controlSpacing = Math.round(VIEW_W * CTRL_SPACING);

      const joystickX = Math.round(screenCenterX - controlSpacing);
      const jumpX = Math.round(screenCenterX + controlSpacing);

      this.cJoystick.node.setPosition(joystickX, baseAlignY);
      this.cJump.node.setPosition(jumpX, baseAlignY);

      this.joystickCenterX = joystickX;
      this.joystickCenterY = baseAlignY;
      this.joystickMaxRadius = Math.round(this.BTN * 0.7);

      this.LEFT_AREA = new Phaser.Geom.Rectangle(
        0,
        padTop,
        Math.floor(VIEW_W * 0.6),
        padH
      );
      this.RIGHT_AREA = new Phaser.Geom.Rectangle(
        Math.floor(VIEW_W * 0.65),
        padTop,
        Math.floor(VIEW_W * 0.35),
        padH
      );
    }

    _onDown(p) {
      if (Phaser.Geom.Rectangle.Contains(this.RIGHT_AREA, p.x, p.y)) {
        this._jumpEdge = true;
        this.state.up = true;
        this._setActive(this.cJump, true);
        return;
      }
      if (
        this._leftTouchId === null &&
        Phaser.Geom.Rectangle.Contains(this.LEFT_AREA, p.x, p.y)
      ) {
        this._leftTouchId = p.id;
        this.state.left = this.state.right = false;
        this._setActive(this.cJoystick, true);
        if (this.cJoystick.knob) {
          this.cJoystick.knob.setPosition(0, 0);
        }
      }
    }

    _onMove(p) {
      if (p.id !== this._leftTouchId || !p.isDown) return;

      const deltaX = p.x - this.joystickCenterX;
      const deltaY = p.y - this.joystickCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let knobX = deltaX;
      let knobY = deltaY;
      if (distance > this.joystickMaxRadius) {
        const ratio = this.joystickMaxRadius / distance;
        knobX = deltaX * ratio;
        knobY = deltaY * ratio;
      }

      if (this.cJoystick.knob) {
        this.cJoystick.knob.setPosition(knobX, knobY);
      }

      const normalizedX = knobX / this.joystickMaxRadius;
      const threshold = 0.3;

      if (normalizedX > threshold) {
        this.state.left = false;
        this.state.right = true;
      } else if (normalizedX < -threshold) {
        this.state.left = true;
        this.state.right = false;
      } else {
        this.state.left = this.state.right = false;
      }
    }

    _onUp(p) {
      if (p.id === this._leftTouchId) {
        this._leftTouchId = null;
        this.state.left = this.state.right = false;
        this._setActive(this.cJoystick, false);
        if (this.cJoystick.knob) {
          this.scene.tweens.add({
            targets: this.cJoystick.knob,
            x: 0,
            y: 0,
            duration: 150,
            ease: "Back.easeOut",
          });
        }
      }
      if (Phaser.Geom.Rectangle.Contains(this.RIGHT_AREA, p.x, p.y)) {
        this.state.up = false;
        this._setActive(this.cJump, false);
      }
    }

    _onCancel() {
      this._leftTouchId = null;
      this.state = { left: false, right: false, up: false };
      this._setActive(this.cJoystick, false);
      this._setActive(this.cJump, false);
      if (this.cJoystick.knob) {
        this.cJoystick.knob.setPosition(0, 0);
      }
    }

    read() {
      const edge = this._jumpEdge;
      this._jumpEdge = false;
      return {
        left: this.state.left,
        right: this.state.right,
        jumpPressed: edge,
        jumpHeld: this.state.up,
      };
    }
  }

  function mergeInputs(a, b) {
    if (!b) return a;
    return {
      left: !!(a.left || b.left),
      right: !!(a.right || b.right),
      jumpPressed: !!(a.jumpPressed || b.jumpPressed),
      jumpHeld: !!(a.jumpHeld || b.jumpHeld),
    };
  }

  // -------------------- ANIMATION CATEGORIZATION --------------------
  /**
   * Determines if an animation should allow keyboard/movement controls
   * Returns true if movement is ALLOWED, false if movement should be DISABLED
   *
   * STRICT: Only enable controls for animations that need directional input
   * (walking, running, jumping - basic locomotion)
   */
  function isMovementAnimation(animName) {
    if (!animName) return false;

    const name = String(animName).toLowerCase();

    // STRICT movement-enabled animations (keyboard ENABLED)
    // Only basic locomotion that requires directional control
    const movementKeywords = [
      "walk", // walking, walk
      "run", // running, run
      "jump", // jumping, jump, jumpInplace
      "fall", // fall, falling (physics)
    ];

    // Check if animation name contains movement keywords
    // Use whole-word matching to avoid false positives like "flySuperman" matching "fly"
    for (const keyword of movementKeywords) {
      // Simple word boundary check - keyword should be a standalone word or word part
      if (
        name === keyword ||
        name.startsWith(keyword) ||
        name.includes("/" + keyword) || // e.g., "general/walk"
        name.includes(" " + keyword)
      ) {
        // e.g., "walk fast"
        return true;
      }
    }

    // All other animations disable controls and auto-play (including idle)
    // (idle, dances, facial expressions, attacks, emotes, flying poses, etc.)
    return false;
  }

  // -------------------- PLAYER CONTROLLER --------------------
  class PlayerController {
    constructor(scene, spineGO) {
      this.scene = scene;
      this.go = spineGO;
      this.x = spineGO.x;
      this.y = GROUND_Y;
      this.vx = 0;
      this.vy = 0;
      this.onGround = true;
      this.facing = 1;
      this.baseScaleX = Math.abs(spineGO.scaleX) || 1;

      // Sequence control - controls animation type and position behavior
      this.sequenceActive = false;
      this.sequenceNames = [];
      this.currentSequenceIndex = 0;
      this.currentSequenceAnimName = null;

      // Virtual velocity for background scrolling (used in sequence mode)
      this.virtualVx = 0;

      // Track if controls are currently enabled
      this.controlsEnabled = false;
      
      // Track if button animation is playing (prevents idle override)
      this.buttonAnimationActive = false;
    }

    update(dt, input) {
      // If no sequence is active AND no button animation, show idle
      if (!this.sequenceActive && !this.buttonAnimationActive) {
        this.go.x = this.x;
        this.go.y = this.y;
        playFromList(this.go, ANIM.idle, true);
        return;
      }
      
      // If button animation is active, don't interfere - just maintain position
      if (this.buttonAnimationActive) {
        this.go.x = this.x;
        this.go.y = this.y;
        return;
      }

      // Check if current animation allows movement controls
      const allowMovement = isMovementAnimation(this.currentSequenceAnimName);
      this.controlsEnabled = allowMovement;

      // MOVEMENT-CONTROLLED ANIMATIONS (walk, run, jump, etc.)
      if (allowMovement) {
        // SEQUENCE MODE: Character stays centered, background moves
        // Handle input for movement direction
        const want = (input.left ? -1 : 0) + (input.right ? +1 : 0);

        // Only update facing direction based on input
        if (want !== 0) {
          this.facing = want;
          this.go.scaleX = this.baseScaleX * this.facing;
          // Set virtual velocity for background scrolling
          this.virtualVx = MOVE_VX * want;
        } else {
          this.virtualVx = 0;
        }

        // Jump still works in sequence mode
        if (this.onGround && input.jumpPressed) {
          this.vy = JUMP_VY;
          this.onGround = false;
          playFromList(this.go, ANIM.jump, false);
        }

        // Gravity for jumping
        if (!this.onGround) {
          this.vy = Math.min(MAX_FALL_VY, this.vy + GRAVITY * dt);
          this.y += this.vy * dt;

          if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
            this.onGround = true;
          }
        }

        // Character stays centered, update sprite position
        this.go.x = this.x;
        this.go.y = this.y;

        // Update animation based on sequence and movement input
        if (this.onGround) {
          if (this.currentSequenceAnimName) {
            if (want !== 0) {
              // Moving: play sequence animation
              setAnim(this.go, this.currentSequenceAnimName, true, 0);
              const entry = this.go.animationState?.getCurrent(0);
              if (entry) {
                entry.timeScale = 1.0;
              }
            } else {
              // Standing still: show idle
              playFromList(this.go, ANIM.idle, true);
            }
          }
        } else {
          // In air: show jump/fall
          if (this.vy > 120) {
            playFromList(this.go, ANIM.fall, true);
          }
        }
      } else {
        // AUTO-PLAY ANIMATIONS (dances, attacks, emotes, etc.)
        // Controls are DISABLED - animation plays automatically
        this.virtualVx = 0;

        // Make sure character stays grounded
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;

        // Character stays centered
        this.go.x = this.x;
        this.go.y = this.y;

        // Play the sequence animation automatically
        if (this.currentSequenceAnimName) {
          setAnim(this.go, this.currentSequenceAnimName, true, 0);
          const entry = this.go.animationState?.getCurrent(0);
          if (entry) {
            entry.timeScale = 1.0;
          }
        }
      }
    }

    getCurrentAnimationMode() {
      if (!this.sequenceActive) return null;
      if (this.currentSequenceIndex >= this.sequenceNames.length) return null;
      const name = this.sequenceNames[this.currentSequenceIndex] || "";
      const lower = name.toLowerCase();
      if (lower.includes("walk")) return "walk";
      if (lower.includes("run")) return "run";
      if (lower.includes("jump")) return "jump";
      return "idle";
    }

    setSequenceAnimation(animName) {
      this.currentSequenceAnimName = animName;
    }
  }

  class Boot extends Phaser.Scene {
    constructor() {
      super("boot");
    }
    preload() {
      // Background image
      this.load.image("bg", "/assets/background/back.png");
      this.load.spineJson(
        "skeleton",
        "/assets/skeleton/skeleton1/skeleton.json"
      );
      this.load.spineAtlas(
        "skeleton",
        "/assets/skeleton/skeleton1/skeleton.atlas"
      );
    }
    create() {
      this.scene.start("play");
    }
  }

  class Play extends Phaser.Scene {
    constructor() {
      super("play");
    }
    async create() {
      // Add wide panoramic background (6480x1920) that scrolls left for seamless effect
      this.bg = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, "bg");
      this.bg.setOrigin(0, 0); // Top-left origin to prevent flipping
      this.bg.setScrollFactor(0);
      this.bg.setDepth(0);

      // Scale background to match view scene height exactly
      const bgTexture = this.textures.get("bg");
      const bgHeight = bgTexture.source[0].height;
      const scaleY = VIEW_H / bgHeight;
      this.bg.setScale(scaleY);
      // Wide 6480 width allows for smooth continuous scrolling without visible repeat

      // Create a subtle glow stripe texture for parallax overlay
      const glowKey = "glowTex";
      if (!this.textures.exists(glowKey)) {
        const cw = 512,
          ch = 256;
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(255,255,255,0)";
        ctx.fillRect(0, 0, cw, ch);
        // Draw soft horizontal glow bands
        for (let i = 0; i < 6; i++) {
          const y = (i + 0.5) * (ch / 6);
          const grad = ctx.createLinearGradient(0, y - 12, 0, y + 12);
          grad.addColorStop(0, "rgba(255,180,100,0)");
          grad.addColorStop(0.5, "rgba(255,180,100,0.22)");
          grad.addColorStop(1, "rgba(255,180,100,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, y - 12, cw, 24);
        }
        this.textures.addCanvas(glowKey, canvas);
      }
      this.bgScroll = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, glowKey);
      this.bgScroll.setOrigin(0, 0);
      this.bgScroll.setScrollFactor(0);
      this.bgScroll.setBlendMode(Phaser.BlendModes.ADD);
      this.bgScroll.setAlpha(0.45);
      this.bgScroll.setDepth(1);
      this.bgSpeed = 0; // pixels per second

      const p = this.add.spine(
        VIEW_W / 2,
        Math.floor(VIEW_H * 0.97),
        "skeleton",
        "skeleton"
      );
      // Normalize scale roughly to fit; quick heuristic
      p.setScale(0.6);
      applyCrossfades(p, 0.1);  // Short crossfade for snappy animations
      p.setDepth(2);

      // Initialize player controller
      this.playerController = new PlayerController(this, p);

      // Set initial idle animation
      playFromList(p, ANIM.idle, true);

      // Initialize input controls
      this.input.addPointer(2);
      this.ctrl = new KBController(this, { left: "A", right: "D", up: "W" });
      this.touches = new TouchTriControls(this);

      // Add control mode display
      this.modeText = this.add
        .text(VIEW_W / 2, 40, "Enter prompt and click Play to begin", {
          font: "32px monospace",
          fill: "#fff",
          stroke: "#111",
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
        .setDepth(1000)
        .setScrollFactor(0);

      const playBtn = document.getElementById("playBtn");
      const input = document.getElementById("prompt");
      const status = document.getElementById("status");

      // Interactive button system
      this.actionButtons = [];
      this.actionButtonContainer = this.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(1001)
        .setVisible(false);

      async function fetchSequence(prompt) {
        status.textContent = "Generating...";
        try {
          const r = await fetch("/api/sequence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });
          const j = await r.json();
          status.textContent = "";
          if (j && Array.isArray(j.ordered_sequence)) {
            return {
              sequence: j.ordered_sequence,
              vibe: j.vibe || "neutral",
              controlSuggestion: j.control_suggestion || "auto"
            };
          }
          if (j && j.error) status.textContent = `Error: ${j.error}`;
          return { sequence: [], vibe: "neutral", controlSuggestion: "auto" };
        } catch (e) {
          status.textContent = `Error: ${e.message || e}`;
          return { sequence: [], vibe: "neutral", controlSuggestion: "auto" };
        }
      }

      // Function to create interactive action button
      const createActionButton = (animName, x, y) => {
        const btnWidth = 200;
        const btnHeight = 60;
        const container = this.add.container(x, y);
        
        // Button background
        const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x4f46e5, 0.9)
          .setStrokeStyle(3, 0x818cf8, 1);
        
        // Button text
        const text = this.add.text(0, 0, animName.toUpperCase(), {
          font: "bold 24px monospace",
          fill: "#fff"
        }).setOrigin(0.5);
        
        container.add([bg, text]);
        container.setDepth(1001).setScrollFactor(0);
        
        // Make interactive
        bg.setInteractive({ useHandCursor: true });
        bg.on("pointerdown", () => {
          console.log(`Action button clicked: ${animName}`);
          // Play the animation without stopping the sequence
          const resolvedName = resolveAnimationName(p, animName);
          if (resolvedName) {
            // Stop the sequence and enable button animation mode
            this.playerController.sequenceActive = false;
            this.playerController.setSequenceAnimation(null);
            this.playerController.buttonAnimationActive = true;
            
            // Play animation ONCE (not looping)
            setAnim(p, resolvedName, false, 0);  // false = play once
            status.textContent = `Playing: ${animName}`;
            console.log(`Button triggered: ${animName} (playing once)`);
            
            // Get animation duration and return to idle after it finishes
            const animDuration = p.skeleton?.data?.findAnimation(resolvedName)?.duration || 2;
            this.time.delayedCall(animDuration * 1000 + 100, () => {
              this.playerController.buttonAnimationActive = false;
              playFromList(p, ANIM.idle, true);
              status.textContent = `Finished: ${animName}`;
              console.log(`${animName} finished, returning to idle`);
            });
          }
        });
        
        // Hover effects
        bg.on("pointerover", () => {
          bg.setFillStyle(0x6366f1, 1);
          bg.setScale(1.05);
        });
        bg.on("pointerout", () => {
          bg.setFillStyle(0x4f46e5, 0.9);
          bg.setScale(1);
        });
        
        return container;
      };
      
      // Function to setup interactive buttons based on control suggestion
      const setupInteractiveButtons = (controlSuggestion, sequence) => {
        // Clear existing buttons
        this.actionButtons.forEach(btn => btn.destroy());
        this.actionButtons = [];
        this.actionButtonContainer.setVisible(false);
        
        if (controlSuggestion.startsWith("button:")) {
          // Extract action from "button:twerk" format
          const action = controlSuggestion.split(":")[1];
          const btn = createActionButton(action, VIEW_W / 2, VIEW_H - 200);
          this.actionButtons.push(btn);
          this.actionButtonContainer.setVisible(true);
          console.log(`Created interactive button for: ${action}`);
        } else if (controlSuggestion === "interactive") {
          // Create buttons for all non-movement animations in sequence
          const actions = sequence.filter(anim => !isMovementAnimation(anim));
          if (actions.length > 0) {
            const startX = VIEW_W / 2 - ((actions.length - 1) * 120);
            actions.forEach((action, idx) => {
              const btn = createActionButton(action, startX + idx * 240, VIEW_H - 200);
              this.actionButtons.push(btn);
            });
            this.actionButtonContainer.setVisible(true);
            console.log(`Created ${actions.length} interactive buttons`);
          }
        }
      };

      const executePrompt = async (promptText) => {
        console.log("Executing prompt:", promptText);
        const prompt = (promptText || "").trim();
        if (!prompt) {
          status.textContent = "Enter a prompt";
          return;
        }
        const result = await fetchSequence(prompt);
        console.log("Result:", result);
        
        if (!result.sequence || !result.sequence.length) {
          status.textContent = "No animations found for prompt";
          return;
        }
        
        const { sequence, vibe, controlSuggestion } = result;
        console.log(`Vibe: ${vibe}, Control: ${controlSuggestion}`);
        
        // Filter sequence based on control suggestion
        let playableSequence = [...sequence];
        
        // If button control, remove the button action from auto-play sequence
        if (controlSuggestion && controlSuggestion.startsWith("button:")) {
          const buttonAction = controlSuggestion.split(":")[1];
          playableSequence = sequence.filter(anim => 
            anim.toLowerCase() !== buttonAction.toLowerCase()
          );
          console.log(`Button mode: Removed "${buttonAction}" from auto-play sequence`);
          status.textContent = `Playing (${vibe}): ${playableSequence.join(" → ")} | Click button to ${buttonAction}`;
        } else {
          status.textContent = `Playing (${vibe}): ${sequence.join(" → ")}`;
        }

        // Setup interactive buttons if needed
        setupInteractiveButtons(controlSuggestion, sequence);

        // Reset button animation mode when starting new sequence
        this.playerController.buttonAnimationActive = false;

        // Start the sequence - player can still control direction and jumping
        // For button mode: plays everything EXCEPT the button action
        if (playableSequence.length > 0) {
          playSequenceWithDuration(this, p, playableSequence, 20, this.playerController);
        } else {
          // If sequence is empty after filtering, just show idle
          console.log("No auto-play animations, waiting for button click");
        }
      };

      playBtn.addEventListener("click", async () => {
        await executePrompt(input.value);
      });

      // Allow Enter key to submit
      input.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
          await executePrompt(input.value);
        }
      });

      // Add instruction text
      this.instructionText = this.add
        .text(
          VIEW_W / 2,
          VIEW_H - 50,
          "Controls auto-enable for movement animations | Enter prompt and click Play",
          {
            font: "22px monospace",
            fill: "#cfd8e3",
            stroke: "#111",
            strokeThickness: 3,
          }
        )
        .setOrigin(0.5, 1)
        .setDepth(990)
        .setScrollFactor(0);
    }

    update(time, delta) {
      const dt = Math.min(0.05, delta / 1000);

      // Wait for initialization to complete
      if (!this.ctrl || !this.touches) return;

      // Read inputs
      const kb = readInputs(this.ctrl);
      const touch = this.touches.read();
      const input = mergeInputs(kb, touch);

      // Update player controller (ALWAYS updates - both modes)
      if (this.playerController) {
        this.playerController.update(dt, input);

        // Update mode text and control visibility
        if (this.playerController.sequenceActive) {
          const animName = this.playerController.currentSequenceAnimName || "";
          const idx = this.playerController.currentSequenceIndex + 1;
          const total = this.playerController.sequenceNames.length;
          const allowMovement = isMovementAnimation(animName);
          const controlStatus = allowMovement
            ? "ENABLED"
            : "DISABLED (Auto-play)";
          this.modeText.setText(
            `Sequence (${idx}/${total}): ${animName} | Controls: ${controlStatus}`
          );

          // Show/hide touch controls based on whether movement is allowed
          if (this.touches && this.touches.ui) {
            this.touches.ui.setVisible(allowMovement);
          }
        } else {
          this.modeText.setText("Enter prompt and click Play to begin");
          // Hide controls when no sequence is active
          if (this.touches && this.touches.ui) {
            this.touches.ui.setVisible(false);
          }
        }

        // Update background speed and direction
        if (
          this.playerController.sequenceActive &&
          this.playerController.currentSequenceAnimName
        ) {
          // SEQUENCE MODE: Use animation name + virtual velocity for background
          const virtualVx = this.playerController.virtualVx;

          if (virtualVx !== 0) {
            const animName =
              this.playerController.currentSequenceAnimName.toLowerCase();
            let baseSpeed = 20;
            if (animName.includes("run")) {
              baseSpeed = 140;
            } else if (animName.includes("walk")) {
              baseSpeed = 60;
            } else if (animName.includes("fly")) {
              baseSpeed = 100;
            }

            // Background moves opposite to input direction
            this.bgSpeed = baseSpeed * Math.sign(virtualVx);
          } else {
            // Not moving: stop background
            this.bgSpeed = 0;
          }
        } else {
          // No sequence active: stop background
          this.bgSpeed = 0;
        }
      }

      // Background scrolling
      if (this.bgSpeed !== 0) {
        const scrollAmount = (this.bgSpeed * delta) / 1000;
        this.bg.tilePositionX += scrollAmount;
        if (this.bgScroll) {
          this.bgScroll.tilePositionX += scrollAmount;
        }
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: "#000",
    parent: "stage",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    plugins: {
      scene: [
        {
          key: "SpinePlugin",
          plugin:
            (window.spine && window.spine.SpinePlugin) || window.SpinePlugin,
          mapping: "spine",
        },
      ],
    },
    scene: [Boot, Play],
  });
})();
