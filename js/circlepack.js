/*
 * Circlepack - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the plot
 * @param _data						-- the dataset
 */
Circlepack = function(_parentElement, _data){
	this.parentElement = _parentElement;
	this.data = _data;
	this.initVis();
	this.nodeSelected; // the current node that is selected
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
   vis.width = 2100 - vis.margin.left - vis.margin.right;
   vis.height = 600 - vis.margin.left - vis.margin.right;
   vis.diameter = vis.width;

   vis.svg = d3.select("#" + vis.parentElement).append("svg")
      .attr("class", "vis-svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
	    .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        // .attr("transform", "translate(" + vis.width / 2 + "," + vis.height / 2 + ")");
	       .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

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
    .offset([0,10])
    .direction('e')
    .html(function(d) {
      return vis.formatTooltip(d)
    });
    vis.svg.call(vis.tip);

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

  vis.root = d3
    .hierarchy(vis.data)
    .sum(function(d) {
      //return d.size;
      return 10;
    })
    .sort(function(a, b) {
        //TODO: handle *.data.diff is undefined
        b_diff = b.data.diff
        a_diff = a.data.diff
        return a_diff - b_diff;
        //"The specified function is passed two nodes a and b to compare.
        // If a should be before b, the function must return a value less than zero;
        // if b should be before a, the function must return a value greater than zero;"
        // -- https://github.com/d3/d3-hierarchy#node_sort
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
  var vis = this;

  vis.circles = vis.svg.selectAll("circle")
    .data(vis.nodes);

  vis.circles.enter()
    .append("circle")
    .attr("r", d => d.r)
    .attr("transform", function(d){
        return `translate(${d.x}, ${d.y})`;
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
      // only show tooltip if nothing is selected
      if (!vis.nodeSelected) vis.tip.hide(d).show(d)
      // always show outline
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
      if (!vis.nodeSelected) {
        // if clicking a node and nothing is selected, select it and show tooltip
        vis.nodeSelected = this;
        vis.tip.hide(d).show(d);
        d3.select(this)
          .attr("stroke-width", '1.5px')
          .attr("stroke", "#000")

      } else if (vis.nodeSelected === this) {
        // if clicking a node that is already selected, unselect it and hide tooltip
        vis.nodeSelected = undefined;
        vis.tip.hide(d);
        d3.select(this)
          .attr("stroke", 'none')

      } else if (vis.nodeSelected && vis.nodeSelected !== this) {
        // if clicking a node and a different node is already selected, unselect it and select this one
        var previous = vis.nodeSelected
        vis.nodeSelected = this;
        vis.tip.hide(d).show(d);
        d3.select(previous)
          .attr("stroke", 'none')
        d3.select(this)
          .attr("stroke-width", '1.5px')
          .attr("stroke", "#000")
      }
    })

    // Remove old data
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

