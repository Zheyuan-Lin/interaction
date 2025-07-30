// libraries
import { Injectable } from "@angular/core";
import { Socket } from "ngx-socket-io";
import { map } from "rxjs/operators";
import { SessionPage, InteractionTypes } from "../models/config";
import { Observable, Subject } from "rxjs";

@Injectable()
export class ChatService {
  constructor(
    private vizSocket: Socket,
    private global: SessionPage
  ) {}

  // Add getter for socket ID
  getSocketId(): string {
    return this.vizSocket?.ioSocket?.id || 'not_connected';
  }

  connectToSocket() {
    console.log('Attempting to connect to socket...');
    
    // Add connection options for security
    this.vizSocket.ioSocket.io.opts = {
      ...this.vizSocket.ioSocket.io.opts,
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: true,
      rejectUnauthorized: false,
      secure: true
    };

    // Set up connection event handlers before connecting
    this.vizSocket.on('connect', () => {
      // Wait for next tick to ensure socket ID is available
      setTimeout(() => {
        const socketId = this.vizSocket.ioSocket.id;
        console.log('Socket connected successfully with ID:', socketId);
        // Request attribute distribution on connect with socket ID
        this.vizSocket.emit('request_attribute_distribution', { socketId });
      }, 100); // Increased timeout to ensure socket is fully initialized
    });

    this.vizSocket.on('connect_error', (error) => {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        this.vizSocket.connect();
      }, 5000);
    });

    this.vizSocket.on('disconnect', (reason) => {
      const socketId = this.vizSocket.ioSocket.id;
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.vizSocket.connect();
      }
    });

    this.vizSocket.on('error', (error) => {
      // Socket error handling
    });

    // Listen for attribute distribution updates
    this.vizSocket.on('attribute_distribution', (data) => {
      const socketId = this.vizSocket.ioSocket.id;
      // Emit the data through the observable
      this.attributeDistributionSubject.next(data);
    });

    // Add ping/pong monitoring
    this.vizSocket.ioSocket.io.on('ping', () => {
      // Ping monitoring
    });

    this.vizSocket.ioSocket.io.on('pong', (latency) => {
      // Pong monitoring
    });

    // Now connect after setting up all event handlers
    this.vizSocket.connect();
  }

  removeAllListenersAndDisconnectFromSocket() {
    this.vizSocket.removeAllListeners();
    this.vizSocket.disconnect();
  }

  sendMessageToSaveSessionLogs(data, participantId) {
    let payload = {
      data: data,
      participantId: participantId,
    };
    this.vizSocket.emit("on_session_end_page_level_logs", payload);
  }

  sendMessageToSaveLogs() {
    this.vizSocket.emit("on_save_logs", null);
  }

  sendMessageToRestartBiasComputation() {
    this.vizSocket.emit("on_reset_bias_computation", null);
  }

  sendInteractionResponse(payload) {
    this.vizSocket.emit("on_interaction", payload);
  }

  sendInteraction(payload) {  
    this.vizSocket.emit("recieve_interaction", payload);
  }

  // Document Interaction Methods
  sendDocumentInteraction(interactionType: string, data: any) {
    const participantId = localStorage.getItem('userId') || "anonymous";
    const payload = {
      interactionType: interactionType,
      data: data,
      participantId: participantId,
      interactionAt: new Date().toISOString(),
      appMode: this.global.appMode,
      appType: this.global.appType,
      appLevel: this.global.appLevel,
      group: "control"  // Add the group field that server expects
    };
    this.vizSocket.emit("recieve_interaction", payload);
  }

  // Filter Interactions
  sendFilterAdded(attribute: string) {
    this.sendDocumentInteraction(InteractionTypes.ADD_FILTER, {
      attribute: attribute,
      action: 'added'
    });
  }

  sendFilterRemoved(attribute: string) {
    this.sendDocumentInteraction(InteractionTypes.REMOVE_FILTER, {
      attribute: attribute,
      action: 'removed'
    });
  }

  sendFilterChanged(attribute: string, filterValue: any, filterType: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_FILTER, {
      attribute: attribute,
      value: filterValue,
      filterType: filterType
    });
  }

  sendAllFiltersRemoved() {
    this.sendDocumentInteraction(InteractionTypes.REMOVE_ALL_FILTERS, {
      action: 'removed_all'
    });
  }

  // Encoding Interactions
  sendAxisAttributeChanged(axis: string, attribute: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_AXIS_ATTRIBUTE, {
      axisChanged: axis,
      attribute: attribute
    });
  }

  sendAxesSwapped() {
    this.sendDocumentInteraction(InteractionTypes.SWAP_AXES_ATTRIBUTES, {
      action: 'swapped'
    });
  }

  sendAggregationChanged(aggregationType: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_AGGREGATION, {
      aggregationType: aggregationType
    });
  }

  sendChartTypeChanged(chartType: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_CHART_TYPE, {
      chartType: chartType
    });
  }

  sendAllEncodingsRemoved() {
    this.sendDocumentInteraction(InteractionTypes.REMOVE_ALL_ENCODINGS, {
      action: 'removed_all'
    });
  }

  // Color Mode Interactions
  sendVisColorByModeChanged(mode: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_VIS_COLOR_BY_MODE, {
      mode: mode
    });
  }

  sendAttributeColorByModeChanged(mode: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_ATTRIBUTE_COLOR_BY_MODE, {
      mode: mode
    });
  }

  // Sort Interactions
  sendAttributePanelSortChanged(sortType: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_ATTRIBUTE_PANEL_SORT, {
      sortType: sortType
    });
  }

  sendDistributionPanelSortChanged(sortType: string) {
    this.sendDocumentInteraction(InteractionTypes.CHANGE_DISTRIBUTION_PANEL_SORT, {
      sortType: sortType
    });
  }

  // Awareness Panel Interactions
  sendAttributeAccordionToggled(attribute: string, action: string) {
    this.sendDocumentInteraction(InteractionTypes.TOGGLE_ATTRIBUTE_ACCORDION_AWARENESS_PANEL, {
      attribute: attribute,
      action: action
    });
  }

  sendAllAttributeAccordionToggled(action: string) {
    this.sendDocumentInteraction(InteractionTypes.TOGGLE_ALL_ATTRIBUTE_ACCORDION_AWARENESS_PANEL, {
      action: action
    });
  }

  sendAttributeBookmarkToggled(attribute: string, action: string) {
    this.sendDocumentInteraction(InteractionTypes.TOGGLE_ATTRIBUTE_BOOKMARK_AWARENESS_PANEL, {
      attribute: attribute,
      action: action
    });
  }

  sendAllAttributeBookmarkToggled(action: string) {
    this.sendDocumentInteraction(InteractionTypes.TOGGLE_ALL_ATTRIBUTE_BOOKMARK_AWARENESS_PANEL, {
      action: action
    });
  }

  getDisconnectEventResponse() {
    return this.vizSocket.fromEvent("disconnect").pipe(map((obj) => obj));
  }

  getConnectEventResponse() {
    return this.vizSocket.fromEvent("connect").pipe(map((obj) => obj));
  }

  getInteractionResponse() {
    return this.vizSocket
      .fromEvent("interaction_response")
      .pipe(map((obj) => obj));
  }

  // Add a Subject for attribute distribution
  private attributeDistributionSubject = new Subject<any>();

  // Update the getAttributeDistribution method to use the Subject
  getAttributeDistribution() {
    return this.attributeDistributionSubject.asObservable();
  }

  sendQuestionResponse(questionId: string, question: string, response: string) {
    const userId = localStorage.getItem('userId') || "anonymous";
    const payload = {
      question_id: questionId,
      response: response,
      question: question,
      participant_id: userId,
      timestamp: new Date().toISOString()
    };
    this.vizSocket.emit("on_question_response", payload);
  }

  getExternalQuestion() {
    return this.vizSocket.fromEvent("question").pipe(map((obj) => {
      return obj;
    }));
  }
  

  sendInsights(payload) {
    this.vizSocket.emit("on_insight", payload);
  }
}