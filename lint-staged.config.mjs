export default {
  "*.{js,mjs,cjs,ts,tsx}": ["oxfmt --write", "oxlint --fix"],
  "*.{json,jsonc,css,md,yml,yaml}": "oxfmt --write",
}
