function scene1() {
  const svg = d3.select("#visualization");
  svg.selectAll("*").remove(); // Clear previous scene

  const width = 800;
  const height = 400;
  const margin = { top: 50, right: 30, bottom: 70, left: 100 }; // Adjusted left margin for label space

  // Load the CSV file from GitHub
  d3.csv(
    "https://raw.githubusercontent.com/jasonccfok/CS416/main/China%20Automobile%20Sales%20Data.csv"
  ).then(data => {
    // Parse the data: extract date, filter by range, and ensure "units_sold" is numeric
    data = data.map(d => ({
      date: d3.timeParse("%Y-%m-%d")(d.year_month), // Parse the date
      units_sold: +d.units_sold,                   // Convert "units_sold" to number
      is_ev: d.is_ev.trim(),                       // Trim "is_ev" values
    }));

    // Filter data to keep only dates between Jan 2018 and Dec 2023
    const filteredData = data.filter(
      d =>
        d.date >= new Date(2018, 0, 1) && // Jan 1, 2018
        d.date <= new Date(2023, 11, 31)  // Dec 31, 2023
    );

    // Summarize data to calculate "Market Shares" for each month
    const aggregatedData = d3.rollups(
      filteredData,
      v => {
        const totalUnits = d3.sum(v, d => d.units_sold);
        const evUnits = d3.sum(v.filter(d => d.is_ev === "EV"), d => d.units_sold);
        const gasolineUnits = totalUnits - evUnits;
        return {
          marketShare: evUnits / totalUnits,
          evUnits,
          gasolineUnits,
        };
      },
      d => d3.timeFormat("%Y-%m")(d.date) // Group by year-month string
    ).map(([month, values]) => ({
      month: d3.timeParse("%Y-%m")(month), // Convert back to Date object
      ...values,
    }));

    // Sort the data by date
    aggregatedData.sort((a, b) => d3.ascending(a.month, b.month));

    // Set up scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(aggregatedData, d => d.month)) // Extent of dates (min to max)
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, 0.35]) // Market shares range from 0 to 35%
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Area generator
    const area = d3
      .area()
      .x(d => x(d.month)) // Use time scale for x-axis
      .y0(y(0))           // Base area at 0
      .y1(d => y(d.marketShare));

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
      .style("max-width", "300px");

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

    // Add x-axis label left-aligned under 2018
    svg
      .append("text")
      .attr("x", x(new Date(2018, 0, 1))) // Align under 2018
      .attr("y", height - 30)
      .attr("fill", "black")
      .style("text-anchor", "start")
      .style("font-size", "16px") // Enlarge axis label
      .text("Year");

    // Draw y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d3.format(".0%"))) // Format as percentages
      .selectAll("text")
      .style("font-size", "14px"); // Enlarge tick labels

    // Add y-axis label horizontally middle-aligned
    svg
      .append("text")
      .attr("x", margin.left) // Align horizontally above the y-axis
      .attr("y", margin.top - 20) // Position slightly above the y-axis
      .attr("fill", "black")
      .style("text-anchor", "middle") // Horizontally center-align the text
      .style("font-size", "16px") // Enlarge axis label
      .text("EV Market Shares"); // Updated label text

    // Draw the area
    svg
      .append("path")
      .datum(aggregatedData) // Bind the data
      .attr("fill", "steelblue")
      .attr("opacity", 0.5) // Add transparency to the area
      .attr("d", area);

    // Add invisible circles for tooltips
    svg
      .selectAll(".tooltip-circle")
      .data(aggregatedData)
      .enter()
      .append("circle")
      .attr("class", "tooltip-circle")
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.marketShare))
      .attr("r", 5)
      .attr("fill", "transparent")
      .on("mouseover", function (event, d) {
        tooltip
          .style("visibility", "visible")
          .html(
            `<table>
              <tr><th colspan="2">${d3.timeFormat("%Y-%m")(d.month)}</th></tr>
              <tr><td><strong>EV Market Share</strong></td><td>${d3.format(".1%")(d.marketShare)}</td></tr>
              <tr><td><strong>EV Units</strong></td><td>${d3.format(",.2f")(d.evUnits / 1e6)} Mn</td></tr>
              <tr><td><strong>Gasoline Market Share</strong></td><td>${d3.format(".1%")(1 - d.marketShare)}</td></tr>
              <tr><td><strong>Gasoline Units</strong></td><td>${d3.format(",.2f")(d.gasolineUnits / 1e6)} Mn</td></tr>
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

    // Define events
    const events = [
      {
        date: new Date(2019, 5, 25), // June 25, 2019
        dateStr: "2019-06-25",
        event: "China reduced subsidies for New Energy Vehicle (NEV) to encourage automakers to innovate and compete without heavy reliance on financial support. This marked a shift toward sustainable market-driven growth."
      },
      {
        date: new Date(2020, 3, 23), // April 23, 2020
        dateStr: "2020-04-23",
        event: "The Chinese government extended its New Energy Vehicle (NEV) subsidies and tax exemptions until the end of 2022, which was previously set to expire in 2020. This policy aimed to stabilize the EV market during the pandemic and maintain momentum in EV adoption."
      },
      {
        date: new Date(2021, 0, 1), // January 1, 2021
        dateStr: "2021-01-01",
        event: "China implemented China VI Emission Standards (Phase 2), which are some of the strictest emission regulations globally. These standards encouraged automakers to focus on cleaner technologies, including EVs, to meet regulatory requirements."
      },
      {
        date: new Date(2022, 11, 31), // December 31, 2022
        dateStr: "2022-12-31",
        event: "The subsidy program officially ended, pushing the industry toward self-sufficiency after years of government support."
      }
    ];

    // Add event annotations
    events.forEach(eventInfo => {
      // Find the data point closest to the event date
      const eventDataPoint = aggregatedData.find(d => {
        const timeDiff = Math.abs(d.month - eventInfo.date);
        return timeDiff === Math.min(...aggregatedData.map(point => Math.abs(point.month - eventInfo.date)));
      });

      if (eventDataPoint) {
        // Add event marker
        svg
          .append("circle")
          .attr("cx", x(eventInfo.date))
          .attr("cy", y(eventDataPoint.marketShare))
          .attr("r", 6)
          .attr("fill", "navy")
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
                  <div><strong>EV Market Share:</strong> ${d3.format(".1%")(eventDataPoint.marketShare)}</div>
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
  });
}