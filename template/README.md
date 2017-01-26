# <%=name %>

<%=description %>

## Working with the app

### Setup

Tested with Node version 5.12.0 You also need Gulp installed.

Install dependencies with

    npm i

### Running the app locally

You can run the app locally simply by running Gulp:

    gulp <%=moduleName %>

This will build the app and run it from a local server. It will also watch for any changes and
automatically refresh the page.

### Running tests

You can run the tests in PhantomJS:

    gulp <%=moduleName %>:spec

Or you can run them in Chrome if you wish to debug them:

    gulp <%=moduleName %>spec:chrome:debug

## Contributors

* [<%= author %>](https://github.com/<%= user %>)
