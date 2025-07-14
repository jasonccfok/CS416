function scene3() {
const svg = d3.select("#visualization");
svg.selectAll("*").remove(); // Clear previous scene

// Use the actual SVG dimensions from HTML - adjusted chart proportions
const width = 800;
const height = 400;
const outerRadius = Math.min(width, height) / 2 - 60; // Increased margin from 50 to 60 to prevent overflow
const innerRadius = outerRadius * 0.45; // Increased from 0.35 to 0.45 for better center size
const brandOuterRadius = outerRadius + 35; // Reduced from 60 to 35 to fit within boundaries

// Enhanced color scheme with better contrast
const countryColors = d3.scaleOrdinal([
"#FA8072", // Salmon (China)
"#B47EDE", // Floral
"#40E0D0", // Turkish
"#FFD700", // Gold
"#FF6347", // Tomato
"#4682B4", // Steel Blue
"#20B2AA", // Light Sea Green
"#F0E68C", // Khaki
"#DDA0DD", // Plum
"#87CEEB" // Sky Blue
]);

// Handle slider container - create if it doesn't exist
const vizParent = d3.select("#visualization").node().parentNode;
let sliderContainer = d3.select(vizParent).select(".slider-container");

if (sliderContainer.empty()) {
const containerDiv = document.createElement("div");
containerDiv.className = "slider-container";
containerDiv.style.textAlign = "center";
containerDiv.style.margin = "20px 0";
containerDiv.style.display = "block"; // Ensure it's visible when created
vizParent.insertBefore(containerDiv, d3.select("#visualization").node());
sliderContainer = d3.select(containerDiv);
} else {
// Make sure it's visible if it already exists
sliderContainer.style("display", "block");
}

// Load the data
d3.csv(
"https://raw.githubusercontent.com/jasonccfok/CS416/main/China%20Automobile%20Sales%20Data.csv"
).then(data => {
console.log("Data loaded:", data.length, "records");

// Parse and filter data for EVs
const processedData = data
  .filter(d => d.is_ev && d.is_ev.trim() === "EV")
  .map(d => ({
    date: d3.timeParse("%Y-%m-%d")(d.year_month),
    units_sold: +d.units_sold,
    brand: d.brand ? d.brand.trim() : "Unknown",
    brand_country: d.brand_country ? d.brand_country.trim() : "Unknown",
    model: d.model ? d.model.trim() : "Unknown",  // Add this line
    year_month: d.year_month,
    low_price: +d.low_price || 0,
    high_price: +d.high_price || 0,
    body_type: d.body_type ? d.body_type.trim() : "Unknown"
  }))
  .filter(d => d.date && !isNaN(d.units_sold) && d.units_sold > 0);

console.log("Processed EV data:", processedData.length, "records");

if (processedData.length === 0) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("No EV data available for visualization");
  return;
}

// Get unique body types and sort them
const bodyTypes = ["All", ...Array.from(new Set(processedData.map(d => d.body_type)))  .filter(d => d !== "Unknown")  .sort()];

// Hardcoded date range from 2018-01 to 2023-12
const uniqueDates = [];
for (let year = 2018; year <= 2023; year++) {
  for (let month = 1; month <= 12; month++) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}`;
    uniqueDates.push({
      dateStr,
      date: d3.timeParse("%Y-%m")(dateStr)
    });
  }
}

let currentDateIndex = uniqueDates.length - 1; // Start with latest date (2023-12)
let selectedBodyType = "All"; // Start with all body types

// Clear existing slider content
sliderContainer.selectAll("*").remove();

// Create a flex container for controls - DATE SLIDER FIRST (LEFT), BODY TYPE SECOND (RIGHT)
const controlsContainer = sliderContainer
  .append("div")
  .style("display", "flex")
  .style("justify-content", "center")
  .style("align-items", "center")
  .style("gap", "30px")
  .style("flex-wrap", "wrap")
  .style("margin-bottom", "20px");

// Add date slider container FIRST (will appear on the left)
const dateContainer = controlsContainer
  .append("div")
  .style("display", "flex")
  .style("flex-direction", "column")
  .style("align-items", "center")
  .style("gap", "5px");

dateContainer
  .append("label")
  .style("font-weight", "bold")
  .style("font-size", "14px")
  .html(`Select Date: <span id="selectedDate">${uniqueDates[currentDateIndex].dateStr}</span>`);

const slider = dateContainer
  .append("input")
  .attr("type", "range")
  .attr("min", 0)
  .attr("max", uniqueDates.length - 1)
  .attr("value", currentDateIndex)
  .style("width", "300px")
  .on("input", function() {
    currentDateIndex = +this.value;
    d3.select("#selectedDate").text(uniqueDates[currentDateIndex].dateStr);
    updateChart();
  });

// Add body type filter SECOND (will appear on the right)
const bodyTypeContainer = controlsContainer
  .append("div")
  .style("display", "flex")
  .style("flex-direction", "column")
  .style("align-items", "center")
  .style("gap", "5px");

bodyTypeContainer
  .append("label")
  .style("font-weight", "bold")
  .style("font-size", "14px")
  .text("Filter by Body Type:");

const bodyTypeSelect = bodyTypeContainer
  .append("select")
  .style("padding", "5px 10px")
  .style("font-size", "14px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("background-color", "white")
  .on("change", function() {
    selectedBodyType = this.value;
    updateChart();
  });

bodyTypeSelect
  .selectAll("option")
  .data(bodyTypes)
  .enter()
  .append("option")
  .attr("value", d => d)
  .text(d => d);

// Add chart container
const chartGroup = svg
  .append("g")
  .attr("transform", `translate(${width / 2}, ${height / 2})`);

// Add center text with line breaks and slightly larger font for the enlarged chart
const centerTextGroup = chartGroup
  .append("g")
  .attr("class", "center-title");

centerTextGroup
  .append("text")
  .attr("text-anchor", "middle")
  .attr("dy", "-0.3em")
  .style("font-size", "16px") // Increased from 14px
  .style("font-weight", "bold")
  .style("fill", "#333")
  .text("EV Market");

centerTextGroup
  .append("text")
  .attr("text-anchor", "middle")
  .attr("dy", "0.7em")
  .style("font-size", "16px") // Increased from 14px
  .style("font-weight", "bold")
  .style("fill", "#333")
  .text("Shares");

// Tooltip setup
let tooltip = d3.select("body").select(".tooltip");
if (tooltip.empty()) {
  tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");
}

tooltip
  .style("position", "absolute")
  .style("background", "white")
  .style("color", "black")
  .style("border", "1px solid #ccc")
  .style("border-radius", "6px")
  .style("padding", "10px")
  .style("font-size", "12px")
  .style("pointer-events", "none")
  .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
  .style("opacity", 0);

// Function to update chart based on selected date and body type
function updateChart() {
  const selectedDate = uniqueDates[currentDateIndex].dateStr;
  
  // Filter by date first
  let selectedMonthData = processedData.filter(d => 
    d3.timeFormat("%Y-%m")(d.date) === selectedDate
  );

  // Then filter by body type if not "All"
  if (selectedBodyType !== "All") {
    selectedMonthData = selectedMonthData.filter(d => d.body_type === selectedBodyType);
  }

  console.log(`Selected date: ${selectedDate}, Body type: ${selectedBodyType}, Data points: ${selectedMonthData.length}`);

  if (selectedMonthData.length === 0) {
    chartGroup.selectAll(".country-slice, .brand-slice, .country-label, .brand-label").remove();
    
    // Show "No data" message
    chartGroup.selectAll(".no-data-text").remove();
    chartGroup
      .append("text")
      .attr("class", "no-data-text")
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#666")
      .text(`No data available for ${selectedBodyType === "All" ? "any body type" : selectedBodyType} in ${selectedDate}`);
    
    return;
  } else {
    // Remove "no data" message if it exists
    chartGroup.selectAll(".no-data-text").remove();
  }

  const totalUnits = d3.sum(selectedMonthData, d => d.units_sold);

  // Aggregate data by brand_country and sort descendingly
  const brandCountryData = d3.rollups(
    selectedMonthData,
    v => {
      const units_sold = d3.sum(v, d => d.units_sold);
      const validPrices = v.filter(d => d.low_price > 0 && d.high_price > 0);
      const low_price = validPrices.length > 0 ? d3.min(validPrices, d => d.low_price) : 0;
      const high_price = validPrices.length > 0 ? d3.max(validPrices, d => d.high_price) : 0;
      return { units_sold, low_price, high_price };
    },
    d => d.brand_country
  )
    .map(([brand_country, data]) => ({
      brand_country,
      units_sold: data.units_sold,
      low_price: data.low_price,
      high_price: data.high_price,
      market_share: data.units_sold / totalUnits,
    }))
    .sort((a, b) => d3.descending(a.units_sold, b.units_sold));

  // Create hierarchical data structure for brands within countries
  const hierarchicalData = [];
  let currentAngle = 0;
  
  brandCountryData.forEach((country, countryIndex) => {
    // Get brands for this country and sort them descendingly
    const countryBrands = d3.rollups(
      selectedMonthData.filter(d => d.brand_country === country.brand_country),
      v => {
        const units_sold = d3.sum(v, d => d.units_sold);
        const validPrices = v.filter(d => d.low_price > 0 && d.high_price > 0);
        const low_price = validPrices.length > 0 ? d3.min(validPrices, d => d.low_price) : 0;
        const high_price = validPrices.length > 0 ? d3.max(validPrices, d => d.high_price) : 0;
        return { units_sold, low_price, high_price };
      },
      d => d.brand
    )
      .map(([brand, data]) => ({
        brand,
        brand_country: country.brand_country,
        units_sold: data.units_sold,
        low_price: data.low_price,
        high_price: data.high_price,
        market_share: data.units_sold / totalUnits,
        countryIndex
      }))
      .sort((a, b) => d3.descending(a.units_sold, b.units_sold));

    // Calculate angles for this country
    const countryAngleSize = (country.units_sold / totalUnits) * 2 * Math.PI;
    
    // Add country data
    country.startAngle = currentAngle;
    country.endAngle = currentAngle + countryAngleSize;
    country.countryIndex = countryIndex;
    
    // Calculate brand positions within this country's segment
    let brandAngleStart = currentAngle;
    countryBrands.forEach(brand => {
      const brandAngleSize = (brand.units_sold / totalUnits) * 2 * Math.PI;
      brand.startAngle = brandAngleStart;
      brand.endAngle = brandAngleStart + brandAngleSize;
      brandAngleStart += brandAngleSize;
      hierarchicalData.push(brand);
    });
    
    currentAngle += countryAngleSize;
  });

  // Helper function to format price range
  function formatPriceRange(low, high) {
    if (low > 0 && high > 0) {
      return `RMB ${Math.round(low)} to ${Math.round(high)}`;
    }
    return "Price not available";
  }

  // Create arc generators
  const countryArc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const brandArc = d3.arc()
    .innerRadius(outerRadius + 5) // Reduced spacing back to 5
    .outerRadius(brandOuterRadius);

  // Update country slices
  const countrySlices = chartGroup
    .selectAll(".country-slice")
    .data(brandCountryData, d => d.brand_country);

  countrySlices.exit().remove();

  countrySlices
    .enter()
    .append("path")
    .attr("class", "country-slice")
    .merge(countrySlices)
    .attr("d", d => countryArc({
      startAngle: d.startAngle,
      endAngle: d.endAngle
    }))
    .attr("fill", d => countryColors(d.countryIndex))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mouseover", function (event, d) {
      // Count distinct brands (automakers) for this country
      const distinctBrands = new Set(selectedMonthData
        .filter(item => item.brand_country === d.brand_country)
        .map(item => item.brand)).size;
        
      // Create table format tooltip
      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 5px;">
            ${d.brand_country}
          </div>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Units Sold:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${d3.format(",")(d.units_sold)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Market Share:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${d3.format(".1%")(d.market_share)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Automakers:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${distinctBrands}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; font-weight: bold;">Price Range:</td>
              <td style="padding: 2px 0 2px 8px;">${formatPriceRange(d.low_price, d.high_price)}</td>
            </tr>
            ${selectedBodyType !== "All" ? `
            <tr>
              <td style="padding: 2px 8px 2px 0; font-weight: bold;">Body Type:</td>
              <td style="padding: 2px 0 2px 8px;">${selectedBodyType}</td>
            </tr>
            ` : ""}
          </table>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 10}px`);
    })
    .on("mouseout", function () {
      tooltip
        .style("opacity", 0);
    });

  // Update brand slices
  const brandSlices = chartGroup
    .selectAll(".brand-slice")
    .data(hierarchicalData, d => d.brand);

  brandSlices.exit().remove();

  brandSlices
    .enter()
    .append("path")
    .attr("class", "brand-slice")
    .merge(brandSlices)
    .attr("d", d => brandArc({
      startAngle: d.startAngle,
      endAngle: d.endAngle
    }))
    .attr("fill", d => {
      const baseColor = countryColors(d.countryIndex);
      return d3.color(baseColor).brighter(0.3);
    })
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .on("mouseover", function (event, d) {
      // Count distinct models for this brand
      const distinctModels = new Set(selectedMonthData
        .filter(item => item.brand === d.brand)
        .map(item => item.model)).size;
        
      // Create table format tooltip
      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 5px;">
            ${d.brand}
          </div>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Country:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${d.brand_country}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Units Sold:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${d3.format(",")(d.units_sold)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Market Share:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${d3.format(".1%")(d.market_share)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; border-bottom: 1px solid #eee; font-weight: bold;">Models Offered:</td>
              <td style="padding: 2px 0 2px 8px; border-bottom: 1px solid #eee;">${distinctModels}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0; font-weight: bold;">Price Range:</td>
              <td style="padding: 2px 0 2px 8px;">${formatPriceRange(d.low_price, d.high_price)}</td>
            </tr>
            ${selectedBodyType !== "All" ? `
            <tr>
              <td style="padding: 2px 8px 2px 0; font-weight: bold;">Body Type:</td>
              <td style="padding: 2px 0 2px 8px;">${selectedBodyType}</td>
            </tr>
            ` : ""}
          </table>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 10}px`);
    })
    .on("mouseout", function () {
      tooltip
        .style("opacity", 0);
    });

  // Update country labels with larger font for the enlarged chart
  const countryLabels = chartGroup
    .selectAll(".country-label")
    .data(brandCountryData, d => d.brand_country);

  countryLabels.exit().remove();

  countryLabels
    .enter()
    .append("text")
    .attr("class", "country-label")
    .merge(countryLabels)
    .attr("transform", d => {
      const angle = (d.startAngle + d.endAngle) / 2;
      const labelRadius = (innerRadius + outerRadius) / 2;
      const x = Math.cos(angle - Math.PI / 2) * labelRadius;
      const y = Math.sin(angle - Math.PI / 2) * labelRadius;
      return `translate(${x}, ${y})`;
    })
    .attr("text-anchor", "middle")
    .style("font-size", "11px") // Increased from 10px
    .style("font-weight", "bold")
    .style("fill", "black")
    .text(d => d.market_share > 0.05 ? d.brand_country : "");

  // Update brand labels with larger font for the enlarged chart
  const brandLabels = chartGroup
    .selectAll(".brand-label")
    .data(hierarchicalData, d => d.brand);

  brandLabels.exit().remove();

  brandLabels
    .enter()
    .append("text")
    .attr("class", "brand-label")
    .merge(brandLabels)
    .attr("transform", d => {
      const angle = (d.startAngle + d.endAngle) / 2;
      const labelRadius = (outerRadius + 5 + brandOuterRadius) / 2; // Updated spacing
      const x = Math.cos(angle - Math.PI / 2) * labelRadius;
      const y = Math.sin(angle - Math.PI / 2) * labelRadius;
      return `translate(${x}, ${y})`;
    })
    .attr("text-anchor", "middle")
    .style("font-size", "10px") // Increased from 9px
    .style("font-weight", "normal")
    .style("fill", "black")
    .text(d => d.market_share > 0.02 ? d.brand : "");
}

// Initialize chart with latest date and all body types
updateChart();
}).catch(error => {
console.error("Error loading data:", error);
svg.append("text")
.attr("x", width / 2)
.attr("y", height / 2)
.attr("text-anchor", "middle")
.style("font-size", "16px")
.style("fill", "red")
.text("Error loading data. Please check the data source.");
});
}