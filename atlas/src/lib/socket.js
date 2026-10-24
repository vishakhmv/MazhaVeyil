const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ResilientLiveHub {
  constructor(onEventCallback, onStatusChange) {
    this.onEvent = onEventCallback;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.pollTimer = null;
    this.lastEventId = 0;
    this.reconnectAttempts = 0;
    this.isManualClosed = false;
    this.connectionState = 'disconnected'; // 'connected' | 'polling' | 'disconnected'
  }

  connect() {
    this.isManualClosed = false;
    this._initWs();
  }

  _initWs() {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this._updateState('connected');
        this._stopPolling();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pledge') {
            this.onEvent(data);
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.ws.onerror = () => {
        this._handleDisconnect();
      };

      this.ws.onclose = () => {
        this._handleDisconnect();
      };
    } catch {
      this._handleDisconnect();
    }
  }

  _handleDisconnect() {
    if (this.isManualClosed) return;
    this._updateState('polling');
    this._startPollingFallback();

    // Try reconnecting WS with backoff
    const delay = Math.min(10000, 2000 * Math.pow(1.5, this.reconnectAttempts++));
    setTimeout(() => {
      if (!this.isManualClosed && this.connectionState !== 'connected') {
        this._initWs();
      }
    }, delay);
  }

  _startPollingFallback() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/events/poll?since=${this.lastEventId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          for (const ev of data.events) {
            this.onEvent(ev);
          }
          this.lastEventId = data.latest_id;
        }
      } catch {
        // network silent fail
      }
    }, 2500);
  }

  _stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  _updateState(state) {
    this.connectionState = state;
    if (this.onStatusChange) {
      this.onStatusChange(state);
    }
  }

  close() {
    this.isManualClosed = true;
    this._stopPolling();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    this._updateState('disconnected');
  }
}
