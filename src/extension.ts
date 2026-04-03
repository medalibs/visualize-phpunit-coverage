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

    // Command to send specific diagnostic context to agent
    const sendToAgentCommand = vscode.commands.registerCommand('phpunit-coverage.sendToAgent', (arg) => {
        // arg could be a Diagnostic or a URI depending on how it's called
        let message = 'Sending coverage data to agent...';
        if (arg?.range) {
            message = `Sending uncovered line ${arg.range.start.line + 1} from ${vscode.window.activeTextEditor?.document.fileName} to agent...`;
        }
        vscode.window.showInformationMessage(message);
        // Here you would typically integrate with an AI service or extension API
        // For example:
        // vscode.commands.executeCommand('workbench.action.chat.open', { prompt: `Help me fix this uncovered code...` });
    });

    // Command to send all uncovered lines report to agent
    const sendAllToAgentCommand = vscode.commands.registerCommand('phpunit-coverage.sendAllToAgent', () => {
        vscode.window.showInformationMessage('Sending all uncovered lines to agent for analysis...');
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
        if (e.affectsConfiguration('phpunit-coverage.showDecorations') || e.affectsConfiguration('phpunit-coverage.showInProblems')) {
            coverageProvider.updateDiagnostics();
            coverageProvider.decorateVisibleEditors();
        }
    });

    // Initialize at startup
    coverageProvider.refresh();

    // Code Action Provider for "Send to Agent" quick fix
    const codeActionProvider = vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, {
        provideCodeActions(document, range, context) {
            const actions: vscode.CodeAction[] = [];
            
            // Look for uncovered-line diagnostics in the context
            const uncoveredDiagnostics = context.diagnostics.filter(d => d.code === 'uncovered-line');
            
            for (const diagnostic of uncoveredDiagnostics) {
                const action = new vscode.CodeAction('Send to Agent', vscode.CodeActionKind.QuickFix);
                action.command = {
                    command: 'phpunit-coverage.sendToAgent',
                    title: 'Send to Agent',
                    arguments: [diagnostic]
                };
                action.diagnostics = [diagnostic];
                action.isPreferred = true;
                actions.push(action);
            }
            
            return actions;
        }
    }, {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    });

    context.subscriptions.push(
        refreshCommand, 
        toggleCommand, 
        sendToAgentCommand, 
        sendAllToAgentCommand, 
        codeActionProvider,
        changeActiveEditor, 
        openDocument, 
        changeConfig, 
        xmlWatcher, 
        coverageProvider
    );
}

export function deactivate() {}
