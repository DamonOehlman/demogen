[![build status](https://secure.travis-ci.org/DamonOehlman/demogen.png)](http://travis-ci.org/DamonOehlman/demogen)
# demogen

Demogen is the ___write your JS library demo code once___ solution.  

## Why use demogen?

It's annoying to wrap demos for your library in the same boilerplate HTML everytime, but that is the way that most of us like to consume demos.  I've made various attempts to make my demo writing process simple (for me) in the past but it generally results in demos that are confusing to work with.

## Getting Started

First, install using npm:

```
npm install demogen -g
```

If all has gone well, then you will have a `demogen` executable available to you in your path.

### Scaffolding a Project

You can scaffold a new project by changing to the directory you want to create the project in and running:

```
demogen create
```

### Building the Demos

Demogen generates a number of static HTML files from the assets in the `_sources` directory.  To generate those files, simply run either `demogen` with no additional parameters or:

```
demogen build
```

Once this is done you will have a number of .html files in the current folder for demos that have been defined in the `_sources` directory.  Feel free to give it a go with a newly scaffolded project.  The demos are currently pretty lame, but that will be fixed in time.

## Structuring your Demo Files

Get this right, and everything will just sing. So here's what you need to know.

### The Layout File

In the root of the `_sources` tree you should have a `_layout.html` file.  The one that is created when scaffolding a project is essentially a version of the [HTML5 Boilerplate](http://html5boilerplate.com/) with [Handlebars](http://handlebars.strobeapp.com/) templating in relevant places:

```html
<!doctype html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en"> <!--<![endif]-->
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">

  <title></title>
  <meta name="description" content="{{ description }}">
  <meta name="author" content="{{ author }}">

  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="_demogen/js/modernizr-2.0.6.min.js"></script>
</head>

<body>
  {{#css}}
  <style type="text/css">{{this}}</style>
  {{/css}}
  {{{ body }}}


  <!--[if lt IE 7 ]>
    <script src="//ajax.googleapis.com/ajax/libs/chrome-frame/1.0.3/CFInstall.min.js"></script>
    <script>window.attachEvent('onload',function(){CFInstall.check({mode:'overlay'})})</script>
  <![endif]-->

  <pre id="demosrc">{{{ code }}}</pre>
  <script src="_demogen/js/keymaster.min.js"></script>
  <script src="_demogen/js/jquery-1.6.2.min.js"></script>
  <script src="_demogen/js/ace/ace.js"></script>
  <script src="_demogen/js/ace/theme-{{ theme }}.js"></script>
  <script src="_demogen/js/ace/mode-{{ mode }}.js"></script>
  <script src="_demogen/js/runner.js"></script>
  <script defer="defer">{{{ code }}}</script>
</body>
</html>
```

You can either use this file or replace it with your own.

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