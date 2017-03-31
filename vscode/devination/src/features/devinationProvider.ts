'use strict';

import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as vscode from 'vscode';
import Url from 'vscode-uri';
import * as cheerio from 'cheerio';

import {
    workspace, window, commands, TextDocumentContentProvider,
    Event, Uri, TextDocumentChangeEvent, ViewColumn, EventEmitter,
    TextDocument, Disposable
} from "vscode";


export default class DevinationProvider implements vscode.CodeActionProvider {

	private static commandId: string = 'extension.devination';
	private command: vscode.Disposable;
	private diagnosticCollection: vscode.DiagnosticCollection;
	private provider: DevinationDocumentContentProvider;

	public activate(subscriptions: vscode.Disposable[]) {
		this.command = vscode.commands.registerCommand(DevinationProvider.commandId, this.runCodeAction, this);
		this.provider = new DevinationDocumentContentProvider();
		let registration = vscode.workspace.registerTextDocumentContentProvider('devination', this.provider);
		subscriptions.push(this.command, registration);
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
			let cp = require('child_process');
			let devination = cp.spawn('devination-cli-exe', ["--language", "haskell", "--query", text], { shell: true });
			let result = '';
			devination.stdout.on('data', function (data) {
				result += data.toString();
			});
			let that = this;

			devination.stdout.on('end', function (data) {
				let results = JSON.parse(result);
				if(results){
					let path = 'devination://' + results[0]['basePath'] + 'Documents/' + results[0]['path'];
					let uri = Uri.parse(path);
					that.provider.update(results, uri);
					vscode.commands.executeCommand('vscode.previewHtml', uri, vscode.ViewColumn.Two, 'Devination').then((success) => {
						}, (reason) => {
							vscode.window.showErrorMessage(reason);
						});
				}else {
					vscode.window.showErrorMessage("Term not found");
				}
			});

			devination.stderr.on('data', function (data) {
				console.log(data.toString());
			});
		} else {
			vscode.window.showErrorMessage("Could not search for empty term");
		}
	}
}


class DevinationDocumentContentProvider implements TextDocumentContentProvider {

		private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
		private results = [];

		public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
			return this.showDocs(this.results, uri);
		}

		get onDidChange(): vscode.Event<vscode.Uri> {
			return this._onDidChange.event;
		}

		public update(results, uri: vscode.Uri) {
			// this._onDidChange.fire(uri);
			this.results = results;
			this.showDocs(results, uri);
		}

		private showDocs(results, uri: Uri): Thenable<string> {
			let editor = vscode.window.activeTextEditor;
			return this.snippet(editor.document, uri, results);
		}

		private errorSnippet(error: string): string {
			return `
				<body>
					${error}
				</body>`;
		}

		private buildResult(result) {
			let path = result['path'];
			let name = result['name'];
			let mFrom = path.split("#")[0].split("/").pop();
			return "<a href='" + 'html://' + result['basePath'] + 'Documents/' + path.split("#")[0] + "'>"+ name + ": " + mFrom + "</a>";
		}

		private buildResults(results) {
			return results.map((result) => { return this.buildResult(result) })
		}

		//  todo: parse from result
		private buildCss($, result) {
			let path = result['path'];
			let absolutePath = result['basePath'] + 'Documents/' + path.split("#")[0] + "/../"
			let links = $('link[rel="stylesheet"]').map((i,el) => {
				let current = $(el).attr('href');
				return $(el).attr('href', absolutePath + current);
			})
			return links.get().join('');
		}

		private snippet(document: vscode.TextDocument, uri: Uri, results): Thenable<string> {
			let path = uri.path;
			let fragment = uri.fragment;
			let that = this;
			return vscode.workspace.openTextDocument(path)
					.then((document) => {
							let dom = document.getText();
							let $ = cheerio.load(dom, { xmlMode: true, lowerCaseTags: true });
							let section = $;
							if(fragment.length > 0){
								section = $('[name="'+fragment+'"]').parent();
							}
							let links = this.buildResults(results).join('<br>');
							let text = section.html();
							let css = this.buildCss($, results[0]);
							return css + links + "<hr><br>" +  text.toString();
						});
		}
}
