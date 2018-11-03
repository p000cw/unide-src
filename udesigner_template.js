// UniDe Universal Designer for components
import modelToLitElement from "./modeltolit.js";

let initialDesign = `div
  (
    style
    width: 100%; height: 100%;
    =
  )`;

let currentDesign = null;
let selectedElement = null;

// DnD Stuff
let markerEl = document.createElement("div");
let previousBegin, previousEnd;
// Positions for DnD
const POSITION_BEFORE_ELEMENT = -1;
const POSITION_CHILD_OF_ELEMENT = 0;
const POSITION_AFTER_ELEMENT = 1;

// Design stack for undo/redo
let designStack = [];
let redoStack = [];

// Finds the first parenthesis starting from index which is not matched.
// That paren marks the end of the component
let findDanglingParen = (arr, index) => {
  let i = index;
  let parenCount = 0;
  do {
    switch (arr[i].trim()) {
      case "(":
        parenCount++;
        break;
      case ")":
        parenCount--;
        break;
      default:
        break;
    }
    i++;
  } while (parenCount >= 0);
  return i - 1;
};

let getPaperElement = () => {
  return document.getElementById("paper");
};

let getOutlineElement = () => {
  return document.getElementById("outline");
};

let showCurrentDesign = () => {
  let paper = getPaperElement();
  paper.innerHTML = "";
  linoToDOM(currentDesign, paper);
  let outline = getOutlineElement();
  outline.innerHTML = "";
  linoToOutline(currentDesign, outline);
};

let startDrag = (event, snippet) => {
  event.dataTransfer.setData("text", snippet);
  previousBegin = previousEnd = -1;
};

let showNewDesign = newDesign => {
  designStack.push(currentDesign);
  currentDesign = newDesign;
  showCurrentDesign();
};

let startDragFromModel = (elementId, event) => {
  // TODO Splice element tree to be dragged out from the model.
  let newDesign = currentDesign.slice();
  previousBegin = elementId - 1;
  previousEnd = findDanglingParen(currentDesign, elementId + 1);
  let elementTree = newDesign.splice(
    previousBegin,
    previousEnd - elementId + 2
  );
  designStack.push(currentDesign);
  currentDesign = newDesign;
  event.dataTransfer.setData("text", elementTree);
  event.stopPropagation();
};
let getPositionOnTarget = (el, clientX, clientY) => {
  let bcr = el.getBoundingClientRect();
  let radius = Math.min(bcr.right - bcr.left, bcr.bottom - bcr.top) / 2;
  let midX = (bcr.left + bcr.right) / 2;
  let midY = (bcr.top + bcr.bottom) / 2;
  if (
    Math.sqrt(
      (midX - clientX) * (midX - clientX) + (midY - clientY) * (midY - clientY)
    ) <= radius
  ) {
    return POSITION_CHILD_OF_ELEMENT;
  } else if (clientY < midY) {
    return POSITION_BEFORE_ELEMENT;
  } else {
    return POSITION_AFTER_ELEMENT;
  }
};

let placeMarker = e => {
  let marker = document.getElementById("marker");
  marker.style.display = "none";
  let target = document.elementFromPoint(e.clientX, e.clientY);
  let designId = target.getAttribute("data-design-id");
  if (designId) {
    let bcr = target.getBoundingClientRect();
    marker.style.display = "block";
    marker.style.top = bcr.top + "px";
    marker.style.left = bcr.left + "px";
    marker.style.width = bcr.width + "px";
    marker.style.height = bcr.height + "px";
    let position = getPositionOnTarget(target, e.clientX, e.clientY);
    switch (position) {
      case POSITION_CHILD_OF_ELEMENT:
        marker.style.border = "1px red solid";
        break;
      case POSITION_BEFORE_ELEMENT:
        marker.style.border = "none";
        marker.style.borderTop = "1px red solid";
        break;
      case POSITION_AFTER_ELEMENT:
        marker.style.border = "none";
        marker.style.borderBottom = "1px red solid";
        break;
      default:
        break;
    }
    e.preventDefault();
    e.stopPropagation();
  } else {
    marker.style.display = "none";
  }
};

