/*
 * Slider - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the plot
 * @param _data						-- the dataset
 */
VisSlider = function(_parentElement, _data){
  this.parentElement = _parentElement;
  // this.svg = _svgElement;
  this.data = _data;

  this.initVis();
}


VisSlider.prototype.initVis = function() {
  let vis = this;

  vis.margin = { top: 10, right: 10, bottom: 10, left: 20 };

  var tickValues = [30, 90, 180, 365]

  var totalWidth = document.getElementById(vis.parentElement).offsetWidth
  vis.width = totalWidth - vis.margin.left - vis.margin.right;
  vis.height = 100 - vis.margin.left - vis.margin.right;

  vis.svg = d3.select("#" + vis.parentElement).append("svg")
    .attr("class", "slider-svg")
    .attr("id", "slider-svg-id")
    .attr("viewBox", `0 0 ${vis.width/1.5} ${vis.height}`)
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

  let slider = d3.sliderBottom()
    .min(d3.min(tickValues))
    .max(d3.max(tickValues))
    .default(365)
    .width(300)
    .height(20)
    .marks(tickValues)
    .tickValues(tickValues)
    .fill('#b0c9d0') //#d4dfe2 //rgb(199, 217, 222) //rgb(176, 201, 208)
    .on("onchange", val => {
      d3.event.sourceEvent.stopPropagation();
      sliderChanged(val)
    });

  var gTime = vis.svg.call(slider)

}
