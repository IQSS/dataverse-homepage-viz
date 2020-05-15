/*
 * Slider - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the plot
 * @param _data						-- the dataset
 */
VisSlider = function(_parentElement, _data){
  this.parentElement = _parentElement;
  this.data = _data;

  this.initVis();
}

VisSlider.prototype.initVis = function() {
  let vis = this;

  var tickValues = [30, 90, 180, 365]

  var totalWidth = document.getElementById(vis.parentElement).offsetWidth
  vis.width = totalWidth;
  vis.height = 42;

  vis.svg = d3.select("#" + vis.parentElement).append("text")
    .text("Jan 01, 2018 - Dec 31, 2018")
    .attr("style", "margin-left:5px;")
    .append("svg")
    .attr("class", "slider-svg")
    .attr("id", "slider-svg-id")
    .attr("viewBox", `0 0 ${vis.width} ${vis.height}`)
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", `translate(15,10)`);

  let slider = d3.sliderBottom()
    .min(d3.min(tickValues))
    .max(d3.max(tickValues))
    .default(30)
    .width(329)
    .marks(tickValues)
    .tickValues(tickValues)
    .fill('#b0c9d0')
    .on("onchange", val => {
      d3.event.sourceEvent.stopPropagation();
      sliderChanged(val)
    });

  vis.svg.call(slider)
    .selectAll(".axis .tick text, .slider .parameter-value text")
    .attr("font-size", 12)
    .attr("dy", 0)
}