let dropElement = e => {
  // Hide marker
  let marker = document.getElementById("marker");
  marker.style.display = "none";
  let target = document.elementFromPoint(e.clientX, e.clientY);
  let index = target.getAttribute("data-design-id") | 0;
  if (index >= previousBegin && index <= previousEnd) {
    // Do not allow dropping on itself
    return;
  }
  if (index > previousEnd) {
    // Adjust for removed content
    index -= previousEnd - previousBegin;
  }
  let position = getPositionOnTarget(target, e.clientX, e.clientY);
  let spliceIndex = findDanglingParen(currentDesign, index + 1);
  if (position === POSITION_AFTER_ELEMENT) {
    spliceIndex = findDanglingParen(currentDesign, index + 1) + 1;
  } else if (position === POSITION_BEFORE_ELEMENT) {
    spliceIndex = index - 1;
  }

  let elementTree = e.dataTransfer.getData("text").split(",");
  let left = currentDesign.slice(0, spliceIndex);
  let right = currentDesign.slice(spliceIndex, currentDesign.length);
  let newDesign = left.concat(elementTree).concat(right);
  designStack.push(currentDesign);
  currentDesign = newDesign;
  showCurrentDesign();
  e.preventDefault();
};

let selectElement = e => {
  let target = document.elementFromPoint(e.clientX, e.clientY);
  let designId = target.getAttribute("data-design-id");
  if (designId) {
    selectedElement = designId | 0;
    // Mini interpreter for extracting property values
    let stack = [];
    let props = "";
    let ip = (designId | 0) + 1;
    let value = currentDesign[ip].trim();
    while (value !== "(" && value !== ")" && ip < currentDesign.length) {
      if (value === "=") {
        let tos = stack.pop();
        let nos = stack.pop();
        props = props + `${nos}\t${tos}\n`;
      } else {
        stack.push(value);
      }
      ip++;
      value = currentDesign[ip].trim();
    }
    document.getElementById("attributes").value = props;
    e.preventDefault();
    e.stopPropagation();
  }
};

let saveAttributes = () => {
  let attributeString = document.getElementById("attributes").value;
  let attributesAsStrings = attributeString.split("\n");
  let attributes = [];
  for (let i in attributesAsStrings) {
    let str = attributesAsStrings[i].trim();
    if (str !== "") {
      let index = str.indexOf("\t");
      if (index === -1) {
        index = str.indexOf(" ");
      }
      let key = str.substring(0, index);
      let value = str.substring(index);
      attributes.push(key);
      attributes.push(value);
      attributes.push("=");
    }
  }
  // Find range of previous attributes
  let index = selectedElement + 1;
  do {
    let a = currentDesign[index].trim();
    if (a === "(") {
      index--;
      break;
    }
    if (a === ")") {
      break;
    }
    index++;
  } while (index < currentDesign.length);

  // Stick the attributes where the old ones were
  let first = currentDesign.slice(0, selectedElement + 1);
  let rest = currentDesign.slice(index, currentDesign.length);
  let newDesign = first.concat(attributes).concat(rest);
  designStack.push(currentDesign);
  currentDesign = newDesign;
  showCurrentDesign();
};

let makeLinoInterpreter = (lparenfnStr, rparenfnStr, eqfnStr, valuefnStr) => {
  let stack = [];
  let tree = [];
  let current;
  let lparenfn = eval(lparenfnStr);
  let rparenfn = eval(rparenfnStr);
  let eqfn = eval(eqfnStr);
  let valuefn = eval(valuefnStr);
  return (code, target) => {
    current = target;
    code.forEach((str, index) => {
      let trimmed = str.trim();
      switch (trimmed) {
        case "(":
          lparenfn(index);
          break;
        case ")":
          rparenfn();
          break;
        case "=":
          eqfn();
          break;
        default:
          valuefn(trimmed);
      }
    });
    return current;
  };
};

let linoToDOM = makeLinoInterpreter(
  `(index) => {
    let old = current;
    tree.push(current);
    current = document.createElement(stack.pop());
    current.setAttribute('data-design-id', index);
    current.ondragstart = (event) => {startDragFromModel(index, event)};
    current.draggable = true;
    old.appendChild(current);
  }`,
  "() => {current = tree.pop()}",
  `
  () => {
    let tos=stack.pop();
    let nos=stack.pop();
    if (nos in current) {
      try {
        let json = JSON.parse(tos);
        current[nos]=json;
      } catch (e){
        current[nos]=tos;
      }
    } else {
      current.setAttribute(nos, tos);
    }
  }
  `,
  "str => {stack.push(str)}"
);

let linoToOutline = makeLinoInterpreter(
  `(index) => {
      let old = current;
      tree.push(current);
      current = document.createElement('div');
      current.textContent=stack.pop();
      current.setAttribute('data-design-id', index);
      current.ondragstart = (event) => {startDragFromModel(index, event)};
      current.draggable = true;
      old.appendChild(current);
    }`,
  "() => {current = tree.pop()}",
  "() => {}",
  "str => {stack.push(str)}"
);

