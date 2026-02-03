---
description: Release a new version of FlowY (increment version, build, and publish)
---

This workflow automates the release process when the user confirms the current state is ready ("es passt").

1. **Ensure Git is clean**:
    Before releasing, ensure all changes are committed.

    ```powershell
    git status
    ```

2. **Increment Version**:
    Automatically increment the patch version (e.g., 1.0.0 -> 1.0.1).
    // turbo

    ```powershell
    npm version patch
    ```

3. **Push Version Bump**:
    Push the new version tag and updated package.json to GitHub.
    // turbo

    ```powershell
    git push origin main
    git push --tags
    ```

4. **Build and Publish**:
    Run the electron-publish script to build the application and upload artifacts to GitHub Releases.
    // turbo

    ```powershell
    npm run electron-publish
    ```

5. **Completion**:
    Notify the user that the new version is live.
