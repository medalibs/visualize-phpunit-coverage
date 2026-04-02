import * as vscode from 'vscode';
import { CoverageProvider } from './coverage-provider';

export function activate(context: vscode.ExtensionContext) {
    const coverageProvider = new CoverageProvider();

    // Commande pour rafraîchir manuellement la couverture
    const refreshCommand = vscode.commands.registerCommand('phpunit-coverage.showCoverage', () => {
        coverageProvider.refresh();
    });

    // Commande pour activer/désactiver l'affichage
    const toggleCommand = vscode.commands.registerCommand('phpunit-coverage.toggleCoverage', () => {
        const config = vscode.workspace.getConfiguration('phpunit-coverage');
        const isEnabled = config.get<boolean>('showDecorations');
        config.update('showDecorations', !isEnabled, vscode.ConfigurationTarget.Global);
    });

    // Mettre à jour quand on ouvre un nouvel éditeur (onglet actif)
    const changeActiveEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        coverageProvider.decorateVisibleEditors();
    });

    // Mettre à jour dès qu'un document est ouvert en arrière-plan
    const openDocument = vscode.workspace.onDidOpenTextDocument(() => {
        coverageProvider.decorateVisibleEditors();
    });

    // Charger le chemin depuis la config
    const getCloverPath = () => vscode.workspace.getConfiguration('phpunit-coverage').get<string>('cloverPath') || '**/clover.xml';

    // Surveiller les changements dans les rapports pour auto-refresh
    let xmlWatcher = vscode.workspace.createFileSystemWatcher(getCloverPath());
    xmlWatcher.onDidChange(() => coverageProvider.refresh());
    xmlWatcher.onDidCreate(() => coverageProvider.refresh());

    // Surveiller les changements de configuration
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

    // Initialiser au démarrage
    coverageProvider.refresh();

    context.subscriptions.push(refreshCommand, toggleCommand, changeActiveEditor, openDocument, changeConfig, xmlWatcher, coverageProvider);
}

export function deactivate() {}
