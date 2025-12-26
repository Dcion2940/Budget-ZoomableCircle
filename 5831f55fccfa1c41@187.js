function _1(md){return(
md`<div style="color: grey; font: 13px/25.5px var(--sans-serif); text-transform: uppercase;"><h1 style="display: none;">Zoomable circle packing</h1><a href="https://d3js.org/">D3</a> › <a href="/@d3/gallery">Gallery</a></div>

# 2019 Taiwan Budget (Circle Packing)

<div style="text-align: left; font: 12px/18px var(--sans-serif); margin-bottom: 8px;">單位：十億元</div>

Click to zoom in or out.`
)}

function _chart(d3,data)
{

  // Specify the chart’s dimensions.
  const width = 928;
  const height = width;

  const formatValue = d3.format(",.2f");
  const topLevelColor = d3.scaleOrdinal(d3.schemeTableau10);
  const backgroundColor = "#f5f7fb";

  // Compute the layout.
  const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
    (d3.hierarchy(data)
      .sum(d => d.value ?? 0)
      .sort((a, b) => b.value - a.value));
  const root = pack(data);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .attr("style", `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${backgroundColor}; cursor: pointer;`);

  // Append the nodes.
  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
      .attr("fill", d => {
        const topAncestor = d.ancestors().find(a => a.depth === 1) || d;
        const base = d3.color(topLevelColor(topAncestor.data.name));
        const t = d.depth === 1 ? 0 : d.depth === 2 ? 0.35 : 0.6;
        return d3.interpolateLab(base, d3.rgb(255, 255, 255))(t);
      })
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
      .text(d => `${d.data.name}${d.value ? `（${formatValue(d.value)}）` : ""}`);

  node.append("title")
    .text(d => `${d.ancestors().reverse().map(d => d.data.name).join(" / ")}\n${formatValue(d.value)} 十億元`);

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


async function _data(d3,FileAttachment){return(
{
  const rows = await FileAttachment("tw2019ap.csv").csv();
  const filtered = rows
    .filter(d => String(d.year ?? "") === "2019")
    .map(d => ({...d, amount: +d.amount || 0}));

  const byTop = d3.rollups(
    filtered,
    topGroup => d3.rollups(
      topGroup,
      depGroup => d3.rollups(
        depGroup,
        catGroup => d3.sum(catGroup, d => d.amount),
        d => d.depcat
      ),
      d => d.depname
    ),
    d => d.topname
  );

  // byTop: [topname, [[depname, [[depcat, amount], ...]], ...]]
  const children = byTop.map(([topname, depEntries]) => {
    const depChildren = depEntries.map(([depname, catEntries]) => {
      const catNodes = catEntries.map(([depcat, amount]) => ({
        name: depcat,
        value: amount / 1e9
      }));
      const depValue = d3.sum(catNodes, d => d.value);
      return {name: depname, children: catNodes, value: depValue};
    });
    const topValue = d3.sum(depChildren, d => d.value);
    return {name: topname, children: depChildren, value: topValue};
  });

  return {name: "2019 預算", children};
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
  main.variable(observer("data")).define("data", ["d3","FileAttachment"], _data);
  return main;
}
