// src/services/ProjectManager.js
const vscode = require("vscode");
const { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc,
    updateDoc,  // Added updateDoc here
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

            // Update the project
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, {
                projectName: newName,
                updatedAt: serverTimestamp()
            });

            debugLog('Project updated successfully:', projectId);
        } catch (error) {
            debugLog('Error updating project:', error);
            throw new Error(`Failed to update project: ${error.message}`);
        }
    }
}

module.exports = ProjectManager;