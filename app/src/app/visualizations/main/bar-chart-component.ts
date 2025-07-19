// libraries
import * as d3 from "d3";
import $ from "jquery";
// local
import { BarChartConfig } from "src/app/models/viz";
import { sequentialColorRange, SessionPage } from "src/app/models/config";
import { UtilsService } from "src/app/services/utils.service";
import { ChatService } from "src/app/services/socket.service";

export class BarChart {
  barChartConfig;
  plotWidth: number;
  plotHeight: number;
  plotGroup;

  constructor(
    public utilsService: UtilsService,
    public chatService: ChatService,
    public global: SessionPage,
    public userConfig,
    public appConfig
  ) {
    this.barChartConfig = new BarChartConfig();
  }

  /**
   * Create variables needed to draw and update plot.
   */
  initialize() {
    let context = this;
    const container = "#plot_container";
    const width = $(container).parent().width();
    const height = $(container).parent().height();
    const plotMargins = { top: 50, bottom: 50, left: 60, right: 30 };

    context.plotWidth = width - plotMargins.left - plotMargins.right;
    context.plotHeight = height - plotMargins.top - plotMargins.bottom;

    $(container).empty();

    // Add containing SVG
    let svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

    // Add linear gradient to SVG definition for use in color scale FIRST
    let grad = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "grad")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");
    grad
      .selectAll("stop")
      .data(sequentialColorRange)
      .enter()
      .append("stop")
      .style("stop-color", (d) => d.toString())
      .attr("offset", (_, i) => 100 * (i / (sequentialColorRange.length - 1)) + "%");

    // Add plot group
    context.plotGroup = svg
      .append("g")
      .classed("plot", true)
      .attr("transform", `translate(${plotMargins.left},${plotMargins.top})`);

    // Add X and Y axis groups
    context.barChartConfig.yAxisGroup = context.plotGroup.append("g").classed("y", true).classed("axis", true);
    context.barChartConfig.xAxisGroup = context.plotGroup
      .append("g")
      .classed("x", true)
      .classed("axis", true)
      .attr("transform", `translate(${0},${context.plotHeight})`);

    // Add bar groups
    context.barChartConfig.barsGroup = context.plotGroup.append("g").classed("bars", true);

    // Add legend group (empty for now)
    context.barChartConfig.legendGroup = context.plotGroup.append("g").classed("legend", true);

