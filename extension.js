// extension.js
const vscode = require('vscode')
const SidebarProvider = require('./src/ui/SidebarProvider')
const WebviewProvider = require('./src/ui/WebviewProvider')
const ProjectManager = require('./src/services/ProjectManager')
const AuthService = require('./src/services/AuthService')
const { auth } = require('./src/config/firebase')
const { debugLog } = require('./src/utils/debug')

let globalTreeDataProvider
let webviewProvider

function activate(context) {
  debugLog('Activating extension')

  // Create output channel for debugging
  global._outputChannel = vscode.window.createOutputChannel(
    'Firebase Extension',
  )

  // Initialize providers
  globalTreeDataProvider = new SidebarProvider()
  webviewProvider = new WebviewProvider(context)

  // Register TreeView
  const treeView = vscode.window.createTreeView('firebaseSidebar', {
    treeDataProvider: globalTreeDataProvider,
  })

  context.subscriptions.push(treeView)

  // Register commands
  const commands = [
    vscode.commands.registerCommand('extension.login', () =>
      AuthService.login(webviewProvider),
    ),

    vscode.commands.registerCommand('extension.logout', async () => {
      await AuthService.logout()
    }),
     vscode.commands.registerCommand('extension.updateProject', async () => {
      try {
        const projects = await ProjectManager.listProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects to update.');
          return;
        }

        const projectItems = projects.map(p => ({
          label: p.projectName,
          id: p.id,
          description: p.workspacePath || 'Path not available'
        }));

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project to update'
        });

        if (selected) {
          const newName = await vscode.window.showInputBox({
            prompt: 'Enter new project name',
            placeHolder: selected.label,
            validateInput: text => text && text.length > 0 ? null : 'Project name is required'
          });

          if (newName) {
            await ProjectManager.updateProject(selected.id, newName);
            vscode.window.showInformationMessage(`Project renamed to "${newName}" successfully!`);
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to update project: ${error.message}`);
      }
    }),
    vscode.commands.registerCommand('extension.saveProject', async () => {
      try {
        const projectName = await vscode.window.showInputBox({
          prompt: 'Enter a name for the project',
          placeHolder: 'My Project',
          validateInput: (text) =>
            text && text.length > 0 ? null : 'Project name is required',
        })

        if (projectName) {
          await ProjectManager.saveProject(projectName)
          vscode.window.showInformationMessage(
            `Project "${projectName}" saved successfully!`,
          )
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save project: ${error.message}`,
        )
      }
    }),

    vscode.commands.registerCommand('extension.viewAllProjects', async () => {
      try {
        const projects = await ProjectManager.listProjects()
        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects found.')
          return
        }

        const projectsList = projects.map((project) => ({
          label: project.projectName,
          detail: `Created at: ${project.createdAt
            ?.toDate()
            .toLocaleDateString()}`,
        }))

        const selectedProject = await vscode.window.showQuickPick(
          projectsList,
          {
            placeHolder: 'Select a project to view',
          },
        )

        if (selectedProject) {
          vscode.window.showInformationMessage(
            `Viewing project: ${selectedProject.label}`,
          )
        }
      } catch (error) {
        // extension.js continued...

        vscode.window.showErrorMessage(
          `Failed to view projects: ${error.message}`,
        )
      }
    }),
     vscode.commands.registerCommand('extension.syncProject', async () => {
      try {
        const projects = await ProjectManager.listProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects to sync.');
          return;
        }

        const projectItems = projects.map(p => ({
          label: p.projectName,
          id: p.id,
          description: p.workspacePath || 'Path not available'
        }));

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project to sync'
        });

        if (selected) {
          await ProjectManager.syncProject(selected.id);
          vscode.window.showInformationMessage(`Project "${selected.label}" synced successfully!`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to sync project: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand('extension.deleteProject', async () => {
      try {
        const projects = await ProjectManager.listProjects()
        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects to delete.')
          return
        }

        const projectItems = projects.map((p) => ({
          label: p.projectName,
          id: p.id,
        }))

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project to delete',
        })

        if (selected) {
          const confirmed = await vscode.window.showWarningMessage(
            `Are you sure you want to delete "${selected.label}"?`,
            { modal: true },
            'Delete',
          )

          if (confirmed === 'Delete') {
            await ProjectManager.deleteProject(selected.id)
            vscode.window.showInformationMessage(
              `Project "${selected.label}" deleted successfully!`,
            )
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to delete project: ${error.message}`,
        )
      }
    })

    
  ]

  context.subscriptions.push(...commands)

  // Set up auth state listener
  auth.onAuthStateChanged(async (user) => {
    debugLog(
      'Auth state changed:',
      user ? `User logged in: ${user.email}` : 'User logged out',
    )
    if (!user) {
      // Clear webview when user logs out
      if (webviewProvider._panel) {
        webviewProvider._panel.dispose()
      }
    }
  })

  debugLog('Extension activated')
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
