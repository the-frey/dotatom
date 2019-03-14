{$, View, TextEditorView} = require 'atom-space-pen-views'
fs = require 'fs'

defaultHost = "localhost"
defaultPort = ""

module.exports =
  class NReplConnectionView extends View
    @content: ->
      @div class: "proto-repl proto-repl-nrepl-connection-dialog", =>
        @h3 "nRepl connection", class: "icon icon-clobe"
        @div class: "block", =>
          @label "Host"
          @subview "hostEditor", new TextEditorView(mini: true, placeholderText: defaultHost, attributes: tabindex: 1)
        @div class: "block", =>
          @label "Port"
          @subview "portEditor", new TextEditorView(mini: true, placeholderText: defaultPort, attributes: tabindex: 2)

    # * `confirmCallback` The {Function} execute on confirm. An {Object} will
    #   be passed to callback function with following keys:
    #   * `port` The {Number} entered port number
    #   * `host` The {String} entered host name
    constructor: (@confirmCallback)->
      super

    initialize: ->
      atom.commands.add @element,
        "core:confirm": => @onConfirm()
        "core:cancel": => @onCancel()

    show: ->
      @panel ?= atom.workspace.addModalPanel(item: this, visible: false)
      @storeActiveElement()
      @resetEditors()
      @panel.show()
      @hostEditor.focus()

      nreplPortPath = atom.project.getPaths().find (path) -> fs.existsSync("#{path}/.nrepl-port")
      defaultPort = if nreplPortPath
        fs.readFileSync("#{nreplPortPath}/.nrepl-port").toString()
      else
        ""
      @portEditor.getModel().setPlaceholderText(defaultPort)

    onConfirm: ->
      host = @hostEditor.getText() || defaultHost
      port = @portEditor.getText() || defaultPort
      @confirmCallback? port: parseInt(port), host: host
      @panel?.hide()

    onCancel: ->
      @panel?.hide()
      @restoreFocus()

    storeActiveElement: ->
      @previousActiveElement = $(document.activeElement)

    restoreFocus: ->
      @previousActiveElement?.focus()

    resetEditors: ->
      @hostEditor.setText('')
      @portEditor.setText('')

    toggleFocus: ->
      if @hostEditor.element.hasFocus()
        @portEditor.element.focus()
      else
        @hostEditor.element.focus()
