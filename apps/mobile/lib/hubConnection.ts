import type * as signalR from '@microsoft/signalr';

/** Module-level singleton, populated by useSignalR after connect. */
export const hubConnection: { current: signalR.HubConnection | null } = { current: null };
