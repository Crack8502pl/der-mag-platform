// src/file-generator/webdav.server.ts
// WebDAV server for sharing generated files

import { v2 as webdav } from 'webdav-server';
import path from 'path';

let server: webdav.WebDAVServer | null = null;

/**
 * Start the WebDAV server
 * @param port - Port number to run the server on
 * @param rootPath - Root directory to serve files from
 * @returns Promise that resolves when the server is started
 */
export async function startServer(port: number, rootPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (server) {
        console.log('WebDAV server is already running');
        resolve();
        return;
      }

      // Create WebDAV server
      server = new webdav.WebDAVServer({
        port,
        requireAuthentification: false, // Set to true in production with proper auth
      });

      // Add physical file system
      server.setFileSystem('/generated', new webdav.PhysicalFileSystem(rootPath), (success) => {
        if (!success) {
          reject(new Error('Failed to set file system for WebDAV server'));
          return;
        }

        // Start the server
        server!.start(() => {
          console.log(`WebDAV server started on port ${port}`);
          console.log(`Serving files from: ${rootPath}`);
          console.log(`Access via: http://localhost:${port}/generated/`);
          resolve();
        });
      });

    } catch (error) {
      reject(new Error(`Failed to start WebDAV server: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Stop the WebDAV server
 * @returns Promise that resolves when the server is stopped
 */
export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      console.log('WebDAV server is not running');
      resolve();
      return;
    }

    try {
      server.stop(() => {
        console.log('WebDAV server stopped');
        server = null;
        resolve();
      });
    } catch (error) {
      console.error('Error stopping WebDAV server:', error);
      server = null;
      resolve();
    }
  });
}

/**
 * Check if the WebDAV server is running
 * @returns True if the server is running, false otherwise
 */
export function isRunning(): boolean {
  return server !== null;
}
