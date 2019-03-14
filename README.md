# Dot Atom

A simple atom setup for Clojure and collaborative editing using Atom and Atom Teletype. 

You can use this as a solid base for Clojure development or simply for pairing. 

It's been set up to work well with the One Dark UI and Tron Legacy syntax packages. There's a tiny bit of custom LESS in `less.css` - remove it if you're using a different theme.

## Installation

Clone this repo into `~/.atom` and restart atom.

## Lein and Boot

Lein and Boot are expected to be in:

```
/usr/local/bin/boot
/usr/local/bin/lein
```

You will also need [Joker](https://github.com/candid82/joker) installed and available for linting. 

## Connect to a remote repl

With: `cmd-option-y`

## Load current buffer

With `C-c l`

## Joker and teletype

The linter with Joker with fail when you are in your remote pair's buffer. Disable the linter before connecting. If you're the host, then you can leave it running.

