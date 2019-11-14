var svg = d3.select("svg"),
  // Margin between the outer box and the first level of circles.
  //margin = 20,
  margin = 0,
  diameter = +svg.attr("width"),
  width = +svg.attr("width"),
  height = +svg.attr("height"),
  g = svg
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var color = d3
  .scaleLinear()
  .domain([-1, 5])
  .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
  .interpolate(d3.interpolateHcl);

var pack = d3
  .pack()
  .size([width - margin, height - margin])
  // For nested circles, the distance between the circle itself and circles inside it.
  .padding(4);

d3.json("data/data.json", function(error, root) {
  if (error) throw error;

  root = d3
    .hierarchy(root)
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
      return Math.random();
    });
  //.sum(function(d) { return 10; });
  //.sort(function(a, b) { return b.value - a.value; });

  var focus = root,
    nodes = pack(root).descendants(),
    view;

  var tooltip = d3
    .select("body")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .text("a simple tooltip");

  var circle = g
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", function(d) {
      // "?" is the ternary operator
      return d.parent
        ? d.children
          ? "node"
          : "node node--leaf"
        : "node node--root";
    })
    .style("fill", function(d) {
      return d.children ? color(d.depth) : null;
    })
    .on("mouseover", function(d) {
      //console.log("d.data.name: " + d.data.name);
      return tooltip.text(d.data.name).style("visibility", "visible");
    })
    .on("mousemove", function() {
      return tooltip
        .style("top", d3.event.pageY - 10 + "px")
        .style("left", d3.event.pageX + 10 + "px");
    })
    .on("mouseout", function() {
      return tooltip.style("visibility", "hidden");
    })
    .on("click", function(d) {
      if (focus !== d) zoom(d), d3.event.stopPropagation();
    });

  var text = g
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", "label")
    .style("fill-opacity", function(d) {
      return d.parent === root ? 1 : 0;
    })
    .style("display", function(d) {
      //return d.parent === root ? "inline" : "none";
      //return d.parent === root ? "inline" : "inline";
      return d.parent === root ? "none" : "none";
    })
    //.text(function(d) { return d.data.name; });
    .text(function(d) {
      return d.data.name;
    });

  var node = g.selectAll("circle,text");

  svg.style("background", color(-1)).on("click", function() {
    zoom(root);
  });

  zoomTo([root.x, root.y, root.r * 2 + margin]);

  function zoom(d) {
    var focus0 = focus;
    focus = d;

    var transition = d3
      .transition()
      .duration(d3.event.altKey ? 7500 : 750)
      .tween("zoom", function(d) {
        var i = d3.interpolateZoom(view, [
          focus.x,
          focus.y,
          focus.r * 2 + margin
        ]);
        return function(t) {
          zoomTo(i(t));
        };
      });

    transition
      .selectAll("text")
      .filter(function(d) {
        //return d.parent === focus || this.style.display === "inline";
        return d.parent === focus || this.style.display === "none";
      })
      .style("fill-opacity", function(d) {
        return d.parent === focus ? 1 : 0;
      })
      .on("start", function(d) {
        //if (d.parent === focus) this.style.display = "inline";
        if (d.parent === focus) this.style.display = "none";
      })
      .on("end", function(d) {
        //if (d.parent !== focus) this.style.display = "none";
        //if (d.parent !== focus) this.style.display = "inline";
        if (d.parent !== focus) this.style.display = "none";
      });
  }

  function zoomTo(v) {
    var k = diameter / v[2];
    view = v;
    node.attr("transform", function(d) {
      return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
    });
    circle.attr("r", function(d) {
      return d.r * k;
    });
  }

  // not used but for wrapping long lines, we hope
  function multiLineText(text, x, y, width, height) {
    return (
      "<switch>\n" +
      '<foreignObject x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      width +
      '" height="' +
      height +
      '">\n' +
      '<p xmlns="http://www.w3.org/1999/xhtml">' +
      text +
      "</p>\n" +
      "</foreignObject>\n" +
      '<text x="' +
      x +
      '" y="' +
      y +
      '">' +
      text +
      "</text>\n" +
      "</switch>\n"
    );
  }
});
