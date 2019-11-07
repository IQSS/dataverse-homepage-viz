#!/bin/sh
prettier --parser html --write index.html
prettier --parser babel --write js/script.js
prettier --parser css --write css/styles.css
