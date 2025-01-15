const vscode = require('vscode');
const { auth } = require('../config/firebase');
const ProjectManager = require('../services/ProjectManager');

class WebviewProvider {
    constructor(context) {
        this.context = context;
        this._panel = null;
    }

    showMainInterface() {
        if (this._panel) {
            this._panel.reveal();
            return;
        }

        this._panel = vscode.window.createWebviewPanel(
            'firebaseMain',
            'Firebase Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this._panel.webview.html = this._getMainInterfaceContent();

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'viewProjects':
                    this.showProjectsView();
                    break;
                    
                case 'saveProject':
                    try {
                        const projectName = await vscode.window.showInputBox({
                            prompt: "Enter a name for the project",
                            placeHolder: "My Project",
                            validateInput: text => text && text.length > 0 ? null : "Project name is required"
                        });

                        if (projectName) {
                            await ProjectManager.saveProject(projectName);
                            vscode.window.showInformationMessage(`Project "${projectName}" saved successfully!`);
                            // Refresh projects view if it's open
                            this._handleViewProjects();
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to save project: ${error.message}`);
                    }
                    break;
            }
        });

        this._panel.onDidDispose(() => {
            this._panel = null;
        });
    }

    async _handleViewProjects() {
        try {
            const projects = await ProjectManager.listProjects();
            if (this._panel) {
                this._panel.webview.postMessage({
                    command: 'displayProjects',
                    projects: projects.map(project => ({
                        ...project,
                        createdAt: project.createdAt?.toDate?.().toLocaleString() || 'Unknown date',
                        updatedAt: project.updatedAt?.toDate?.().toLocaleString() || 'Unknown date'
                    }))
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load projects: ${error.message}`);
        }
    }

    async _handleDeleteProject(projectId) {
        try {
            const confirmation = await vscode.window.showWarningMessage(
                'Are you sure you want to delete this project?',
                { modal: true },
                'Delete'
            );

            if (confirmation === 'Delete') {
                await ProjectManager.deleteProject(projectId);
                await this._handleViewProjects();
                vscode.window.showInformationMessage('Project deleted successfully');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete project: ${error.message}`);
        }
    }

    async _handleUpdateProject(projectId, projectName) {
        try {
            await ProjectManager.updateProject(projectId, projectName);
            await this._handleViewProjects();
            vscode.window.showInformationMessage('Project updated successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update project: ${error.message}`);
        }
    }

    showProjectsView() {
        // Dispose of existing panel if it exists
        if (this._panel) {
            this._panel.dispose();
        }

        this._panel = vscode.window.createWebviewPanel(
            'firebaseProjects',
            'Firebase Projects',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this._panel.webview.html = this._getProjectsViewContent();

        this._panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'deleteProject':
                    await this._handleDeleteProject(message.projectId);
                    break;
                case 'updateProject':
                    await this._handleUpdateProject(message.projectId, message.newName);
                    break;
                case 'refreshProjects':
                    await this._handleViewProjects();
                    break;
                case 'backToMain':
                    this.showMainInterface();
                    break;
            }
        });

        this._panel.onDidDispose(() => {
            this._panel = null;
        });

        this._handleViewProjects();
    }

    _getMainInterfaceContent() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .welcome-section {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-top: 30px;
                }
                .action-card {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                }
                .action-card:hover {
                    border-color: var(--vscode-button-background);
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 10px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="welcome-section">
                    <h1>Firebase Project Dashboard</h1>
                    <p>Manage your Firebase projects and configurations</p>
                </div>
                
                <div class="actions-grid">
                    <div class="action-card">
                        <h3>View Projects</h3>
                        <p>Browse and manage your saved projects</p>
                        <button onclick="viewProjects()">View Projects</button>
                    </div>
                    
                    <div class="action-card">
                        <h3>Save Current Project</h3>
                        <p>Save your current workspace as a project</p>
                        <button onclick="saveProject()">Save Project</button>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function viewProjects() {
                    vscode.postMessage({ command: 'viewProjects' });
                }
                
                function saveProject() {
                    vscode.postMessage({ command: 'saveProject' });
                }
            </script>
        </body>
        </html>`;
    }

    _getProjectsViewContent() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .nav-buttons {
                    display: flex;
                    gap: 10px;
                }
                .project-grid {
                    display: grid;
                    gap: 20px;
                }
                .project-card {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 8px;
                    padding: 20px;
                }
                .project-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .project-title {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: var(--vscode-foreground);
                }
                .project-dates {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    margin: 10px 0;
                }
                .files-list {
                    margin: 15px 0;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 4px;
                    padding: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .file-item {
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                .file-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .delete-btn {
                    background-color: var(--vscode-errorForeground);
                }
                .delete-btn:hover {
                    opacity: 0.9;
                }
                .no-projects {
                    text-align: center;
                    padding: 40px;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Firebase Projects</h1>
                    <div class="nav-buttons">
                        <button onclick="backToMain()">Back to Dashboard</button>
                        <button onclick="refreshProjects()">Refresh</button>
                    </div>
                </div>
                <div id="projects-container" class="project-grid">
                    <div class="no-projects">Loading projects...</div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function refreshProjects() {
                    vscode.postMessage({ command: 'refreshProjects' });
                }

                function backToMain() {
                    vscode.postMessage({ command: 'backToMain' });
                }

                function deleteProject(projectId) {
                    vscode.postMessage({ command: 'deleteProject', projectId: projectId });
                }

                function updateProject(projectId) {
                    const newName = prompt('Enter new project name:');
                    if (newName) {
                        vscode.postMessage({ 
                            command: 'updateProject', 
                            projectId: projectId,
                            newName: newName 
                        });
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'displayProjects':
                            displayProjects(message.projects);
                            break;
                    }
                });

                function displayProjects(projects) {
                    const container = document.getElementById('projects-container');
                    
                    if (!projects || projects.length === 0) {
                        container.innerHTML = '<div class="no-projects">No projects found</div>';
                        return;
                    }

                    container.innerHTML = projects.map(project => \`
                        <div class="project-card">
                            <div class="project-header">
                                <div class="project-title">\${project.projectName}</div>
                                <div class="actions">
                                    <button onclick="updateProject('\${project.id}')">Update</button>
                                    <button class="delete-btn" onclick="deleteProject('\${project.id}')">Delete</button>
                                </div>
                            </div>
                            <div class="project-dates">
                                Created: \${project.createdAt}<br>
                                Last Updated: \${project.updatedAt}
                            </div>
                            <div class="files-section">
                                <strong>Project Files:</strong>
                                <div class="files-list">
                                    \${project.files ? project.files.map(file => \`
                                        <div class="file-item">\${file}</div>
                                    \`).join('') : '<div class="no-files">No files found</div>'}
                                </div>
                            </div>
                        </div>
                    \`).join('');
                }
            </script>
        </body>
        </html>`;
    }
}

module.exports = WebviewProvider;