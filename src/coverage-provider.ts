import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { XMLParser } from 'fast-xml-parser';

interface FileCoverage {
    covered: number[];
    uncovered: number[];
}

export class CoverageProvider {
    private readonly coverageMap: Map<string, FileCoverage> = new Map();
    private readonly coveredDecorator: vscode.TextEditorDecorationType;
    private readonly uncoveredDecorator: vscode.TextEditorDecorationType;

    constructor() {
        this.coveredDecorator = vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.parse('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM0Q0FGNTAiLz48L3N2Zz4='),
            gutterIconSize: 'contain',
            backgroundColor: 'rgba(76, 175, 80, 0.35)',
            isWholeLine: true,
        });

        this.uncoveredDecorator = vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.parse('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNGNDQzMzYiLz48L3N2Zz4='),
            gutterIconSize: 'contain',
            backgroundColor: 'rgba(244, 67, 54, 0.35)',
            isWholeLine: true,
        });
    }

    public async refresh() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        console.log('--- PHPUnit Coverage: Refreshing ---');
        const config = vscode.workspace.getConfiguration('phpunit-coverage');
        const cloverPath = config.get<string>('cloverPath') || '**/clover.xml';

        // Searching for the specified coverage file
        const files = await vscode.workspace.findFiles(cloverPath, '**/node_modules/**');
        if (files.length === 0) {
            console.log(`PHPUnit Coverage: No file found for: ${cloverPath}`);
            vscode.window.showWarningMessage(`No coverage file found for path: ${cloverPath}`);
            return;
        }

        const reportPath = files[0].fsPath;
        console.log(`PHPUnit Coverage: Using report: ${reportPath}`);
        
        this.loadReport(reportPath);
        this.decorateVisibleEditors();
    }

    private loadReport(path: string) {
        try {
            const xmlData = fs.readFileSync(path, 'utf8');
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            const result = parser.parse(xmlData);

            this.coverageMap.clear();

            const processFile = (file: any) => {
                if (!file?.name) return;
                
                const fileName = file.name;
                const lines = Array.isArray(file.line) ? file.line : [file.line];
                
                const cov: FileCoverage = { covered: [], uncovered: [] };
                lines.forEach((l: any) => {
                    // Some reports don't have type="stmt" or use other types
                    if (l?.num && l.count !== undefined) {
                        const num = Number.parseInt(l.num) - 1;
                        if (Number.parseInt(l.count) > 0) {
                            cov.covered.push(num);
                        } else {
                            cov.uncovered.push(num);
                        }
                    }
                });
                this.coverageMap.set(fileName, cov);
                console.log(`PHPUnit Coverage: Loaded: ${fileName} (${cov.covered.length} covered, ${cov.uncovered.length} uncovered)`);
            };

            const coverage = result.coverage;
            if (!coverage) {
                console.log('PHPUnit Coverage: Invalid XML structure (no <coverage> tag)');
                return;
            }

            const projects = Array.isArray(coverage.project) ? coverage.project : [coverage.project];
            
            projects.forEach((project: any) => {
                if (!project) return;

                if (project.file) {
                    const files = Array.isArray(project.file) ? project.file : [project.file];
                    files.forEach((f: any) => processFile(f));
                }
                
                if (project.package) {
                    const packages = Array.isArray(project.package) ? project.package : [project.package];
                    packages.forEach((pkg: any) => {
                        if (pkg.file) {
                            const pkgFiles = Array.isArray(pkg.file) ? pkg.file : [pkg.file];
                            pkgFiles.forEach((f: any) => processFile(f));
                        }
                    });
                }
            });

            vscode.window.showInformationMessage(`Coverage loaded for ${this.coverageMap.size} files.`);
        } catch (e) {
            console.error('PHPUnit Coverage: Critical error during parsing', e);
            vscode.window.showErrorMessage('Error reading report: ' + e);
        }
    }

    public decorateVisibleEditors() {
        const config = vscode.workspace.getConfiguration('phpunit-coverage');
        const showDecorations = config.get<boolean>('showDecorations') !== false;

        if (this.coverageMap.size === 0 || !showDecorations) {
            console.log('PHPUnit Coverage: Hiding or no coverage data.');
            vscode.window.visibleTextEditors.forEach(editor => {
                editor.setDecorations(this.coveredDecorator, []);
                editor.setDecorations(this.uncoveredDecorator, []);
            });
            return;
        }

        vscode.window.visibleTextEditors.forEach(editor => {
            const fileName = editor.document.fileName.replace(/\\/g, '/');
            console.log(`PHPUnit Coverage: Attempting decoration for: ${fileName}`);
            
            let coverage = this.coverageMap.get(fileName);
            
            if (!coverage) {
                // Look for a match by path suffix (e.g., src/Calculator.php)
                // Normalize paths for comparison
                for (const [xmlPath, data] of this.coverageMap.entries()) {
                    const normalizedXmlPath = xmlPath.replace(/\\/g, '/');
                    
                    // If the VS Code path ends with the XML path or vice-versa
                    // Take at least the last two segments to avoid false positives (e.g., Index.php)
                    const xmlSegments = normalizedXmlPath.split('/');
                    const fileSegments = fileName.split('/');
                    
                    const minSegments = Math.min(xmlSegments.length, fileSegments.length, 2);
                    const xmlSuffix = xmlSegments.slice(-minSegments).join('/');
                    const fileSuffix = fileSegments.slice(-minSegments).join('/');

                    if (xmlSuffix === fileSuffix && xmlSuffix.length > 0) {
                        coverage = data;
                        console.log(`PHPUnit Coverage: Match found by suffix: ${normalizedXmlPath}`);
                        break;
                    }
                }
            }

            if (coverage) {
                const coveredRanges = coverage.covered.map(l => {
                    const range = new vscode.Range(l, 0, l, 0);
                    return range;
                });
                const uncoveredRanges = coverage.uncovered.map(l => {
                    const range = new vscode.Range(l, 0, l, 0);
                    return range;
                });

                editor.setDecorations(this.coveredDecorator, coveredRanges);
                editor.setDecorations(this.uncoveredDecorator, uncoveredRanges);
                console.log(`PHPUnit Coverage: Applied (${coveredRanges.length} covered, ${uncoveredRanges.length} uncovered) to ${fileName}`);
            } else {
                console.log(`PHPUnit Coverage: No data found in report for ${fileName}`);
                editor.setDecorations(this.coveredDecorator, []);
                editor.setDecorations(this.uncoveredDecorator, []);
            }
        });
    }

    public dispose() {
        this.coveredDecorator.dispose();
        this.uncoveredDecorator.dispose();
    }
}
