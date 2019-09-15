# Unide

Remember when Vaadin was "Thinking of U and I"? That was the time
when pure Java was king and no declarative formats were to be seen.

Unide is a "U and I Designer" from the days of old. It exports the
designs into a Java project that can be built with maven. It is also
free as it is released under the MIT license.

To run the project, clone the repository, `npm install` the damned thing and
finally recite this ancient spell: `polymer serve --npm`

## Goal of the project

Currently: the user is able to produce UIs, add basic navigation and finally export the
result to a maven project as plain Java (and some CSS).

Future: the user should be able to create full applications in Unide without programming.

## Some build instructions I nicked from rollup-starter-app

`npm run build` builds the application to `public/bundle.js`, along with a sourcemap file for debugging.

`npm start` launches a server, using [serve](https://github.com/zeit/serve). Navigate to [localhost:3000](http://localhost:3000).

`npm run watch` will continually rebuild the application as your source files change.

`npm run dev` will run `npm start` and `npm run watch` in parallel.
