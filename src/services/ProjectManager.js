// src/services/ProjectManager.js
const vscode = require("vscode");
const { collection, addDoc, getDocs, query, where, serverTimestamp } = require("firebase/firestore");
const { auth, db } = require("../config/firebase");

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
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
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

      await addDoc(collection(db, "projects"), {
        userId: user.uid,
        projectName,
        files: fileNames,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw new Error(`Failed to save project: ${error.message}`);
    }
  }
}

module.exports = ProjectManager;