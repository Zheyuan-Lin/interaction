// libraries
import { Injectable } from "@angular/core";
import { Socket } from "ngx-socket-io";
import { map } from "rxjs/operators";
import { SessionPage } from "../models/config";
import { Observable, Subject } from "rxjs";

@Injectable()
export class ChatService {
  constructor(
    private vizSocket: Socket,
    private global: SessionPage
  ) {}

  connectToSocket() {
    console.log('ChatService: Attempting to connect to socket...');
    this.vizSocket.connect();
  }

  getSocketId(): string {
    return this.vizSocket.ioSocket ? this.vizSocket.ioSocket.id : 'not_connected';
  }

  isConnected(): boolean {
    return this.vizSocket.ioSocket ? this.vizSocket.ioSocket.connected : false;
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
    console.log('Interaction:', payload.interactionType);
    // Note: We can't import UtilsService here due to circular dependency,
    // so validation is done at the calling site
    this.vizSocket.emit("on_interaction", payload);
  }

  sendStandardizedInteraction(payload) {
    console.log('Standardized Interaction:', payload.interactionType);
    // This is an alias for sendInteractionResponse for consistency
    this.vizSocket.emit("on_interaction", payload);
  }

  getDisconnectEventResponse() {
    return this.vizSocket.fromEvent("disconnect").pipe(map((obj) => {
      return obj;
    }));
  }

  getConnectEventResponse() {
    return this.vizSocket.fromEvent("connect").pipe(map((obj) => {
      return obj;
    }));
  }

  getInteractionResponse() {
    return this.vizSocket
      .fromEvent("interaction_response")
      .pipe(map((obj) => {
        return obj;
      }));
  }

  getAttributeDistribution() {
    return this.vizSocket
      .fromEvent("attribute_distribution")
      .pipe(map((obj) => {
        return obj;
      }));
  }

  getExternalQuestion() {
    console.log('ChatService: Setting up getExternalQuestion listener for "question"');
    return this.vizSocket
      .fromEvent("question")
      .pipe(map((obj) => {
        console.log('ChatService: Received external question:', obj);
        return obj;
      }));
  }

  // Debug method to listen for all events
  listenForAllEvents() {
    console.log('ChatService: Setting up debug listeners for common events...');
    
    // Listen for the exact event name from your example
    this.vizSocket.fromEvent("receive_external_question").subscribe((data) => {
      console.log('DEBUG: receive_external_question event received:', data);
    });
    
    // Also try some variations in case there's a naming issue
    this.vizSocket.fromEvent("external_question").subscribe((data) => {
      console.log('DEBUG: external_question event received:', data);
    });
    
    this.vizSocket.fromEvent("question").subscribe((data) => {
      console.log('DEBUG: question event received:', data);
    });
    
    this.vizSocket.fromEvent("on_external_question").subscribe((data) => {
      console.log('DEBUG: on_external_question event received:', data);
    });
  }

  sendInsights(payload) {
    this.vizSocket.emit("on_insight", payload);
  }

  sendQuestionResponse(payload) {
    this.vizSocket.emit("on_question_response", payload);
  }
}
