import * as vscode from 'vscode';
import { CoverageProvider } from './coverage-provider';

export function activate(context: vscode.ExtensionContext) {
    const coverageProvider = new CoverageProvider();

    // Command to manually refresh coverage
    const refreshCommand = vscode.commands.registerCommand('phpunit-coverage.showCoverage', () => {
        coverageProvider.refresh();
    });

    // Command to toggle coverage highlighting
    const toggleCommand = vscode.commands.registerCommand('phpunit-coverage.toggleCoverage', () => {
        const config = vscode.workspace.getConfiguration('phpunit-coverage');
        const isEnabled = config.get<boolean>('showDecorations');
        config.update('showDecorations', !isEnabled, vscode.ConfigurationTarget.Global);
    });

    // Update when a new editor is opened (active tab)
    const changeActiveEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        coverageProvider.decorateVisibleEditors();
    });

    // Update as soon as a document is opened in the background
    const openDocument = vscode.workspace.onDidOpenTextDocument(() => {
        coverageProvider.decorateVisibleEditors();
    });

    // Load path from configuration
    const getCloverPath = () => vscode.workspace.getConfiguration('phpunit-coverage').get<string>('cloverPath') || '**/clover.xml';

    // Watch for report changes for auto-refresh
    let xmlWatcher = vscode.workspace.createFileSystemWatcher(getCloverPath());
    xmlWatcher.onDidChange(() => coverageProvider.refresh());
    xmlWatcher.onDidCreate(() => coverageProvider.refresh());

    // Watch for configuration changes
    const changeConfig = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('phpunit-coverage.cloverPath')) {
            xmlWatcher.dispose();
            xmlWatcher = vscode.workspace.createFileSystemWatcher(getCloverPath());
            xmlWatcher.onDidChange(() => coverageProvider.refresh());
            xmlWatcher.onDidCreate(() => coverageProvider.refresh());
            coverageProvider.refresh();
        }
        if (e.affectsConfiguration('phpunit-coverage.showDecorations')) {
            coverageProvider.decorateVisibleEditors();
        }
    });

    // Initialize at startup
    coverageProvider.refresh();

    context.subscriptions.push(refreshCommand, toggleCommand, changeActiveEditor, openDocument, changeConfig, xmlWatcher, coverageProvider);
}

export function deactivate() {}
