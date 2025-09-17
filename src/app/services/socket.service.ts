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
    
    // Safe access to socket options
    if (this.vizSocket && this.vizSocket.ioSocket && this.vizSocket.ioSocket.opts) {
    } else {
      console.log('Socket not yet initialized, checking config...');
      console.log('Socket service available:', !!this.vizSocket);
    }
    
    this.vizSocket.connect();
    
    // Debug connection events
    this.vizSocket.on('connect', () => {
    });
    
    this.vizSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      if (error.type) console.error('Error type:', error.type);
      if (error.description) console.error('Error description:', error.description);
    });
    
    this.vizSocket.on('disconnect', (reason) => {
      console.warn('🔌 Socket disconnected:', reason);
    });
    
    this.vizSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });
    
    this.vizSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket reconnection attempt:', attemptNumber);
    });
    
    this.vizSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
    });
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
    
    // Check connection status using the underlying ioSocket
    const isConnected = this.vizSocket.ioSocket && 
                       (this.vizSocket.ioSocket.connected || 
                        this.vizSocket.ioSocket.readyState === 'open');
    
    if (!isConnected) {
      console.error('❌ Cannot send interaction - socket not connected');
      console.log('Attempting to reconnect...');
      this.vizSocket.connect();
      return;
    }
    
    this.vizSocket.emit("recieve_interaction", payload);
    console.log('Interation type:', payload.interactionType);
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

  getAttributeDistribution() {
    return this.vizSocket
      .fromEvent("attribute_distribution")
      .pipe(map((obj) => obj));
  }

  sendQuestionResponse(questionId: string, question: string, response: string) {
    const userId = localStorage.getItem('userId');
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