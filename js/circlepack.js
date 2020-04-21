/*
 * Circlepack - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the plot
 * @param _data						-- the dataset
 */
Circlepack = function(_parentElement, _data){
	this.parentElement = _parentElement;
	this.data = _data;
	this.displayData = {};
	this.nodeSelected; // the current circle node that is selected

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
   vis.margin = { top: 0, right: 0, bottom: 0, left: 0 };

   var totalWidth = document.getElementById(vis.parentElement).offsetWidth
  // console.log("totalWidth: " + totalWidth)
   vis.width = totalWidth - vis.margin.left - vis.margin.right;
   vis.height = 450 - vis.margin.left - vis.margin.right;
   vis.diameter = vis.width;

   vis.svg = d3.select("#" + vis.parentElement).append("svg")
      .attr("class", "vis-svg")
      .attr("id", "vis-svg-id")
      // .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${vis.width} ${vis.height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
	    // .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

   // Scales and axes

   // Color scale
   vis.color = d3
     .scaleLinear()
     .domain([-1, 5])
     .range(["hsl(38,76%,80%)", "hsl(38,76%,33%)"])
     .interpolate(d3.interpolateHcl);

  // Legend

  // Tooltip
  // References: https://github.com/caged/d3-tip/blob/master/examples/arrow-styles.html
  vis.tip = d3.tip()
    .attr("class", "tooltip")
    .attr("id", "tooltip-id")
    .offset([-5,12])
    .direction('e')
    .html(function(d) {
      return vis.formatTooltip(d)
    })
    vis.svg.call(vis.tip);

   vis.wrangleData();
}

 /*
 *  Data wrangling
 */
Circlepack.prototype.wrangleData = function(sliderMax = null){
  var vis = this;
  console.log("================ wrangleData =================");

  // first make another copy of vis.data using spread operator
  vis.displayData = { ...vis.data };
  // console.log("--- vis.displayData.children.length ---" + vis.displayData.children.length)

  //Filter data
  // first filter for only the data we need to display based on slider value,
  // then feed it through further transformations
  var filteredChildren = vis.displayData.children.filter(child => sliderMax ? child.diff <= sliderMax : true)
  vis.displayData.children = filteredChildren;

  // console.log("--- filteredChildren.length ---" + filteredChildren.length)
  // console.log(filteredChildren)

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

  vis.root = d3
    .hierarchy(vis.displayData)
    .sum(function(d) {
      //return d.size;
      return 10;
    })
    .sort(function(a, b) {
      b_diff = b.data.diff === undefined ? 0 : b.data.diff
      a_diff = a.data.diff === undefined ? 0 : a.data.diff
      return a_diff - b_diff;
      //"The specified function is passed two nodes a and b to compare.
      // If a should be before b, the function must return a value less than zero;
      // if b should be before a, the function must return a value greater than zero;"
      // -- https://github.com/d3/d3-hierarchy#node_sort
    });

  // console.log(vis.root)

  // Config pack function
  vis.pack = d3.pack()
    .size([vis.width, vis.height])
    // For nested circles, the padding between tangent circles
    .padding(4);
  // Invoke pack function
  vis.nodes = vis.pack(vis.root).descendants();

  // console.log("--- vis.nodes ---")
  // console.log(vis.nodes)
  vis.updateVis();
}

/*
 *  The drawing function
 */
