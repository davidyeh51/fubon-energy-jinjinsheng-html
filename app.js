const deck = window.DECK_DATA;
const slideEl = document.querySelector("#slide");
const thumbsEl = document.querySelector("#thumbs");
const counterEl = document.querySelector("#slideCounter");
const statusEl = document.querySelector("#statusText");
const editToggle = document.querySelector("#editToggle");
const resetEdits = document.querySelector("#resetEdits");
const downloadHtml = document.querySelector("#downloadHtml");

const STORAGE_KEY = `editable-deck:${deck.source}`;
let current = 0;
let editing = false;
let selected = null;
let edits = loadEdits();

function loadEdits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveEdits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
}

function elState(slideNumber, id) {
  edits[slideNumber] ||= {};
  edits[slideNumber][id] ||= {};
  return edits[slideNumber][id];
}

function mergedElement(slideNumber, el) {
  return {
    ...el,
    box: { ...el.box, ...(edits[slideNumber]?.[el.id]?.box || {}) },
    html: edits[slideNumber]?.[el.id]?.html ?? el.html,
  };
}

function setBoxStyle(node, box) {
  node.style.left = `${(box.x / deck.width) * 100}%`;
  node.style.top = `${(box.y / deck.height) * 100}%`;
  node.style.width = `${(box.w / deck.width) * 100}%`;
  node.style.height = `${(box.h / deck.height) * 100}%`;
}

