import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

export class RepositoryProvider {
  constructor() {
    this.baseDir = path.join(process.cwd(), '.sentinel-repos');
  }

  async _ensureBaseDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (e) {
      // Ignore
    }
  }

  async fetchRepository(repoUrl) {
    await this._ensureBaseDir();
    const id = crypto.createHash('md5').update(repoUrl).digest('hex');
    const repoPath = path.join(this.baseDir, id);
    
    try {
      await fs.stat(repoPath);
      // If exists, pull latest
      await execAsync('git pull', { cwd: repoPath });
    } catch (e) {
      // Clone if not exists
      await execAsync(`git clone --depth 50 ${repoUrl} ${id}`, { cwd: this.baseDir });
    }

    return { id, repoPath };
  }

  async getFiles(repoPath) {
    try {
      const { stdout } = await execAsync('git ls-files', { cwd: repoPath });
      const files = stdout.split('\n').filter(f => f.trim() !== '');
      return files;
    } catch (e) {
      return [];
    }
  }

  async getFileContent(repoPath, filePath) {
    try {
      const content = await fs.readFile(path.join(repoPath, filePath), 'utf-8');
      return content;
    } catch (e) {
      return null;
    }
  }

  async getHistory(repoPath) {
    try {
      // Get commit history with churn
      const { stdout } = await execAsync('git log --name-only --oneline -n 50', { cwd: repoPath });
      return stdout;
    } catch (e) {
      return '';
    }
  }
}

export const repositoryProvider = new RepositoryProvider();
