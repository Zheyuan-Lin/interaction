// libraries
import * as d3 from "d3";
import { Injectable } from "@angular/core";
// local
import { InteractionTypes } from "src/app/models/config";
import { APP_GROUP_NAME } from "../constants/app-constants";
import { Message } from "../models/message";

@Injectable()
export class UtilsService {
  appMode: string = "synthetic_voters_v14.csv";
  appType: string = "AWARENESS";
  appLevel: string = "live";
  sumTimesVisited: number = 0;
  maxTimesVisited: number = 0;
  /**
   * Generates a random alphanumeric string of `length` characters.
   */
  generateRandomUniqueString(length: number) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * Generates random app type between CONTROL and AWARENESS
   */
  generateRandomAppType() {
    return Math.random() >= 0.5 ? "CONTROL" : "AWARENESS";
  }

  /**
   * Get current time. E.g. usage: timestamp of interaction
   */
  getCurrentTime() {
    return new Date().getTime();
  }

  /**
   * Get current timestamp in both Unix and readable formats
   */
  getCurrentTimestamp() {
    const now = new Date();
    return {
      unix: now.getTime(),
      readable: now.toISOString(),
      local: now.toLocaleString()
    };
  }

  /**
   * Creates 2 smaller arrays from attribute list for single item detail view.
   */
  chunkAttrArray(dataset) {
    let arr = dataset.attributeList;
    let chunkSize = Math.ceil(arr.length / 2);
    if (chunkSize <= 0) throw "Cannot split attributes into 2 columns in detail view.";
    let R = [];
    for (let i = 0, len = arr.length; i < len; i += chunkSize) {
      R.push(arr.slice(i, i + chunkSize));
    }
    return R;
  }

  /**
   * Reducer for calculating sum of a list of numbers.
   */
  sum(acc: number, cur: number) {
    return acc + cur;
  }

  /**
   * Reducer for calculating max of a list of numbers.
   */
  max(acc: number, cur: number) {
    return acc > cur ? acc : cur;
  }


  /**
   * Return bool if attribute is measurement type "N", "O", "T", or "Q".
   */
  isMeasure(dataset, attr, measureScale) {
    return attr ? dataset.attributeDatatypeList[measureScale].indexOf(attr) !== -1 : false;
  }

  /**
   * Sort function that handles income ordering specifically.
   * If the attribute is "income", it orders as "Low", "Middle", "High".
   * Otherwise, it uses alphabetical ordering.
   */
  sortWithIncomeOrder(x: any, y: any, attributeName: string) {
    // Check if this is the income attribute
    if (attributeName === "income") {
      const incomeOrder = ["Low", "Middle", "High"];
      const xIndex = incomeOrder.indexOf(x);
      const yIndex = incomeOrder.indexOf(y);
      
      // If both values are in the income order, sort by that order
      if (xIndex !== -1 && yIndex !== -1) {
        return xIndex - yIndex;
      }
      // If only one is in the order, prioritize the ordered one
      if (xIndex !== -1) return -1;
      if (yIndex !== -1) return 1;
    }
    
    // Default to alphabetical ordering
    return d3.ascending(x, y);
  }

  /**
   * Apply an aggregation function to the X or Y axis using d3 agg functions.
   */
  aggregate(values, aggType, xyVar) {
    if (values.length) {
      switch (aggType) {
        case "count":
          return d3.count(values, (d) => d[xyVar]);
        case "min":
          return d3.min(values, (d) => d[xyVar]);
        case "max":
          return d3.max(values, (d) => d[xyVar]);
        case "avg":
          return d3.mean(values, (d) => d[xyVar]);
        case "sum":
          return d3.sum(values, (d) => d[xyVar]);
        default:
          return 0; // no agg applied yet
      }
    }
    return 0; // values is empty
  }

  /**
   * Returns string of float rounded to up to 2 decimals formatted with suffix.
   *   e.g. 10,000,000 => 10M; 12,345.6789 => 12.35K
   */
  formatLargeNum(d: number) {
    if (d === 0) return "0";
    if (!d) return "";
    
    // Handle negative numbers
    const isNegative = d < 0;
    const absD = Math.abs(d);
    
    let digits = (Math.log(absD) * Math.LOG10E + 1) | 0;
    let result = "";
    
    if (digits >= 13) {
      result = `${Math.round((absD / 1000000000000 + Number.EPSILON) * 100) / 100}T`;
    } else if (digits >= 10) {
      result = `${Math.round((absD / 1000000000 + Number.EPSILON) * 100) / 100}B`;
    } else if (digits >= 7) {
      result = `${Math.round((absD / 1000000 + Number.EPSILON) * 100) / 100}M`;
    } else if (digits >= 4) {
      result = `${Math.round((absD / 1000 + Number.EPSILON) * 100) / 100}K`;
    } else {
      result = `${Math.round((absD + Number.EPSILON) * 100) / 100}`;
    }
    
    return isNegative ? `-${result}` : result;
  }



