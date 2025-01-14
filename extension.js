const vscode = require("vscode");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithCustomToken, signOut } = require("firebase/auth");
const {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} = require("firebase/firestore");
const axios = require("axios");

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJn4YIQ8if8W-wFaqq4u898XLSHBDLFec",
  authDomain: "vs-code-plugin-453ae.firebaseapp.com",
  projectId: "vs-code-plugin-453ae",
  storageBucket: "vs-code-plugin-453ae.firebasestorage.app",
  messagingSenderId: "414560570386",
  appId: "1:414560570386:web:ba07a941ce459fd9171ccb",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function activate(context) {
  // Register TreeView
  const treeDataProvider = new SidebarProvider();
  vscode.window.registerTreeDataProvider("firebaseSidebar", treeDataProvider);

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

      // Set Webview HTML
      panel.webview.html = panelHtml;

      // Handle messages from Webview
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

  // Login Command
  const loginCommand = vscode.commands.registerCommand("extension.login", async () => {
    try {
      const uid = await vscode.window.showInputBox({
        prompt: "Enter UID for authentication",
      });
      if (!uid) {
        vscode.window.showErrorMessage("UID is required for login.");
        return;
      }

      const response = await axios.post("http://localhost:3000/generateCustomToken", { uid });
      const customToken = response.data.token;

      await signInWithCustomToken(auth, customToken);
      vscode.window.showInformationMessage("Login successful!");
    } catch (error) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
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

// Sidebar Provider Class
class SidebarProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    return Promise.resolve([
      new SidebarItem("Login", "extension.login"),
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

// HTML for Webview
const panelHtml = `
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
      background-color: #f4f4f4;
    }
    .button {
      display: block;
      width: 100%;
      max-width: 200px;
      margin: 10px auto;
      padding: 10px 20px;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      text-decoration: none;
      border-radius: 5px;
      color: white;
      cursor: pointer;
    }
    .button.green {
      background-color: #4caf50;
    }
    .button.red {
      background-color: #f44336;
    }
    .button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <h1>Firebase Plugin</h1>
  <button class="button green" onclick="vscode.postMessage({ command: 'extension.login' })">Login</button>
  <button class="button green" onclick="vscode.postMessage({ command: 'extension.saveProject' })">Save Project</button>
  <button class="button red" onclick="vscode.postMessage({ command: 'extension.logout' })">Logout</button>

  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>
`;

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
