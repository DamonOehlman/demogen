# demogen

Demogen is the ___write your JS library demo code once___ solution.  

## Why use demogen?

It's annoying to wrap demos for your library in the same boilerplate HTML everytime, but that is the way that most of us like to consume demos.  I've made various attempts to make my demo writing process simple (for me) in the past but it generally results in demos that are confusing to work with.

## Getting Started

To be completed.

### Scaffolding a Project

To be completed

## Structuring your Demo Files

Get this right, and everything will just sing. So here's what you need to know.

### The Layout File

In the root of the `_sources` tree you should have a `_layout.html` file.  The one that is created when scaffolding a project is essentially a version of the [HTML5 Boilerplate](http://html5boilerplate.com/) with [Handlebars](http://handlebars.strobeapp.com/) templating in relevant places.  You can either use this file or replace it with your own.

Additionally, like most things in demogen, this file can be overriden in a child directory to have a set of _sub-demos_ use a different layout entirely.

For instance, if you had a directory structure like:

```
- yourproject
|-- _sources
  |-- _layout.html
  |-- demo1
    |-- demo.js
  |-- category1
    |-- _layout
    |-- demo2
      |-- demo.js
      |-- README.md
```

Then the demo file created for demo1 (`demo1.html`) would be using the top level layout.  The demo file created for demo2 (`category1-demo2.html`) would however, use the layout that exists in the `category1` folder.