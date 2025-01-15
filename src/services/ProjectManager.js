const vscode = require("vscode");
const { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc,
    updateDoc,
    doc, 
    query, 
    where, 
    serverTimestamp 
} = require("firebase/firestore");
const { auth, db } = require("../config/firebase");
const { debugLog } = require("../utils/debug");

class ProjectManager {
    static async listProjects() {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }

            const projectsRef = collection(db, "projects");
            const q = query(projectsRef, where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            console.log('Projects fetched:', querySnapshot.size);
            
            const projects = querySnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Project data:', { id: doc.id, ...data });
                return {
                    id: doc.id,
                    ...data
                };
            });

            return projects;
        } catch (error) {
            console.error('Error listing projects:', error);
            throw new Error(`Failed to list projects: ${error.message}`);
        }
    }

    static async saveProject(projectName) {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error("No workspace is open");
            }

            const workspacePath = workspaceFolders[0].uri.fsPath;
            const projectFiles = await vscode.workspace.findFiles("**/*");
            const fileNames = projectFiles.map(file => 
                vscode.workspace.asRelativePath(file)
            );

            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }

            const docRef = await addDoc(collection(db, "projects"), {
                userId: user.uid,
                projectName,
                workspacePath,
                files: fileNames,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            debugLog('Project saved successfully:', docRef.id);
            return docRef.id;
        } catch (error) {
            debugLog('Error saving project:', error);
            throw new Error(`Failed to save project: ${error.message}`);
        }
    }

    static async updateProject(projectId, newName) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }

            // Verify project exists and belongs to user
            const projects = await this.listProjects();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                throw new Error("Project not found or access denied");
            }

            // Get current workspace path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error("No workspace is open");
            }

            const currentWorkspacePath = workspaceFolders[0].uri.fsPath;

            // Check if workspace path matches
            if (project.workspacePath && project.workspacePath !== currentWorkspacePath) {
                const openWorkspace = await vscode.window.showWarningMessage(
                    `This project was last saved in: ${project.workspacePath}\nCurrent workspace: ${currentWorkspacePath}`,
                    'Update Anyway',
                    'Cancel'
                );
                
                if (openWorkspace !== 'Update Anyway') {
                    throw new Error("Workspace mismatch - update cancelled");
                }
            }

            // Get updated file list
            const projectFiles = await vscode.workspace.findFiles("**/*");
            const fileNames = projectFiles.map(file => 
                vscode.workspace.asRelativePath(file)
            );

            // Update the project
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, {
                projectName: newName,
                workspacePath: currentWorkspacePath,
                files: fileNames,
                updatedAt: serverTimestamp()
            });

            debugLog('Project updated successfully:', projectId);
            
            // Show success message with file count
            vscode.window.showInformationMessage(
                `Project updated successfully. ${fileNames.length} files tracked.`
            );

        } catch (error) {
            debugLog('Error updating project:', error);
            throw new Error(`Failed to update project: ${error.message}`);
        }
    }

    static async deleteProject(projectId) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }

            // Verify project exists and belongs to user
            const projectRef = doc(db, "projects", projectId);
            const projects = await this.listProjects();
            const projectExists = projects.some(p => p.id === projectId);
            
            if (!projectExists) {
                throw new Error("Project not found or access denied");
            }

            // Delete the project
            await deleteDoc(projectRef);
            debugLog('Project deleted successfully:', projectId);
        } catch (error) {
            debugLog('Error deleting project:', error);
            throw new Error(`Failed to delete project: ${error.message}`);
        }
    }
     static async syncProject(projectId) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }

            // Verify project exists and belongs to user
            const projects = await this.listProjects();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                throw new Error("Project not found or access denied");
            }

            // Verify the workspace path exists
            if (!project.workspacePath) {
                throw new Error("Project workspace path not found");
            }

            // Check if the workspace path exists
            const workspaceUri = vscode.Uri.file(project.workspacePath);
            try {
                await vscode.workspace.fs.stat(workspaceUri);
            } catch (error) {
                throw new Error(`Project folder not found at: ${project.workspacePath}`);
            }

            // Prompt user to open the workspace if it's not currently open
            const currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (currentWorkspace !== project.workspacePath) {
                const openWorkspace = await vscode.window.showWarningMessage(
                    `This project is located at: ${project.workspacePath}\nDo you want to open this workspace?`,
                    'Open Workspace',
                    'Cancel'
                );
                
                if (openWorkspace === 'Open Workspace') {
                    await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
                    // Wait for workspace to open
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw new Error("Sync cancelled - workspace needs to be open");
                }
            }

            // Get updated file list from the workspace
            const projectFiles = await vscode.workspace.findFiles("**/*");
            const fileNames = projectFiles.map(file => 
                vscode.workspace.asRelativePath(file)
            );

            // Update the project in Firebase
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, {
                files: fileNames,
                updatedAt: serverTimestamp()
            });

            debugLog('Project synced successfully:', projectId);
            vscode.window.showInformationMessage(
                `Project synced successfully. ${fileNames.length} files tracked.`
            );

        } catch (error) {
            debugLog('Error syncing project:', error);
            throw new Error(`Failed to sync project: ${error.message}`);
        }
    }

    static async getWorkspaceSuggestions() {
        try {
            const recentWorkspaces = await vscode.workspace.recentWorkspaces;
            return recentWorkspaces.map(uri => uri.fsPath);
        } catch (error) {
            debugLog('Error getting workspace suggestions:', error);
            return [];
        }
    }
}

module.exports = ProjectManager;