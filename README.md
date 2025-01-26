# Firebase VSCode Plugin

A Visual Studio Code extension that helps you manage your Firebase projects directly from your IDE. This plugin provides a seamless integration between your local development environment and Firebase services.

## Features

- **Google Authentication**: Securely sign in with your Google account to access your Firebase projects
- **Project Management**:
  - Create new Firebase projects from your current workspace
  - View and manage all your Firebase projects
  - Update project names and configurations
  - Delete projects when no longer needed
  - Sync project files with Firebase
- **Sidebar Integration**: Quick access to all Firebase-related commands through a dedicated sidebar
- **File Tracking**: Automatically tracks and syncs your project files
- **Workspace Support**: Handles multiple workspace configurations

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar
3. Search for "Saif Firebase Plugin"
4. Click Install

## Requirements

- Visual Studio Code ^1.74.0
- Active Firebase account
- Node.js and npm installed on your system

## Usage

### Authentication

1. Click on the Firebase icon in the Activity Bar
2. Click "Sign in with Google"
3. Complete the authentication process in your browser

### Managing Projects

#### Create a New Project
1. Open the workspace/folder you want to save as a Firebase project
2. Click "Save New Project" in the sidebar
3. Enter a project name when prompted

#### View Projects
1. Click "View All Projects" in the sidebar
2. Browse through your saved projects
3. View project details including:
   - Project name
   - Creation date
   - Last update date
   - Tracked files

#### Update Project
1. Select a project from the projects view
2. Click the "Update" button
3. Enter the new project name
4. Confirm the changes

#### Sync Project
1. Select a project from the projects view
2. Click the "Sync" button
3. If needed, confirm workspace path changes
4. Wait for the sync completion message

#### Delete Project
1. Select a project from the projects view
2. Click the "Delete" button
3. Confirm the deletion

## Extension Settings

This extension contributes the following settings:

* `firebase-plugin.enable`: Enable/disable the extension
* `firebase-plugin.debug`: Enable/disable debug logging

## Security

- Authentication is handled securely through Google OAuth
- Firebase configuration and credentials are stored securely
- No sensitive information is stored in plain text

## Known Issues

No major issues currently known. Please report any bugs or feature requests on our GitHub repository.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Building

```bash
# Install dependencies
npm install

# Package the extension
npm run package


```

## Technology Stack

- Visual Studio Code Extension API
- Firebase Authentication
- Firebase Firestore
- Node.js
- Electron (for desktop builds)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Note**: This extension requires appropriate Firebase credentials and configurations to be set up in your development environment. Make sure you have the necessary Firebase project settings before using the extension.