  /**
   * Returns new message object for communicating with backend server.
   * This is the standardized method for all interaction messages.
   */
  initializeNewMessage(context: any, interactionType?: string, data: any = {}): Message {
    const participantId = localStorage.getItem('userId') || "anonymous";
    const timestamp = this.getCurrentTimestamp();
    
    // Get current app state from context if available
    const appMode = context?.global?.appMode || this.appMode;
    const appType = context?.global?.appType || this.appType;
    const appLevel = context?.global?.appLevel || this.appLevel;
    const chartType = context?.currentPlotType || context?.appConfig?.[context?.global?.appMode]?.["chartType"] || '';

    return {
      appMode,
      appType,
      appLevel,
      chartType,
      interactionType: interactionType || '',
      interactionDuration: 0,
      interactionAt: timestamp.readable,
      participantId,
      data,
      createdAt: timestamp.unix,
      createdAtReadable: timestamp.readable,
      createdAtLocal: timestamp.local,
      eventX: 0,
      eventY: 0,
       group: APP_GROUP_NAME
    } as Message;
  }

  /**
   * Colors a data point based on interaction patterns
   */
  colorDataPoint(context, dataPoint, dataList) {
    // Simplified color assignment - just assign white as default
    if (dataPoint && !dataPoint.hasOwnProperty("color")) {
      dataPoint["color"] = "white";
    }
  }

  /**
   * Validates and standardizes interaction message before sending
   */
  validateAndStandardizeMessage(message) {
    // Ensure required fields exist
    if (!message.interactionType) {
      console.warn("Interaction message missing interactionType:", message);
      return false;
    }
    
    // Ensure data object exists with standard fields
    if (!message.data) {
      message.data = {};
    }
    
    // Standardize common fields
    if (!message.data.hasOwnProperty('eventX')) message.data.eventX = null;
    if (!message.data.hasOwnProperty('eventY')) message.data.eventY = null;
    
    // Ensure timing fields
    if (!message.interactionAt) message.interactionAt = this.getCurrentTime();
    if (!message.interactionDuration) message.interactionDuration = 0;
    
    // Ensure participant ID
    if (!message.participantId) message.participantId = "anonymous";
    
    // Ensure group
    if (!message.group) message.group = APP_GROUP_NAME;
    

    return true;
  }

  /**
   * Adds the selected item to an object of selected datapoints.
   */
  clickAddItem(context, event, d) {
    let dataset = context.appConfig[context.global.appMode];
    const id = d[dataset["primaryKey"]];
    if (id !== "-" && !dataset["selectedObjects"].hasOwnProperty(id)) {
      // id is valid and does not exist yet in selectedObjects
      d["selected"] = true;
      dataset["selectedObject"] = d;
      dataset["selectedObjects"][id] = d;
      context.userConfig["originalDatasetDict"][id]["selected"] = true;
      /* Prepare and Send New Message - Start */
      let message = this.initializeNewMessage(context);
      message.interactionType = InteractionTypes.CLICK_ADD_ITEM;
      message.data["id"] = id;
      message.data["x"] = {
        name: dataset["xVar"],
        value: d["xVar"],
      };
      message.data["y"] = {
        name: dataset["yVar"],
        value: d["yVar"],
      };
      message.data["eventX"] = event.clientX;
      message.data["eventY"] = event.clientY;
      
      // Validate and send
      if (this.validateAndStandardizeMessage(message)) {
        context.chatService.sendStandardizedInteraction(message);
      }
      /* Prepare and Send New Message - End */
    }
  }

