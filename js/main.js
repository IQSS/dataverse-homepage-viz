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
  circlepack.wrangleData(value)
}

function onresize() {
  // tell circlepack to reset the tooltip
  circlepack.resetTooltip();
}

window.addEventListener("resize", onresize);

// Start vis application
loadData();