function renderThumbs() {
  thumbsEl.innerHTML = "";
  deck.slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thumb${index === current ? " active" : ""}`;
    button.addEventListener("click", () => showSlide(index));

    const preview = document.createElement("div");
    preview.className = "thumb-preview";
    preview.style.background = slide.background;
    slide.elements.slice(0, 18).forEach((base) => {
      const item = mergedElement(slide.number, base);
      const mini = document.createElement("div");
      mini.style.position = "absolute";
      mini.style.left = `${(item.box.x / deck.width) * 100}%`;
      mini.style.top = `${(item.box.y / deck.height) * 100}%`;
      mini.style.width = `${(item.box.w / deck.width) * 100}%`;
      mini.style.height = `${(item.box.h / deck.height) * 100}%`;
      mini.style.background = item.type === "image" ? "#ccd6d0" : item.style?.fill || "rgba(0,111,83,.22)";
      mini.style.borderRadius = "1px";
      preview.appendChild(mini);
    });

    const title = document.createElement("div");
    title.className = "thumb-title";
    title.textContent = `${slide.number}. ${slide.title}`;
    button.append(preview, title);
    thumbsEl.appendChild(button);
  });
}

function renderElement(slide, base) {
  const item = mergedElement(slide.number, base);
  const node = document.createElement("div");
  node.className = `deck-element ${item.type}`;
  node.dataset.id = item.id;
  node.style.zIndex = item.z;
  setBoxStyle(node, item.box);
  if (item.rot) node.style.transform = `rotate(${item.rot}deg)`;

  const style = item.style || {};
  if (style.fill) node.style.background = style.fill;
  if (style.borderColor) node.style.borderColor = style.borderColor;
  if (style.borderWidth) {
    node.style.borderStyle = "solid";
    node.style.borderWidth = `${style.borderWidth}px`;
  }
  if (style.color) node.style.color = style.color;
  if (style.fontSize) node.style.fontSize = `${style.fontSize}px`;
  if (style.anchor === "mid") {
    node.style.display = "flex";
    node.style.alignItems = "center";
  }

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = "";
    node.appendChild(img);
  } else {
    const content = document.createElement("div");
    content.className = "editable";
    content.contentEditable = editing && item.type === "text" ? "true" : "false";
    content.innerHTML = item.html || "";
    content.addEventListener("input", () => {
      elState(slide.number, item.id).html = content.innerHTML;
      saveEdits();
      statusEl.textContent = "已儲存文字修改";
    });
    node.appendChild(content);
  }

  const move = document.createElement("span");
  move.className = "move-handle";
  move.title = "拖曳移動";
  move.addEventListener("pointerdown", (event) => startMove(event, slide.number, item.id, node));
  const resize = document.createElement("span");
  resize.className = "resize-handle";
  resize.title = "拖曳縮放";
  resize.addEventListener("pointerdown", (event) => startResize(event, slide.number, item.id, node));
  node.append(move, resize);

  node.addEventListener("pointerdown", () => {
    if (!editing) return;
    selectNode(node);
  });
  return node;
}

function showSlide(index) {
  current = Math.max(0, Math.min(deck.slides.length - 1, index));
  selected = null;
  const slide = deck.slides[current];
  slideEl.innerHTML = "";
  slideEl.style.background = slide.background;
  slide.elements.forEach((element) => slideEl.appendChild(renderElement(slide, element)));
  counterEl.textContent = `${current + 1} / ${deck.slides.length}`;
  statusEl.textContent = editing ? "編輯模式" : "瀏覽模式";
  renderThumbs();
}

function selectNode(node) {
  document.querySelectorAll(".deck-element.selected").forEach((el) => el.classList.remove("selected"));
  selected = node;
  node.classList.add("selected");
}

function startMove(event, slideNumber, id, node) {
  event.preventDefault();
  event.stopPropagation();
  selectNode(node);
  const slideRect = slideEl.getBoundingClientRect();
  const state = elState(slideNumber, id);
  const start = { x: event.clientX, y: event.clientY, box: { ...mergedElement(slideNumber, deck.slides[current].elements.find((el) => el.id === id)).box } };
  node.setPointerCapture(event.pointerId);
  node.onpointermove = (moveEvent) => {
    const dx = ((moveEvent.clientX - start.x) / slideRect.width) * deck.width;
    const dy = ((moveEvent.clientY - start.y) / slideRect.height) * deck.height;
    state.box = { ...start.box, x: Math.round(start.box.x + dx), y: Math.round(start.box.y + dy) };
    setBoxStyle(node, state.box);
  };
  node.onpointerup = () => {
    node.onpointermove = null;
    saveEdits();
    statusEl.textContent = "已儲存位置修改";
  };
}

function startResize(event, slideNumber, id, node) {
  event.preventDefault();
  event.stopPropagation();
  selectNode(node);
  const slideRect = slideEl.getBoundingClientRect();
  const state = elState(slideNumber, id);
  const start = { x: event.clientX, y: event.clientY, box: { ...mergedElement(slideNumber, deck.slides[current].elements.find((el) => el.id === id)).box } };
  node.setPointerCapture(event.pointerId);
  node.onpointermove = (moveEvent) => {
    const dw = ((moveEvent.clientX - start.x) / slideRect.width) * deck.width;
    const dh = ((moveEvent.clientY - start.y) / slideRect.height) * deck.height;
    state.box = {
      ...start.box,
      w: Math.max(24, Math.round(start.box.w + dw)),
      h: Math.max(18, Math.round(start.box.h + dh)),
    };
    setBoxStyle(node, state.box);
  };
  node.onpointerup = () => {
    node.onpointermove = null;
    saveEdits();
    statusEl.textContent = "已儲存尺寸修改";
  };
}

document.querySelector("#prevSlide").addEventListener("click", () => showSlide(current - 1));
document.querySelector("#nextSlide").addEventListener("click", () => showSlide(current + 1));

document.addEventListener("keydown", (event) => {
  if (event.target?.isContentEditable) return;
  if (event.key === "ArrowLeft") showSlide(current - 1);
  if (event.key === "ArrowRight") showSlide(current + 1);
});

editToggle.addEventListener("click", () => {
  editing = !editing;
  document.body.classList.toggle("editing", editing);
  editToggle.setAttribute("aria-pressed", String(editing));
  showSlide(current);
});

resetEdits.addEventListener("click", () => {
  delete edits[deck.slides[current].number];
  saveEdits();
  showSlide(current);
});

downloadHtml.addEventListener("click", () => {
  const clone = document.documentElement.cloneNode(true);
  const script = clone.querySelector("script[src='app.js']");
  if (script) script.remove();
  const blob = new Blob(["<!doctype html>\n" + clone.outerHTML], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jinjinsheng-energy-edited.html";
  a.click();
  URL.revokeObjectURL(url);
});

showSlide(0);
