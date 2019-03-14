/** @babel */

import { CompositeDisposable } from 'atom';
import BracketMatcher from './bracket-matcher';
import minimatch from 'minimatch';
import path from 'path';

export default {

  subscriptions: null,
  editors: null,
  brackets: null,
  ignored_files: null,
  repeat_color: null,

  config: {
    brackets: {
      title: 'Brackets to match',
      description: "Should be matching pairs like '()', and '{}'",
      default: ['{}', '()', '[]'],
      type: 'array',
      items: {
        type: 'string'
      }
    },
    ignored_files: {
      title: 'Ignored files',
      description: 'Files which will not be colorized',
      default: ['*.md', '.*'],
      type: 'array',
      items: {
        type: 'string'
      }
    },
    repeat_color: {
      title: 'Repeat Color Count',
      description: 'Number of color classes to repeat',
      default: 9,
      type: 'integer'
    }
  },

  activate() {
    this.subscriptions = new CompositeDisposable();
    this.editors = new WeakMap();
    this.brackets = atom.config.get('bracket-colorizer.brackets');
    this.ignored_files = atom.config.get('bracket-colorizer.ignored_files');
    this.repeat_color = atom.config.get('bracket-colorizer.repeat_color');

    this.subscriptions.add(atom.workspace.onDidStopChangingActivePaneItem(() => this.processEditor()));
    this.subscriptions.add(atom.config.onDidChange('bracket-colorizer.brackets', (value) => {
      this.brackets = value;
      this.cleanAll();
      this.processEditor();
    }));
    this.subscriptions.add(atom.config.onDidChange('bracket-colorizer.ignored_files', (value) => {
      this.ignored_files = value;
      this.cleanAll();
      this.processEditor();
    }));
    this.subscriptions.add(atom.config.onDidChange('bracket-colorizer.repeat_color', (value) => {
      this.repeat_color = value;
      this.cleanAll();
      this.processEditor();
    }));

    this.processEditor();
  },

  deactivate() {
    this.cleanAll();
    this.subscriptions.dispose();
  },

  processEditor() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor || this.editors.has(editor)) {
      return;
    }

    let file = editor.buffer.file;
    if (!file) {
      return;
    }
    if (file.path) {
      for (let name of this.ignored_files) {
        if (minimatch(path.basename(file.path), name)) {
          return;
        }
      }
    }

    const editorObj = {
      subscriptions: new CompositeDisposable(),
      bracketMatcher: new BracketMatcher(editor, this.brackets, this.repeat_color),
    };
    editorObj.subscriptions.add(editor.onDidStopChanging(() => {
      editorObj.bracketMatcher.refresh();
    }));
    editorObj.subscriptions.add(editor.onDidTokenize(() => {
      editorObj.bracketMatcher.refresh();
    }));
    editorObj.subscriptions.add(editor.onDidDestroy(() => {
      editorObj.bracketMatcher.destroy();
      editorObj.subscriptions.dispose();
      this.editors.delete(editor);
    }));
    this.editors.set(editor, editorObj);
  },

  cleanAll() {
    atom.workspace.getTextEditors().forEach((editor) => {
      if (!this.editors.has(editor)) {
        return;
      }
      const editorObj = this.editors.get(editor);
      editorObj.bracketMatcher.destroy();
      editorObj.subscriptions.dispose();
      this.editors.delete(editor);
    });
  }
};
