import type * as signalR from '@microsoft/signalr';

/**
 * Module-level singleton that holds the active SignalR hub connection.
 * Populated by useSignalR after successful connect. Read by other modules
 * (e.g. the matches page) to invoke hub methods without prop-drilling.
 */
export const hubConnection: { current: signalR.HubConnection | null } = { current: null };
