const vscode = require("vscode");
const { initializeApp } = require("firebase/app");
const { 
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged
} = require("firebase/auth");
const http = require('http');
const crypto = require('crypto');
const fetch = require('node-fetch');
const {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJn4YIQ8if8W-wFaqq4u898XLSHBDLFec",
  authDomain: "vs-code-plugin-453ae.firebaseapp.com",
  projectId: "vs-code-plugin-453ae",
  storageBucket: "vs-code-plugin-453ae.firebasestorage.app",
  messagingSenderId: "414560570386",
  appId: "1:414560570386:web:ba07a941ce459fd9171ccb",
  clientId: "414560570386-35usvjqlcp7dgp4q4n1qgd2tlac68qea.apps.googleusercontent.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.setPersistence(require('firebase/auth').browserLocalPersistence);
const db = getFirestore(app);

// Global variable for tree data provider
let globalTreeDataProvider;

// Debug function
function debugLog(message, data = '') {
    console.log(`[DEBUG] ${message}`, data);
    // Also show in VS Code output
    if (global._outputChannel) {
        global._outputChannel.appendLine(`[DEBUG] ${message} ${data}`);
    }
}

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

  // ... other ProjectManager methods remain the same
}

class SidebarProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.lastRefreshTime = 0;
    this.isRefreshing = false;
  }

  async refresh() {
    // Prevent multiple refreshes within 2 seconds
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

      // Cache projects to prevent multiple fetches
      if (!this._cachedProjects || (Date.now() - this._lastCacheTime) > 5000) {
        this._cachedProjects = await ProjectManager.listProjects();
        this._lastCacheTime = Date.now();
      }
      
      return [
        new SidebarGroupItem("My Projects", [
          ...this._cachedProjects.map(project => 
            new ProjectItem(project.projectName, project.id, project.files)
          )
        ]),
        new SidebarItem("Save New Project", "extension.saveProject"),
        new SidebarItem("Logout", "extension.logout"),
      ];
    } catch (error) {
      debugLog('Error in getChildren:', error.message);
      return [];
    }
  }
}

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

function activate(context) {
  // Create output channel for debugging
  global._outputChannel = vscode.window.createOutputChannel('Firebase Extension');

  // Create and store the tree data provider globally
  globalTreeDataProvider = new SidebarProvider();
  debugLog('TreeDataProvider created');
  
  // Register TreeView
  const treeView = vscode.window.createTreeView("firebaseSidebar", {
    treeDataProvider: globalTreeDataProvider
  });
  debugLog('TreeView registered');

  // Set up auth state listener
  auth.onAuthStateChanged((user) => {
    debugLog('Auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
    if (globalTreeDataProvider) {
      globalTreeDataProvider.refresh();
      debugLog('TreeView refreshed after auth state change');
    }
  });

  // Login Command
  const loginCommand = vscode.commands.registerCommand("extension.login", async () => {
    try {
      debugLog('Starting login process');
      const server = http.createServer();
      const state = crypto.randomBytes(16).toString('hex');
      
      await new Promise((resolve) => {
        server.listen(0, 'localhost', () => {
          debugLog('Local server started');
          resolve();
        });
      });

      const port = server.address().port;
      
      server.on('request', async (req, res) => {
        if (req.url.startsWith('/oauth/callback')) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <body>
                <script>
                  const params = new URLSearchParams(window.location.hash.substring(1));
                  const accessToken = params.get('access_token');
                  const state = params.get('state');
                  
                  fetch('/oauth/tokens?' + new URLSearchParams({
                    access_token: accessToken,
                    state: state
                  })).then(() => {
                    document.body.innerHTML = '<h1>Successfully signed in! You can close this window.</h1>';
                  });
                </script>
                <h1>Processing authentication...</h1>
              </body>
            </html>
          `);
        } else if (req.url.startsWith('/oauth/tokens')) {
          const urlParams = new URL(req.url, `http://localhost:${port}`).searchParams;
          const accessToken = urlParams.get('access_token');
          const receivedState = urlParams.get('state');

          if (receivedState !== state) {
            res.writeHead(400);
            res.end('Invalid state parameter');
            return;
          }

          try {
            debugLog('Received OAuth callback tokens');
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userInfo = await userInfoResponse.json();
            debugLog('User info fetched:', userInfo.email);

            const credential = GoogleAuthProvider.credential(null, accessToken);
            const userCred = await signInWithCredential(auth, credential);
            debugLog('Firebase credential created and signed in');
            
            res.writeHead(200);
            res.end();

            // Single refresh after login
            if (globalTreeDataProvider) {
              debugLog('Refreshing TreeView after login');
              await globalTreeDataProvider.refresh();
              vscode.window.showInformationMessage(`Logged in as ${userInfo.email}`);
            }
            
          } catch (error) {
            debugLog('Error during authentication:', error.message);
            res.writeHead(400);
            res.end();
            vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
          }

          server.close();
        }
      });

      const redirectUri = `http://localhost:${port}/oauth/callback`;
      const clientId = firebaseConfig.clientId;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}` +
        `&state=${state}` +
        `&flowName=GeneralOAuthFlow`;

      await vscode.env.openExternal(vscode.Uri.parse(authUrl));
      vscode.window.showInformationMessage('Please complete the sign-in in your browser.');

    } catch (error) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      console.error("Login error details:", error);
    }
  });

  // Logout Command
  const logoutCommand = vscode.commands.registerCommand("extension.logout", async () => {
    try {
      await signOut(auth);
      vscode.window.showInformationMessage("Logged out successfully!");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to logout: ${error.message}`);
    }
  });

  // Save Project Command
  const saveProjectCommand = vscode.commands.registerCommand(
    "extension.saveProject",
    async () => {
      try {
        const projectName = await vscode.window.showInputBox({
          prompt: "Enter a name for the project",
          placeHolder: "My Project",
          validateInput: text => {
            return text && text.length > 0 ? null : "Project name is required";
          }
        });

        if (!projectName) {
          return;
        }

        await ProjectManager.saveProject(projectName);
        globalTreeDataProvider.refresh();
        vscode.window.showInformationMessage(`Project "${projectName}" saved successfully!`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to save project: ${error.message}`);
      }
    }
  );

  // Register all commands
  context.subscriptions.push(
    loginCommand,
    logoutCommand,
    saveProjectCommand
  );
}

module.exports = {
  activate,
  deactivate: () => {}
};