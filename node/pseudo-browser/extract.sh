#cat dist/pseudo-browser.js  | perl -wne '/require\("([^"]+)"\)/i and print "$1\n"' | sort | uniq
#

cat dist/pseudo-browser.js  | grep '^//#region' | grep node_module
cat dist/pseudo-browser.js  | grep '^//#region' | grep node_module | wc -l
