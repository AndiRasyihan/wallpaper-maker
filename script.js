/* ============================================================
   Wallpaper Maker - script.js
   Editor wallpaper berbasis Fabric.js (vanilla JS)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* ----------------------- State ----------------------- */
  const state = {
    realW: 1080,
    realH: 1920,
    scale: 1, // display / real
    bgMode: "solid", // 'solid' | 'gradient'
    hasBgImage: false,
    vignette: null, // fabric.Rect overlay
    patternRect: null, // fabric.Rect pola/tekstur
  };

  const canvas = new fabric.Canvas("c", {
    backgroundColor: "#1e1e2e",
    preserveObjectStacking: true,
  });

  /* --------------- Helper: elemen DOM --------------- */
  const $ = (id) => document.getElementById(id);

  /* ----------------------- Ukuran kanvas ----------------------- */
  function fitScale(realW, realH) {
    const area = $("canvas-wrapper").parentElement; // .canvas-area
    const maxW = Math.max(200, area.clientWidth - 60);
    const maxH = Math.max(200, area.clientHeight - 80);
    return Math.min(maxW / realW, maxH / realH, 1);
  }

  function applyCanvasSize(realW, realH) {
    state.realW = realW;
    state.realH = realH;
    state.scale = fitScale(realW, realH);
    canvas.setWidth(Math.round(realW * state.scale));
    canvas.setHeight(Math.round(realH * state.scale));
    applyBackground(); // re-cover gambar / re-hitung gradasi
    updateVignette(); // re-hitung vignette sesuai ukuran baru
    updatePattern(); // re-buat pola sesuai ukuran baru
    canvas.requestRenderAll();
    $("canvas-meta").textContent =
      `${realW} × ${realH} px  •  tampil ${Math.round(state.scale * 100)}%`;
  }

  /* ----------------------- Background ----------------------- */
  function buildGradient() {
    const c1 = $("bg-grad-1").value;
    const c2 = $("bg-grad-2").value;
    const dir = $("bg-grad-dir").value;
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    let coords = { x1: 0, y1: 0, x2: 0, y2: h }; // to-bottom
    if (dir === "to-right") coords = { x1: 0, y1: 0, x2: w, y2: 0 };
    else if (dir === "diagonal") coords = { x1: 0, y1: 0, x2: w, y2: h };
    return new fabric.Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords,
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ],
    });
  }

  function coverBgImage(img) {
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const scale = Math.max(cw / img.width, ch / img.height);
    img.set({
      originX: "center",
      originY: "center",
      left: cw / 2,
      top: ch / 2,
      scaleX: scale,
      scaleY: scale,
    });
  }

  function applyBackground() {
    if (state.hasBgImage && canvas.backgroundImage) {
      coverBgImage(canvas.backgroundImage);
      canvas.requestRenderAll();
      return;
    }
    if (state.bgMode === "solid") {
      canvas.setBackgroundColor($("bg-color").value, () =>
        canvas.requestRenderAll(),
      );
    } else {
      canvas.setBackgroundColor(buildGradient(), () =>
        canvas.requestRenderAll(),
      );
    }
  }

  /* ----------------------- Tambah objek ----------------------- */
  function centerAndAdd(obj) {
    canvas.add(obj);
    canvas.viewportCenterObject(obj);
    obj.setCoords();
    canvas.setActiveObject(obj);
    keepLayersSane();
    canvas.requestRenderAll();
  }

  function keepVignetteTop() {
    if (state.vignette) canvas.bringToFront(state.vignette);
  }

  function keepLayersSane() {
    if (state.patternRect) canvas.sendToBack(state.patternRect);
    keepVignetteTop();
  }

  function addGlass() {
    const g = new fabric.Rect({
      width: 320,
      height: 210,
      rx: 28,
      ry: 28,
      fill: "rgba(255,255,255,0.15)",
      stroke: "rgba(255,255,255,0.45)",
      strokeWidth: 2,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.35)",
        blur: 30,
        offsetX: 0,
        offsetY: 10,
      }),
    });
    centerAndAdd(g);
  }

  function addText() {
    const t = new fabric.IText("Ketik di sini", {
      fontFamily: "Poppins",
      fontSize: 60,
      fill: "#ffffff",
      fontWeight: "normal",
    });
    centerAndAdd(t);
  }

  function addEmoji(emoji) {
    const t = new fabric.IText(emoji, {
      fontFamily: "Poppins",
      fontSize: 120,
      editable: false,
    });
    centerAndAdd(t);
  }

  function addShape(kind) {
    let obj;
    const common = { fill: "#ff6b6b", stroke: "#ffffff", strokeWidth: 0 };
    if (kind === "rect") {
      obj = new fabric.Rect({
        width: 200,
        height: 140,
        rx: 0,
        ry: 0,
        ...common,
      });
    } else if (kind === "circle") {
      obj = new fabric.Circle({ radius: 90, ...common });
    } else if (kind === "triangle") {
      obj = new fabric.Triangle({ width: 180, height: 160, ...common });
    } else if (kind === "line") {
      obj = new fabric.Line([0, 0, 220, 0], {
        stroke: "#ffffff",
        strokeWidth: 6,
      });
    }
    if (obj) centerAndAdd(obj);
  }

  /* ----------------------- Upload gambar latar ----------------------- */
  function handleImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(
        e.target.result,
        (img) => {
          coverBgImage(img);
          canvas.backgroundImage = img;
          state.hasBgImage = true;
          $("filter-hint").classList.add("hidden");
          applyFilters();
          canvas.requestRenderAll();
        },
        { crossOrigin: "anonymous" },
      );
    };
    reader.readAsDataURL(file);
  }

  function clearBgImage() {
    canvas.backgroundImage = null;
    state.hasBgImage = false;
    $("filter-hint").classList.remove("hidden");
    applyBackground();
    canvas.requestRenderAll();
  }

  /* ----------------------- Filter ----------------------- */
  function applyFilters() {
    const img = canvas.backgroundImage;
    if (!img || !(img instanceof fabric.Image)) return;

    const filters = [];
    const blur = +$("f-blur").value;
    const brightness = +$("f-brightness").value;
    const contrast = +$("f-contrast").value;
    const saturation = +$("f-saturation").value;
    const sharpen = +$("f-sharpen").value;
    const noise = +$("f-noise").value;
    const grayscale = $("f-grayscale").checked;

    if (blur > 0)
      filters.push(new fabric.Image.filters.Blur({ blur: blur / 100 }));
    if (brightness !== 0)
      filters.push(
        new fabric.Image.filters.Brightness({ brightness: brightness / 100 }),
      );
    if (contrast !== 0)
      filters.push(
        new fabric.Image.filters.Contrast({ contrast: contrast / 100 }),
      );
    if (saturation !== 0)
      filters.push(
        new fabric.Image.filters.Saturation({ saturation: saturation / 100 }),
      );
    if (sharpen > 0) {
      // Kernel sharpen berparameter: a=0 -> tanpa efek, makin besar makin tajam
      const a = sharpen / 50; // 0 .. 2
      filters.push(
        new fabric.Image.filters.Convolute({
          matrix: [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0],
        }),
      );
    }
    if (grayscale) filters.push(new fabric.Image.filters.Grayscale());

    if (noise > 0)
      filters.push(new fabric.Image.filters.Noise({ noise: noise * 2 }));

    img.filters = filters;
    img.applyFilters();
    canvas.requestRenderAll();
  }

  /* ----------------------- Isi gradasi & efek objek ----------------------- */
  function buildObjectGradient() {
    const c1 = $("grad-c1").value;
    const c2 = $("grad-c2").value;
    const dir = $("grad-dir").value;
    let coords = { x1: 0, y1: 0, x2: 0, y2: 1 };
    if (dir === "to-right") coords = { x1: 0, y1: 0, x2: 1, y2: 0 };
    else if (dir === "diagonal") coords = { x1: 0, y1: 0, x2: 1, y2: 1 };
    return new fabric.Gradient({
      type: "linear",
      gradientUnits: "percentage",
      coords,
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ],
    });
  }

  function applyObjectFill() {
    withActive((o) => {
      if ($("grad-enable").checked) {
        o.set("fill", buildObjectGradient());
      } else {
        const isText = o.type === "i-text" || o.type === "text";
        o.set("fill", isText ? $("text-color").value : $("shape-fill").value);
      }
    });
  }

  function syncFxRows() {
    const mode = $("fx-mode").value;
    $("shadow-rows").classList.toggle("hidden", mode !== "shadow");
    $("glow-rows").classList.toggle("hidden", mode !== "glow");
  }

  function applyObjectEffect() {
    withActive((o) => {
      const mode = $("fx-mode").value;
      if (mode === "none") {
        o.set("shadow", null);
      } else if (mode === "shadow") {
        o.set(
          "shadow",
          new fabric.Shadow({
            color: $("sh-color").value,
            blur: +$("sh-blur").value,
            offsetX: +$("sh-x").value,
            offsetY: +$("sh-y").value,
          }),
        );
      } else {
        o.set(
          "shadow",
          new fabric.Shadow({
            color: $("glow-color").value,
            blur: +$("glow-strength").value,
            offsetX: 0,
            offsetY: 0,
          }),
        );
      }
    });
  }

  /* ----------------------- Vignette ----------------------- */
  function hexToRgb(hex) {
    const h = toHex(hex).slice(1);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function updateVignette() {
    if (state.vignette) {
      canvas.remove(state.vignette);
      state.vignette = null;
    }
    if (!$("vig-enable").checked) {
      canvas.requestRenderAll();
      return;
    }
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const intensity = +$("vig-intensity").value / 100;
    const { r, g, b } = hexToRgb($("vig-color").value);
    const cx = w / 2;
    const cy = h / 2;
    const rad = Math.sqrt(cx * cx + cy * cy);
    const grad = new fabric.Gradient({
      type: "radial",
      gradientUnits: "pixels",
      coords: { x1: cx, y1: cy, r1: rad * 0.35, x2: cx, y2: cy, r2: rad },
      colorStops: [
        { offset: 0, color: `rgba(${r},${g},${b},0)` },
        { offset: 1, color: `rgba(${r},${g},${b},${intensity})` },
      ],
    });
    const rect = new fabric.Rect({
      left: 0,
      top: 0,
      width: w,
      height: h,
      fill: grad,
      selectable: false,
      evented: false,
      hoverCursor: "default",
    });
    state.vignette = rect;
    canvas.add(rect);
    canvas.bringToFront(rect);
    canvas.requestRenderAll();
  }

  /* ----------------------- Pola / Tekstur ----------------------- */
  function buildPatternTile(type, color, size) {
    const tile = document.createElement("canvas");
    tile.width = size;
    tile.height = size;
    const ctx = tile.getContext("2d");
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (type === "dots") {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, Math.max(1.5, size * 0.1), 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "grid") {
      ctx.lineWidth = Math.max(1, size * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, 0.5);
      ctx.lineTo(size, 0.5);
      ctx.moveTo(0.5, 0);
      ctx.lineTo(0.5, size);
      ctx.stroke();
    } else if (type === "diag") {
      ctx.lineWidth = Math.max(1, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(size, 0);
      ctx.moveTo(-size / 4, size / 4);
      ctx.lineTo(size / 4, -size / 4);
      ctx.moveTo((size * 3) / 4, (size * 5) / 4);
      ctx.lineTo((size * 5) / 4, (size * 3) / 4);
      ctx.stroke();
    }
    return tile;
  }

  function updatePattern() {
    if (state.patternRect) {
      canvas.remove(state.patternRect);
      state.patternRect = null;
    }
    const type = $("pat-type").value;
    $("pat-rows").classList.toggle("hidden", type === "none");
    if (type === "none") {
      canvas.requestRenderAll();
      return;
    }
    const size = +$("pat-scale").value;
    const tile = buildPatternTile(type, $("pat-color").value, size);
    const rect = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      fill: new fabric.Pattern({ source: tile, repeat: "repeat" }),
      opacity: +$("pat-opacity").value / 100,
      selectable: false,
      evented: false,
      hoverCursor: "default",
    });
    state.patternRect = rect;
    canvas.add(rect);
    canvas.sendToBack(rect);
    keepVignetteTop();
    canvas.requestRenderAll();
  }

  /* ----------------------- Panel properti kontekstual ----------------------- */
  function updateToggle(btn, active) {
    btn.classList.toggle("active", !!active);
  }

  function refreshObjectPanel() {
    const obj = canvas.getActiveObject();
    const panel = $("object-panel");
    if (!obj) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");

    const isText = obj.type === "i-text" || obj.type === "text";
    const isShape = ["rect", "circle", "triangle", "line"].includes(obj.type);

    $("text-props").classList.toggle("hidden", !isText);
    $("shape-props").classList.toggle("hidden", !isShape);

    $("obj-opacity").value = Math.round((obj.opacity ?? 1) * 100);

    if (isText) {
      $("text-content").value = obj.text || "";
      $("text-font").value = obj.fontFamily || "Poppins";
      $("text-size").value = obj.fontSize || 60;
      $("text-color").value = toHex(obj.fill) || "#ffffff";
      updateToggle($("text-bold"), obj.fontWeight === "bold");
      updateToggle($("text-italic"), obj.fontStyle === "italic");
      updateToggle($("text-underline"), obj.underline);
    }
    if (isShape) {
      $("shape-fill").value = toHex(obj.fill) || "#ff6b6b";
      $("shape-stroke").value = toHex(obj.stroke) || "#ffffff";
      $("shape-stroke-width").value = obj.strokeWidth || 0;
    }

    // Sudut membulat hanya untuk persegi
    $("radius-row").classList.toggle("hidden", obj.type !== "rect");
    if (obj.type === "rect") $("obj-radius").value = obj.rx || 0;

    // Bayangan / Neon glow
    const sh = obj.shadow;
    let fxMode = "none";
    if (sh) fxMode = sh.offsetX === 0 && sh.offsetY === 0 ? "glow" : "shadow";
    $("fx-mode").value = fxMode;
    syncFxRows();
    if (fxMode === "shadow") {
      $("sh-color").value = toHex(sh.color) || "#000000";
      $("sh-blur").value = sh.blur || 0;
      $("sh-x").value = sh.offsetX || 0;
      $("sh-y").value = sh.offsetY || 0;
    } else if (fxMode === "glow") {
      $("glow-color").value = toHex(sh.color) || "#00e5ff";
      $("glow-strength").value = sh.blur || 40;
    }

    // Isi gradasi
    const isGrad =
      obj.fill &&
      typeof obj.fill === "object" &&
      Array.isArray(obj.fill.colorStops);
    $("grad-enable").checked = !!isGrad;
    $("grad-rows").classList.toggle("hidden", !isGrad);
    if (isGrad && obj.fill.colorStops.length >= 2) {
      $("grad-c1").value = toHex(obj.fill.colorStops[0].color);
      $("grad-c2").value = toHex(obj.fill.colorStops[1].color);
    }

    // Blend mode
    const gco = obj.globalCompositeOperation;
    const knownBlends = [
      "multiply",
      "screen",
      "overlay",
      "lighter",
      "difference",
    ];
    $("blend-mode").value = knownBlends.includes(gco) ? gco : "normal";
  }

  // Konversi warna ke #rrggbb (color input hanya menerima hex)
  function toHex(color) {
    if (!color || typeof color !== "string") return "#000000";
    if (color[0] === "#") {
      // #rgb -> #rrggbb
      if (color.length === 4) {
        return (
          "#" +
          color
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        );
      }
      return color.slice(0, 7);
    }
    const m = color.match(/\d+/g);
    if (m && m.length >= 3) {
      return (
        "#" +
        m
          .slice(0, 3)
          .map((n) => (+n).toString(16).padStart(2, "0"))
          .join("")
      );
    }
    return "#000000";
  }

  function withActive(fn) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    fn(obj);
    canvas.requestRenderAll();
  }

  /* ----------------------- Layer & aksi objek ----------------------- */
  function duplicateActive() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.clone((cloned) => {
      cloned.set({ left: (obj.left || 0) + 25, top: (obj.top || 0) + 25 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      keepLayersSane();
      canvas.requestRenderAll();
    });
  }

  function deleteActive() {
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    objs.forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    refreshObjectPanel();
  }

  function clearAll() {
    canvas
      .getObjects()
      .slice()
      .forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    clearBgImage();
    // reset filter UI
    [
      "f-blur",
      "f-brightness",
      "f-contrast",
      "f-saturation",
      "f-sharpen",
      "f-noise",
    ].forEach((id) => ($(id).value = 0));
    $("f-grayscale").checked = false;
    $("vig-enable").checked = false;
    updateVignette();
    $("pat-type").value = "none";
    updatePattern();
    canvas.requestRenderAll();
    refreshObjectPanel();
  }

  /* ----------------------- Export ----------------------- */
  function download(format) {
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const exportScale = +$("export-scale").value || 1;
    const multiplier = (state.realW / canvas.getWidth()) * exportScale;
    const dataURL = canvas.toDataURL({
      format: format === "jpg" ? "jpeg" : "png",
      quality: 0.95,
      multiplier,
    });
    const outW = Math.round(state.realW * exportScale);
    const outH = Math.round(state.realH * exportScale);
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `wallpaper-${outW}x${outH}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ----------------------- Emoji picker ----------------------- */
  const EMOJIS = [
    "❤️",
    "⭐",
    "✨",
    "🔥",
    "🌙",
    "☁️",
    "🌈",
    "🌸",
    "🦋",
    "🌺",
    "💫",
    "🎵",
    "😎",
    "🥰",
    "👑",
    "💎",
  ];
  const emojiGrid = $("emoji-grid");
  EMOJIS.forEach((e) => {
    const b = document.createElement("button");
    b.className = "emoji-btn";
    b.textContent = e;
    b.addEventListener("click", () => addEmoji(e));
    emojiGrid.appendChild(b);
  });

  /* ----------------------- Event bindings ----------------------- */
  // Toolbar
  $("add-text").addEventListener("click", addText);
  $("add-glass").addEventListener("click", addGlass);
  $("upload-image-btn").addEventListener("click", () =>
    $("upload-image").click(),
  );
  $("upload-image").addEventListener("change", (e) => {
    handleImageUpload(e.target.files[0]);
    e.target.value = ""; // izinkan upload file sama lagi
  });
  document.querySelectorAll(".shape-btn").forEach((btn) => {
    btn.addEventListener("click", () => addShape(btn.dataset.shape));
  });

  // Ukuran
  $("preset-size").addEventListener("change", (e) => {
    const v = e.target.value;
    const custom = $("custom-size");
    if (v === "custom") {
      custom.classList.remove("hidden");
    } else {
      custom.classList.add("hidden");
      const [w, h] = v.split("x").map(Number);
      applyCanvasSize(w, h);
    }
  });
  $("apply-custom").addEventListener("click", () => {
    const w = Math.min(8000, Math.max(16, +$("custom-w").value || 1080));
    const h = Math.min(8000, Math.max(16, +$("custom-h").value || 1920));
    $("custom-w").value = w;
    $("custom-h").value = h;
    applyCanvasSize(w, h);
  });

  // Export
  $("download-png").addEventListener("click", () => download("png"));
  $("download-jpg").addEventListener("click", () => download("jpg"));

  // Background
  $("bg-mode").addEventListener("change", (e) => {
    state.bgMode = e.target.value;
    $("bg-solid-row").classList.toggle("hidden", state.bgMode !== "solid");
    $("bg-gradient-rows").classList.toggle(
      "hidden",
      state.bgMode !== "gradient",
    );
    applyBackground();
  });
  $("bg-color").addEventListener("input", applyBackground);
  $("bg-grad-1").addEventListener("input", applyBackground);
  $("bg-grad-2").addEventListener("input", applyBackground);
  $("bg-grad-dir").addEventListener("change", applyBackground);
  $("clear-bg-image").addEventListener("click", clearBgImage);

  // Filter
  [
    "f-blur",
    "f-brightness",
    "f-contrast",
    "f-saturation",
    "f-sharpen",
    "f-noise",
  ].forEach((id) => $(id).addEventListener("input", applyFilters));
  $("f-grayscale").addEventListener("change", applyFilters);

  // Vignette
  ["vig-intensity", "vig-color"].forEach((id) =>
    $(id).addEventListener("input", updateVignette),
  );
  $("vig-enable").addEventListener("change", updateVignette);

  // Properti teks
  $("text-content").addEventListener("input", (e) =>
    withActive((o) => o.set("text", e.target.value)),
  );
  $("text-font").addEventListener("change", (e) =>
    withActive((o) => o.set("fontFamily", e.target.value)),
  );
  $("text-size").addEventListener("input", (e) =>
    withActive((o) => o.set("fontSize", +e.target.value)),
  );
  $("text-color").addEventListener("input", (e) => {
    $("grad-enable").checked = false;
    $("grad-rows").classList.add("hidden");
    withActive((o) => o.set("fill", e.target.value));
  });
  $("text-bold").addEventListener("click", () =>
    withActive((o) => {
      const bold = o.fontWeight === "bold";
      o.set("fontWeight", bold ? "normal" : "bold");
      updateToggle($("text-bold"), !bold);
    }),
  );
  $("text-italic").addEventListener("click", () =>
    withActive((o) => {
      const it = o.fontStyle === "italic";
      o.set("fontStyle", it ? "normal" : "italic");
      updateToggle($("text-italic"), !it);
    }),
  );
  $("text-underline").addEventListener("click", () =>
    withActive((o) => {
      o.set("underline", !o.underline);
      updateToggle($("text-underline"), o.underline);
    }),
  );

  // Properti shape
  $("shape-fill").addEventListener("input", (e) => {
    $("grad-enable").checked = false;
    $("grad-rows").classList.add("hidden");
    withActive((o) => o.set("fill", e.target.value));
  });
  $("shape-stroke").addEventListener("input", (e) =>
    withActive((o) => o.set("stroke", e.target.value)),
  );
  $("shape-stroke-width").addEventListener("input", (e) =>
    withActive((o) => o.set("strokeWidth", +e.target.value)),
  );

  // Opacity umum
  $("obj-opacity").addEventListener("input", (e) =>
    withActive((o) => o.set("opacity", +e.target.value / 100)),
  );

  // Sudut membulat (persegi)
  $("obj-radius").addEventListener("input", (e) =>
    withActive((o) => {
      if (o.type === "rect")
        o.set({ rx: +e.target.value, ry: +e.target.value });
    }),
  );

  // Efek objek (bayangan / neon glow)
  $("fx-mode").addEventListener("change", () => {
    syncFxRows();
    applyObjectEffect();
  });
  [
    "sh-color",
    "sh-blur",
    "sh-x",
    "sh-y",
    "glow-color",
    "glow-strength",
  ].forEach((id) => $(id).addEventListener("input", applyObjectEffect));

  // Isi gradasi objek
  $("grad-enable").addEventListener("change", () => {
    $("grad-rows").classList.toggle("hidden", !$("grad-enable").checked);
    applyObjectFill();
  });
  ["grad-c1", "grad-c2"].forEach((id) =>
    $(id).addEventListener("input", applyObjectFill),
  );
  $("grad-dir").addEventListener("change", applyObjectFill);

  // Blend mode
  $("blend-mode").addEventListener("change", (e) =>
    withActive((o) =>
      o.set(
        "globalCompositeOperation",
        e.target.value === "normal" ? "source-over" : e.target.value,
      ),
    ),
  );

  // Pola / tekstur
  $("pat-type").addEventListener("change", updatePattern);
  ["pat-color", "pat-opacity", "pat-scale"].forEach((id) =>
    $(id).addEventListener("input", updatePattern),
  );

  // Layer & aksi
  $("layer-forward").addEventListener("click", () =>
    withActive((o) => {
      canvas.bringForward(o);
      keepLayersSane();
    }),
  );
  $("layer-back").addEventListener("click", () =>
    withActive((o) => {
      canvas.sendBackwards(o);
      keepLayersSane();
    }),
  );
  $("obj-duplicate").addEventListener("click", duplicateActive);
  $("obj-delete").addEventListener("click", deleteActive);
  $("clear-all").addEventListener("click", clearAll);

  // Seleksi objek -> refresh panel
  canvas.on("selection:created", refreshObjectPanel);
  canvas.on("selection:updated", refreshObjectPanel);
  canvas.on("selection:cleared", refreshObjectPanel);
  canvas.on("object:modified", refreshObjectPanel);

  // Keyboard: Delete/Backspace hapus objek (kecuali saat mengedit teks)
  document.addEventListener("keydown", (e) => {
    const editingText =
      canvas.getActiveObject() && canvas.getActiveObject().isEditing;
    const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement.tagName,
    );
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      !editingText &&
      !inField
    ) {
      e.preventDefault();
      deleteActive();
    }
  });

  // Re-fit saat window di-resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(
      () => applyCanvasSize(state.realW, state.realH),
      150,
    );
  });

  /* ----------------------- Init ----------------------- */
  applyCanvasSize(1080, 1920);
});
