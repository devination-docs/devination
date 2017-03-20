import * as vscode from 'vscode';

import DevinationProvider from './features/devinationProvider';

export function activate(context: vscode.ExtensionContext) {
	let linter = new DevinationProvider();
	linter.activate(context.subscriptions);
	vscode.languages.registerCodeActionsProvider('haskell', linter);
}