const populatePalette = () => {
  let palette = document.getElementById("palette");
  palette.innerHTML = "";

  // TODO gather designs from local storage and create a section for them
  let designs = window.localStorage.getItem("designs");

  for (let j in paletteContent) {
    let section = paletteContent[j];
    let outer = document.createElement("div");
    outer.className = "palette-section";
    outer.innerHTML = section[0];
    let tags = section[1];
    outer.onmouseover = event => {
      outer.style.height = 3 + tags.length * 3 + "em";
    };
    outer.onmouseout = event => {
      outer.style.height = null;
    };
    palette.appendChild(outer);
    for (let i in tags) {
      let tagAndSnippet = tags[i];
      let el = document.createElement("div");
      const snippet = tagAndSnippet[1];
      if (snippet) {
        el.draggable = true;
        el.ondragstart = event => {
          const preview = document.getElementById("element-preview");
          preview.style.display = "none";
          startDrag(event, snippet);
        };

        el.onmouseover = event => {
          const preview = document.getElementById("element-preview");
          preview.style.top = event.clientY + "px";
          preview.style.left = event.clientX + 200 + "px";
          preview.innerHTML = "";
          linoToDOM(snippet, preview);
          preview.style.display = "block";
        };
        el.onmouseout = event => {
          const preview = document.getElementById("element-preview");
          preview.style.display = "none";
        };
      }
      el.innerHTML = tagAndSnippet[0];
      outer.appendChild(el);
    }
  }
};

let populateDesignSelector = () => {
  let selector = document.getElementById("choose-design");
  selector.innerHTML = "";
  let designsStr = localStorage.getItem("designs") || "{}";
  let designs = JSON.parse(designsStr);
  let keys = Object.keys(designs);
  let placeholder = document.createElement("option");
  placeholder.textContent = "Select a design";
  selector.add(placeholder);
  for (let i in keys) {
    let el = document.createElement("option");
    el.textContent = keys[i];
    el.setAttribute("value", keys[i]);
    selector.add(el);
  }
};

let saveDesign = event => {
  let designName = document.getElementById("design-name").value;
  let designsStr = localStorage.getItem("designs") || "{}";
  let designs = JSON.parse(designsStr);
  designs[designName] = currentDesign;
  localStorage.setItem("designs", JSON.stringify(designs));
  populateDesignSelector();
};

let loadDesign = event => {
  let designName = document.getElementById("choose-design").value;
  document.getElementById("design-name").value = designName;
  let designs = JSON.parse(localStorage.getItem("designs"));
  currentDesign = designs[designName];
  designStack = [];
  redoStack = [];
  showCurrentDesign();
};

const installEventHandlers = () => {
  let outline = getOutlineElement();
  outline.ondragover = placeMarker;
  outline.onclick = selectElement;
  let paper = getPaperElement();
  paper.ondragover = placeMarker;
  paper.onclick = selectElement;
  let marker = document.getElementById("marker");
  marker.ondrop = dropElement;
  marker.ondragover = placeMarker;
  let attributes = document.getElementById("attributes");
  attributes.onblur = saveAttributes;

  document.getElementById("save-design").onclick = saveDesign;
  document.getElementById("choose-design").onchange = loadDesign;
};

let initializeDesign = () => {
  // Initialize design
  currentDesign = initialDesign.split("\n");
  designStack.push(currentDesign);
};

let initDesigner = () => {
  populatePalette();
  installEventHandlers();

  //Keyboard handler
  document.body.onkeypress = event => {
    if (event.key === "z" && event.ctrlKey) {
      if (designStack.length > 0) {
        redoStack.push(currentDesign);
        currentDesign = designStack.pop();
        showCurrentDesign();
      }
      event.stopPropagation();
      event.preventDefault();
    }
    if (event.key === "y" && event.ctrlKey) {
      if (redoStack.lenght > 0) {
        designStack.push(currentDesign);
        currentDesign = redoStack.pop();
        showCurrentDesign();
      }
      event.stopPropagation();
      event.preventDefault();
    }

    if (event.key === "Delete") {
      let newDesign = currentDesign.slice();
      newDesign.splice(
        selectedElement - 1,
        findDanglingParen(newDesign, selectedElement + 1) - selectedElement + 2
      );
      showNewDesign(newDesign);
      event.stopPropagation();
      event.preventDefault();
    }
  };

  let btn = document.getElementById("showbutton");
  btn.onclick = e => {
    document.getElementById("attributes").value = modelToLitElement(
      currentDesign
    );
  };

  initializeDesign();
  populateDesignSelector();

  // Liftoff
  showCurrentDesign();
};

export default initDesigner;
