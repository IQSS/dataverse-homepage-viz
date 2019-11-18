var allData = {};
var circlepack;

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
  console.log("createVis");
  circlepack = new Circlepack("circlepack", allData);
}

// Start vis application
loadData();
