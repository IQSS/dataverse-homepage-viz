var allData = {};
var circlepack;

function loadData(){
  d3.json("data/data_big.json", function(error, data) {
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
