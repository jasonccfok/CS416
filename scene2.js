function scene2() {
  const svg = d3.select("#visualization");
  svg.selectAll("*").remove(); // Clear previous scene

  const width = 800;
  const height = 400;
  const margin = { top: 70, right: 30, bottom: 70, left: 100 };

  // Load the CSV file from GitHub
  d3.csv(
    "https://raw.githubusercontent.com/jasonccfok/CS416/main/China%20Automobile%20Sales%20Data.csv"
  ).then(data => {
    // Parse the data: filter EVs, extract date, and ensure "units_sold" is numeric
    data = data
      .filter(d => d.is_ev.trim() === "EV") // Filter only EVs
      .map(d => ({
        date: d3.timeParse("%Y-%m-%d")(d.year_month), // Parse the date
        units_sold: +d.units_sold,                   // Convert "units_sold" to number
        brand_country: d.brand_country.trim(),       // Trim "brand_country" values
        brand: d.brand.trim(),                       // Add brand field
      }));

    // Filter data to keep only dates between Jan 2018 and Dec 2023
    const filteredData = data.filter(
      d =>
        d.date >= new Date(2018, 0, 1) && // Jan 1, 2018
        d.date <= new Date(2023, 11, 31)  // Dec 31, 2023
    );

    // Summarize data for stacking
    const summarizedData = d3.rollups(
      filteredData,
      v => {
        const chinaData = v.filter(d => d.brand_country === "China");
        const chinaUnits = d3.sum(chinaData, d => d.units_sold);
        const chinaBrands = new Set(chinaData.map(d => d.brand)).size;
        
        const others = d3.rollups(
          v.filter(d => d.brand_country !== "China"), // Non-China countries
          group => ({
            units: d3.sum(group, d => d.units_sold),
            brands: new Set(group.map(d => d.brand)).size
          }),
          d => d.brand_country                        // Group by brand_country
        ).map(([country, data]) => ({ country, units: data.units, brands: data.brands }));

        const othersUnits = d3.sum(others, d => d.units); // Total "Others" units
        const totalUnits = chinaUnits + othersUnits;
        const chinaMarketShare = totalUnits > 0 ? chinaUnits / totalUnits : 0;
        
        return { 
          China: chinaUnits, 
          chinaBrands: chinaBrands,
          Others: others, 
          othersUnits,
          totalUnits,
          chinaMarketShare
        };
      },
      d => d3.timeFormat("%Y-%m")(d.date) // Group by year-month string
    ).map(([month, values]) => ({
      month: d3.timeParse("%Y-%m")(month), // Convert back to Date object
      ...values,
    }));

    // Sort the data by date
    summarizedData.sort((a, b) => d3.ascending(a.month, b.month));

    // Set up scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(summarizedData, d => d.month)) // Extent of dates (min to max)
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(summarizedData, d => (d.China + d.othersUnits) / 1e6)]) // Total units sold in millions
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Stack generator for area chart
    const stack = d3
      .stack()
      .keys(["China", "Others"]); // Stack the China and Others categories

    const stackedData = stack(
      summarizedData.map(d => ({
        month: d.month,
        China: d.China,
        Others: d.othersUnits, // Total "Others" units
      }))
    );

    // Define the area generator
    const area = d3
      .area()
      .x(d => x(d.data.month))
      .y0(d => y(d[0] / 1e6)) // Start of the stack (in millions)
      .y1(d => y(d[1] / 1e6)); // End of the stack (in millions)

    // Add tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid lightgray")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("visibility", "hidden")
      .style("font-size", "12px")
      .style("text-align", "left")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("z-index", "1000")
      .style("max-width", "300px"); // Added max-width to make tooltip narrower

    // Draw x-axis (at the bottom)
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`) // Bottom of the graph
      .call(
        d3.axisBottom(x)
          .ticks(d3.timeYear.every(1)) // Show ticks for every January
          .tickFormat(d => (d.getMonth() === 0 ? d.getFullYear() : "")) // Display year only for January
      )
      .selectAll("text")
      .style("font-size", "14px") // Enlarge tick labels
      .style("text-anchor", "start") // Left align the labels
      .attr("transform", "translate(5,0)"); // Add spacing for better alignment

    // Add x-axis label
    svg
      .append("text")
      .attr("x", margin.left) // Align horizontally
      .attr("y", height - 30)
      .attr("fill", "black")
      .style("text-anchor", "start")
      .style("font-size", "16px")
      .text("Year");

    // Draw y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d => `${d}`)) // Display y-axis in millions
      .selectAll("text")
      .style("font-size", "14px"); // Enlarge tick labels

    // Add y-axis label
    svg
      .append("text")
      .attr("x", margin.left) // Align horizontally above the y-axis
      .attr("y", margin.top - 20) // Position slightly above the y-axis
      .attr("fill", "black")
      .style("text-anchor", "middle") // Horizontally center-align the text
      .style("font-size", "16px") // Enlarge axis label
      .text("EV Units Sold (Millions)");

    // Draw the stacked area chart
    svg
      .selectAll(".area")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", "area")
      .attr("d", area)
      .attr("fill", (d, i) => (i === 0 ? "Salmon" : "#50C878")) // Salmon for China, Emerald for Others
      .attr("opacity", 0.7);

    // Add tooltip interaction for data points
    svg
      .selectAll(".tooltip-circle")
      .data(summarizedData)
      .enter()
      .append("circle")
      .attr("class", "tooltip-circle")
      .attr("cx", d => x(d.month))
      .attr("cy", d => y((d.China + d.othersUnits) / 1e6))
      .attr("r", 5)
      .attr("fill", "transparent")
      .on("mouseover", function (event, d) {
        const othersBreakdown = d.Others.map(
          o =>
            `<tr>
              <td>${o.country}</td>
              <td>${o.brands}</td>
              <td>${d3.format(",")(o.units)}</td>
              <td>${d3.format(".1%")(o.units / (d.China + d.othersUnits))}</td>
            </tr>`
        ).join("");
        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>${d3.timeFormat("%Y-%m")(d.month)}</strong><br><br>` +
            `<table>
              <thead>
                <tr>
                  <th>Automaker Country</th>
                  <th>Number of Automakers</th>
                  <th>Units Sold</th>
                  <th>Market Share</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>China</td>
                  <td>${d.chinaBrands}</td>
                  <td>${d3.format(",")(d.China)}</td>
                  <td>${d3.format(".1%")(d.China / (d.China + d.othersUnits))}</td>
                </tr>
                ${othersBreakdown}
              </tbody>
            </table>`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      });

    // Event information array
    const events = [
      {
        date: new Date(2018, 3, 17), // April 17, 2018
        dateStr: "April 17, 2018",
        event: "The National Development and Reform Commission (NDRC) announced that foreign ownership limits for automakers would be gradually removed over five years."
      },
      {
        date: new Date(2018, 6, 10), // July 10, 2018
        dateStr: "July 10, 2018",
        event: "Tesla Inc. became the first foreign automaker to take advantage of the relaxed ownership rules. The company registered its wholly-owned subsidiary in Shanghai."
      },
      {
        date: new Date(2019, 0, 10), // January 10, 2019
        dateStr: "January 10, 2019",
        event: "Construction of Tesla's Gigafactory 3 began in Shanghai. Tesla's entry intensified competition in the Chinese EV market, setting an example for other foreign automakers."
      },
      {
        date: new Date(2020, 0, 23), // January 23, 2020
        dateStr: "January 23, 2020",
        event: "As COVID-19 spread rapidly across China, the government imposed strict lockdowns, especially in Wuhan (Hubei province), the epicenter of the outbreak. Wuhan, often referred to as the \"Detroit of China,\" is a major hub for automotive manufacturing."
      },
      {
        date: new Date(2021, 8, 15), // September 15, 2021
        dateStr: "September 15, 2021",
        event: "BMW announced it would increase its stake in its Chinese joint venture, BMW Brilliance Automotive, from 50% to 75%. This followed the partial relaxation of ownership restrictions for passenger car manufacturers."
      },
      {
        date: new Date(2022, 0, 1), // January 1, 2022
        dateStr: "January 1, 2022",
        event: "The Chinese government officially removed all ownership restrictions for passenger vehicle manufacturers."
      }
    ];

    // Add event markers
    events.forEach((eventInfo, index) => {
      // Find the closest data point for the event date
      const eventDataPoint = summarizedData.reduce((closest, current) => {
        const eventTime = eventInfo.date.getTime();
        const currentDiff = Math.abs(current.month.getTime() - eventTime);
        const closestDiff = Math.abs(closest.month.getTime() - eventTime);
        return currentDiff < closestDiff ? current : closest;
      });

      if (eventDataPoint) {
        // Add event marker positioned on the stacked area chart
        svg
          .append("circle")
          .attr("cx", x(eventInfo.date))
          .attr("cy", y((eventDataPoint.China + eventDataPoint.othersUnits) / 1e6)) // Position at the top of the stack
          .attr("r", 6)
          .attr("fill", "#004225") // Dark green
          .attr("opacity", 0.5)
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mouseover", function (event, d) {
            tooltip
              .style("visibility", "visible")
              .html(
                `<div>
                  <div><strong>${eventInfo.dateStr}</strong></div>
                  <div><strong>Event:</strong> ${eventInfo.event}</div>
                </div>`
              );
          })
          .on("mousemove", function (event) {
            tooltip
              .style("top", `${event.pageY - 10}px`)
              .style("left", `${event.pageX + 10}px`);
          })
          .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
          });
      }
    });

    // Add legend (center-aligned with better spacing)
    const legend = svg
      .append("g")
      .attr("transform", `translate(${width / 2 - 90},${margin.top - 50})`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "Salmon");

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .style("font-size", "14px")
      .text("Chinese automakers");

    legend
      .append("rect")
      .attr("x", 180)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "#50C878");

    legend
      .append("text")
      .attr("x", 200)
      .attr("y", 12)
      .style("font-size", "14px")
      .text("Foreign automakers");
  });
}