  /**
   * Removes the selected item from the object of selected datapoints.
   */
  clickRemoveItem(context, event, d) {
    let dataset = context.appConfig[context.global.appMode];
    const id = d[dataset["primaryKey"]];
    if (id !== "-" && dataset["selectedObjects"].hasOwnProperty(id)) {
      // id is valid and already exists in selectedObjects
      d["selected"] = false;
      context.userConfig["originalDatasetDict"][id]["selected"] = false;
      delete dataset["selectedObjects"][id];
      /* Prepare and Send New Message - Start */
      let message = this.initializeNewMessage(context);
      message.interactionType = InteractionTypes.CLICK_REMOVE_ITEM;
      message.data["id"] = id;
      message.data["x"] = {
        name: dataset["xVar"],
        value: d["xVar"],
      };
      message.data["y"] = {
        name: dataset["yVar"],
        value: d["yVar"],
      };
      message.data["eventX"] = event.clientX;
      message.data["eventY"] = event.clientY;
      
      // Validate and send
      if (this.validateAndStandardizeMessage(message)) {
        context.chatService.sendStandardizedInteraction(message);
      }
      /* Prepare and Send New Message - End */
    }
  }

  /**
   * Adds all selected items to an object of selected datapoints.
   */
  clickGroup(context, event, meta) {
    let ids = [];
    let xValues = [];
    let yValues = [];
    let dataset = context.appConfig[context.global.appMode];
    if (dataset["selectedGroups"].hasOwnProperty(meta.binLabel)) {
      // remove group and un-select all points in the group
      delete dataset["selectedGroups"][meta.binLabel];
      
      const validDataPoints = meta.binData.filter(d => d[dataset["primaryKey"]] !== "-");
      
      meta.binData.forEach((d) => {
        const id = d[dataset["primaryKey"]];
        if (id !== "-") {
          // id is valid => push values sequentially, using index as 'key'
          ids.push(id);
          xValues.push(d["xVar"]);
          yValues.push(d["yVar"]);
          d["selected"] = false;
          if (dataset["selectedObjects"].hasOwnProperty(id)) {
            // delete id from selectedObjects
            delete dataset["selectedObjects"][id];
            context.userConfig["originalDatasetDict"][id]["selected"] = false;
            
          }
        }
      });
    } else {
      // add group and select all points in the group
      dataset["selectedGroups"][meta.binLabel] = meta.binData;
      
      
      meta.binData.forEach((d) => {
        const id = d[dataset["primaryKey"]];
        if (id !== "-") {
          // id is valid => push values sequentially, using index as 'key'
          ids.push(id);
          xValues.push(d["xVar"]);
          yValues.push(d["yVar"]);
          d["selected"] = true;
          
          
          if (!dataset["selectedObjects"].hasOwnProperty(id)) {
            // add id to selectedObjects
            dataset["selectedObjects"][id] = d;
            context.userConfig["originalDatasetDict"][id]["selected"] = true;
          }
        }
      });
    }
    /* Prepare and Send New Message - Start */
    let message = this.initializeNewMessage(context);
    message.interactionType = InteractionTypes.CLICK_GROUP;
    message.data["id"] = ids;
    message.data["x"] = {
      name: dataset["xVar"],
      value: xValues,
    };
    message.data["y"] = {
      name: dataset["yVar"],
      value: yValues,
    };
    message.data["agg"] = {
      name: meta.aggName, // aggregation applied to the bucket
      axis: meta.aggAxis, // axis the aggregation is applied to
      value: meta.binValue, // Value of the aggregation
      label: meta.binLabel, // label of the bucket the agg was applied to
    };
    message.data["eventX"] = event.clientX;
    message.data["eventY"] = event.clientY;
    
    // Validate and send
    if (this.validateAndStandardizeMessage(message)) {
      context.chatService.sendStandardizedInteraction(message);
    }
    /* Prepare and Send New Message - End */
  }

  /**
   * Adds the hovered item to an object of hovered datapoints.
   */
  mouseoverItem(context, event, d, element = null, styleAttr = null) {
    let dataset = context.appConfig[context.global.appMode];
    context.userConfig["hoverStartTime"] = this.getCurrentTime();
    if (!context.userConfig["hoverTimer"]) {
      // no hover timer function yet => set one to act after delay
      let this_ = this;
      dataset["hoveredObject"] = d; // add data to details table
      const delay = 350; // 350 ms delay before hover counts as an interaction
      context.userConfig["hoverTimer"] = setTimeout(function () {
        context.userConfig["hoverTimer"] = null;
        /* Prepare and Send New Message - Start */
        let message = this_.initializeNewMessage(context);
        let startTime = context.userConfig["hoverStartTime"];
        let currentTime = this_.getCurrentTime();
        message.interactionDuration = currentTime - startTime;
        message.interactionType = InteractionTypes.MOUSEOVER_ITEM;
        message.data["id"] = d[dataset["primaryKey"]];
        message.data["x"] = {
          name: dataset["xVar"],
          value: d["xVar"],
        };
        message.data["y"] = {
          name: dataset["yVar"],
          value: d["yVar"],
        };
        message.data["eventX"] = event.clientX;
        message.data["eventY"] = event.clientY;
        
        // Validate and send
        if (this_.validateAndStandardizeMessage(message)) {
          context.chatService.sendStandardizedInteraction(message);
        }
        /* Prepare and Send New Message - End */
      }, delay);
    }
  }