Circlepack.prototype.updateVis = function(){
  var vis = this;

  // global click handler
  d3.select("body")
    .on("click", function(){
      // reset any tooltips if target we clicked on is not a circle
      // this check is not strictly necessary since we call d3.event.stopPropagation() in the circle click handler below
      // however, I'm including it here in case we want to allow circle clicks to propagate to the svg body in the future
      if (d3.event.target.nodeName !== 'circle') {
          vis.resetTooltip()
      }
    });

  vis.circles = vis.svg.selectAll("circle")
    .data(vis.nodes);

  vis.circles.enter()
    .append("circle")
    .attr("class", function(d) {
      // "?" is the ternary operator
      return d.parent
        ? d.children
          ? "node"
          : "node node--leaf"
        : "node node--root";
    })
    .attr("r", d => d.r)
    .attr("transform", function(d){
      return `translate(${d.x}, ${d.y})`;
    })
    .style("fill", function(d){
      return d.children ? vis.color(d.depth) : 'white';
    })
    .on("mouseover", function(d) {
      // only show tooltip on hover if none are selected
      // console.log('showing what this is')
      // console.log(this)

      var circle = this;
      var circleSelect = d3.select(this)
      var circleX = d.x;

      // console.log(`getBBox:`);
      // console.log(circle.getBBox())

      if (!vis.nodeSelected) {
        if (showWestwardTooltip(circleX, circleSelect)) {
          vis.tip.hide(d)
            .direction('w').offset([-5,-12])
            .show(d)
        }  else {
          vis.tip.hide(d)
            .direction('e').offset([-5,12])
            .show(d)
        }
      }
      // always show outline on hover
      d3.select(this)
        .attr("stroke-width", "1.5px")
        .attr("stroke", "#000")
    })
    .on("mouseout", function(d) {
      if (vis.nodeSelected !== this) {
        // set stroke to none on mouseout if not mousing over a selected node and nothing is selected
        d3.select(this)
          .attr("stroke", "none")
        // only hide tooltip if no node is selected
        if (!vis.nodeSelected) vis.tip.hide(d);
      }
    })
    .on("click", function(d) {
      var circle = this;
      if (!vis.nodeSelected) {
        // if clicking a node and nothing is selected, select it and show tooltip
        vis.nodeSelected = this;
        vis.tip.hide(d).show(d);
        d3.select(this)
          .attr("stroke-width", '1.5px')
          .attr("stroke", "#000")

      } else if (vis.nodeSelected === this) {
        // if clicking a node that is already selected, unselect it and hide tooltip
        vis.resetTooltip()

      } else if (vis.nodeSelected && vis.nodeSelected !== this) {
        // if clicking a node and a different node is already selected, unselect it and select this one
        var previous = vis.nodeSelected
        d3.select(previous)
          .attr("stroke", 'none')
        vis.tip.hide(d).show(d);
        vis.nodeSelected = this;
        d3.select(this)
          .attr("stroke-width", '1.5px')
          .attr("stroke", "#000")
      }
      // blocks circle clicks from propagating to the global click event handler at the top of updateVis method
      d3.event.stopPropagation()
    })
    .merge(vis.circles) // update vis with new data
    // .transition(t)
    .attr("class", function(d) {
      // "?" is the ternary operator
      return d.parent
        ? d.children
          ? "node"
          : "node node--leaf"
        : "node node--root";
    })
    .attr("r", d => d.r)
    .attr("transform", function(d){
      return `translate(${d.x}, ${d.y})`;
    })
    .style("fill", function(d){
      return d.children ? vis.color(d.depth) : 'white';
    })

  // Remove old data
  vis.circles.exit().remove();

  // Update axes

}


//////////////////////////////////////////
/*            HELPER METHODS            */
//////////////////////////////////////////

// Parse a string with the format "2018-11-12 08:45:41.549" into a Javascript Date object
var parseDateTime = d3.timeParse("%Y-%m-%d %H:%M:%S.%L");

// Format date objects like: Jan 30, 2020
var formatDate = d3.timeFormat("%b %e, %Y");

// Set the transition duration
// Usage: d3.select("circle").transition(t)
var t = d3.transition()
  .duration(500)

/*
 * @param node -- circlepack hierarchy node
 * @return boolean -- true if node is a dataset
 */
function isDataset(node) {
  // if node does not have a parent, it must be the root node
  if(!node.parent) return false
  // if node has no children, it is a dataset
  return !node.children
}

/*
 * @param node -- circlepack hierarchy node
 * @return boolean -- true if node is a dataverse
 */
