// src/ui/SidebarProvider.js
const vscode = require("vscode");
const ProjectManager = require("../services/ProjectManager");
const { auth } = require("../config/firebase");
const { debugLog } = require("../utils/debug");
const { SidebarItem, SidebarGroupItem, ProjectItem } = require("./TreeItems");

class SidebarProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.lastRefreshTime = 0;
    this.isRefreshing = false;
  }

  async refresh() {
    const now = Date.now();
    if (this.isRefreshing || (now - this.lastRefreshTime) < 2000) {
      return;
    }

    try {
      this.isRefreshing = true;
      this._onDidChangeTreeData.fire();
      this.lastRefreshTime = now;
    } finally {
      this.isRefreshing = false;
    }
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren() {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return [
          new SidebarItem("Login with Google", "extension.login"),
        ];
      }

      if (!this._cachedProjects || (Date.now() - this._lastCacheTime) > 5000) {
        this._cachedProjects = await ProjectManager.listProjects();
        this._lastCacheTime = Date.now();
      }

      // Create project items with delete functionality
      const projectItems = this._cachedProjects.map(project => {
        const item = new ProjectItem(project.projectName, project.id, project.files);
        item.contextValue = 'project'; // This enables context menu items
        return item;
      });
      
      return [
        new SidebarGroupItem("My Projects", projectItems),
        new SidebarItem("Save New Project", "extension.saveProject"),
        new SidebarItem("View All Projects", "extension.viewAllProjects"),
        new SidebarItem("Delete Project", "extension.deleteProject"),
        new SidebarItem("Logout", "extension.logout"),
      ];
    } catch (error) {
      debugLog('Error in getChildren:', error.message);
      return [];
    }
  }
}

module.exports = SidebarProvider;
