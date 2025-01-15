// src/ui/TreeItems.js
const vscode = require("vscode");

class SidebarItem extends vscode.TreeItem {
  constructor(label, command) {
    super(label);
    this.command = {
      command,
      title: label,
    };
  }
}

class SidebarGroupItem extends vscode.TreeItem {
  constructor(label, children) {
    super(
      label,
      children === undefined ? vscode.TreeItemCollapsibleState.None 
                           : vscode.TreeItemCollapsibleState.Expanded
    );
    this.children = children;
  }
}

class ProjectItem extends vscode.TreeItem {
  constructor(label, projectId, files) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.projectId = projectId;
    this.files = files;
    this.contextValue = 'project';
    
    this.command = {
      command: 'extension.viewProject',
      title: 'View Project',
      arguments: [this]
    };
  }
}

module.exports = {
  SidebarItem,
  SidebarGroupItem,
  ProjectItem
};
