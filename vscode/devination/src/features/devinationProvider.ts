'use strict';

import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as vscode from 'vscode';
import Url from 'vscode-uri'
import fileUrl = require("file-url");
import {
    workspace, window, commands, TextDocumentContentProvider,
    Event, Uri, TextDocumentChangeEvent, ViewColumn, EventEmitter,
    TextDocument, Disposable
} from "vscode";

import open from 'open';
import open_mac from 'mac-open';

// decide what os should be used
// possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
let platform = process.platform;

export default class DevinationProvider implements vscode.CodeActionProvider {

	private static commandId: string = 'extension.devination';
	private command: vscode.Disposable;
	private diagnosticCollection: vscode.DiagnosticCollection;
	// private provider: HtmlDocumentContentProvider;

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
		// this.provider = new HtmlDocumentContentProvider(document);

		return [{
			title: "Search in devination",
			command: DevinationProvider.commandId,
			arguments: [document, diagnostic.range, diagnostic.message]
		}];
	}


	private openHtml(e: string) {
		let es = path.extname(e.toString());
		if (/^\.(html|htm|shtml|xhtml)$/.test(es)) {
			if (platform === 'darwin') {
				open_mac(e);
			}
			else {
				open(e);
			}
		} else {
			vscode.window.showInformationMessage('Supports html file only!');
		}
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
			let cp = require('child_process');
			let devination = cp.spawn('devination-cli-exe', ["--language", "haskell", "--query", text], { shell: true });
			let result = '';
			devination.stdout.on('data', function (data) {
				result += data.toString();
			});
			let that = this;

			devination.stdout.on('end', function (data) {
				let item = JSON.parse(result)[0];
				if(item){
					let path = 'file://' + item['basePath'] + 'Documents/' + item['path'];
					let uri = Uri.parse(path);
					let success = commands.executeCommand('vscode.previewHtml', uri, vscode.ViewColumn.Two);
				}else {
					vscode.window.showErrorMessage("Term not found");
				}
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


// class HtmlDocumentContentProvider implements TextDocumentContentProvider {
//     private _onDidChange = new EventEmitter<Uri>();
//     private doc: TextDocument;

//     constructor(document: TextDocument) {
//         this.doc = document;
//     }

//     public provideTextDocumentContent(uri: Uri): string {
//         return this.createHtmlSnippet();
//     }

//     get onDidChange(): Event<Uri> {
//         return this._onDidChange.event;
//     }

//     public update(uri: Uri) {
//         this._onDidChange.fire(uri);
//     }

//     private createHtmlSnippet(): string {
//         if (this.doc.languageId !== "html") {
//             return this.errorSnippet("Active editor doesn't show a HTML - no properties to preview.");
//         }
//         return this.preview();
//     }

//     private errorSnippet(error: string): string {
//         return `
//                 <body>
//                     ${error}
//                 </body>`;
//     }

//     private createLocalSource(file: string, type: string) {
//         let source_path = fileUrl(
//             path.join(
//                 __dirname,
//                 "..",
//                 "..",
//                 "static",
//                 file
//             )
//         );
//         switch (type) {
//             case "SCRIPT":
//                 return `<script src="${source_path}"></script>`;
//             case "STYLE":
// 		return `<link href="${source_path}" rel="stylesheet" />`;
//         }
//     }

//     private fixLinks(): string {
//         return this.doc.getText().replace(
//             new RegExp("((?:src|href)=[\'\"])((?!http|\\/).*?)([\'\"])", "gmi"),
//             (subString: string, p1: string, p2: string, p3: string): string => {
//                 return [
//                     p1,
//                     fileUrl(path.join(
//                         path.dirname(this.doc.fileName),
//                         p2
//                     )),
//                     p3
//                 ].join("");
//             }
//         );
//     }

//     public preview(): string {
//         return this.createLocalSource("header_fix.css", "STYLE") +
//             this.fixLinks();
//     }
// }
