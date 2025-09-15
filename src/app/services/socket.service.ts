// libraries
import { Injectable } from "@angular/core";
import { Socket } from "ngx-socket-io";
import { map } from "rxjs/operators";
import { SessionPage } from "../models/config";
import { Observable, Subject } from "rxjs";

@Injectable()
export class ChatService {
  // Add a Subject for attribute distribution
  private attributeDistributionSubject = new Subject<any>();

  constructor(
    private vizSocket: Socket,
    private global: SessionPage
  ) {}

  // Add getter for socket ID
  getSocketId(): string {
    const socketId = this.vizSocket?.ioSocket?.id;
    if (socketId) {
      return socketId;
    } else if (this.vizSocket?.ioSocket?.connected) {
      return 'connected_but_id_unavailable';
    } else {
      return 'not_connected';
    }
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
        if (socketId) {
          console.log('Socket connected successfully with ID:', socketId);
          // Request attribute distribution on connect with socket ID
          this.vizSocket.emit('request_attribute_distribution', { socketId });
        } else {
          console.log('Socket connected but ID not yet available, retrying...');
          // Retry after a longer delay
          setTimeout(() => {
            const retrySocketId = this.vizSocket.ioSocket.id;
            if (retrySocketId) {
              console.log('Socket ID retrieved on retry:', retrySocketId);
              this.vizSocket.emit('request_attribute_distribution', { socketId: retrySocketId });
            } else {
              console.log('Socket ID still not available, proceeding without it');
              this.vizSocket.emit('request_attribute_distribution', {});
            }
          }, 500);
        }
      }, 100);
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
    return this.attributeDistributionSubject.asObservable();
  }

  getExternalQuestion() {
    return this.vizSocket.fromEvent("question").pipe(map((obj) => {
      return obj;
    }));
  }

  sendInsights(payload) {
    this.vizSocket.emit("on_insight", payload);
  }

  sendQuestionResponse(payload) {
    this.vizSocket.emit("on_question_response", payload);
  }

  /**
   * Standardized method for sending all interaction messages.
   * This is the primary method that should be used for all user interactions.
   */
  sendStandardizedInteraction(message: any) {
    // Validate message before sending
    if (!message || !message.interactionType) {
      console.error('Invalid message: interactionType is required');
      return;
    }
    
    // Log the interaction for debugging
    console.log('Interaction:', message.interactionType);
    
    // Send via the standard interaction endpoint
    this.vizSocket.emit("on_interaction", message);
  }
}
