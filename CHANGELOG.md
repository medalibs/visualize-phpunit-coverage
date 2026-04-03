# Change Log

All notable changes to the "phpunit-coverage" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.
    
## [0.0.4] - 2026-04-03
- 🩺 **Problems Tab Integration**: Uncovered lines now appear in the VS Code "Problems" tab for better visibility.
- 🤖 **AI Agent Integration**: Added "Send to Agent" actions in the Problems tab and as a code action/quick fix to quickly get help with uncovered code.
- 📍 **Navigation**: Clicking on a problem now correctly navigates to the file and line.
- ⚙️ **New Setting**: Added `phpunit-coverage.showInProblems` to toggle coverage diagnostics.
- 🛣️ **Improved Path Resolution**: Enhanced logic to match files in the report even when paths are different from the local workspace (e.g. Docker/remote environments).

## [0.0.3] - 2026-04-02
- 🌐 Translated all notifications and code comments to English.
- 🛣️ Improved path matching logic for Windows/Linux compatibility.
- 🩺 Fixed issue with report parsing in certain workspace structures.

## [0.0.2] - 2026-04-02
- ✨ Added screenshot and improved README.
- 🎨 Added command `PHPUnit: Toggle Coverage Highlights`.
- 🛠️ Added configuration `phpunit-coverage.showDecorations` to enable/disable highlights.
- 📂 Added configuration `phpunit-coverage.cloverPath` to customize the clover.xml location.

## [0.0.1] - 2026-04-01
- Initial release