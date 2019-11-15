/*
 * Circlepack - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the plot
 * @param _data						-- the dataset
 */
Circlepack = function(_parentElement, _data){
	this.parentElement = _parentElement;
	this.data = _data;
	this.initVis();
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/*
 * Initialize visualization (static content; e.g. SVG area, axes)
 */
 Circlepack.prototype.initVis = function(){
   // Padding and margins
   var vis = this;
   console.log("initVis");
   vis.margin = { top: 0, right: 0, bottom: 0, left: 0 };
   vis.width = 1050 - vis.margin.left - vis.margin.right;
   vis.height = 300 - vis.margin.left - vis.margin.right;
   vis.diameter = vis.width;

   vis.svg = d3.select("#" + vis.parentElement).append("svg")
      .attr("class", "vis-svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
	    .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        // .attr("transform", "translate(" + vis.width / 2 + "," + vis.height / 2 + ")");
	       .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

   // Scales and axes

   // Color scale
   vis.color = d3
     .scaleLinear()
     .domain([-1, 5])
     .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
     .interpolate(d3.interpolateHcl);

  // Legend

  // Tooltip
  vis.tooltip = d3.select("#" + vis.parentElement).append("div")
    .attr("class", "tooltip-details")
    .text("a simple tooltip");

   vis.wrangleData();
 }

 /*
 *  Data wrangling
 */
Circlepack.prototype.wrangleData = function(){
  var vis = this;
  console.log("wrangleData");

  //Filter data

  // Label and enhance data
  // console.log(vis.data);
  // console.log("LEVELS");
  // var levels = function lv(node, level){
  //   node.level = level;
  //   level += 1;
  //   if(node.hasOwnProperty("children")){
  //     if(node.children.length > 0){
  //       node.children.forEach(function(e){
  //         levels(e, level)
  //       })
  //     }
  //   } else {
  //     return;
  //   }
  // }
  // levels(vis.data, 0);

  // Reorganize data
  vis.root = d3
    .hierarchy(vis.data)
    //.sum(function(d) { return d.size; })
    //
    .sum(function(d) {
      //console.log("d: " + d.name);
      //return d.size;
      return 10;
    })
    .sort(function(a, b) {
      //console.log("b: " + b.value + " a:" + a.value);
      // changes the orientation
      //return b.value - a.value;
      //"The specified function is passed two nodes a and b to compare.
      // If a should be before b, the function must return a value less than zero;
      // if b should be before a, the function must return a value greater than zero;"
      // -- https://github.com/d3/d3-hierarchy#node_sort
      random = getRandomInt(-1, 1);
      //console.log(random);
      return random;
    });

    // Config pack function
    vis.pack = d3
      .pack()
      .size([vis.width, vis.height])
      // For nested circles, the distance between the circle itself and circles inside it.
      .padding(4);
    vis.nodes = vis.pack(vis.root).descendants();

  vis.updateVis();
}

/*
 *  The drawing function
 */
Circlepack.prototype.updateVis = function(){
  console.log("updateVis");
  var vis = this;
  console.log(vis);

  vis.circles = vis.svg.selectAll("circle")
    .data(vis.nodes);
  console.log(vis.circles);
  vis.circles.enter()
    .append("circle")
    .attr("r", d => d.r)
    .attr("transform", function(d){
        return "translate(" + d.x + "," + d.y + ")";
      // let x = getRandomInt(0,vis.width);
      // let y = getRandomInt(0, vis.height);
      // return "translate(" + x + "," + y + ")";
    })
    .attr("class", function(d) {
      // "?" is the ternary operator
      return d.parent
        ? d.children
          ? "node"
          : "node node--leaf"
        : "node node--root";
    })
    .style("fill", function(d){
      return d.children ? vis.color(d.depth) : null;
    })
    .on("mouseover", function(d) {
      vis.tooltip.html(`<div id="tooltip-text">${d.data.name}</div>`);
      vis.tooltip.transition()
        .duration(300)
        .style("opacity", 1)
        // .style("top", `${d.x - d.r - vis.height}px`)
        // .style("left", `${d.y - d.r}px`)
    })
    .on("mousemove", function(d) {
      vis.tooltip
        .style("top", d3.event.pageY - 10 + "px")
        .style("left", d3.event.pageX + 10 + "px");
    })
    .on("mouseout", function(d) {
      vis.tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

    // Remove old data
    // Update axes

}
