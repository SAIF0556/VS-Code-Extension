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
    this._isLoading = false;
    this._initialized = false;
    this._cachedProjects = [];
    this._lastRefreshTime = 0;
    this._refreshTimeout = null;

    // Set up auth state listener
    auth.onAuthStateChanged((user) => {
      debugLog('Auth state changed in SidebarProvider:', user ? `User logged in: ${user.email}` : 'User logged out');
      this._initialized = true;
      this._triggerRefresh();
    });
  }

  _triggerRefresh() {
    // Clear any pending refresh
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }

    // Debounce refresh to prevent multiple rapid updates
    this._refreshTimeout = setTimeout(() => {
      this._onDidChangeTreeData.fire();
      this._refreshTimeout = null;
    }, 1000);
  }

  async _fetchProjects() {
    // Only fetch if enough time has passed since last fetch
    const now = Date.now();
    if (now - this._lastRefreshTime < 5000) {
      return this._cachedProjects;
    }

    try {
      this._isLoading = true;
      this._cachedProjects = await ProjectManager.listProjects();
      this._lastRefreshTime = now;
      return this._cachedProjects;
    } catch (error) {
      debugLog('Error fetching projects:', error.message);
      return [];
    } finally {
      this._isLoading = false;
    }
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren() {
    // If not initialized, show loading
    if (!this._initialized) {
      return [new SidebarItem("Initializing...", "")];
    }

    const user = auth.currentUser;
    
    // If not logged in, show login button
    if (!user) {
      return [new SidebarItem("Login with Google", "extension.login")];
    }

    try {
      // Fetch projects if needed
      const projects = await this._fetchProjects();

      // Create project items
      const projectItems = projects.map(project => {
        const item = new ProjectItem(project.projectName, project.id, project.files);
        item.contextValue = 'project';
        return item;
      });

      // Return the full sidebar structure
      return [
        new SidebarGroupItem("My Projects", projectItems.length > 0 ? projectItems : [
          new SidebarItem("No projects yet", "")
        ]),
        new SidebarItem("Save New Project", "extension.saveProject"),
        new SidebarItem("View All Projects", "extension.viewAllProjects"),
        new SidebarItem("Delete Project", "extension.deleteProject"),
        new SidebarItem("Logout", "extension.logout")
      ];
    } catch (error) {
      debugLog('Error in getChildren:', error.message);
      return [new SidebarItem("Error loading sidebar", "")];
    }
  }

  refresh() {
    this._lastRefreshTime = 0; // Reset cache timer to force refresh
    this._triggerRefresh();
  }
}

module.exports = SidebarProvider;