  /**
   * Removes the hovered item from the object of hovered datapoints.
   */
  mouseoutItem(context, event, d) {
    let dataset = context.appConfig[context.global.appMode];
    dataset["hoveredObject"] = { hovered: false }; // remove point from table
    if (context.userConfig["hoverTimer"]) {
      // Hover was not long enough => reset for next hover
      clearTimeout(context.userConfig["hoverTimer"]);
      context.userConfig["hoverTimer"] = null;
    } else {
      // Hover was long enough => count as an interaction, update server
      /* Prepare and Send New Message - Start */
      let message = this.initializeNewMessage(context);
      let startTime = context.userConfig["hoverStartTime"];
      let currentTime = this.getCurrentTime();
      message.interactionDuration = currentTime - startTime;
      message.interactionType = InteractionTypes.MOUSEOUT_ITEM;
      message.data["id"] = d[dataset["primaryKey"]];
      message.data["x"] = {
        name: dataset["xVar"],
        value: d["xVar"],
      };
      message.data["y"] = {
        name: dataset["yVar"],
        value: d["yVar"],
      };
      message.data["eventX"] = event.clientX;
      message.data["eventY"] = event.clientY;
      
      // Validate and send
      if (this.validateAndStandardizeMessage(message)) {
        context.chatService.sendStandardizedInteraction(message);
      }
      /* Prepare and Send New Message - End */
    }
  }

  /**
   * Adds all hovered items to an object of hovered datapoints.
   */
  mouseoverGroup(context, event, element, meta) {
    let dataPointIDs = [];
    let xValues = [];
    let yValues = [];
    let dataset = context.appConfig[context.global.appMode];
    let originalDatasetDict = context.userConfig["originalDatasetDict"];
    
    // Check if we're already hovering over the same bar to prevent continuous interactions
    if (context.userConfig["lastHoveredBar"] === meta.binLabel) {
      return; // Already hovering over this bar, don't trigger again
    }
    
    // update hovered Objects and collect them for server
    dataset["hoveredObjects"]["binName"] = meta.binLabel;
    switch (meta.aggAxis) {
      case "x-axis":
        dataset["hoveredObjects"]["binAttr"] = dataset["yVar"];
        break;
      case "y-axis":
        dataset["hoveredObjects"]["binAttr"] = dataset["xVar"];
        break;
    }
    let hoveredPoints = dataset["hoveredObjects"]["points"];
    meta.binData.forEach((d) => {
      const id = d[dataset["primaryKey"]];
      if (id !== "-") {
        let dataPoint = originalDatasetDict[id];
        if (meta.aggName == "min" || meta.aggName == "max") {
          // only add points if they are equal to the min or max value
          if (meta.aggAxis == "x-axis" && dataPoint[dataset["xVar"]] === meta.binValue) {
            // order of insertion is preserved for the server! super important!!
            dataPointIDs.push(id);
            xValues.push(d["xVar"]);
            yValues.push(d["yVar"]);
            // use dict OBJECT to update source data by reference!
            hoveredPoints[id] = dataPoint; // add new points to details table
          } else if (meta.aggAxis == "y-axis" && dataPoint[dataset["yVar"]] === meta.binValue) {
            // order of insertion is preserved for the server! super important!!
            dataPointIDs.push(id);
            xValues.push(d["xVar"]);
            yValues.push(d["yVar"]);
            // use dict OBJECT to update source data by reference!
            hoveredPoints[id] = dataPoint; // add new points to details table
          }
        } else {
          // order of insertion is preserved for the server! super important!!
          dataPointIDs.push(id);
          xValues.push(d["xVar"]);
          yValues.push(d["yVar"]);
          // use dict OBJECT to update source data by reference!
          hoveredPoints[id] = dataPoint; // add new points to details table
        }
      }
    });
    // remove existing hovered points if they aren't in the new hover group!
    Object.keys(hoveredPoints).forEach((id) => {
      if (dataPointIDs.indexOf(id) === -1) {
        delete hoveredPoints[id];
      }
    });
    context.userConfig["hoverStartTime"] = this.getCurrentTime();
    if (!context.userConfig["hoverTimer"]) {
      // no hover timer function yet => set one to act after delay
      let this_ = this;
      const delay = 350; // 350 ms delay before hover counts as an interaction
      context.userConfig["hoverTimer"] = setTimeout(function () {
        // reset timer function and set hovered object properties for point
        context.userConfig["hoverTimer"] = null;
        
        // Mark this bar as the last hovered bar to prevent continuous interactions
        context.userConfig["lastHoveredBar"] = meta.binLabel;
        
        /* Prepare and Send New Message - Start */
        let message = this_.initializeNewMessage(context);
        let startTime = context.userConfig["hoverStartTime"];
        let currentTime = this_.getCurrentTime();
        message.interactionDuration = currentTime - startTime;
        message.interactionType = InteractionTypes.MOUSEOVER_GROUP;
        message.data["id"] = dataPointIDs;
        message.data["x"] = {
          name: dataset["xVar"],
          value: xValues,
        };
        message.data["y"] = {
          name: dataset["yVar"],
          value: yValues,
        };
        message.data["agg"] = {
          name: meta.aggName, // aggregation applied to the bucket
          axis: meta.aggAxis, // axis the aggregation is applied to
          value: meta.binValue, // Value of the aggregation
          label: meta.binLabel, // label of the bucket the agg was applied to
        };
        message.data["eventX"] = event.clientX;
        message.data["eventY"] = event.clientY;
        
        // Validate and send
        if (this_.validateAndStandardizeMessage(message)) {
          context.chatService.sendStandardizedInteraction(message);
        }
        /* Prepare and Send New Message - End */
      }, delay);
    }
  }

