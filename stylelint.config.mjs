/** @type {import('stylelint').Config} */
export default {
  ignoreFiles: ['src/styles/tokens.css'],
  rules: {
    'color-no-hex': true,
    // `transparent` inside color-mix() is a keyword, not a palette name.
    'color-named': ['never', { ignore: ['inside-function'] }],
  },
};
