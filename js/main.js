var allData = {};
var circlepack;
var slider;

async function loadData(){

  const getConfig = await fetch('config.json');
  const config = await getConfig.json();

  d3.json(config.datafile, function(error, data) {
    if (error){
      throw error;
    } else {
      allData = data;
      createVis();
    }
  });
}

function createVis(){
  // console.log("createVis");
  circlepack = new Circlepack("circlepack", allData);
  slider = new VisSlider("slider", allData);
}

function sliderChanged(value) {
  // console.log("called sliderChanged: " + value)
  circlepack.wrangleData(value)
}

function onresize() {
  // console.log("WINDOW RESIZED TO WIDTH " + window.innerWidth)
  // console.log("WINDOW RESIZED TO WIDTH/2 " + window.innerWidth/2)
  // tell circlepack to redraw tooltip
  circlepack.resetTooltip();

  // var totalWidth = document.getElementById(circlepack.parentElement).offsetWidth
  // console.log("totalWidth: " + totalWidth)
  // circlepack.width = totalWidth - circlepack.margin.left - circlepack.margin.right;
  // circlepack.height = 450 - circlepack.margin.left - circlepack.margin.right;
  // circlepack.svg.attr("viewBox", `0 0 ${circlepack.width} ${circlepack.height}`)
}

window.addEventListener("resize", onresize);

// Start vis application
loadData();
