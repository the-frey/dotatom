'use babel'

import { CompositeDisposable, TextEditor, Emitter } from 'atom'

let subs = new CompositeDisposable
let panes = new Set

function ensurePaneVisible(pane) {
  if (!pane) return
  if (pane.getFlexScale && pane.getFlexScale() < 0.2) {
    pane.parent.adjustFlexScale()
    pane.setFlexScale(0.6)
  }
  ensurePaneVisible(pane.parent)
  ensurePaneContainerVisible(pane)
}

function ensurePaneContainerVisible(pane) {
  if (pane.getActiveItem) {
    let container = atom.workspace.paneContainerForItem(pane.getActiveItem())
    if (container.isVisible && !container.isVisible()) container.show()
  }
}

export default class PaneItem {
  static activate() {
    if (subs != null) return
    subs = new CompositeDisposable
    panes.forEach(Pane => Pane.registerView())
  }

  static deactivate() {
    if (subs != null) subs.dispose()
    subs = null
  }

  static attachView(View) {
    this.View = View
    this.registerView()
  }

  static registerView() {
    panes.add(this)

    subs.add(atom.views.addViewProvider(this, pane => {
      if (pane.element != null) {
        return pane.element
      } else {
        return new this.View().initialize(pane)
      }
    }))

    subs.add(atom.deserializers.add({
      name: `Ink${this.name}`,
      deserialize: (state) => {
        let opts = {}
        if (state.persistentState && state.persistentState.opts) {
          opts = state.persistentState.opts
        }
        let pane = this.fromId(state.id, opts)
        if (state.persistentState) pane.persistentState = state.persistentState
        if (pane.currentPane()) return
        return pane
      }
    }))

    subs.add(atom.workspace.onDidOpen(({uri, item}) => {
      if (uri && uri.match(new RegExp(`atom://ink-${this.name.toLowerCase()}/(.+)`))) {
        if (item.onAttached) item.onAttached()
      }
    }))

    subs.add(atom.workspace.addOpener(uri => {
      let m
      if (m = uri.match(new RegExp(`atom://ink-${this.name.toLowerCase()}/(.+)`))) {
        let [_, id] = m
        return this.fromId(id)
      }
    }))
  }

  static fromId(id, ...args) {
    let pane
    if (this.registered == null) { this.registered = {} }
    if (pane = this.registered[id]) {
      return pane
    } else {
      pane = this.registered[id] = new this(...args)
      pane.id = id
      return pane
    }
  }

  constructor () {
    this.__emitter = new Emitter()
  }

  getURI() {
    return `atom://ink-${this.constructor.name.toLowerCase()}/${this.id}`
  }

  serialize() {
    if (this.id) {
      return {
        deserializer: `Ink${this.constructor.name}`,
        id: this.id,
        persistentState: this.persistentState
      }
    }
  }

  currentPane() {
    for (let pane of atom.workspace.getPanes()) {
      if (pane.getItems().includes(this)) return pane
    }
  }

  activate() {
    let pane
    if (pane = this.currentPane()) {
      pane.activate()
      pane.setActiveItem(this)
      ensurePaneVisible(pane)
      return true
    }
  }

  open(opts) {
    if (this.activate()) { return Promise.resolve(this) }
    if (this.id) {
      return atom.workspace.open(`atom://ink-${this.constructor.name.toLowerCase()}/${this.id}`, opts)
    } else {
      throw new Error('Pane does not have an ID')
    }
  }

  ensureVisible (opts = {}) {
    let pane = this.currentPane()
    if (pane) {
      ensurePaneVisible(pane)
      if (pane.getActiveItem() !== this) pane.activateItem(this)
      return new Promise((resolve) => resolve())
    } else {
      let p = atom.workspace.getActivePane()
      prom = this.open(opts)
      prom.then(() => p.activate())
      return prom
    }
  }

  close() {
    if (this.currentPane()) this.currentPane().removeItem(this)
  }

  setTitle (title, force) {
    if (this.__forcedTitle) {
      if (force) {
        this.__forcedTitle = true
        this.__title = title
        this.__emitter.emit('change-title', title)
      }
    } else {
      this.__forcedTitle = force ? true : false
      this.__title = title
      this.__emitter.emit('change-title', title)
    }
  }

  getTitle () {
    return this.__title
  }

  onDidChangeTitle (f) {
    return this.__emitter.on('change-title', f)
  }

  static focusEditorPane() {
    let cur = atom.workspace.getActivePaneItem()
    if (cur instanceof TextEditor) return
    for (pane of atom.workspace.getPanes()) {
      if (pane.getActiveItem() instanceof TextEditor) {
        pane.focus()
        break
      }
    }
  }

}
