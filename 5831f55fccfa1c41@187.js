function _1(md){return(
md`<div style="color: grey; font: 13px/25.5px var(--sans-serif); text-transform: uppercase;"><h1 style="display: none;">Zoomable circle packing</h1><a href="https://d3js.org/">D3</a> › <a href="/@d3/gallery">Gallery</a></div>

# Zoomable circle packing

Click to zoom in or out.`
)}

function _chart(d3,data)
{

  // Specify the chart’s dimensions.
  const width = 928;
  const height = width;

  // Create the color scale.
  const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
      .interpolate(d3.interpolateHcl);

  // Compute the layout.
  const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
    (d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value));
  const root = pack(data);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .attr("style", `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

  // Append the nodes.
  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
      .attr("fill", d => d.children ? color(d.depth) : "white")
      .attr("pointer-events", d => !d.children ? "none" : null)
      .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", null); })
      .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

  // Append the text labels.
  const label = svg.append("g")
      .style("font", "10px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none")
      .text(d => d.data.name);

  // Create the zoom behavior and zoom immediately in to the initial focus node.
  svg.on("click", (event) => zoom(event, root));
  let focus = root;
  let view;
  zoomTo([focus.x, focus.y, focus.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(event, d) {
    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", d => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return t => zoomTo(i(t));
        });

    label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }

  return svg.node();
}


function _data(FileAttachment,buildBudgetTree){return(
FileAttachment("tw2019ap.csv").csv({typed: true}).then(buildBudgetTree)
)}

function _buildBudgetTree(){return(
function buildBudgetTree(rows) {
  const root = {name: "2019 Budget", children: [], value: 0};

  const ensureChild = (parent, name) => {
    if (!parent.__childrenMap) parent.__childrenMap = new Map();
    let child = parent.__childrenMap.get(name);
    if (!child) {
      child = {name, children: [], value: 0};
      parent.__childrenMap.set(name, child);
      parent.children.push(child);
    }
    return child;
  };

  const addAmount = (node, amount) => {
    node.value = (node.value || 0) + amount;
  };

  for (const row of rows) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;

    const topNode = ensureChild(root, row.topname || "");
    const depNode = ensureChild(topNode, row.depname || "");
    const catNode = ensureChild(depNode, row.depcat || "");

    addAmount(root, amount);
    addAmount(topNode, amount);
    addAmount(depNode, amount);
    addAmount(catNode, amount);
  }

  const cleanup = (node) => {
    if (node.__childrenMap) delete node.__childrenMap;
    if (node.children && node.children.length) {
      node.children.forEach(cleanup);
    } else {
      delete node.children;
    }
    return node;
  };

  return cleanup(root);
}
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["tw2019ap.csv", {url: new URL("./files/tw2019ap.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("chart")).define("chart", ["d3","data"], _chart);
  main.variable(observer("data")).define("data", ["FileAttachment","buildBudgetTree"], _data);
  main.variable(observer("buildBudgetTree")).define("buildBudgetTree", _buildBudgetTree);
  return main;
}
