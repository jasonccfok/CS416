// Define dimensions and margins
const width = 800;
const height = 400;
const margin = { top: 20, right: 30, bottom: 30, left: 40 };

// Append an SVG element to the page
const svg = d3
  .select("#visualization")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Example dataset
const data = [
  { category: "A", value: 30 },
  { category: "B", value: 80 },
  { category: "C", value: 45 },
  { category: "D", value: 60 },
  { category: "E", value: 20 },
  { category: "F", value: 90 },
  { category: "G", value: 55 }
];

// Scales
const x = d3.scaleBand()
  .domain(data.map(d => d.category))
  .range([0, width - margin.left - margin.right])
  .padding(0.1);

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .range([height - margin.top - margin.bottom, 0]);

// Add axes
svg.append("g")
  .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
  .call(d3.axisBottom(x));

svg.append("g")
  .call(d3.axisLeft(y));

// Tooltip
const tooltip = d3.select(".tooltip");

// Add bars
svg.selectAll(".bar")
  .data(data)
  .enter()
  .append("rect")
  .attr("class", "bar")
  .attr("x", d => x(d.category))
  .attr("y", d => y(d.value))
  .attr("width", x.bandwidth())
  .attr("height", d => height - margin.top - margin.bottom - y(d.value))
  .attr("fill", "steelblue")
  .on("mouseover", (event, d) => {
    tooltip
      .style("opacity", 1)
      .html(`Category: ${d.category}<br>Value: ${d.value}`)
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY + 10}px`);
  })
  .on("mouseout", () => {
    tooltip.style("opacity", 0);
  });