  /**
   * Removes all hovered items from the object of hovered datapoints.
   */
  mouseoutGroup(context, event, meta) {
    let dataset = context.appConfig[context.global.appMode];
    let originalDatasetDict = context.userConfig["originalDatasetDict"];
    
    // Reset the last hovered bar to allow new hover interactions
    context.userConfig["lastHoveredBar"] = null;
    
    // clear hovered Objects
    dataset["hoveredObjects"]["binName"] = null;
    dataset["hoveredObjects"]["binAttr"] = null;
    dataset["hoveredObjects"]["points"] = {};

    // clear hover timer if it exists
    if (context.userConfig["hoverTimer"]) {
      clearTimeout(context.userConfig["hoverTimer"]);
      context.userConfig["hoverTimer"] = null;
    }

    // Bars should remain white always - no color changes needed

    // collect data point IDs for server
    let dataPointIDs = [];
    let xValues = [];
    let yValues = [];
    meta.binData.forEach((d) => {
      const id = d[dataset["primaryKey"]];
      if (id !== "-") {
        let dataPoint = originalDatasetDict[id];
        if (meta.aggName == "min" || meta.aggName == "max") {
          // only add points if they are equal to the min or max value
          if (meta.aggAxis == "x-axis" && dataPoint[dataset["xVar"]] === meta.binValue) {
            dataPointIDs.push(id);
            xValues.push(d["xVar"]);
            yValues.push(d["yVar"]);
          } else if (meta.aggAxis == "y-axis" && dataPoint[dataset["yVar"]] === meta.binValue) {
            dataPointIDs.push(id);
            xValues.push(d["xVar"]);
            yValues.push(d["yVar"]);
          }
        } else {
          dataPointIDs.push(id);
          xValues.push(d["xVar"]);
          yValues.push(d["yVar"]);
        }
      }
    });

    /* Prepare and Send New Message - Start */
    let message = this.initializeNewMessage(context);
    let startTime = context.userConfig["hoverStartTime"];
    let currentTime = this.getCurrentTime();
    message.interactionDuration = currentTime - startTime;
    message.interactionType = InteractionTypes.MOUSEOUT_GROUP;
    message.data["id"] = dataPointIDs;
    message.data["x"] = {
      name: dataset["xVar"],
      value: xValues,
    };
    message.data["y"] = {
      name: dataset["yVar"],
      value: yValues,
    };
    message.data["agg"] = {
      name: meta.aggName, // aggregation applied to the bucket
      axis: meta.aggAxis, // axis the aggregation is applied to
      value: meta.binValue, // Value of the aggregation
      label: meta.binLabel, // label of the bucket the agg was applied to
    };
    message.data["eventX"] = event.clientX;
    message.data["eventY"] = event.clientY;
    
    // Validate and send
    if (this.validateAndStandardizeMessage(message)) {
      context.chatService.sendStandardizedInteraction(message);
    }
    /* Prepare and Send New Message - End */
  }
}