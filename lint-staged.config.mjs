export default {
  "*.{js,mjs,cjs,ts,tsx}": ["oxlint --fix --fix-suggestions", "oxfmt --write"],
  "*.{json,jsonc,css,md,yml,yaml}": "oxfmt --write",
}
