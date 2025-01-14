const vscode = require("vscode");
const { initializeApp } = require("firebase/app");
const { 
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut
} = require("firebase/auth");
const http = require('http');
const crypto = require('crypto');
const fetch = require('node-fetch');
const {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} = require("firebase/firestore");

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJn4YIQ8if8W-wFaqq4u898XLSHBDLFec",
  authDomain: "vs-code-plugin-453ae.firebaseapp.com",
  projectId: "vs-code-plugin-453ae",
  storageBucket: "vs-code-plugin-453ae.firebasestorage.app",
  messagingSenderId: "414560570386",
  appId: "1:414560570386:web:ba07a941ce459fd9171ccb",
  // Add your OAuth client ID here
  clientId: "414560570386-35usvjqlcp7dgp4q4n1qgd2tlac68qea.apps.googleusercontent.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

function activate(context) {
  // Register TreeView
  const treeDataProvider = new SidebarProvider();
  vscode.window.registerTreeDataProvider("firebaseSidebar", treeDataProvider);

  // Login Command
  const loginCommand = vscode.commands.registerCommand("extension.login", async () => {
    try {
      // Create a local server to handle the OAuth callback
      const server = http.createServer();
      const state = crypto.randomBytes(16).toString('hex');
      
      // Wait for the server to start
      await new Promise((resolve) => {
        server.listen(0, 'localhost', () => resolve());
      });

      const port = server.address().port;
      
      // Handle the OAuth callback
      server.on('request', async (req, res) => {
        if (req.url.startsWith('/oauth/callback')) {
          // Send an HTML page that will parse the hash fragment
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <body>
                <script>
                  // Parse the hash fragment
                  const params = new URLSearchParams(window.location.hash.substring(1));
                  const accessToken = params.get('access_token');
                  const state = params.get('state');
                  
                  // Send the tokens back to our server
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
            res.end('Invalid state parameter. Authorization failed.');
            return;
          }

          try {
            // Get user info using the access token
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userInfo = await userInfoResponse.json();

            // Create credential from access token
            const credential = GoogleAuthProvider.credential(null, accessToken);
            const userCredential = await signInWithCredential(auth, credential);
            
            res.writeHead(200);
            res.end();
            
            vscode.window.showInformationMessage(`Logged in as ${userInfo.email}`);
          } catch (error) {
            res.writeHead(400);
            res.end();
            vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
          }

          server.close();
        }
      });

      // Generate OAuth URL
      const redirectUri = `http://localhost:${port}/oauth/callback`;
      const clientId = firebaseConfig.clientId; // Using OAuth client ID from Google Cloud Console
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}` +
        `&state=${state}` +
        `&flowName=GeneralOAuthFlow`;

      // Open the authentication URL in the user's browser
      await vscode.env.openExternal(vscode.Uri.parse(authUrl));
      vscode.window.showInformationMessage('Please complete the sign-in in your browser.');

    } catch (error) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      console.error("Login error details:", error);
    }
  });

  // Register Webview Panel
  const panelCommand = vscode.commands.registerCommand(
    "firebaseSidebar.openWebview",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "firebaseWebview",
        "Firebase Plugin",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();
      
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "extension.login":
            vscode.commands.executeCommand("extension.login");
            break;
          case "extension.saveProject":
            vscode.commands.executeCommand("extension.saveProject");
            break;
          case "extension.logout":
            vscode.commands.executeCommand("extension.logout");
            break;
        }
      });
    }
  );

  // Other commands
  const logoutCommand = vscode.commands.registerCommand("extension.logout", async () => {
    try {
      await signOut(auth);
      vscode.window.showInformationMessage("Logged out successfully!");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to logout: ${error.message}`);
    }
  });

  const saveProjectCommand = vscode.commands.registerCommand(
    "extension.saveProject",
    async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage("No workspace is open.");
          return;
        }

        const projectFiles = await vscode.workspace.findFiles("**/*");
        const fileNames = projectFiles.map((file) =>
          vscode.workspace.asRelativePath(file)
        );

        const projectName = await vscode.window.showInputBox({
          prompt: "Enter a name for the project",
        });
        if (!projectName) {
          vscode.window.showErrorMessage("Project name is required.");
          return;
        }

        const user = auth.currentUser;
        if (!user) {
          vscode.window.showErrorMessage(
            "You must be logged in to save a project."
          );
          return;
        }

        await addDoc(collection(db, "projects"), {
          userId: user.uid,
          projectName,
          files: fileNames,
          createdAt: serverTimestamp(),
        });

        vscode.window.showInformationMessage("Project saved successfully!");
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to save project: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(
    panelCommand,
    loginCommand,
    logoutCommand,
    saveProjectCommand
  );
}

function getWebviewContent() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Firebase Plugin</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                max-width: 240px;
                margin: 10px auto;
                padding: 10px 20px;
                font-size: 14px;
                border-radius: 4px;
                cursor: pointer;
                border: none;
                gap: 8px;
            }
            .google-btn {
                background-color: white;
                color: #757575;
                border: 1px solid #ddd;
            }
            .save-btn {
                background-color: #4CAF50;
                color: white;
            }
            .logout-btn {
                background-color: #f44336;
                color: white;
            }
            .button:hover {
                opacity: 0.9;
            }
        </style>
    </head>
    <body>
        <h1>Firebase Plugin</h1>
        <button class="button google-btn" onclick="vscode.postMessage({ command: 'extension.login' })">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18">
            Sign in with Google
        </button>
        <button class="button save-btn" onclick="vscode.postMessage({ command: 'extension.saveProject' })">
            Save Project
        </button>
        <button class="button logout-btn" onclick="vscode.postMessage({ command: 'extension.logout' })">
            Logout
        </button>

        <script>
            const vscode = acquireVsCodeApi();
        </script>
    </body>
    </html>
  `;
}

// SidebarProvider Class
class SidebarProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    return Promise.resolve([
      new SidebarItem("Login with Google", "extension.login"),
      new SidebarItem("Save Project", "extension.saveProject"),
      new SidebarItem("Logout", "extension.logout"),
    ]);
  }
}

// Sidebar Item Class
class SidebarItem extends vscode.TreeItem {
  constructor(label, command) {
    super(label);
    this.command = {
      command,
      title: label,
    };
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};