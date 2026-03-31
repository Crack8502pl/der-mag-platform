// src/services/PermissionBroadcastService.ts
// Service for broadcasting permission updates to connected SSE clients

import { Response } from 'express';

interface SSEClient {
  roleId: number;
  res: Response;
}

class PermissionBroadcastService {
  private clients: Set<SSEClient> = new Set();

  /**
   * Add a new SSE client connection
   */
  addClient(roleId: number, res: Response): SSEClient {
    const client: SSEClient = { roleId, res };
    this.clients.add(client);
    return client;
  }

  /**
   * Remove an SSE client connection
   */
  removeClient(client: SSEClient): void {
    this.clients.delete(client);
  }

  /**
   * Broadcast permission update to all clients with the given roleId
   */
  broadcastRoleUpdate(roleId: number): void {
    const payload = JSON.stringify({ type: 'permission-update', roleId });
    const message = `data: ${payload}\n\n`;

    for (const client of this.clients) {
      if (client.roleId === roleId) {
        try {
          client.res.write(message);
        } catch {
          // Client disconnected; will be cleaned up via 'close' event
        }
      }
    }
  }

  /**
   * Return number of connected clients (for diagnostics)
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const permissionBroadcastService = new PermissionBroadcastService();