    // Create unsupported text to display if chart cannot render
    context.barChartConfig.unsupportedMessage = `
      <tspan>If using
        categorical (<tspan style="font-family: 'Font Awesome 5 Free'; font-weight: 800 !important">&#xf031;</tspan>)
        and/or
        temporal (<tspan style="font-family: 'Font Awesome 5 Free'; font-weight: 800 !important">&#xf133;</tspan>)
      </tspan>
      <tspan x="0" dy="1.2em">
        attributes, you must have 
        <tspan style="font-weight: 800 !important">only one</tspan>!
      </tspan>`;
  }

  /**
   * Calculate new values and re-draw plot.
   */
  update() {
    let context = this;
    let utils = context.utilsService;
    let originalDatasetDict = context.userConfig["originalDatasetDict"];
    let dataset = context.appConfig[context.global.appMode];

    // if there's no dataset don't update the bar chart
    if (!originalDatasetDict) return;

    // Clear ALL existing content first to ensure clean redraw
    context.barChartConfig.barsGroup.selectAll("*").remove();
    context.barChartConfig.legendGroup.selectAll("*").remove();

    // create raw data object
    let rawData = Object.keys(originalDatasetDict).map((id) => {
      return {
        ...originalDatasetDict[id],
        xVar: dataset["xVar"] == null ? null : originalDatasetDict[id][dataset["xVar"]],
        yVar: dataset["yVar"] == null ? null : originalDatasetDict[id][dataset["yVar"]],
      };
    });

    // filter raw data into a prepared data set
    let prepared = rawData;
    ["N", "O"].forEach((dataType) =>
      dataset.attributeDatatypeList[dataType].forEach((attr) => {
        let filterModel = dataset["attributes"][attr]["filterModel"];
        prepared = prepared.filter((item) => {
          return filterModel.indexOf(item[attr]) !== -1;
        });
      })
    );
    ["Q", "T"].forEach((dataType) =>
      dataset.attributeDatatypeList[dataType].forEach((attr) => {
        let filterModel = dataset["attributes"][attr]["filterModel"];
        prepared = prepared.filter((item) => {
          return (
            parseFloat(item[attr]) >= parseFloat(filterModel[0]) && parseFloat(item[attr]) <= parseFloat(filterModel[1])
          );
        });
      })
    );

    // Create buckets, scales and axes based on xy data types
    let buckets = []; // list of label-value pairs: [[label, value], ...]
    let horizontal = false;
    let xAxisTitle = "";
    let yAxisTitle = "";
    
    // Get aggregation type from dataset - ensure it's properly handled
    let aggType = dataset["aggType"];
    if (!aggType || aggType === null || aggType === undefined) {
      aggType = "count"; // Default fallback
    }
    
    
    let aggTitle = "";
    if (context.userConfig["aggregationMapping"] && context.userConfig["aggregationMapping"][aggType]) {
      aggTitle = context.userConfig["aggregationMapping"][aggType].toUpperCase();
    } else {
      aggTitle = aggType.toUpperCase();
    }
    
 
    
    let xScale = context.barChartConfig.xScale;
    let xAxis = context.barChartConfig.xAxis;
    let yScale = context.barChartConfig.yScale;
    let yAxis = context.barChartConfig.yAxis;
    let xIsQ = utils.isMeasure(dataset, dataset["xVar"], "Q");
    let yIsQ = utils.isMeasure(dataset, dataset["yVar"], "Q");



    // Check if we should create a grouped bar chart (both variables are categorical)
    let shouldCreateGroupedBar = dataset["xVar"] && dataset["yVar"] && !xIsQ && !yIsQ;

    console.log("Bar chart debugging:", {
      xVar: dataset["xVar"],
      yVar: dataset["yVar"],
      xIsQ: xIsQ,
      yIsQ: yIsQ,
      shouldCreateGroupedBar: shouldCreateGroupedBar
    });

    if (shouldCreateGroupedBar) {
      // Create grouped bar chart
      this.createGroupedBarChart(context, prepared, dataset, utils);
      return;
    }

    if (dataset["yVar"] == null) {
      // yVar is NA => Vertical histogram
      xScale = d3.scaleBand().range([0, context.plotWidth]).padding(0.1);
      xAxis = d3.axisBottom(xScale);
      if (xIsQ) {
        // [Q x NA] => Vertical binned histogram of count
        context.barChartConfig.legendGroup.style("display", "block");
        const bins = d3.bin().value((d) => +d["xVar"])(prepared);
        buckets = bins.map((bin) => {
          const lb = utils.formatLargeNum(+bin.x0); // lowerbound
          const ub = utils.formatLargeNum(+bin.x1); // upperbound
          const val = utils.aggregate(bin, "count", "xVar");
          return [`[${lb}, ${ub})`, val, bin];
        });
        xAxis.tickFormat((_, i) => buckets[i] ? buckets[i][0] : "");
        xAxisTitle = dataset["xVar"];
        yAxisTitle = `COUNT(${dataset["xVar"]})`;
      } else if (dataset["xVar"] !== null) {
        // [N/O/T x NA] => Vertical histogram of count
        context.barChartConfig.legendGroup.style("display", "block");
        buckets = d3
          .rollups(
            prepared,
            (v) => utils.aggregate(v, "count", "xVar"),
            (d) => d["xVar"]
          )
          .sort(function (x, y) {
            return d3.ascending(x[0], y[0]); // sort buckets
          });
        buckets.forEach((d) => d.push(prepared.filter((obj) => obj["xVar"] == d[0])));
        xAxis.tickFormat((_, i) => buckets[i] ? `${buckets[i][0]}` : "");
        xAxisTitle = dataset["xVar"];
        yAxisTitle = `COUNT(${dataset["xVar"]})`;
      } else {
        // [NA x NA] => unsupported
        context.barChartConfig.legendGroup.style("display", "none");
        context.barChartConfig.barsGroup
          .append("text")
          .attr("class", "unsupported-text")
          .attr("transform", `translate(${context.plotWidth / 2},${context.plotHeight / 2})`)
          .attr("text-anchor", "middle")
          .html(context.barChartConfig.unsupportedMessage);
        return;
      }
      xScale.domain(d3.range(buckets.length));
      yScale = d3.scaleLinear().range([context.plotHeight, 0]);
      
      // Handle Y-axis range properly based on value distribution
      let minVal = d3.min(buckets, (d) => d[1]) || 0;
      let maxVal = d3.max(buckets, (d) => d[1]) || 0;
      
      if (minVal >= 0) {
        yScale.domain([0, maxVal]).nice();
      } else if (maxVal <= 0) {
        yScale.domain([minVal, 0]).nice();
      } else {
        yScale.domain([minVal, maxVal]).nice();
      }
      
      yAxis = d3.axisLeft(yScale).tickFormat((d) => utils.formatLargeNum(+d));
    } else if (dataset["xVar"] == null) {
      // xVar is NA => Horizontal histogram
      horizontal = true;
      yScale = d3.scaleBand().range([0, context.plotHeight]).padding(0.1);
      yAxis = d3.axisLeft(yScale);
      if (yIsQ) {
        // [NA x Q] => Horizontal binned histogram of count
        context.barChartConfig.legendGroup.style("display", "block");
        const bins = d3.bin().value((d) => +d["yVar"])(prepared);
        buckets = bins
          .map((bin) => {
            const lb = utils.formatLargeNum(+bin.x0); // lowerbound
            const ub = utils.formatLargeNum(+bin.x1); // upperbound
            const val = utils.aggregate(bin, "count", "yVar");
            return [`[${lb}, ${ub})`, val, bin];
          })
          .reverse(); // sort buckets reverse vertically
        yAxis.tickFormat((_, i) => buckets[i] ? buckets[i][0] : "");
        yAxisTitle = dataset["yVar"];
        xAxisTitle = `COUNT(${dataset["yVar"]})`;
      } else if (dataset["yVar"] !== null) {
        // [NA x N/O/T] => Horizontal histogram of count
        context.barChartConfig.legendGroup.style("display", "block");
        buckets = d3
          .rollups(
            prepared,
            (v) => utils.aggregate(v, "count", "yVar"),
            (d) => d["yVar"]
          )
          .sort(function (x, y) {
            return d3.ascending(y[0], x[0]); // sort buckets reverse vertically
          });
        buckets.forEach((d) => d.push(prepared.filter((obj) => obj["yVar"] == d[0])));
        yAxis.tickFormat((_, i) => buckets[i] ? `${buckets[i][0]}` : "");
        yAxisTitle = dataset["yVar"];
        xAxisTitle = `COUNT(${dataset["yVar"]})`;
      } else {
        // [NA x NA] => unsupported
        context.barChartConfig.legendGroup.style("display", "none");
        context.barChartConfig.barsGroup
          .append("text")
          .attr("class", "unsupported-text")
          .attr("transform", `translate(${context.plotWidth / 2},${context.plotHeight / 2})`)
          .attr("text-anchor", "middle")
          .html(context.barChartConfig.unsupportedMessage);
        return;
      }
      yScale.domain(d3.range(buckets.length));
      xScale = d3.scaleLinear().range([0, context.plotWidth]);
      
      // Handle negative values properly for horizontal charts with aggregated data
      let minVal = d3.min(buckets, (d) => d[1]) || 0;
      let maxVal = d3.max(buckets, (d) => d[1]) || 0;
      
      if (minVal >= 0) {
        xScale.domain([0, maxVal]).nice();
      } else if (maxVal <= 0) {
        xScale.domain([minVal, 0]).nice();
      } else {
        xScale.domain([minVal, maxVal]).nice();
      }
      
      xAxis = d3.axisBottom(xScale).tickFormat((d) => utils.formatLargeNum(+d));
    } else {
      // both xVar and yVar are defined
      if (yIsQ) {
        // yVar is Q => vertical bar chart
        xScale = d3.scaleBand().range([0, context.plotWidth]).padding(0.1);
        xAxis = d3.axisBottom(xScale);
        xAxisTitle = dataset["xVar"];
        yAxisTitle = `${aggTitle}(${dataset["yVar"]})`;
        
        if (xIsQ) {
          // [Q x Q] => bin x, rollup, aggregate y
          context.barChartConfig.legendGroup.style("display", "block");
          const bins = d3.bin().value((d) => +d["xVar"])(prepared);
          buckets = bins.map((bin) => {
            const lb = utils.formatLargeNum(+bin.x0); // lowerbound
            const ub = utils.formatLargeNum(+bin.x1); // upperbound
            const val = utils.aggregate(bin, aggType, "yVar");
            console.log('🔢 [Q x Q] aggregation:', { bin: `${lb}-${ub}`, aggType, val });
            return [`[${lb}, ${ub})`, val, bin];
          });
          xAxis.tickFormat((_, i) => buckets[i] ? buckets[i][0] : "");
        } else {
          // [N/O/T x Q] => rollup, aggregate
          context.barChartConfig.legendGroup.style("display", "block");
          buckets = d3
            .rollups(
              prepared,
              (v) => {
                const val = utils.aggregate(v, aggType, "yVar");
      
                return val;
              },
              (d) => d["xVar"]
            )
            .sort(function (x, y) {
              return d3.ascending(x[0], y[0]); // sort buckets
            });
          buckets.forEach((d) => d.push(prepared.filter((obj) => obj["xVar"] == d[0])));
          xAxis.tickFormat((_, i) => buckets[i] ? `${buckets[i][0]}` : "");
        }
        xScale.domain(d3.range(buckets.length));
        yScale = d3.scaleLinear().range([context.plotHeight, 0]);
        
        // Handle Y-axis range properly based on value distribution
        let minVal = d3.min(buckets, (d) => d[1]) || 0;
        let maxVal = d3.max(buckets, (d) => d[1]) || 0;
        
        if (minVal >= 0) {
          yScale.domain([0, maxVal]).nice();
        } else if (maxVal <= 0) {
          yScale.domain([minVal, 0]).nice();
        } else {
          yScale.domain([minVal, maxVal]).nice();
        }
        
        yAxis = d3.axisLeft(yScale).tickFormat((d) => utils.formatLargeNum(+d));
      } else {
        // yVar is N/O/T => horizontal bar chart
        horizontal = true;
        yScale = d3.scaleBand().range([0, context.plotHeight]).padding(0.1);
        yAxis = d3.axisLeft(yScale);
        if (xIsQ) {
          // [Q x N/O/T] => rollup, aggregate => horizontal bar chart
          context.barChartConfig.legendGroup.style("display", "block");
          buckets = d3
            .rollups(
              prepared,
              (v) => {
                const val = utils.aggregate(v, aggType, "xVar");
        
                return val;
              },
              (d) => d["yVar"]
            )
            .sort(function (x, y) {
              return d3.ascending(y[0], x[0]); // sort buckets reverse vertically
            });
          buckets.forEach((d) => d.push(prepared.filter((obj) => obj["yVar"] == d[0])));
          yAxis.tickFormat((_, i) => buckets[i] ? `${buckets[i][0]}` : "");
          yAxisTitle = dataset["yVar"];
          xAxisTitle = `${aggTitle}(${dataset["xVar"]})`;
        } else {
          // [N/O/T x N/O/T] => unsupported (handled by grouped bar chart above)
          context.barChartConfig.legendGroup.style("display", "none");
          context.barChartConfig.barsGroup
            .append("text")
            .attr("class", "unsupported-text")
            .attr("transform", `translate(${context.plotWidth / 2},${context.plotHeight / 2})`)
            .attr("text-anchor", "middle")
            .html(context.barChartConfig.unsupportedMessage);
          return;
        }
        yScale.domain(d3.range(buckets.length));
        xScale = d3.scaleLinear().range([0, context.plotWidth]);
        
        // Handle negative values properly for horizontal charts with aggregated data
        let minVal = d3.min(buckets, (d) => d[1]) || 0;
        let maxVal = d3.max(buckets, (d) => d[1]) || 0;
        
        if (minVal >= 0) {
          xScale.domain([0, maxVal]).nice();
        } else if (maxVal <= 0) {
          xScale.domain([minVal, 0]).nice();
        } else {
          xScale.domain([minVal, maxVal]).nice();
        }
        
        xAxis = d3.axisBottom(xScale).tickFormat((d) => utils.formatLargeNum(+d));
      }
    }

    // Force clear all axis content before redrawing
    context.barChartConfig.xAxisGroup.selectAll("*").remove();
    context.barChartConfig.yAxisGroup.selectAll("*").remove();

    // draw axes
    context.barChartConfig.xAxisGroup.call(xAxis);
    context.barChartConfig.yAxisGroup.call(yAxis);

    // Add zero line for charts with negative values
    if (buckets.length > 0) {
      let hasNegativeValues = buckets.some(d => d[1] < 0);
      if (hasNegativeValues) {
        if (horizontal) {
          context.barChartConfig.barsGroup
            .append("line")
            .attr("class", "zero-line")
            .attr("x1", xScale(0))
            .attr("x2", xScale(0))
            .attr("y1", 0)
            .attr("y2", context.plotHeight)
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3");
        } else {
          context.barChartConfig.barsGroup
            .append("line")
            .attr("class", "zero-line")
            .attr("x1", 0)
            .attr("x2", context.plotWidth)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3");
        }
      }
    }

    // draw axis titles
    context.barChartConfig.xAxisGroup
      .append("g")
      .classed("x axis title", true)
      .attr("opacity", 1)
      .attr("transform", `translate(${context.plotWidth / 2}, 0)`)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("dy", "3.71em")
      .text(xAxisTitle);
      
    context.barChartConfig.yAxisGroup
      .append("g")
      .classed("y axis title", true)
      .attr("opacity", 1)
      .attr("transform", `translate(-30, ${context.plotHeight / 2})`)
      .append("text")
      .attr("fill", "currentColor")
      .text(yAxisTitle);

    // prepare data labels for yAxis
    context.barChartConfig.yAxisGroup
      .selectAll("text")
      .style("text-anchor", "middle")
      .attr("dx", "0.8em")
      .attr("dy", "-1.21em")
      .attr("transform", "rotate(-90)");

    // stagger every other tick label
    context.barChartConfig.xAxisGroup.selectAll(".tick").each(function (_, i) {
      if (i % 2 !== 0) {
        d3.select(this).select("line").attr("y2", 15);
        d3.select(this).select("text").attr("dy", "1.91em");
      }
    });
    context.barChartConfig.yAxisGroup.selectAll(".tick").each(function (_, i) {
      if (i % 2 !== 0) {
        d3.select(this).select("line").attr("x2", -15);
        d3.select(this).select("text").attr("dy", "-2.41em");
      }
    });

    // Store updated scales and axes back in the chart config
    context.barChartConfig.xScale = xScale;
    context.barChartConfig.yScale = yScale;
    context.barChartConfig.xAxis = xAxis;
    context.barChartConfig.yAxis = yAxis;

    // JOIN data selection using bucket label as key
    let dataBound = context.barChartConfig.barsGroup.selectAll(".post").data(buckets, (d) => `${d[0]}`);

    // ENTER new group for each bar and text label
    let enterSelection = dataBound.enter().append("g").classed("post", true);

    // ENTER text for all bars
    const offset = 5;
    enterSelection
      .append("text")
      .attr("transform", (d, i) => {
        let x, y;
        if (horizontal) {
          x = d[1] >= 0 ? xScale(d[1]) + offset : xScale(d[1]) - offset;
          y = yScale(i) + yScale.bandwidth() / 2 + 4;
        } else {
          x = xScale(i) + xScale.bandwidth() / 2;
          y = d[1] >= 0 ? yScale(d[1]) - offset : yScale(d[1]) + offset + 10;
        }
        return `translate(${x},${y})`;
      })
      .attr("display", "none")
      .style("text-anchor", (d) => {
        if (horizontal) {
          return d[1] >= 0 ? "start" : "end";
        } else {
          return "middle";
        }
      })
      .text((d) => utils.formatLargeNum(+d[1]));

    // ENTER all bars
    enterSelection
      .append("rect")
      .attr("transform", (d, i) => {
        if (horizontal) {
          d["x"] = d[1] >= 0 ? xScale(0) : xScale(d[1]);
          d["y"] = yScale(i);
        } else {
          d["x"] = xScale(i);
          d["y"] = d[1] >= 0 ? yScale(d[1]) : yScale(0);
        }
        return `translate(${d["x"]},${d["y"]})`;
      })
      .attr("height", (d) => {
        if (horizontal) {
          return yScale.bandwidth();
        } else {
          return Math.abs(yScale(d[1]) - yScale(0));
        }
      })
      .attr("width", (d) => {
        if (horizontal) {
          return Math.abs(xScale(d[1]) - xScale(0));
        } else {
          return xScale.bandwidth();
        }
      })
      .style("fill", (d) => {
        // fill based on interactions with underlying data points!
        if (context.global.appType == "CONTROL") return "white";
        switch (dataset["colorByMode"]) {
          case "abs":
            const sumInteracted = d[2].reduce(utils.sumTimesVisited, 0) as number;
            const sumVisits = prepared.reduce(utils.sumTimesVisited, 0) as number;
            return sumInteracted == 0
              ? "white"
              : context.userConfig.focusSequentialColorScale(sumInteracted / sumVisits);
          case "rel":
            const maxInteracted = d[2].reduce(utils.maxTimesVisited, 0) as number;
            const maxVisits = prepared.reduce(utils.maxTimesVisited, 0) as number;
            return maxInteracted == 0
              ? "white"
              : context.userConfig.focusSequentialColorScale(maxInteracted / maxVisits);
          case "binary":
            const visited = d[2].some((el) => el["timesVisited"] > 0);
            return !visited ? "white" : context.userConfig.focusSequentialColorScale(1);
          default:
            return "white";
        }
      })
      .style("fill-opacity", 0.8)
      .style("stroke", (d) => (d[2].reduce((a, b) => a || b["selected"], false) ? "brown" : "black"))
      .style("stroke-width", (d) => (d[2].reduce((a, b) => a || b["selected"], false) ? "3px" : "1px"))
      .style("stroke-dasharray", (d) => {
        const countSelected = d[2].filter((o) => o["selected"]).length;
        return countSelected < d[2].length && countSelected > 0 ? "4" : "none";
      })
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        if (context.global.appType === "ADMIN") {
          utils.clickGroup(context, event, {
            aggName: dataset["aggType"] == null ? "count" : dataset["aggType"],
            aggAxis: horizontal ? "x-axis" : "y-axis",
            binLabel: d[0],
            binValue: d[1],
            binData: d[2],
          });
        }
      })
      .on("mouseover", function (event, d) {
        d3.select(this.parentNode).select("text").attr("display", "block");
        d3.select(this)
          .style("stroke", "brown")
          .style("stroke-width", "3px");
        
        // Add hover functionality to show grouped data details
        context.utilsService.mouseoverGroup(context, event, this, {
          aggName: aggType,
          aggAxis: horizontal ? "x-axis" : "y-axis",
          binLabel: d[0],
          binValue: d[1],
          binData: d[2] || [], // Use the bin data if available, otherwise empty array
        });
      })
      .on("mouseout", function (event, d) {
        d3.select(this.parentNode).select("text").attr("display", "none");
        d3.select(this)
          .style("stroke", "black")
          .style("stroke-width", "1px");
        
        // Remove hover functionality
        context.utilsService.mouseoutGroup(context, event, {
          aggName: aggType,
          aggAxis: horizontal ? "x-axis" : "y-axis",
          binLabel: d[0],
          binValue: d[1],
          binData: d[2] || [],
        });
      });

    // FILTER can update `buckets` => must update hovered Objects list
    if (dataset["hoveredObjects"]["binName"]) {
      // binName set => there is a bin visible in details view, reset existing object
      let currentBinName = dataset["hoveredObjects"]["binName"];
      let currentBinAttr = dataset["hoveredObjects"]["binAttr"];
      dataset["hoveredObjects"] = { binName: null, binAttr: null, points: {} };
      // look for the bin in the filtered data set. If not there, table is already reset!
      for (let bin of buckets) {
        if (
          bin[0] == currentBinName &&
          ((horizontal && dataset["yVar"] == currentBinAttr) || (!horizontal && dataset["xVar"] == currentBinAttr))
        ) {
          // found the bin! => update hovered Objects for possible FILTER
          dataset["hoveredObjects"]["binName"] = currentBinName;
          dataset["hoveredObjects"]["binAttr"] = currentBinAttr;
          bin[2].forEach((d) => {
            const id = d[dataset["primaryKey"]];
            if (id !== "-") {
              // use dict OBJECT to update source data by reference!
              let dataPoint = originalDatasetDict[id];
              context.utilsService.colorDataPoint(context, dataPoint, bin[2]);
              dataset["hoveredObjects"]["points"][id] = dataPoint;
            }
          });
          // attempt to remove values from the details table
          if (dataset["aggType"] == "min" || dataset["aggType"] == "max") {
            if (horizontal) {
              Object.keys(dataset["hoveredObjects"]["points"]).forEach((id) => {
                if (dataset["hoveredObjects"]["points"][id][dataset["xVar"]] !== bin[1]) {
                  delete dataset["hoveredObjects"]["points"][id];
                }
              });
            } else {
              Object.keys(dataset["hoveredObjects"]["points"]).forEach((id) => {
                if (dataset["hoveredObjects"]["points"][id][dataset["yVar"]] !== bin[1]) {
                  delete dataset["hoveredObjects"]["points"][id];
                }
              });
            }
          }
          break;
        }
      }
    }
  }

  /**
   * Create grouped bar chart when both x and y variables are categorical
   */
  createGroupedBarChart(context, prepared, dataset, utils) {
    // Get unique values for both x and y variables
    const xValuesSet = new Set<string>();
    const yValuesSet = new Set<string>();
    
    prepared.forEach(d => {
      xValuesSet.add(String(d.xVar));
      yValuesSet.add(String(d.yVar));
    });
    
    const xValues = Array.from(xValuesSet).sort() as string[];
    const yValues = Array.from(yValuesSet).sort() as string[];
    
    // Create grouped data structure
    const groupedData = [];
    xValues.forEach(xVal => {
      yValues.forEach(yVal => {
        const groupData = prepared.filter(d => String(d.xVar) === xVal && String(d.yVar) === yVal);
        groupedData.push({
          xVal: xVal,
          yVal: yVal,
          count: groupData.length,
          data: groupData
        });
      });
    });

    // Set up scales
    const xScale = d3.scaleBand()
      .domain(xValues)
      .range([0, context.plotWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .range([context.plotHeight, 0]);

    // Find max count for y scale domain
    const maxCount = d3.max(groupedData, d => d.count) || 0;
    yScale.domain([0, maxCount]).nice();

    // Create color scale for y values
    const colorScale = d3.scaleOrdinal()
      .domain(yValues)
      .range(d3.schemeCategory10);

    // Clear existing content
    context.barChartConfig.barsGroup.selectAll("*").remove();
    context.barChartConfig.legendGroup.selectAll("*").remove();

    // Draw axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => utils.formatLargeNum(+d));

    context.barChartConfig.xAxisGroup.selectAll("*").remove();
    context.barChartConfig.yAxisGroup.selectAll("*").remove();

    context.barChartConfig.xAxisGroup.call(xAxis);
    context.barChartConfig.yAxisGroup.call(yAxis);

    // Add axis titles
    context.barChartConfig.xAxisGroup
      .append("g")
      .classed("x axis title", true)
      .attr("opacity", 1)
      .attr("transform", `translate(${context.plotWidth / 2}, 0)`)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("dy", "3.71em")
      .text(dataset["xVar"]);

    context.barChartConfig.yAxisGroup
      .append("g")
      .classed("y axis title", true)
      .attr("opacity", 1)
      .attr("transform", `translate(-30, ${context.plotHeight / 2})`)
      .append("text")
      .attr("fill", "currentColor")
      .text(`COUNT`);

    // Calculate bar width and positioning
    const barWidth = xScale.bandwidth() / yValues.length;
    const barPadding = 2;

    // Create bars
    const barGroups = context.barChartConfig.barsGroup
      .selectAll(".bar-group")
      .data(groupedData)
      .enter()
      .append("g")
      .classed("bar-group", true)
      .attr("transform", d => {
        const xPos = xScale(d.xVal) + (yValues.indexOf(d.yVal) * barWidth);
        return `translate(${xPos}, 0)`;
      });

    // Add bars
    barGroups
      .append("rect")
      .attr("width", barWidth - barPadding)
      .attr("height", d => context.plotHeight - yScale(d.count))
      .attr("y", d => yScale(d.count))
      .style("fill", d => {
        // Apply coloring based on interactions
        if (context.global.appType == "CONTROL") return colorScale(d.yVal);
        
        switch (dataset["colorByMode"]) {
          case "abs":
            const sumInteracted = d.data.reduce(utils.sumTimesVisited, 0) as number;
            const sumVisits = prepared.reduce(utils.sumTimesVisited, 0) as number;
            return sumInteracted == 0
              ? colorScale(d.yVal)
              : context.userConfig.focusSequentialColorScale(sumInteracted / sumVisits);
          case "rel":
            const maxInteracted = d.data.reduce(utils.maxTimesVisited, 0) as number;
            const maxVisits = prepared.reduce(utils.maxTimesVisited, 0) as number;
            return maxInteracted == 0
              ? colorScale(d.yVal)
              : context.userConfig.focusSequentialColorScale(maxInteracted / maxVisits);
          case "binary":
            const visited = d.data.some((el) => el["timesVisited"] > 0);
            return !visited ? colorScale(d.yVal) : context.userConfig.focusSequentialColorScale(1);
          default:
            return colorScale(d.yVal);
        }
      })
      .style("fill-opacity", 0.8)
      .style("stroke", d => (d.data.reduce((a, b) => a || b["selected"], false) ? "brown" : "black"))
      .style("stroke-width", d => (d.data.reduce((a, b) => a || b["selected"], false) ? "3px" : "1px"))
      .style("stroke-dasharray", d => {
        const countSelected = d.data.filter((o) => o["selected"]).length;
        return countSelected < d.data.length && countSelected > 0 ? "4" : "none";
      })
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        if (context.global.appType === "ADMIN") {
          utils.clickGroup(context, event, {
            aggName: "count",
            aggAxis: "y-axis",
            binLabel: `${d.xVal} - ${d.yVal}`,
            binValue: d.count,
            binData: d.data,
          });
        }
      })
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("stroke", "brown")
          .style("stroke-width", "3px");
        
        // Add hover functionality
        context.utilsService.mouseoverGroup(context, event, this, {
          aggName: "count",
          aggAxis: "y-axis",
          binLabel: `${d.xVal} - ${d.yVal}`,
          binValue: d.count,
          binData: d.data,
        });
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .style("stroke", "black")
          .style("stroke-width", "1px");
        
        // Remove hover functionality
        context.utilsService.mouseoutGroup(context, event, {
          aggName: "count",
          aggAxis: "y-axis",
          binLabel: `${d.xVal} - ${d.yVal}`,
          binValue: d.count,
          binData: d.data,
        });
      });

    // Add legend
    const legendGroup = context.barChartConfig.legendGroup
      .append("g")
      .attr("transform", `translate(${context.plotWidth - 100}, 20)`);

    yValues.forEach((yVal, i) => {
      const legendItem = legendGroup
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendItem
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .style("fill", colorScale(yVal as string))
        .style("stroke", "black")
        .style("stroke-width", "1px");

      legendItem
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(yVal);
    });

    // Store scales for potential updates
    context.barChartConfig.xScale = xScale;
    context.barChartConfig.yScale = yScale;
    context.barChartConfig.xAxis = xAxis;
    context.barChartConfig.yAxis = yAxis;
  }
}