function isDataverse(node) {
  // if node does not have a parent, it must be the root node
  if(!node.parent) return false
  // if node has children, it is a dataverse
  return node.children
}

/*
 * @param node -- circlepack hierarchy node
 * @return boolean -- true if node is the root node
 */
function isRootNode(node) {
  // if node does not have a parent, it must be the root node
  return !node.parent
}

/*
 * @param circleX -- circle x position
 * @param circleSelection -- d3 selection of a circlepack hierarchy node; eg. var circleSelection = d3.select(this)
 * @return boolean -- true if we want to show a westward tooltip
 */
function showWestwardTooltip(circleX, circleSelection) {
  // show westward tooltip if circle x is far enough to the right of the screen
  var TOOLTIP_BUFFER = 0;
  var MAX_TOOLTIP_WIDTH = 350;
  var TOOLTIP_X_LIMIT = document.documentElement.clientWidth - TOOLTIP_BUFFER - MAX_TOOLTIP_WIDTH - circleSelection.attr("r");
  // console.log(`TOOLTIP_X_LIMIT = ${document.documentElement.clientWidth} - ${TOOLTIP_BUFFER} - ${MAX_TOOLTIP_WIDTH} - ${circleSelection.attr("r")}`)
  // console.log(`${circleX} >= ${TOOLTIP_X_LIMIT} ?`)

  // .direction(function(d) { return vis.direction })
  // .offset(function(d){
  //   // console.log("current direction: " + vis.direction)
  //   // console.log(d)
  //   if (vis.direction == 'n') { return [-12,-5] }
  //   else if (vis.direction =='s') { return [12,-5] }
  //   else if (vis.direction =='e') { return [-5,12] }
  //   else if (vis.direction =='w') { return [-5,-12] }
  // })

  return circleX >= TOOLTIP_X_LIMIT;
}


Circlepack.prototype.resetTooltip = function(d) {
  var vis = this
  d3.select(vis.nodeSelected)
    .attr("stroke", 'none')
  vis.nodeSelected = undefined;
  vis.tip.hide();
}

/*
 * @param d -- circlepack hierarchy node
 * @return String -- string containing html text that will be displayed on the tooltip
 */
Circlepack.prototype.formatTooltip = function(d) {
  var title_html = ''
  var children_html = ''
  var style_tag = ''

  /*temporary for debugging:*/
  var diff = `<div class="tooltip-diff">${d.data.diff}</div>`

  // if date is present parse string as a Date and format it
  var date_label = d.data.date ? formatDate(parseDateTime(d.data.date)) : 'Date unknown'
  var date_html = `<div class="tooltip-date">${date_label}</div>`
  var title_link = d.data.link

  // if current node you're hovering over is a dataset, construct dataset title only
  if (isDataset(d)) {
    title_html = `<div class="tooltip-dataset tooltip-title"><a href="${title_link}" target="_blank">${d.data.name}</a></div>`

  // else if it's a dataverse, construct a dataverse title and add children to the description section
  } else if (isDataverse(d)) {
    title_html = `<div class="tooltip-dataverse tooltip-title"><a href="${title_link}" target="_blank">${d.data.name}</a></div>`
    children_html = children_html.concat(`<ul>`)

    // if dataverse has more than 5 children show link to all datasets
    if (d.children.length > 5) {
      style_tag = "tooltip-dataset"
      children_html = children_html.concat(`<li class="${style_tag} tooltip-desc"><a href="${title_link}" target="_blank">All datasets</a></li>`)

    } else {
      // else show all children
      d.children.forEach(child => {
        if (isDataset(child)) {
          style_tag = "tooltip-dataset"
        } else if (isDataverse(child)) {
          style_tag = "tooltip-dataverse"
        }
        children_html = children_html.concat(`<li class="${style_tag} tooltip-desc"><a href="${child.data.link}" target="_blank">${child.data.name}</a></li>`)
      })
    }
    children_html = children_html.concat(`</ul>`)
  }
  return '<div class="tooltip-details">' + title_html + date_html + children_html + diff + '</div">'
}

