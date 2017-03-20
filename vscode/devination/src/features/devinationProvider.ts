'use strict';

import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as vscode from 'vscode';
import * as Uri from 'url';

export default class DevinationProvider implements vscode.CodeActionProvider {

	private static commandId: string = 'extension.devination';
	private command: vscode.Disposable;
	private diagnosticCollection: vscode.DiagnosticCollection;

	public activate(subscriptions: vscode.Disposable[]) {
		this.command = vscode.commands.registerCommand(DevinationProvider.commandId, this.runCodeAction, this);
	}

	public dispose(): void {
		this.diagnosticCollection.clear();
		this.diagnosticCollection.dispose();
		this.command.dispose();
	}

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
		let diagnostic:vscode.Diagnostic = context.diagnostics[0];
		return [{
			title: "Search in devination",
			command: DevinationProvider.commandId,
			arguments: [document, diagnostic.range, diagnostic.message]
		}];
	}

	private runCodeAction(document: vscode.TextDocument, range: vscode.Range, message:string): any {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }
        let selection = editor.selection;
        let text = editor.document.getText(selection);
		let diagnostics: vscode.Diagnostic[] = [];
		if (text) {
			// https://github.com/electron/electron/issues/2226
			// https://electron.atom.io/docs/tutorial/application-packaging/#executing-binaries-inside-asar-archive
			const cp = require('child_process');
			let path = '/home/joris/tmp/start-devination.rb';
            let devination = cp.spawn('/bin/ruby', [path], { shell: true})
            devination.stdout.on('data', function (data) {
                console.log(data.toString());
            });

			devination.stderr.on('data', function (data) {
                console.log(data.toString());
            });
				// 	['.', '--help'],
				// 	{ shell: true
				// 	},
				// 	(error, stdout, stderr) => {
				// 	if (error) {
				// 		console.error('stderr', stderr);
				// 		console.error(error);
				// 	}
				// 	console.log('stdout', stdout);
				// });


		} else {
			vscode.window.showErrorMessage("Could not search for empty term");
		}
	}
}
